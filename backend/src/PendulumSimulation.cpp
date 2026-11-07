#include "PendulumSimulation.h"
#include "Exceptions.h"
#include "Integrators.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace {
constexpr double kPi = 3.14159265358979323846;
constexpr double kMaxAngleDeg = 170.0;
double toRadians(double degrees) { return degrees * kPi / 180.0; }
}

PendulumSimulation::PendulumSimulation()
    : OscillatorSimulation({"t", "theta", "omega", "alpha", "ke", "pe", "e"},
                           {"s", "rad", "rad/s", "rad/s\xC2\xB2", "J", "J", "J"}),
      environment_(Environment::kEarthGravity), length_(1.0), mass_(1.0),
      angle0Deg_(30.0), state_{0.0, 0.0} {
    initialize();
}

void PendulumSimulation::setLength(double L) {
    if (!std::isfinite(L) || L < 0.2 || L > 5.0) throw InvalidSimulationException("length must be between 0.2 and 5 m.");
    length_ = L;
}
void PendulumSimulation::setMass(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 10.0) throw InvalidMassException("bob mass must be between 0.1 and 10 kg.");
    mass_ = m;
}
void PendulumSimulation::setInitialAngleDegrees(double deg) {
    if (!std::isfinite(deg) || std::fabs(deg) > kMaxAngleDeg) {
        throw InvalidSimulationException("initial angle must be between -170 and 170 degrees.");
    }
    angle0Deg_ = deg;
}
void PendulumSimulation::setGravity(double g) {
    if (!std::isfinite(g) || g < 0.1 || g > 30.0) throw InvalidSimulationException("gravity must be between 0.1 and 30 m/s^2.");
    environment_.setGravity(g);
}

std::vector<ParameterSpec> PendulumSimulation::parameterSpecs() const {
    return {
        {"length", "Pendulum length", "m", 0.2, 5.0, 0.05, 1.0},
        {"mass", "Bob mass", "kg", 0.1, 10.0, 0.1, 1.0},
        {"angle", "Initial angle", "\xC2\xB0", -kMaxAngleDeg, kMaxAngleDeg, 1.0, 30.0},
        {"gravity", "Gravity", "m/s\xC2\xB2", 0.1, 30.0, 0.01, Environment::kEarthGravity},
    };
}

double PendulumSimulation::getParameter(const std::string& name) const {
    if (name == "length") return length_;
    if (name == "mass") return mass_;
    if (name == "angle") return angle0Deg_;
    if (name == "gravity") return environment_.getGravity();
    throw InvalidSimulationException("unknown parameter '" + name + "' for pendulum.");
}

void PendulumSimulation::applyParameter(const std::string& name, double value) {
    if (name == "length") setLength(value);
    else if (name == "mass") setMass(value);
    else if (name == "angle") setInitialAngleDegrees(value);
    else if (name == "gravity") setGravity(value);
}

PendulumResults PendulumSimulation::analytic() const {
    const double g = environment_.getGravity();
    const double theta0 = toRadians(angle0Deg_);
    PendulumResults r;
    r.omega0 = std::sqrt(g / length_);
    r.smallAnglePeriod = 2.0 * kPi / r.omega0;
    r.exactPeriod = 4.0 * std::sqrt(length_ / g) * ellipticK(std::sin(std::fabs(theta0) / 2.0));
    r.maxSpeed = std::sqrt(2.0 * g * length_ * (1.0 - std::cos(theta0)));
    r.maxTension = mass_ * g * (3.0 - 2.0 * std::cos(theta0));
    r.totalEnergy = mass_ * g * length_ * (1.0 - std::cos(theta0));
    return r;
}

double PendulumSimulation::angularAcceleration() const {
    return -(environment_.getGravity() / length_) * std::sin(state_[0]);
}
double PendulumSimulation::kineticEnergy() const {
    const double v = length_ * state_[1];
    return 0.5 * mass_ * v * v;
}
double PendulumSimulation::potentialEnergy() const {
    return mass_ * environment_.getGravity() * length_ * (1.0 - std::cos(state_[0]));
}
double PendulumSimulation::tension() const {
    // Radial balance: T - m g cos(theta) = m L omega^2
    return mass_ * (environment_.getGravity() * std::cos(state_[0]) + length_ * state_[1] * state_[1]);
}

std::vector<double> PendulumSimulation::currentSample() const {
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    return {time(), state_[0], state_[1], angularAcceleration(), ke, pe, ke + pe};
}

void PendulumSimulation::initialize() {
    resetClock();
    clearRecording();
    state_ = {toRadians(angle0Deg_), 0.0}; // released from rest
    initialEnergy_ = kineticEnergy() + potentialEnergy();
    trackCrossing(state_[0]);
    pushSample(currentSample());
}

void PendulumSimulation::update(double dt) {
    if (!(dt > 0.0)) return;
    const double g = environment_.getGravity();
    const double L = length_;
    // Substeps keep omega0 * h <= 0.05 even for short rods under strong gravity.
    const double omega0 = std::sqrt(g / L);
    const int substeps = std::max(1, static_cast<int>(std::ceil(omega0 * dt / 0.05)));
    const double h = dt / substeps;

    auto derivative = [g, L](double, const std::array<double, 2>& y) {
        return std::array<double, 2>{y[1], -(g / L) * std::sin(y[0])};
    };
    for (int i = 0; i < substeps; ++i) {
        state_ = rk4Step<2>(state_, time(), h, derivative);
        addTime(h);
        trackCrossing(state_[0]);
    }
    if (sampleDue()) pushSample(currentSample());
}

std::string PendulumSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    std::ostringstream out;
    out << "{\"type\":\"pendulum\",\"time\":" << num(time()) << ",\"finished\":false"
        << ",\"theta\":" << num(state_[0]) << ",\"thetaDeg\":" << num(state_[0] * 180.0 / kPi)
        << ",\"omega\":" << num(state_[1]) << ",\"alpha\":" << num(angularAcceleration())
        << ",\"bob\":{\"x\":" << num(length_ * std::sin(state_[0])) << ",\"y\":" << num(-length_ * std::cos(state_[0])) << "}"
        << ",\"speed\":" << num(length_ * std::fabs(state_[1])) << ",\"tension\":" << num(tension())
        << ",\"energy\":{\"kinetic\":" << num(ke) << ",\"potential\":" << num(pe) << ",\"total\":" << num(ke + pe) << ",\"initial\":" << num(initialEnergy_)
        << ",\"drift\":" << num(relativeDrift(ke + pe, initialEnergy_)) << "}"
        << ",\"measuredPeriod\":" << num(measuredPeriod()) << "}";
    return out.str();
}

std::string PendulumSimulation::infoJSON() const {
    using namespace JsonUtil;
    const PendulumResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"pendulum\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{\"omega0\":" << num(r.omega0) << ",\"smallAnglePeriod\":" << num(r.smallAnglePeriod)
        << ",\"exactPeriod\":" << num(r.exactPeriod) << ",\"maxSpeed\":" << num(r.maxSpeed)
        << ",\"maxTension\":" << num(r.maxTension) << ",\"totalEnergy\":" << num(r.totalEnergy) << "}}";
    return out.str();
}

// Weight and rod tension, plus the two components of the weight. The bob is at
// (L sin t, -L cos t) from the pivot, so the rod direction toward the pivot is
// (-sin t, cos t) and the direction of increasing angle is (cos t, sin t).
std::vector<ForceVector> PendulumSimulation::forces() const {
    const double g = environment_.getGravity();
    const double s = std::sin(state_[0]);
    const double c = std::cos(state_[0]);
    const Vector2D towardPivot(-s, c);
    const Vector2D outward(s, -c);
    const Vector2D tangent(c, s);
    const double weight = mass_ * g;
    return {
        {"Weight", "W = mg", ForceKind::Gravity, Vector2D(0.0, -weight), false},
        {"Tension", "T", ForceKind::Tension, towardPivot * tension(), false},
        // components of the weight: radial (stretches the rod) and tangential (restoring)
        {"Weight along rod", "mg cos \xCE\xB8", ForceKind::Gravity, outward * (weight * c), true},
        {"Weight along arc", "mg sin \xCE\xB8", ForceKind::Gravity, tangent * (-weight * s), true},
    };
}
