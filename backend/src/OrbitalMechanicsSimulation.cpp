#include "OrbitalMechanicsSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>

// ============================================================
// CENTRAL BODY DATA
// ============================================================
// Accurate gravitational parameters and surface radii (SI).
const OrbitalMechanicsSimulation::CentralBodyData OrbitalMechanicsSimulation::kBodies[5] = {
    // name,    GM (m³/s²),              radius (m)
    {"Earth",  3.986004418e14,           6.3710e6},
    {"Moon",   4.9048695e12,             1.7374e6},
    {"Mars",   4.282837e13,              3.3895e6},
    {"Jupiter",1.26686534e17,            7.1492e7},
    {"Sun",    1.32712440018e20,         6.9634e8},
};

// ============================================================
// CONSTRUCTOR
// ============================================================

OrbitalMechanicsSimulation::OrbitalMechanicsSimulation()
    : Simulation(1.0 / 240.0),
      mass_(1000.0), altitude_(400000.0),
      tangVelocity_(7672.6),  // ~circular orbit for LEO
      radVelocity_(0.0),
      bodyId_(0),
      mu_(kBodies[0].GM), bodyRadius_(kBodies[0].radius),
      x_(0.0), y_(0.0), vx_(0.0), vy_(0.0), ax_(0.0), ay_(0.0),
      t_(0.0), finished_(false),
      recorder_(
          {"t", "r", "speed", "vx", "vy", "Fg", "U", "E", "L", "x", "y"},
          {"s", "m", "m/s", "m/s", "m/s", "N", "J", "J",
           "kg\xC2\xB7m\xC2\xB2/s", "m", "m"},
          kSeriesCapacity)
{
    initialize();
}

// ============================================================
// PARAMETER SPECS
// ============================================================

std::vector<ParameterSpec> OrbitalMechanicsSimulation::parameterSpecs() const {
    return {
        {"mass",        "Satellite mass",         "kg",    1.0,   1.0e6,   1.0,    1000.0},
        {"altitude",    "Orbital altitude",       "m",   1.0e4,  1.0e8, 1000.0,  400000.0},
        {"tangVel",     "Initial tangential v",   "m/s",   0.0, 50000.0, 10.0,    7672.6},
        {"radVel",      "Initial radial v",       "m/s",-5000.0, 5000.0, 10.0,       0.0},
        {"body",        "Central body (0-4)",     "",       0.0,    4.0,  1.0,       0.0},
    };
}

double OrbitalMechanicsSimulation::getParameter(const std::string& name) const {
    if (name == "mass")     return mass_;
    if (name == "altitude") return altitude_;
    if (name == "tangVel")  return tangVelocity_;
    if (name == "radVel")   return radVelocity_;
    if (name == "body")     return static_cast<double>(bodyId_);
    throw InvalidSimulationException("unknown parameter '" + name + "' for orbital.");
}

void OrbitalMechanicsSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass") {
        if (!std::isfinite(value) || value < 1.0 || value > 1.0e6)
            throw InvalidMassException("satellite mass must be in [1, 1e6] kg.");
        mass_ = value;
    } else if (name == "altitude") {
        if (!std::isfinite(value) || value < 1.0e4 || value > 1.0e8)
            throw InvalidSimulationException("altitude must be in [10000, 1e8] m.");
        altitude_ = value;
    } else if (name == "tangVel") {
        if (!std::isfinite(value) || value < 0.0 || value > 50000.0)
            throw InvalidSimulationException("tangential velocity must be in [0, 50000] m/s.");
        tangVelocity_ = value;
    } else if (name == "radVel") {
        if (!std::isfinite(value) || value < -5000.0 || value > 5000.0)
            throw InvalidSimulationException("radial velocity must be in [-5000, 5000] m/s.");
        radVelocity_ = value;
    } else if (name == "body") {
        const int b = static_cast<int>(std::round(value));
        if (b < 0 || b > 4)
            throw InvalidSimulationException("body index must be 0-4.");
        bodyId_ = b;
        mu_ = kBodies[bodyId_].GM;
        bodyRadius_ = kBodies[bodyId_].radius;
    }
}

// ============================================================
// ADVANCE OVERRIDE — allow large time steps for orbital timescales
// ============================================================

void OrbitalMechanicsSimulation::advance(double seconds) {
    // The base class caps advance() at 0.25 s per call to prevent physics
    // catch-up after a tab becomes visible.  For orbital mechanics that is
    // too restrictive: a LEO orbit takes ~5500 s, so at 500x simulation
    // speed the caller passes ~8 s per browser frame.
    // Safety: cap at 300 s (5 minutes of simulated time per browser frame).
    // The adaptive substep logic inside update() ensures numerical accuracy
    // regardless of how large dt is.
    static constexpr double kOrbitalMaxSeconds = 300.0;
    if (!std::isfinite(seconds) || seconds <= 0.0) return;
    if (seconds > kOrbitalMaxSeconds) seconds = kOrbitalMaxSeconds;

    // Run the entire dt as a single update() call.
    // update() internally splits into substeps of at most safeDt each,
    // and handles its own series recording.
    if (!isFinished()) {
        update(seconds);
    }
}

// ============================================================
// GRAVITY HELPERS
// ============================================================

void OrbitalMechanicsSimulation::gravAccel(double px, double py,
                                            double& ax_out, double& ay_out) const {
    const double r2 = px * px + py * py;
    if (r2 < 1.0) {
        // Safety guard: at or inside a point mass — set to zero
        ax_out = 0.0;
        ay_out = 0.0;
        return;
    }
    // a = -mu * r_vec / |r|^3  = -mu / r^2 * (r_hat)
    const double r  = std::sqrt(r2);
    const double r3 = r2 * r;
    ax_out = -mu_ * px / r3;
    ay_out = -mu_ * py / r3;
}

double OrbitalMechanicsSimulation::distFromCentre(double px, double py) const {
    return std::hypot(px, py);
}

// ============================================================
// ANALYTIC RESULTS (for circular orbit at current r or altitude)
// ============================================================

OrbitalMechanicsResults OrbitalMechanicsSimulation::analytic() const {
    OrbitalMechanicsResults res;
    const double r = distFromCentre(x_, y_);
    if (r < 1.0) return res;  // degenerate

    // Use current radius for all analytic quantities
    const double muM = mu_;                             // GM
    res.circularVelocity  = std::sqrt(muM / r);         // v_circ = sqrt(GM/r)
    res.escapeVelocity    = std::sqrt(2.0 * muM / r);   // v_esc  = sqrt(2GM/r)

    if (muM > 0.0) {
        const double rCubed = r * r * r;
        res.orbitalPeriod = 2.0 * kPi * std::sqrt(rCubed / muM); // T = 2pi*sqrt(r³/GM)
    }

    // Gravitational field strength  g = GM/r²
    res.gravFieldStrength = muM / (r * r);

    // Gravitational potential  V = -GM/r
    res.gravPotential     = -muM / r;

    // Forces and energy using satellite mass
    res.gravForce         = muM * mass_ / (r * r);       // F = GMm/r²
    res.potentialEnergy   = -muM * mass_ / r;            // U = -GMm/r
    res.totalEnergy       = -muM * mass_ / (2.0 * r);    // E_circ = -GMm/2r

    // Angular momentum for circular orbit at this r
    res.angularMomentum   = mass_ * res.circularVelocity * r;

    // Altitude above surface
    res.altitude          = r - bodyRadius_;

    return res;
}

// ============================================================
// SIMULATION LOOP
// ============================================================

void OrbitalMechanicsSimulation::initialize() {
    resetClock();
    recorder_.clear();
    finished_ = false;
    t_ = 0.0;

    mu_ = kBodies[bodyId_].GM;
    bodyRadius_ = kBodies[bodyId_].radius;

    // Starting position: satellite at (r0, 0) where r0 = bodyRadius + altitude
    const double r0 = bodyRadius_ + altitude_;
    x_ = r0;
    y_ = 0.0;

    // Initial velocity: tangential = (0, v_tang), radial = (v_rad, 0)
    // Tangential is perpendicular to r_hat = (1, 0), so tangential = (0, 1)
    vx_ = radVelocity_;
    vy_ = tangVelocity_;

    // Initial acceleration
    gravAccel(x_, y_, ax_, ay_);

    recorder_.push(0.0, currentSample());
}

void OrbitalMechanicsSimulation::update(double dt) {
    if (!(dt > 0.0) || finished_) return;

    // Velocity Verlet (leapfrog) integration.
    // For numerical accuracy with fast orbits, use substeps.
    // Rule: at most 0.01 * r / |v| time per substep (<=1% arc per step).
    const double speed = std::hypot(vx_, vy_);
    const double r_now = distFromCentre(x_, y_);
    // Substeps: ensure orbital arc per step is small
    const double safeDt = (speed > 1.0 && r_now > 1.0)
                              ? 0.01 * r_now / speed
                              : dt;
    const int substeps = std::max(1, static_cast<int>(std::ceil(dt / safeDt)));
    const double h = dt / substeps;

    for (int i = 0; i < substeps && !finished_; ++i) {
        // Half-step velocity
        const double vx_half = vx_ + 0.5 * ax_ * h;
        const double vy_half = vy_ + 0.5 * ay_ * h;

        // Full-step position
        x_ += vx_half * h;
        y_ += vy_half * h;

        // New acceleration at new position
        double ax_new, ay_new;
        gravAccel(x_, y_, ax_new, ay_new);

        // Full-step velocity
        vx_ = vx_half + 0.5 * ax_new * h;
        vy_ = vy_half + 0.5 * ay_new * h;
        ax_ = ax_new;
        ay_ = ay_new;

        t_ += h;
        addTime(h);

        // Collision with central body surface
        const double r_new = distFromCentre(x_, y_);
        if (r_new <= bodyRadius_) {
            finished_ = true;
        }

        // Safety: if satellite is unreasonably far (> 100x the initial radius),
        // consider it escaped; keep running but mark — do NOT stop (escape is valid)
        // We just let it continue.
    }

    if (recorder_.due(time())) {
        recorder_.push(time(), currentSample());
    }
}

// ============================================================
// SAMPLE / JSON
// ============================================================

std::vector<double> OrbitalMechanicsSimulation::currentSample() const {
    const double r     = distFromCentre(x_, y_);
    const double speed = std::hypot(vx_, vy_);
    const double Fg    = (r > 1.0) ? mu_ * mass_ / (r * r) : 0.0;
    const double U     = (r > 1.0) ? -mu_ * mass_ / r       : 0.0;
    const double E     = U + 0.5 * mass_ * speed * speed;
    // Angular momentum L = m (r × v) = m (x vy - y vx)
    const double L     = mass_ * (x_ * vy_ - y_ * vx_);
    return {time(), r, speed, vx_, vy_, Fg, U, E, L, x_, y_};
}

std::string OrbitalMechanicsSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double r     = distFromCentre(x_, y_);
    const double speed = std::hypot(vx_, vy_);
    const double Fg    = (r > 1.0) ? mu_ * mass_ / (r * r) : 0.0;
    const double U     = (r > 1.0) ? -mu_ * mass_ / r       : 0.0;
    const double E     = U + 0.5 * mass_ * speed * speed;
    const double L     = mass_ * (x_ * vy_ - y_ * vx_);
    const double alt   = r - bodyRadius_;

    // Instantaneous circular and escape velocity at current r
    const double vCirc = (r > 1.0) ? std::sqrt(mu_ / r)        : 0.0;
    const double vEsc  = (r > 1.0) ? std::sqrt(2.0 * mu_ / r)  : 0.0;

    std::ostringstream out;
    out << "{\"type\":\"orbital\",\"time\":"    << num(time())
        << ",\"finished\":"                     << (finished_ ? "true" : "false")
        << ",\"x\":"                            << num(x_)
        << ",\"y\":"                            << num(y_)
        << ",\"vx\":"                           << num(vx_)
        << ",\"vy\":"                           << num(vy_)
        << ",\"ax\":"                           << num(ax_)
        << ",\"ay\":"                           << num(ay_)
        << ",\"r\":"                            << num(r)
        << ",\"altitude\":"                     << num(alt)
        << ",\"speed\":"                        << num(speed)
        << ",\"gravForce\":"                    << num(Fg)
        << ",\"potentialEnergy\":"              << num(U)
        << ",\"totalEnergy\":"                  << num(E)
        << ",\"angularMomentum\":"              << num(L)
        << ",\"circularVelocity\":"             << num(vCirc)
        << ",\"escapeVelocity\":"               << num(vEsc)
        << ",\"bodyId\":"                       << bodyId_
        << ",\"bodyRadius\":"                   << num(bodyRadius_)
        << "}";
    return out.str();
}

std::string OrbitalMechanicsSimulation::infoJSON() const {
    using namespace JsonUtil;
    const OrbitalMechanicsResults res = analytic();
    std::ostringstream out;
    out << "{\"type\":\"orbital\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{"
        << "\"circularVelocity\":"   << num(res.circularVelocity)
        << ",\"escapeVelocity\":"    << num(res.escapeVelocity)
        << ",\"orbitalPeriod\":"     << num(res.orbitalPeriod)
        << ",\"gravForce\":"         << num(res.gravForce)
        << ",\"potentialEnergy\":"   << num(res.potentialEnergy)
        << ",\"totalEnergy\":"       << num(res.totalEnergy)
        << ",\"angularMomentum\":"   << num(res.angularMomentum)
        << ",\"gravFieldStrength\":" << num(res.gravFieldStrength)
        << ",\"gravPotential\":"     << num(res.gravPotential)
        << ",\"altitude\":"          << num(res.altitude)
        << ",\"bodyId\":"            << bodyId_
        << ",\"bodyName\":"          << quote(kBodies[bodyId_].name)
        << ",\"bodyRadius\":"        << num(bodyRadius_)
        << ",\"mu\":"                << num(mu_)
        << ",\"mass\":"              << num(mass_)
        << "}}";
    return out.str();
}

std::string OrbitalMechanicsSimulation::seriesJSON(std::size_t maxRows) const {
    return recorder_.toJSON(maxRows);
}
