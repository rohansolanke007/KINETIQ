#include "AirResistanceSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

// ============================================================
// CONSTRUCTOR
// ============================================================

AirResistanceSimulation::AirResistanceSimulation()
    : Simulation(1.0 / 240.0),
      mass_(1.0), gravity_(9.81), initVy_(0.0), initHeight_(100.0),
      dragCoeff_(0.47), crossSection_(0.01), airDensity_(1.225),
      linearDrag_(1.0), dragMode_(2),
      projMode_(false), launchAngleDeg_(45.0), launchSpeed_(20.0),
      charLength_(0.1), dynViscosity_(1.81e-5),
      x_(0.0), y_(0.0), vx_(0.0), vy_(0.0), ax_(0.0), ay_(0.0),
      finished_(false),
      recorder_(
          {"t", "y", "vy", "ay", "vx", "ax", "Fd", "Fn", "Re"},
          {"s", "m", "m/s", "m/s\xC2\xB2", "m/s", "m/s\xC2\xB2", "N", "N", ""},
          kSeriesCapacity)
{
    initialize();
}

// ============================================================
// PARAMETER SPECS
// ============================================================

std::vector<ParameterSpec> AirResistanceSimulation::parameterSpecs() const {
    return {
        {"mass",          "Mass",                     "kg",        0.01,  100.0,  0.01,   1.0},
        {"gravity",       "Gravity g",                "m/s\xC2\xB2", 0.0, 25.0, 0.1,  9.81},
        {"initVy",        "Initial vertical velocity","m/s",      -50.0,   50.0,  0.5,   0.0},
        {"initHeight",    "Initial height",           "m",          1.0,  500.0,  1.0, 100.0},
        {"dragCoeff",     "Drag coefficient Cd",      "",           0.05,    2.0, 0.01,  0.47},
        {"crossSection",  "Cross-section area A",     "m\xC2\xB2",0.001,   5.0, 0.001, 0.01},
        {"airDensity",    "Air density \xcf\x81",     "kg/m\xC2\xB3", 0.1,2.0, 0.01, 1.225},
        {"linearDrag",    "Linear drag coeff b",      "kg/s",      0.001,  20.0, 0.001, 1.0},
        {"dragMode",      "Drag mode (0/1/2)",        "",           0.0,    2.0,  1.0,   2.0},
        // 2D projectile controls
        {"projMode",      "Projectile mode (0/1)",    "",           0.0,    1.0,  1.0,   0.0},
        {"launchAngle",   "Launch angle",             "\xC2\xB0",   0.0,   90.0,  1.0,  45.0},
        {"launchSpeed",   "Launch speed",             "m/s",        1.0,  200.0,  1.0,  20.0},
        // Reynolds number extras
        {"charLength",    "Characteristic length L",  "m",          0.001,  2.0, 0.001, 0.1},
        {"dynViscosity",  "Dynamic viscosity \xce\xbc","Pa\xC2\xB7s",1e-6,0.1,1e-6,1.81e-5},
    };
}

double AirResistanceSimulation::getParameter(const std::string& name) const {
    if (name == "mass")         return mass_;
    if (name == "gravity")      return gravity_;
    if (name == "initVy")       return initVy_;
    if (name == "initHeight")   return initHeight_;
    if (name == "dragCoeff")    return dragCoeff_;
    if (name == "crossSection") return crossSection_;
    if (name == "airDensity")   return airDensity_;
    if (name == "linearDrag")   return linearDrag_;
    if (name == "dragMode")     return static_cast<double>(dragMode_);
    if (name == "projMode")     return projMode_ ? 1.0 : 0.0;
    if (name == "launchAngle")  return launchAngleDeg_;
    if (name == "launchSpeed")  return launchSpeed_;
    if (name == "charLength")   return charLength_;
    if (name == "dynViscosity") return dynViscosity_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for drag.");
}

void AirResistanceSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass") {
        if (!std::isfinite(value) || value < 0.01 || value > 100.0)
            throw InvalidMassException("mass must be between 0.01 and 100 kg.");
        mass_ = value;
    } else if (name == "gravity") {
        if (!std::isfinite(value) || value < 0.0 || value > 25.0)
            throw InvalidSimulationException("gravity must be between 0 and 25 m/s².");
        gravity_ = value;
    } else if (name == "initVy") {
        if (!std::isfinite(value) || value < -50.0 || value > 50.0)
            throw InvalidSimulationException("initial vertical velocity must be in [-50, 50] m/s.");
        initVy_ = value;
    } else if (name == "initHeight") {
        if (!std::isfinite(value) || value < 1.0 || value > 500.0)
            throw InvalidSimulationException("initial height must be in [1, 500] m.");
        initHeight_ = value;
    } else if (name == "dragCoeff") {
        if (!std::isfinite(value) || value < 0.05 || value > 2.0)
            throw InvalidSimulationException("drag coefficient must be in [0.05, 2].");
        dragCoeff_ = value;
    } else if (name == "crossSection") {
        if (!std::isfinite(value) || value < 0.001 || value > 5.0)
            throw InvalidSimulationException("cross-section must be in [0.001, 5] m².");
        crossSection_ = value;
    } else if (name == "airDensity") {
        if (!std::isfinite(value) || value < 0.1 || value > 2.0)
            throw InvalidSimulationException("air density must be in [0.1, 2] kg/m³.");
        airDensity_ = value;
    } else if (name == "linearDrag") {
        if (!std::isfinite(value) || value < 0.001 || value > 20.0)
            throw InvalidSimulationException("linear drag coefficient must be in [0.001, 20] kg/s.");
        linearDrag_ = value;
    } else if (name == "dragMode") {
        const int m = static_cast<int>(std::round(value));
        if (m < 0 || m > 2)
            throw InvalidSimulationException("drag mode must be 0, 1, or 2.");
        dragMode_ = m;
    } else if (name == "projMode") {
        projMode_ = (std::round(value) >= 0.5);
    } else if (name == "launchAngle") {
        if (!std::isfinite(value) || value < 0.0 || value > 90.0)
            throw InvalidSimulationException("launch angle must be in [0, 90] degrees.");
        launchAngleDeg_ = value;
    } else if (name == "launchSpeed") {
        if (!std::isfinite(value) || value < 1.0 || value > 200.0)
            throw InvalidSimulationException("launch speed must be in [1, 200] m/s.");
        launchSpeed_ = value;
    } else if (name == "charLength") {
        if (!std::isfinite(value) || value < 0.001 || value > 2.0)
            throw InvalidSimulationException("characteristic length must be in [0.001, 2] m.");
        charLength_ = value;
    } else if (name == "dynViscosity") {
        if (!std::isfinite(value) || value < 1e-6 || value > 0.1)
            throw InvalidSimulationException("dynamic viscosity must be in [1e-6, 0.1] Pa·s.");
        dynViscosity_ = value;
    }
}

// ============================================================
// DRAG PHYSICS HELPERS
// ============================================================

double AirResistanceSimulation::dragForceMagnitude(double speed) const {
    if (speed < 1e-12) return 0.0;
    switch (dragMode_) {
        case 0:  return 0.0;
        case 1:  return linearDrag_ * speed;                               // F_d = b*v
        case 2:  return 0.5 * airDensity_ * dragCoeff_ * crossSection_    // F_d = ½ρCdAv²
                        * speed * speed;
        default: return 0.0;
    }
}

double AirResistanceSimulation::terminalVelocity() const {
    if (gravity_ < 1e-12) return 0.0;
    switch (dragMode_) {
        case 0:  return 0.0;    // no terminal velocity without drag
        case 1:  {              // v_t = mg / b
            if (linearDrag_ < 1e-12) return 0.0;
            return mass_ * gravity_ / linearDrag_;
        }
        case 2:  {              // v_t = sqrt(2mg / (rho Cd A))
            const double denom = airDensity_ * dragCoeff_ * crossSection_;
            if (denom < 1e-20) return 0.0;
            return std::sqrt(2.0 * mass_ * gravity_ / denom);
        }
        default: return 0.0;
    }
}

// Compute net acceleration at position (vx, vy).
// Gravity: ay -= g  (downward)
// Drag opposes velocity: a_drag = -(Fd/m) * v_hat
void AirResistanceSimulation::computeAcceleration(double cvx, double cvy,
                                                   double& ax_out, double& ay_out) const {
    const double speed = std::hypot(cvx, cvy);
    const double Fd = dragForceMagnitude(speed);

    ax_out = 0.0;
    ay_out = -gravity_;   // gravity always downward

    if (speed > 1e-12) {
        // Drag opposes velocity: a_drag = -(Fd/m) * (v/|v|)
        const double ax_drag = -(Fd / mass_) * (cvx / speed);
        const double ay_drag = -(Fd / mass_) * (cvy / speed);
        ax_out += ax_drag;
        ay_out += ay_drag;
    }
}

// ============================================================
// ANALYTIC RESULTS
// ============================================================

AirResistanceResults AirResistanceSimulation::analytic() const {
    AirResistanceResults r;
    const double speed = std::hypot(vx_, vy_);
    r.terminalVelocity = terminalVelocity();
    r.dragForce        = dragForceMagnitude(speed);
    r.gravityForce     = mass_ * gravity_;
    r.netForce         = std::fabs(r.gravityForce - r.dragForce);
    r.acceleration     = (mass_ > 1e-12) ? r.netForce / mass_ : 0.0;
    // Reynolds number: Re = rho * v * L / mu
    if (dynViscosity_ > 1e-20) {
        r.reynoldsNumber = airDensity_ * speed * charLength_ / dynViscosity_;
    }
    return r;
}

// ============================================================
// SIMULATION LOOP
// ============================================================

void AirResistanceSimulation::initialize() {
    resetClock();
    recorder_.clear();
    finished_ = false;

    if (projMode_) {
        // 2D projectile: launch from (0, 0) at angle
        x_  = 0.0;
        y_  = 0.0;
        const double angleRad = launchAngleDeg_ * kPi / 180.0;
        vx_ = launchSpeed_ * std::cos(angleRad);
        vy_ = launchSpeed_ * std::sin(angleRad);
    } else {
        // 1D free-fall: start at initHeight_, initial velocity initVy_ (upward positive)
        x_  = 0.0;
        y_  = initHeight_;
        vx_ = 0.0;
        vy_ = initVy_;
    }

    computeAcceleration(vx_, vy_, ax_, ay_);
    recorder_.push(0.0, currentSample());
}

void AirResistanceSimulation::update(double dt) {
    if (!(dt > 0.0) || finished_) return;

    // Velocity Verlet integration.
    // For stability with quadratic drag, use substeps if Fd/m*dt is large.
    const double aEst   = std::max(std::fabs(ay_), 0.1);
    const int substeps  = std::max(1, static_cast<int>(std::ceil(aEst * dt / 2.0)));
    const double h      = dt / substeps;

    for (int i = 0; i < substeps && !finished_; ++i) {
        // Half-step velocity
        const double vx_half = vx_ + 0.5 * ax_ * h;
        const double vy_half = vy_ + 0.5 * ay_ * h;

        // Full-step position
        x_ += vx_half * h;
        y_ += vy_half * h;

        // New acceleration at new position (depends on velocity, so use half-step vel)
        double ax_new, ay_new;
        computeAcceleration(vx_half, vy_half, ax_new, ay_new);

        // Full-step velocity
        vx_ = vx_half + 0.5 * ax_new * h;
        vy_ = vy_half + 0.5 * ay_new * h;
        ax_ = ax_new;
        ay_ = ay_new;

        addTime(h);

        // Terminal velocity clamp: v cannot exceed v_t (downward, in 1D)
        const double vt = terminalVelocity();
        if (!projMode_ && vt > 0.0 && vy_ < -vt) {
            vy_ = -vt;
            ay_ = 0.0;
        }

        // Check ground collision
        if (y_ <= 0.0) {
            y_ = 0.0;
            vy_ = 0.0;
            vx_ = 0.0;
            ax_ = 0.0;
            ay_ = 0.0;
            finished_ = true;
        }
    }

    if (recorder_.due(time())) {
        recorder_.push(time(), currentSample());
    }
}

// ============================================================
// SAMPLE / JSON
// ============================================================

std::vector<double> AirResistanceSimulation::currentSample() const {
    const double speed = std::hypot(vx_, vy_);
    const double Fd    = dragForceMagnitude(speed);
    const double Fn    = mass_ * std::hypot(ax_ + 0.0, ay_ + gravity_); // net force magnitude
    const double Re    = (dynViscosity_ > 1e-20)
                         ? airDensity_ * speed * charLength_ / dynViscosity_ : 0.0;
    return {time(), y_, vy_, ay_, vx_, ax_, Fd, Fn, Re};
}

std::string AirResistanceSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double speed = std::hypot(vx_, vy_);
    const double Fd    = dragForceMagnitude(speed);
    const double Fg    = mass_ * gravity_;
    const double Fn    = mass_ * std::hypot(ax_, ay_ + gravity_); // net = Fg - Fd (vertical)
    const double Re    = (dynViscosity_ > 1e-20)
                         ? airDensity_ * speed * charLength_ / dynViscosity_ : 0.0;
    const double vt    = terminalVelocity();

    std::ostringstream out;
    out << "{\"type\":\"drag\",\"time\":"    << num(time())
        << ",\"finished\":"                   << (finished_ ? "true" : "false")
        << ",\"x\":"                          << num(x_)
        << ",\"y\":"                          << num(y_)
        << ",\"vx\":"                         << num(vx_)
        << ",\"vy\":"                         << num(vy_)
        << ",\"ax\":"                         << num(ax_)
        << ",\"ay\":"                         << num(ay_)
        << ",\"speed\":"                      << num(speed)
        << ",\"dragForce\":"                  << num(Fd)
        << ",\"gravityForce\":"               << num(Fg)
        << ",\"netForce\":"                   << num(Fn)
        << ",\"reynoldsNumber\":"             << num(Re)
        << ",\"terminalVelocity\":"           << num(vt)
        << ",\"dragMode\":"                   << dragMode_
        << ",\"projMode\":"                   << (projMode_ ? "true" : "false")
        << "}";
    return out.str();
}

std::string AirResistanceSimulation::infoJSON() const {
    using namespace JsonUtil;
    const double vt = terminalVelocity();
    std::ostringstream out;
    out << "{\"type\":\"drag\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{"
        << "\"terminalVelocity\":"  << num(vt)
        << ",\"gravityForce\":"     << num(mass_ * gravity_)
        << ",\"dragMode\":"         << dragMode_
        << ",\"projMode\":"         << (projMode_ ? "true" : "false")
        << ",\"mass\":"             << num(mass_)
        << ",\"gravity\":"          << num(gravity_)
        << ",\"linearDrag\":"       << num(linearDrag_)
        << ",\"dragCoeff\":"        << num(dragCoeff_)
        << ",\"crossSection\":"     << num(crossSection_)
        << ",\"airDensity\":"       << num(airDensity_)
        << "}}";
    return out.str();
}

std::string AirResistanceSimulation::seriesJSON(std::size_t maxRows) const {
    return recorder_.toJSON(maxRows);
}
