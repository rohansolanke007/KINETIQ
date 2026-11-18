#include "RotationalDynamicsSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace {
[[maybe_unused]] constexpr double kPi = 3.14159265358979323846;

// Human-readable shape labels for infoJSON().
const char* shapeLabel(int id) {
    switch (id) {
        case 0: return "Solid disc";
        case 1: return "Solid cylinder";
        case 2: return "Solid sphere";
        case 3: return "Hollow sphere";
        case 4: return "Thin ring";
        case 5: return "Thin rod (centre)";
        case 6: return "Thin rod (end)";
        default: return "Unknown";
    }
}

// Moment-of-inertia formula label for infoJSON().
const char* shapeFormula(int id) {
    switch (id) {
        case 0: return "I = \xC2\xBD MR\xC2\xB2";
        case 1: return "I = \xC2\xBD MR\xC2\xB2";
        case 2: return "I = \xE2\x85\x95 MR\xC2\xB2";
        case 3: return "I = \xE2\x85\x94 MR\xC2\xB2";
        case 4: return "I = MR\xC2\xB2";
        case 5: return "I = ML\xC2\xB2/12";
        case 6: return "I = ML\xC2\xB2/3";
        default: return "?";
    }
}
} // namespace

// ----- Constructor -----------------------------------------------------

RotationalDynamicsSimulation::RotationalDynamicsSimulation()
    : Simulation(1.0 / 240.0),
      mass_(4.0), radius_(2.0), force_(10.0), forceAngleDeg_(90.0),
      omega0_(0.0), shapeId_(0),
      theta_(0.0), omega_(0.0),
      recorder_(
          {"t", "theta", "omega", "alpha", "torque", "KE", "L"},
          {"s", "rad", "rad/s", "rad/s\xC2\xB2", "N\xC2\xB7m", "J", "kg\xC2\xB7m\xC2\xB2/s"},
          kSeriesCapacity)
{
    initialize();
}

// ----- Moment of inertia ----------------------------------------------

double RotationalDynamicsSimulation::momentOfInertia() const {
    const double M = mass_;
    const double R = radius_;
    switch (static_cast<BodyShape>(shapeId_)) {
        case BodyShape::SolidDisc:      return 0.5  * M * R * R;         // ½MR²
        case BodyShape::SolidCylinder:  return 0.5  * M * R * R;         // ½MR²
        case BodyShape::SolidSphere:    return 0.4  * M * R * R;         // ⅖MR²
        case BodyShape::HollowSphere:   return (2.0 / 3.0) * M * R * R; // ⅔MR²
        case BodyShape::ThinRing:       return M * R * R;                 // MR²
        case BodyShape::ThinRodCentre:  return M * R * R / 12.0;         // ML²/12 (R = L)
        case BodyShape::ThinRodEnd:     return M * R * R / 3.0;          // ML²/3  (R = L)
        default:                        return 0.5 * M * R * R;
    }
}

// ----- Torque & alpha -------------------------------------------------

double RotationalDynamicsSimulation::computeTorque() const {
    const double angleRad = forceAngleDeg_ * kPi / 180.0;
    // tau = r * F * sin(theta_angle)
    return radius_ * force_ * std::sin(angleRad);
}

double RotationalDynamicsSimulation::computeAlpha() const {
    const double I = momentOfInertia();
    if (I < 1e-12) return 0.0;
    return computeTorque() / I; // alpha = tau / I
}

// ----- Parameter specs ------------------------------------------------

std::vector<ParameterSpec> RotationalDynamicsSimulation::parameterSpecs() const {
    return {
        {"mass",          "Mass",                  "kg",                 0.1,  50.0,  0.1,    4.0},
        {"radius",        "Radius / Length",       "m",                  0.1,   5.0,  0.05,   2.0},
        {"force",         "Applied force",         "N",                  0.0, 500.0,  1.0,   10.0},
        {"forceAngle",    "Force angle",           "\xC2\xB0",           0.0, 360.0,  1.0,   90.0},
        {"omega0",        "Initial \xcf\x89",      "rad/s",              0.0,  20.0,  0.1,    0.0},
        {"shape",         "Body shape (0-6)",      "",                   0.0,   6.0,  1.0,    0.0},
    };
}

double RotationalDynamicsSimulation::getParameter(const std::string& name) const {
    if (name == "mass")       return mass_;
    if (name == "radius")     return radius_;
    if (name == "force")      return force_;
    if (name == "forceAngle") return forceAngleDeg_;
    if (name == "omega0")     return omega0_;
    if (name == "shape")      return static_cast<double>(shapeId_);
    throw InvalidSimulationException("unknown parameter '" + name + "' for rotational.");
}

void RotationalDynamicsSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass") {
        if (!std::isfinite(value) || value < 0.1 || value > 50.0)
            throw InvalidMassException("mass must be between 0.1 and 50 kg.");
        mass_ = value;
    } else if (name == "radius") {
        if (!std::isfinite(value) || value < 0.1 || value > 5.0)
            throw InvalidSimulationException("radius must be between 0.1 and 5 m.");
        radius_ = value;
    } else if (name == "force") {
        if (!std::isfinite(value) || value < 0.0 || value > 500.0)
            throw InvalidSimulationException("force must be between 0 and 500 N.");
        force_ = value;
    } else if (name == "forceAngle") {
        if (!std::isfinite(value) || value < 0.0 || value > 360.0)
            throw InvalidSimulationException("force angle must be between 0 and 360 degrees.");
        forceAngleDeg_ = value;
    } else if (name == "omega0") {
        if (!std::isfinite(value) || value < 0.0 || value > 20.0)
            throw InvalidSimulationException("initial omega must be between 0 and 20 rad/s.");
        omega0_ = value;
    } else if (name == "shape") {
        const int s = static_cast<int>(std::round(value));
        if (s < 0 || s > 6)
            throw InvalidSimulationException("shape must be between 0 and 6.");
        shapeId_ = s;
    }
}

// ----- Analytic results -----------------------------------------------

RotationalDynamicsResults RotationalDynamicsSimulation::analytic() const {
    RotationalDynamicsResults r;
    r.momentOfInertia  = momentOfInertia();
    r.torque           = computeTorque();
    r.angularAccel     = computeAlpha();
    r.angularMomentum  = r.momentOfInertia * omega_;
    r.rotKineticEnergy = 0.5 * r.momentOfInertia * omega_ * omega_;
    r.rotPower         = r.torque * omega_;
    r.workDone         = r.torque * theta_;
    return r;
}

// ----- Simulation loop ------------------------------------------------

std::vector<double> RotationalDynamicsSimulation::currentSample() const {
    const double I     = momentOfInertia();
    const double tau   = computeTorque();
    const double alpha = computeAlpha();
    const double KE    = 0.5 * I * omega_ * omega_;
    const double L     = I * omega_;
    return {time(), theta_, omega_, alpha, tau, KE, L};
}

void RotationalDynamicsSimulation::initialize() {
    resetClock();
    recorder_.clear();
    omega_ = omega0_;
    theta_ = 0.0;
    recorder_.push(0.0, currentSample());
}

void RotationalDynamicsSimulation::update(double dt) {
    if (!(dt > 0.0)) return;

    const double alpha = computeAlpha();

    // Velocity Verlet integration (constant torque → constant alpha)
    // theta(t+h) = theta(t) + omega(t)*h + 0.5*alpha*h^2
    // omega(t+h) = omega(t) + alpha*h
    const double h = dt; // fixedDt is already 1/240 s — no need for further substeps
    theta_ += omega_ * h + 0.5 * alpha * h * h;
    omega_ += alpha * h;
    addTime(h);

    if (recorder_.due(time())) {
        recorder_.push(time(), currentSample());
    }
}

// ----- JSON snapshots -------------------------------------------------

std::string RotationalDynamicsSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double I     = momentOfInertia();
    const double tau   = computeTorque();
    const double alpha = computeAlpha();
    const double KE    = 0.5 * I * omega_ * omega_;
    const double L     = I * omega_;
    const double P     = tau * omega_;
    const double W     = tau * theta_;
    std::ostringstream out;
    out << "{\"type\":\"rotational\",\"time\":" << num(time()) << ",\"finished\":false"
        << ",\"theta\":"    << num(theta_)
        << ",\"thetaDeg\":" << num(theta_ * 180.0 / kPi)
        << ",\"omega\":"    << num(omega_)
        << ",\"alpha\":"    << num(alpha)
        << ",\"torque\":"   << num(tau)
        << ",\"I\":"        << num(I)
        << ",\"L\":"        << num(L)
        << ",\"KE\":"       << num(KE)
        << ",\"P\":"        << num(P)
        << ",\"W\":"        << num(W)
        << ",\"shapeId\":"  << shapeId_
        << "}";
    return out.str();
}

std::string RotationalDynamicsSimulation::infoJSON() const {
    using namespace JsonUtil;
    const double I     = momentOfInertia();
    const double tau   = computeTorque();
    const double alpha = computeAlpha();
    std::ostringstream out;
    out << "{\"type\":\"rotational\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{"
        << "\"momentOfInertia\":" << num(I)
        << ",\"torque\":"         << num(tau)
        << ",\"angularAccel\":"   << num(alpha)
        << ",\"shapeId\":"        << shapeId_
        << ",\"shapeLabel\":"     << quote(shapeLabel(shapeId_))
        << ",\"shapeFormula\":"   << quote(shapeFormula(shapeId_))
        << ",\"radius\":"         << num(radius_)
        << ",\"mass\":"           << num(mass_)
        << "}}";
    return out.str();
}

std::string RotationalDynamicsSimulation::seriesJSON(std::size_t maxRows) const {
    return recorder_.toJSON(maxRows);
}
