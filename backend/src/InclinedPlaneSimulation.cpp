#include "InclinedPlaneSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <limits>
#include <sstream>

namespace {
constexpr double kPi = 3.14159265358979323846;
constexpr double kTiny = 1e-12;
const double kNaN = std::numeric_limits<double>::quiet_NaN();
const double kInf = std::numeric_limits<double>::infinity();
double toRadians(double degrees) { return degrees * kPi / 180.0; }
}

InclinedPlaneSimulation::InclinedPlaneSimulation()
    : Simulation(), environment_(Environment::kEarthGravity), angleDeg_(30.0), mass_(5.0), muS_(0.5), muK_(0.3),
      applied_(0.0), s_(kStartDistance), v_(0.0), a_(0.0), regime_(Regime::AtRest), frictionHeat_(0.0),
      appliedWork_(0.0), endTime_(kNaN), endSpeed_(kNaN),
      recorder_({"t", "s", "v", "a", "ke", "pe", "e", "heat"}, {"s", "m", "m/s", "m/s\xC2\xB2", "J", "J", "J", "J"},
                kSeriesCapacity) {
    initialize();
}

// ---- validated setters ------------------------------------------------
void InclinedPlaneSimulation::setAngleDegrees(double d) {
    if (!std::isfinite(d) || d < 0.0 || d > 80.0) throw InvalidSimulationException("incline angle must be between 0 and 80 degrees.");
    angleDeg_ = d;
}
void InclinedPlaneSimulation::setMass(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 50.0) throw InvalidMassException("mass must be between 0.1 and 50 kg.");
    mass_ = m;
}
void InclinedPlaneSimulation::setStaticFriction(double mu) {
    if (!std::isfinite(mu) || mu < 0.0 || mu > 1.5) throw InvalidSimulationException("static friction must be between 0 and 1.5.");
    muS_ = mu;
    if (muK_ > muS_) muK_ = muS_; // kinetic friction never exceeds static friction
}
void InclinedPlaneSimulation::setKineticFriction(double mu) {
    if (!std::isfinite(mu) || mu < 0.0 || mu > 1.5) throw InvalidSimulationException("kinetic friction must be between 0 and 1.5.");
    muK_ = std::min(mu, muS_);
}
void InclinedPlaneSimulation::setGravity(double g) {
    if (!std::isfinite(g) || g < 0.1 || g > 30.0) throw InvalidSimulationException("gravity must be between 0.1 and 30 m/s^2.");
    environment_.setGravity(g);
}
void InclinedPlaneSimulation::setAppliedForce(double f) {
    if (!std::isfinite(f) || std::fabs(f) > 100.0) throw InvalidSimulationException("applied force must be between -100 and 100 N.");
    applied_ = f;
}

std::vector<ParameterSpec> InclinedPlaneSimulation::parameterSpecs() const {
    return {
        {"angle", "Incline angle", "\xC2\xB0", 0.0, 80.0, 0.5, 30.0},
        {"mass", "Block mass", "kg", 0.1, 50.0, 0.1, 5.0},
        {"mu_s", "Static friction \xCE\xBCs", "", 0.0, 1.5, 0.01, 0.5},
        {"mu_k", "Kinetic friction \xCE\xBCk", "", 0.0, 1.5, 0.01, 0.3},
        {"gravity", "Gravity", "m/s\xC2\xB2", 0.1, 30.0, 0.01, Environment::kEarthGravity},
        {"applied", "Applied force (up slope +)", "N", -100.0, 100.0, 1.0, 0.0},
    };
}

double InclinedPlaneSimulation::getParameter(const std::string& name) const {
    if (name == "angle") return angleDeg_;
    if (name == "mass") return mass_;
    if (name == "mu_s") return muS_;
    if (name == "mu_k") return muK_;
    if (name == "gravity") return environment_.getGravity();
    if (name == "applied") return applied_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for incline.");
}

void InclinedPlaneSimulation::applyParameter(const std::string& name, double value) {
    if (name == "angle") setAngleDegrees(value);
    else if (name == "mass") setMass(value);
    else if (name == "mu_s") setStaticFriction(value);
    else if (name == "mu_k") setKineticFriction(value);
    else if (name == "gravity") setGravity(value);
    else if (name == "applied") setAppliedForce(value);
}

// ---- forces along the slope -------------------------------------------
double InclinedPlaneSimulation::normalForce() const {
    return mass_ * environment_.getGravity() * std::cos(toRadians(angleDeg_));
}

double InclinedPlaneSimulation::pullAlongSlope() const {
    return applied_ - mass_ * environment_.getGravity() * std::sin(toRadians(angleDeg_));
}

bool InclinedPlaneSimulation::sticks() const {
    return std::fabs(v_) < kTiny && std::fabs(pullAlongSlope()) <= muS_ * normalForce() + kTiny;
}

double InclinedPlaneSimulation::frictionAlongSlope() const {
    const double pull = pullAlongSlope();
    if (sticks()) return -pull; // static friction exactly cancels the pull
    const double direction = std::fabs(v_) >= kTiny ? sign(v_) : sign(pull);
    return -direction * muK_ * normalForce();
}

double InclinedPlaneSimulation::potentialEnergy() const {
    return mass_ * environment_.getGravity() * s_ * std::sin(toRadians(angleDeg_));
}

// ---- closed-form results from rest ------------------------------------
InclineResults InclinedPlaneSimulation::analytic() const {
    const double g = environment_.getGravity();
    const double t = toRadians(angleDeg_);
    InclineResults r;
    r.normalForce = mass_ * g * std::cos(t);
    r.weightAlongSlope = mass_ * g * std::sin(t);
    r.weightPerpendicular = r.normalForce;
    r.maxStaticFriction = muS_ * r.normalForce;
    r.kineticFriction = muK_ * r.normalForce;
    r.criticalAngleDeg = std::atan(muS_) * 180.0 / kPi;
    const double pull = applied_ - r.weightAlongSlope;
    r.slides = std::fabs(pull) > r.maxStaticFriction + kTiny;
    if (!r.slides) {
        r.frictionAlongSlope = -pull;
        r.netForceAlongSlope = 0.0;
        r.acceleration = 0.0;
        r.direction = "none";
        return r;
    }
    r.frictionAlongSlope = -sign(pull) * r.kineticFriction;
    r.netForceAlongSlope = pull + r.frictionAlongSlope;
    r.acceleration = r.netForceAlongSlope / mass_;
    r.direction = pull > 0.0 ? "up" : "down";
    const double distance = pull > 0.0 ? kSlopeLength - kStartDistance : kStartDistance;
    r.timeToEnd = std::sqrt(2.0 * distance / std::fabs(r.acceleration));
    r.speedAtEnd = std::fabs(r.acceleration) * r.timeToEnd;
    return r;
}

// ---- lifecycle ----------------------------------------------------------
void InclinedPlaneSimulation::initialize() {
    resetClock();
    s_ = kStartDistance;
    v_ = 0.0;
    a_ = 0.0;
    regime_ = Regime::AtRest;
    frictionHeat_ = 0.0;
    appliedWork_ = 0.0;
    endTime_ = kNaN;
    endSpeed_ = kNaN;
    initialMechanical_ = kineticEnergy() + potentialEnergy();
    recorder_.clear();
    // The very first acceleration shown is the one that will act at release.
    a_ = sticks() ? 0.0 : (pullAlongSlope() + frictionAlongSlope()) / mass_;
    record();
}

// Earliest time in (0, within] at which s(t) = s + v t + a t^2 / 2 reaches an
// end of the slope. Returns +inf if it does not; *target is set to 0 or the length.
double InclinedPlaneSimulation::earliestHit(double a, double v, double within, double* target) const {
    double best = kInf;
    const double ends[2] = {0.0, kSlopeLength};
    for (double end : ends) {
        const double c = s_ - end; // solve a t^2 / 2 + v t + c = 0
        double t = kInf;
        if (std::fabs(a) < 1e-14) {
            if (std::fabs(v) > 1e-14) t = -c / v;
        } else {
            const double disc = v * v - 2.0 * a * c;
            if (disc >= 0.0) {
                const double root = std::sqrt(disc);
                const double t1 = (-v - root) / a;
                const double t2 = (-v + root) / a;
                t = kInf;
                for (double cand : {t1, t2}) {
                    if (cand > 1e-15 && cand < t) t = cand;
                }
            }
        }
        if (t > 1e-15 && t <= within + 1e-15 && t < best) {
            best = t;
            *target = end;
        }
    }
    return best;
}

void InclinedPlaneSimulation::update(double dt) {
    if (!(dt > 0.0) || isFinished()) return;

    const double pull = pullAlongSlope();
    const double normal = normalForce();
    double remaining = dt;

    for (int guard = 0; guard < 8 && remaining > 0.0 && !isFinished(); ++guard) {
        if (sticks()) {
            a_ = 0.0;
            regime_ = Regime::AtRest;
            addTime(remaining);
            remaining = 0.0;
            break;
        }

        // Moving (or about to move): kinetic friction opposes the motion.
        const double direction = std::fabs(v_) >= kTiny ? sign(v_) : sign(pull);
        const double friction = -direction * muK_ * normal;
        const double a = (pull + friction) / mass_;
        a_ = a;
        regime_ = Regime::Sliding;

        // Does the velocity return to zero inside this regime?
        const double stopTime = (std::fabs(v_) >= kTiny && a * v_ < 0.0) ? -v_ / a : kInf;
        double h = std::min(remaining, stopTime);

        double endTarget = 0.0;
        const double hitTime = earliestHit(a, v_, h, &endTarget);
        const bool hitsEnd = hitTime <= h;
        if (hitsEnd) h = hitTime;

        const double sBefore = s_;
        s_ += v_ * h + 0.5 * a * h * h;
        v_ += a * h;
        const double travelled = s_ - sBefore;
        appliedWork_ += applied_ * travelled;
        frictionHeat_ += std::fabs(friction) * std::fabs(travelled); // direction is constant inside a regime
        addTime(h);
        remaining -= h;

        if (hitsEnd) {
            s_ = endTarget;
            endTime_ = time();
            endSpeed_ = std::fabs(v_);
            regime_ = endTarget <= 0.0 ? Regime::ReachedBottom : Regime::ReachedTop;
            break;
        }
        if (h == stopTime) v_ = 0.0; // exact stop; the loop re-tests static friction
    }
    if (recorder_.due(time()) || isFinished()) record();
}

void InclinedPlaneSimulation::record() {
    recorder_.push(time(), {time(), s_, v_, a_, kineticEnergy(), potentialEnergy(),
                            kineticEnergy() + potentialEnergy(), frictionHeat_});
}

// ---- free-body diagram ----------------------------------------------------
std::vector<ForceVector> InclinedPlaneSimulation::forces() const {
    const double g = environment_.getGravity();
    const double t = toRadians(angleDeg_);
    const Vector2D up(std::cos(t), std::sin(t));       // up the slope
    const Vector2D normal(-std::sin(t), std::cos(t));  // away from the surface
    const double weight = mass_ * g;

    std::vector<ForceVector> list = {
        {"Weight", "W = mg", ForceKind::Gravity, Vector2D(0.0, -weight), false},
        {"Normal", "N", ForceKind::Normal, normal * normalForce(), false},
    };
    const double friction = frictionAlongSlope();
    if (std::fabs(friction) > kTiny) {
        list.push_back({sticks() ? "Static friction" : "Kinetic friction", sticks() ? "fs" : "fk",
                        ForceKind::Friction, up * friction, false});
    }
    if (std::fabs(applied_) > kTiny) list.push_back({"Applied force", "F", ForceKind::Applied, up * applied_, false});
    // components of the weight, drawn dashed and left out of the resultant
    list.push_back({"Weight along slope", "mg sin \xCE\xB8", ForceKind::Gravity, up * (-weight * std::sin(t)), true});
    list.push_back({"Weight into surface", "mg cos \xCE\xB8", ForceKind::Gravity, normal * (-weight * std::cos(t)), true});
    return list;
}

// ---- JSON ---------------------------------------------------------------
namespace {
const char* regimeName(InclinedPlaneSimulation::Regime r) {
    switch (r) {
        case InclinedPlaneSimulation::Regime::AtRest: return "static";
        case InclinedPlaneSimulation::Regime::Sliding: return "sliding";
        case InclinedPlaneSimulation::Regime::ReachedBottom: return "bottom";
        case InclinedPlaneSimulation::Regime::ReachedTop: return "top";
    }
    return "static";
}
}

std::string InclinedPlaneSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double t = toRadians(angleDeg_);
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    std::ostringstream out;
    out << "{\"type\":\"incline\",\"time\":" << num(time()) << ",\"finished\":" << (isFinished() ? "true" : "false")
        << ",\"regime\":" << quote(regimeName(regime_)) << ",\"s\":" << num(s_) << ",\"v\":" << num(v_)
        << ",\"a\":" << num(a_) << ",\"position\":{\"x\":" << num(s_ * std::cos(t)) << ",\"y\":" << num(s_ * std::sin(t))
        << "},\"energy\":{\"kinetic\":" << num(ke) << ",\"potential\":" << num(pe) << ",\"mechanical\":" << num(ke + pe)
        << ",\"frictionHeat\":" << num(frictionHeat_) << ",\"appliedWork\":" << num(appliedWork_)
        << ",\"initial\":" << num(initialMechanical_)
        << ",\"accountingError\":" << num(ke + pe + frictionHeat_ - appliedWork_ - initialMechanical_) << "},\"measured\":{\"timeToEnd\":" << num(endTime_) << ",\"speedAtEnd\":" << num(endSpeed_) << "}}";
    return out.str();
}

std::string InclinedPlaneSimulation::infoJSON() const {
    using namespace JsonUtil;
    const InclineResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"incline\",\"parameters\":" << parametersJSON() << ",\"slope\":{\"length\":" << num(kSlopeLength)
        << ",\"startDistance\":" << num(kStartDistance) << "},\"analytic\":{\"normalForce\":" << num(r.normalForce)
        << ",\"weightAlongSlope\":" << num(r.weightAlongSlope) << ",\"weightPerpendicular\":" << num(r.weightPerpendicular)
        << ",\"maxStaticFriction\":" << num(r.maxStaticFriction) << ",\"kineticFriction\":" << num(r.kineticFriction)
        << ",\"criticalAngleDeg\":" << num(r.criticalAngleDeg) << ",\"netForce\":" << num(r.netForceAlongSlope)
        << ",\"friction\":" << num(r.frictionAlongSlope) << ",\"acceleration\":" << num(r.acceleration)
        << ",\"slides\":" << (r.slides ? "true" : "false") << ",\"direction\":" << quote(r.direction)
        << ",\"timeToEnd\":" << num(r.slides ? r.timeToEnd : kNaN)
        << ",\"speedAtEnd\":" << num(r.slides ? r.speedAtEnd : kNaN) << "}}";
    return out.str();
}
