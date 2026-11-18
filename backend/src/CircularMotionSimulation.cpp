#include "CircularMotionSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

CircularMotionSimulation::CircularMotionSimulation()
    : Simulation(1.0 / 240.0),
      mass_(2.0), radius_(2.0), velocity_(4.0), alpha_(0.0),
      theta_(0.0), omega_(0.0),
      recorder_(
          {"t", "theta", "omega", "v", "ac", "Fc", "alpha"},
          {"s", "rad", "rad/s", "m/s", "m/s\xC2\xB2", "N", "rad/s\xC2\xB2"},
          kSeriesCapacity)
{
    initialize();
}

// ----- Parameter specs ------------------------------------------------

std::vector<ParameterSpec> CircularMotionSimulation::parameterSpecs() const {
    return {
        {"mass",     "Mass",                 "kg",     0.1,  20.0,  0.1,   2.0},
        {"radius",   "Radius",               "m",      0.1,  20.0,  0.1,   2.0},
        {"velocity", "Tangential velocity",  "m/s",    0.1,  50.0,  0.1,   4.0},
        {"alpha",    "Angular acceleration", "rad/s\xC2\xB2", 0.0, 10.0, 0.1, 0.0},
    };
}

double CircularMotionSimulation::getParameter(const std::string& name) const {
    if (name == "mass")     return mass_;
    if (name == "radius")   return radius_;
    if (name == "velocity") return velocity_;
    if (name == "alpha")    return alpha_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for circular.");
}

void CircularMotionSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass") {
        if (!std::isfinite(value) || value < 0.1 || value > 20.0)
            throw InvalidMassException("mass must be between 0.1 and 20 kg.");
        mass_ = value;
    } else if (name == "radius") {
        if (!std::isfinite(value) || value < 0.1 || value > 20.0)
            throw InvalidSimulationException("radius must be between 0.1 and 20 m.");
        radius_ = value;
    } else if (name == "velocity") {
        if (!std::isfinite(value) || value < 0.1 || value > 50.0)
            throw InvalidSimulationException("tangential velocity must be between 0.1 and 50 m/s.");
        velocity_ = value;
    } else if (name == "alpha") {
        if (!std::isfinite(value) || value < 0.0 || value > 10.0)
            throw InvalidSimulationException("angular acceleration must be between 0 and 10 rad/s^2.");
        alpha_ = value;
    }
}

// ----- Analytic results -----------------------------------------------

CircularMotionResults CircularMotionSimulation::analytic() const {
    CircularMotionResults r;
    // Guard against division by zero
    if (radius_ < 1e-9) return r;

    r.angularVelocity     = velocity_ / radius_;                      // omega = v / r
    r.tangentialVelocity  = velocity_;                                 // v
    r.centripetalAccel    = (velocity_ * velocity_) / radius_;         // a_c = v^2 / r
    r.centripetalForce    = mass_ * r.centripetalAccel;               // F_c = m a_c
    r.period              = (r.angularVelocity > 1e-12)
                                ? 2.0 * kPi / r.angularVelocity
                                : 0.0;                                 // T = 2pi/omega
    r.frequency           = (r.period > 1e-12) ? 1.0 / r.period : 0.0; // f = 1/T
    return r;
}

// ----- Simulation loop ------------------------------------------------

std::vector<double> CircularMotionSimulation::currentSample() const {
    const double v_now  = radius_ * omega_;          // v = r omega
    const double ac_now = radius_ * omega_ * omega_; // a_c = r omega^2
    const double Fc_now = mass_ * ac_now;             // F_c = m a_c
    return {time(), theta_, omega_, v_now, ac_now, Fc_now, alpha_};
}

void CircularMotionSimulation::initialize() {
    resetClock();
    recorder_.clear();
    // Initial angular velocity from the initial tangential velocity
    omega_ = (radius_ > 1e-9) ? (velocity_ / radius_) : 0.0;
    theta_ = 0.0;
    recorder_.push(0.0, currentSample());
}

void CircularMotionSimulation::update(double dt) {
    if (!(dt > 0.0)) return;

    // Velocity Verlet for constant alpha (or alpha = 0 for uniform motion)
    // omega(t+h) = omega(t) + alpha * h
    // theta(t+h) = theta(t) + omega(t) * h + 0.5 * alpha * h^2
    // For numerical stability, use substeps if needed.
    const int substeps = std::max(1, static_cast<int>(std::ceil(omega_ * dt / 0.05)));
    const double h = dt / substeps;

    for (int i = 0; i < substeps; ++i) {
        theta_ += omega_ * h + 0.5 * alpha_ * h * h;
        omega_ += alpha_ * h;
        // omega must stay non-negative in this model
        if (omega_ < 0.0) omega_ = 0.0;
        addTime(h);
    }

    if (recorder_.due(time())) {
        recorder_.push(time(), currentSample());
    }
}

// ----- JSON snapshots -------------------------------------------------

std::string CircularMotionSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double v_now  = radius_ * omega_;
    const double ac_now = radius_ * omega_ * omega_;
    const double Fc_now = mass_ * ac_now;
    // Position on the circle: x = r cos(theta), y = r sin(theta)
    const double px = radius_ * std::cos(theta_);
    const double py = radius_ * std::sin(theta_);
    // Tangential velocity direction: (-sin theta, cos theta)
    // Centripetal acceleration direction: toward centre (-cos theta, -sin theta)
    std::ostringstream out;
    out << "{\"type\":\"circular\",\"time\":" << num(time()) << ",\"finished\":false"
        << ",\"theta\":" << num(theta_)
        << ",\"thetaDeg\":" << num(theta_ * 180.0 / kPi)
        << ",\"omega\":" << num(omega_)
        << ",\"alpha\":" << num(alpha_)
        << ",\"v\":" << num(v_now)
        << ",\"ac\":" << num(ac_now)
        << ",\"Fc\":" << num(Fc_now)
        << ",\"pos\":{\"x\":" << num(px) << ",\"y\":" << num(py) << "}"
        << "}";
    return out.str();
}

std::string CircularMotionSimulation::infoJSON() const {
    using namespace JsonUtil;
    const CircularMotionResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"circular\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{"
        << "\"angularVelocity\":"    << num(r.angularVelocity)
        << ",\"tangentialVelocity\":" << num(r.tangentialVelocity)
        << ",\"centripetalAccel\":"  << num(r.centripetalAccel)
        << ",\"centripetalForce\":"  << num(r.centripetalForce)
        << ",\"period\":"            << num(r.period)
        << ",\"frequency\":"         << num(r.frequency)
        << ",\"radius\":"            << num(radius_)
        << ",\"mass\":"              << num(mass_)
        << "}}";
    return out.str();
}

std::string CircularMotionSimulation::seriesJSON(std::size_t maxRows) const {
    return recorder_.toJSON(maxRows);
}
