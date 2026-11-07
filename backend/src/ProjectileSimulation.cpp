#include "ProjectileSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <cmath>
#include <limits>
#include <sstream>

namespace {
constexpr double kPi = 3.14159265358979323846;
const double kNaN = std::numeric_limits<double>::quiet_NaN();

// cos(90 deg) is 6e-17 in floating point; treat such noise as exactly zero
// so a vertical launch has no sideways drift.
double snapToZero(double v) { return std::fabs(v) < 1e-12 ? 0.0 : v; }
}

ProjectileSimulation::ProjectileSimulation()
    : Simulation(),
      environment_(Environment::kEarthGravity),
      speed_(25.0),
      angleDeg_(45.0),
      height_(0.0),
      mass_(1.0),
      finished_(false),
      measuredMaxHeight_(0.0),
      initialEnergy_(0.0),
      measuredApexTime_(kNaN),
      recorder_({"t", "x", "y", "vx", "vy", "speed", "ax", "ay", "ke", "pe", "e"},
                {"s", "m", "m", "m/s", "m/s", "m/s", "m/s\xC2\xB2", "m/s\xC2\xB2", "J", "J", "J"}, kSeriesCapacity) {
    initialize();
}

double ProjectileSimulation::toRadians(double degrees) { return degrees * kPi / 180.0; }

// ---- validated setters ------------------------------------------------
void ProjectileSimulation::setLaunchSpeed(double v) {
    if (!std::isfinite(v) || v < 0.0 || v > kMaxSpeed) {
        throw InvalidSimulationException("initial velocity must be between 0 and 100 m/s.");
    }
    speed_ = v;
}

void ProjectileSimulation::setLaunchAngleDegrees(double deg) {
    if (!std::isfinite(deg) || deg < 0.0 || deg > 90.0) {
        throw InvalidSimulationException("launch angle must be between 0 and 90 degrees.");
    }
    angleDeg_ = deg;
}

void ProjectileSimulation::setGravity(double g) {
    if (!std::isfinite(g) || g < kMinGravity || g > kMaxGravity) {
        throw InvalidSimulationException("gravity must be between 0.1 and 30 m/s^2.");
    }
    environment_.setGravity(g);
}

void ProjectileSimulation::setLaunchHeight(double h) {
    if (!std::isfinite(h) || h < 0.0 || h > kMaxHeight) {
        throw InvalidSimulationException("launch height must be between 0 and 50 m.");
    }
    height_ = h;
}

void ProjectileSimulation::setMass(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 100.0) throw InvalidMassException("mass must be between 0.1 and 100 kg.");
    mass_ = m;
}

// ---- parameter metadata (single source of truth for the UI) -----------
std::vector<ParameterSpec> ProjectileSimulation::parameterSpecs() const {
    return {
        {"speed", "Initial velocity", "m/s", 0.0, kMaxSpeed, 0.5, 25.0},
        {"angle", "Launch angle", "\xC2\xB0", 0.0, 90.0, 0.5, 45.0},
        {"gravity", "Gravity", "m/s\xC2\xB2", kMinGravity, kMaxGravity, 0.01, Environment::kEarthGravity},
        {"height", "Launch height", "m", 0.0, kMaxHeight, 0.5, 0.0},
        {"mass", "Mass", "kg", 0.1, 100.0, 0.1, 1.0},
    };
}

double ProjectileSimulation::getParameter(const std::string& name) const {
    if (name == "speed") return speed_;
    if (name == "angle") return angleDeg_;
    if (name == "gravity") return environment_.getGravity();
    if (name == "height") return height_;
    if (name == "mass") return mass_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for projectile.");
}

void ProjectileSimulation::applyParameter(const std::string& name, double value) {
    if (name == "speed") setLaunchSpeed(value);
    else if (name == "angle") setLaunchAngleDegrees(value);
    else if (name == "gravity") setGravity(value);
    else if (name == "height") setLaunchHeight(value);
    else if (name == "mass") setMass(value);
}

// ---- closed-form solution ---------------------------------------------
ProjectileResults ProjectileSimulation::analytic() const {
    const double g = environment_.getGravity();
    const double theta = toRadians(angleDeg_);
    ProjectileResults r;
    r.ux = snapToZero(speed_ * std::cos(theta));
    r.uy = snapToZero(speed_ * std::sin(theta));
    r.apexTime = r.uy > 0.0 ? r.uy / g : 0.0;
    r.maxHeight = height_ + (r.uy > 0.0 ? (r.uy * r.uy) / (2.0 * g) : 0.0);
    // Positive root of h0 + uy t - 1/2 g t^2 = 0.  With h0 = 0 this is 2 uy / g.
    r.timeOfFlight = (r.uy + std::sqrt(r.uy * r.uy + 2.0 * g * height_)) / g;
    r.range = r.ux * r.timeOfFlight;
    const double vyEnd = r.uy - g * r.timeOfFlight;
    r.impactSpeed = std::sqrt(r.ux * r.ux + vyEnd * vyEnd);
    return r;
}

// ---- Simulation lifecycle ---------------------------------------------
void ProjectileSimulation::initialize() {
    const ProjectileResults r = analytic();
    resetClock();
    position_ = Vector2D(0.0, height_);
    velocity_ = Vector2D(r.ux, r.uy);
    finished_ = false;
    measuredMaxHeight_ = height_;
    initialEnergy_ = kineticEnergy() + potentialEnergy();
    measuredApexTime_ = kNaN;
    recorder_.clear();
    record();
}

void ProjectileSimulation::reset() { initialize(); }

void ProjectileSimulation::update(double dt) {
    if (finished_ || !(dt > 0.0)) return;

    const double g = environment_.getGravity();
    const double ay = -g;
    const double yNext = position_.y + velocity_.y * dt + 0.5 * ay * dt * dt;

    if (yNext <= 0.0) {
        // The body reaches the ground inside this step: solve for the exact
        // instant tau (positive root) instead of overshooting below y = 0.
        double tau = (velocity_.y + std::sqrt(velocity_.y * velocity_.y + 2.0 * g * position_.y)) / g;
        tau = clampValue(tau, 0.0, dt);
        position_.x += velocity_.x * tau;
        position_.y = 0.0;
        velocity_.y += ay * tau;
        addTime(tau);
        finished_ = true;
        record();
        return;
    }

    const double vyNext = velocity_.y + ay * dt;
    if (std::isnan(measuredApexTime_) && velocity_.y > 0.0 && vyNext <= 0.0) {
        // Apex lies inside this step: vy = 0 at t + vy/g, height y + vy^2/2g.
        measuredApexTime_ = time() + velocity_.y / g;
        const double apexY = position_.y + (velocity_.y * velocity_.y) / (2.0 * g);
        if (apexY > measuredMaxHeight_) measuredMaxHeight_ = apexY;
    }
    position_.x += velocity_.x * dt;
    position_.y = yNext;
    velocity_.y = vyNext;
    if (position_.y > measuredMaxHeight_) measuredMaxHeight_ = position_.y;
    addTime(dt);

    if (recorder_.due(time())) record();
}

void ProjectileSimulation::record() {
    const double ay = finished_ ? 0.0 : -environment_.getGravity();
    recorder_.push(time(), {time(), position_.x, position_.y, velocity_.x, velocity_.y,
                            velocity_.magnitude(), 0.0, ay, kineticEnergy(), potentialEnergy(),
                            kineticEnergy() + potentialEnergy()});
}

// ---- JSON ---------------------------------------------------------------
std::string ProjectileSimulation::stateJSON() const {
    using namespace JsonUtil;
    const ProjectileResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"projectile\",\"time\":" << num(time())
        << ",\"finished\":" << (finished_ ? "true" : "false")
        << ",\"position\":{\"x\":" << num(position_.x) << ",\"y\":" << num(position_.y) << "}"
        << ",\"velocity\":{\"x\":" << num(velocity_.x) << ",\"y\":" << num(velocity_.y)
        << ",\"speed\":" << num(velocity_.magnitude()) << "}"
        << ",\"acceleration\":{\"x\":0,\"y\":" << num(finished_ ? 0.0 : -environment_.getGravity()) << "}"
        << ",\"measured\":{\"timeOfFlight\":" << num(finished_ ? time() : kNaN)
        << ",\"range\":" << num(finished_ ? position_.x : kNaN)
        << ",\"maxHeight\":" << num(measuredMaxHeight_)
        << ",\"apexTime\":" << num(measuredApexTime_) << "}"
        << ",\"energy\":{\"kinetic\":" << num(kineticEnergy()) << ",\"potential\":" << num(potentialEnergy())
        << ",\"total\":" << num(kineticEnergy() + potentialEnergy()) << ",\"initial\":" << num(initialEnergy_)
        << ",\"drift\":" << num(relativeDrift(kineticEnergy() + potentialEnergy(), initialEnergy_)) << "}"
        << ",\"progress\":" << num(r.timeOfFlight > 0.0 ? clampValue(time() / r.timeOfFlight, 0.0, 1.0) : 1.0)
        << "}";
    return out.str();
}

std::string ProjectileSimulation::infoJSON() const {
    using namespace JsonUtil;
    const ProjectileResults r = analytic();
    const double g = environment_.getGravity();
    std::ostringstream out;
    out << "{\"type\":\"projectile\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{\"ux\":" << num(r.ux) << ",\"uy\":" << num(r.uy)
        << ",\"timeOfFlight\":" << num(r.timeOfFlight) << ",\"apexTime\":" << num(r.apexTime)
        << ",\"maxHeight\":" << num(r.maxHeight) << ",\"range\":" << num(r.range)
        << ",\"impactSpeed\":" << num(r.impactSpeed) << "}"
        << ",\"predictedPath\":[";
    for (std::size_t i = 0; i <= kPathPoints; ++i) {
        const double t = r.timeOfFlight * static_cast<double>(i) / static_cast<double>(kPathPoints);
        const double y = std::fmax(0.0, height_ + r.uy * t - 0.5 * g * t * t);
        if (i) out << ",";
        out << "[" << num(r.ux * t) << "," << num(y) << "]";
    }
    out << "]}";
    return out.str();
}

std::string ProjectileSimulation::seriesJSON(std::size_t maxRows) const { return recorder_.toJSON(maxRows); }

// In flight only gravity acts. Once landed the ground pushes back with the
// normal reaction, so the forces cancel and the body is in equilibrium.
std::vector<ForceVector> ProjectileSimulation::forces() const {
    const double weight = mass_ * environment_.getGravity();
    std::vector<ForceVector> list = {{"Weight", "W = mg", ForceKind::Gravity, Vector2D(0.0, -weight), false}};
    if (finished_) list.push_back({"Normal", "N", ForceKind::Normal, Vector2D(0.0, weight), false});
    return list;
}
