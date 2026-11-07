#include "SHMSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace {
constexpr double kPi = 3.14159265358979323846;
}

SHMSimulation::SHMSimulation()
    : OscillatorSimulation({"t", "x", "v", "a", "ke", "pe", "e"}, {"s", "m", "m/s", "m/s\xC2\xB2", "J", "J", "J"}),
      mass_(1.0), springK_(25.0), x0_(2.0), x_(0.0), v_(0.0) {
    initialize();
}

void SHMSimulation::setMass(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 20.0) throw InvalidMassException("mass must be between 0.1 and 20 kg.");
    mass_ = m;
}
void SHMSimulation::setSpringConstant(double k) {
    if (!std::isfinite(k) || k < 1.0 || k > 200.0) {
        throw InvalidSimulationException("spring constant must be between 1 and 200 N/m.");
    }
    springK_ = k;
}
void SHMSimulation::setInitialDisplacement(double x) {
    if (!std::isfinite(x) || std::fabs(x) > 5.0) {
        throw InvalidSimulationException("initial displacement must be between -5 and 5 m.");
    }
    x0_ = x;
}

std::vector<ParameterSpec> SHMSimulation::parameterSpecs() const {
    return {
        {"mass", "Mass", "kg", 0.1, 20.0, 0.1, 1.0},
        {"k", "Spring constant", "N/m", 1.0, 200.0, 1.0, 25.0},
        {"displacement", "Initial displacement", "m", -5.0, 5.0, 0.1, 2.0},
    };
}

double SHMSimulation::getParameter(const std::string& name) const {
    if (name == "mass") return mass_;
    if (name == "k") return springK_;
    if (name == "displacement") return x0_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for shm.");
}

void SHMSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass") setMass(value);
    else if (name == "k") setSpringConstant(value);
    else if (name == "displacement") setInitialDisplacement(value);
}

SHMResults SHMSimulation::analytic() const {
    SHMResults r;
    r.omega = std::sqrt(springK_ / mass_);
    r.period = 2.0 * kPi / r.omega;
    r.frequency = 1.0 / r.period;
    r.amplitude = std::fabs(x0_);
    r.maxSpeed = r.omega * r.amplitude;
    r.maxAcceleration = r.omega * r.omega * r.amplitude;
    r.maxForce = springK_ * r.amplitude;
    r.totalEnergy = 0.5 * springK_ * r.amplitude * r.amplitude;
    return r;
}

std::vector<double> SHMSimulation::currentSample() const {
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    return {time(), x_, v_, acceleration(), ke, pe, ke + pe};
}

void SHMSimulation::initialize() {
    resetClock();
    clearRecording();
    x_ = x0_; // released from rest at the initial displacement
    v_ = 0.0;
    initialEnergy_ = kineticEnergy() + potentialEnergy();
    trackCrossing(x_);
    pushSample(currentSample());
}

void SHMSimulation::update(double dt) {
    if (!(dt > 0.0)) return;
    const double omega = std::sqrt(springK_ / mass_);
    const int substeps = std::max(1, static_cast<int>(std::ceil(omega * dt / 0.02)));
    const double h = dt / substeps;
    double a = acceleration();
    for (int i = 0; i < substeps; ++i) {
        // velocity Verlet: half kick, drift, recompute force, half kick
        v_ += 0.5 * a * h;
        x_ += v_ * h;
        a = acceleration();
        v_ += 0.5 * a * h;
        addTime(h);
        trackCrossing(x_);
    }
    if (sampleDue()) pushSample(currentSample());
}

std::string SHMSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    std::ostringstream out;
    out << "{\"type\":\"shm\",\"time\":" << num(time()) << ",\"finished\":false"
        << ",\"x\":" << num(x_) << ",\"v\":" << num(v_) << ",\"a\":" << num(acceleration())
        << ",\"force\":" << num(force())
        << ",\"energy\":{\"kinetic\":" << num(ke) << ",\"potential\":" << num(pe) << ",\"total\":" << num(ke + pe) << ",\"initial\":" << num(initialEnergy_)
        << ",\"drift\":" << num(relativeDrift(ke + pe, initialEnergy_)) << "}"
        << ",\"measuredPeriod\":" << num(measuredPeriod()) << "}";
    return out.str();
}

std::string SHMSimulation::infoJSON() const {
    using namespace JsonUtil;
    const SHMResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"shm\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{\"omega\":" << num(r.omega) << ",\"period\":" << num(r.period)
        << ",\"frequency\":" << num(r.frequency) << ",\"amplitude\":" << num(r.amplitude)
        << ",\"maxSpeed\":" << num(r.maxSpeed) << ",\"maxAcceleration\":" << num(r.maxAcceleration)
        << ",\"maxForce\":" << num(r.maxForce) << ",\"totalEnergy\":" << num(r.totalEnergy) << "}}";
    return out.str();
}

// Horizontal frictionless surface: weight and the normal reaction cancel, so
// the spring force F = -kx is the whole resultant.
std::vector<ForceVector> SHMSimulation::forces() const {
    const double weight = mass_ * kGravity;
    return {
        {"Weight", "W = mg", ForceKind::Gravity, Vector2D(0.0, -weight), false},
        {"Normal", "N", ForceKind::Normal, Vector2D(0.0, weight), false},
        {"Spring force", "F = -kx", ForceKind::Spring, Vector2D(force(), 0.0), false},
    };
}
