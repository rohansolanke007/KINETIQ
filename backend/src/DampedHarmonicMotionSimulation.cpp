#include "DampedHarmonicMotionSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"
#include "MathUtils.h"

#include <algorithm>
#include <cmath>
#include <sstream>
#include <string>

namespace {
constexpr double kPi = 3.14159265358979323846;

// Tolerance for regime classification
constexpr double kCriticalTol = 1e-6;
} // namespace

// ---- Constructor --------------------------------------------------------

DampedHarmonicMotionSimulation::DampedHarmonicMotionSimulation()
    : OscillatorSimulation(
          {"t", "x", "v", "a", "ke", "pe", "e", "Fspring", "Fdamp", "Fnet"},
          {"s", "m", "m/s", "m/s\xC2\xB2", "J", "J", "J", "N", "N", "N"}),
      mass_(1.0), springK_(25.0), damping_(1.0),
      x0_(1.0), v0_(0.0),
      x_(0.0), v_(0.0), initialEnergy_(0.0)
{
    initialize();
}

// ---- Parameter setters --------------------------------------------------

void DampedHarmonicMotionSimulation::setMass(double kg) {
    if (!std::isfinite(kg) || kg < 0.1 || kg > 20.0)
        throw InvalidMassException("mass must be between 0.1 and 20 kg.");
    mass_ = kg;
}

void DampedHarmonicMotionSimulation::setSpringConstant(double npm) {
    if (!std::isfinite(npm) || npm < 1.0 || npm > 500.0)
        throw InvalidSimulationException("spring constant must be between 1 and 500 N/m.");
    springK_ = npm;
}

void DampedHarmonicMotionSimulation::setDampingCoefficient(double nsm) {
    if (!std::isfinite(nsm) || nsm < 0.0 || nsm > 200.0)
        throw InvalidSimulationException("damping coefficient must be between 0 and 200 N·s/m.");
    damping_ = nsm;
}

void DampedHarmonicMotionSimulation::setInitialDisplacement(double m) {
    if (!std::isfinite(m) || std::fabs(m) > 5.0)
        throw InvalidSimulationException("initial displacement must be between -5 and 5 m.");
    x0_ = m;
}

void DampedHarmonicMotionSimulation::setInitialVelocity(double ms) {
    if (!std::isfinite(ms) || std::fabs(ms) > 50.0)
        throw InvalidSimulationException("initial velocity must be between -50 and 50 m/s.");
    v0_ = ms;
}

// ---- Parameter spec / get / apply ---------------------------------------

std::vector<ParameterSpec> DampedHarmonicMotionSimulation::parameterSpecs() const {
    return {
        {"mass",        "Mass",                "kg",     0.1,  20.0,  0.1,  1.0},
        {"k",           "Spring constant",     "N/m",    1.0, 500.0,  1.0, 25.0},
        {"damping",     "Damping coefficient", "N·s/m",  0.0, 200.0,  0.5,  1.0},
        {"displacement","Initial displacement","m",      -5.0,  5.0,  0.1,  1.0},
        {"velocity",    "Initial velocity",    "m/s",   -50.0, 50.0,  0.5,  0.0},
    };
}

double DampedHarmonicMotionSimulation::getParameter(const std::string& name) const {
    if (name == "mass")         return mass_;
    if (name == "k")            return springK_;
    if (name == "damping")      return damping_;
    if (name == "displacement") return x0_;
    if (name == "velocity")     return v0_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for dhm.");
}

void DampedHarmonicMotionSimulation::applyParameter(const std::string& name, double value) {
    if (name == "mass")          setMass(value);
    else if (name == "k")        setSpringConstant(value);
    else if (name == "damping")  setDampingCoefficient(value);
    else if (name == "displacement") setInitialDisplacement(value);
    else if (name == "velocity")     setInitialVelocity(value);
}

// ---- Analytic results ---------------------------------------------------

DampedHarmonicResults DampedHarmonicMotionSimulation::analytic() const {
    DampedHarmonicResults r;
    r.omega0          = std::sqrt(springK_ / mass_);
    r.naturalFrequency= r.omega0 / (2.0 * kPi);
    r.naturalPeriod   = 2.0 * kPi / r.omega0;
    r.beta            = damping_ / (2.0 * mass_);
    r.criticalDamping = 2.0 * std::sqrt(springK_ * mass_);
    r.dampingRatio    = damping_ / r.criticalDamping;

    if (r.dampingRatio < 1.0 - kCriticalTol) {
        // Underdamped
        r.regime          = DampingRegime::Underdamped;
        const double disc = r.omega0 * r.omega0 - r.beta * r.beta;
        r.omegaD          = std::sqrt(std::max(disc, 0.0));
        r.dampedFrequency = r.omegaD / (2.0 * kPi);
        r.dampedPeriod    = r.omegaD > 1e-12 ? 2.0 * kPi / r.omegaD
                                              : std::numeric_limits<double>::quiet_NaN();
    } else if (r.dampingRatio <= 1.0 + kCriticalTol) {
        // Critically damped
        r.regime          = DampingRegime::Critical;
        r.omegaD          = 0.0;
        r.dampedFrequency = 0.0;
        r.dampedPeriod    = std::numeric_limits<double>::quiet_NaN();
    } else {
        // Overdamped
        r.regime          = DampingRegime::Overdamped;
        r.omegaD          = 0.0;
        r.dampedFrequency = 0.0;
        r.dampedPeriod    = std::numeric_limits<double>::quiet_NaN();
    }

    r.qualityFactor = r.dampingRatio > 1e-12 ? 1.0 / (2.0 * r.dampingRatio)
                                              : std::numeric_limits<double>::quiet_NaN();
    r.initialEnergy = 0.5 * mass_ * v0_ * v0_ + 0.5 * springK_ * x0_ * x0_;
    return r;
}

// ---- Numerical integration (RK4) ----------------------------------------

double DampedHarmonicMotionSimulation::computeAccel(double x, double v) const {
    return (-springK_ * x - damping_ * v) / mass_;
}

void DampedHarmonicMotionSimulation::rk4Step(double h) {
    // Classic RK4 on the state vector [x, v]
    // k1
    const double k1x = v_;
    const double k1v = computeAccel(x_, v_);
    // k2
    const double k2x = v_ + 0.5 * h * k1v;
    const double k2v = computeAccel(x_ + 0.5 * h * k1x, v_ + 0.5 * h * k1v);
    // k3
    const double k3x = v_ + 0.5 * h * k2v;
    const double k3v = computeAccel(x_ + 0.5 * h * k2x, v_ + 0.5 * h * k2v);
    // k4
    const double k4x = v_ + h * k3v;
    const double k4v = computeAccel(x_ + h * k3x, v_ + h * k3v);

    x_ += h / 6.0 * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
    v_ += h / 6.0 * (k1v + 2.0 * k2v + 2.0 * k3v + k4v);
}

// ---- Lifecycle ----------------------------------------------------------

std::vector<double> DampedHarmonicMotionSimulation::currentSample() const {
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    const double fs  = springForce();
    const double fd  = dampingForce();
    return {time(), x_, v_, acceleration(), ke, pe, ke + pe, fs, fd, fs + fd};
}

void DampedHarmonicMotionSimulation::initialize() {
    resetClock();
    clearRecording();
    x_ = x0_;
    v_ = v0_;
    initialEnergy_ = totalEnergy();
    trackCrossing(x_);
    pushSample(currentSample());
}

void DampedHarmonicMotionSimulation::update(double dt) {
    if (!(dt > 0.0)) return;

    const double omega0 = std::sqrt(springK_ / mass_);
    // Keep ω₀·h < 0.05 for accuracy; at least 2 sub-steps
    const int substeps = std::max(2, static_cast<int>(std::ceil(omega0 * dt / 0.05)));
    const double h = dt / substeps;

    for (int i = 0; i < substeps; ++i) {
        rk4Step(h);
        addTime(h);
        trackCrossing(x_);
    }

    // Guard against NaN / Inf from extreme parameters
    if (!std::isfinite(x_) || !std::isfinite(v_)) {
        x_ = 0.0;
        v_ = 0.0;
    }

    if (sampleDue()) pushSample(currentSample());
}

// ---- JSON output --------------------------------------------------------

std::string DampedHarmonicMotionSimulation::stateJSON() const {
    using namespace JsonUtil;
    const double ke = kineticEnergy();
    const double pe = potentialEnergy();
    const DampedHarmonicResults r = analytic();

    const char* regimeStr = "underdamped";
    if (r.regime == DampingRegime::Critical)   regimeStr = "critical";
    else if (r.regime == DampingRegime::Overdamped) regimeStr = "overdamped";

    std::ostringstream out;
    out << "{\"type\":\"dhm\",\"time\":" << num(time()) << ",\"finished\":false"
        << ",\"x\":"   << num(x_) << ",\"v\":" << num(v_)
        << ",\"a\":"   << num(acceleration())
        << ",\"Fspring\":" << num(springForce())
        << ",\"Fdamp\":" << num(dampingForce())
        << ",\"Fnet\":" << num(netForce())
        << ",\"energy\":{"
            << "\"kinetic\":"   << num(ke)
            << ",\"potential\":" << num(pe)
            << ",\"total\":"     << num(ke + pe)
            << ",\"initial\":"   << num(initialEnergy_)
            << ",\"drift\":"     << num(relativeDrift(ke + pe, initialEnergy_))
        << "}"
        << ",\"measuredPeriod\":" << num(measuredPeriod())
        << ",\"regime\":\"" << regimeStr << "\""
        << ",\"dampingRatio\":" << num(r.dampingRatio)
        << ",\"omega0\":"     << num(r.omega0)
        << ",\"omegaD\":"     << num(r.omegaD)
        << "}";
    return out.str();
}

std::string DampedHarmonicMotionSimulation::infoJSON() const {
    using namespace JsonUtil;
    const DampedHarmonicResults r = analytic();

    const char* regimeStr = "underdamped";
    if (r.regime == DampingRegime::Critical)    regimeStr = "critical";
    else if (r.regime == DampingRegime::Overdamped) regimeStr = "overdamped";

    std::ostringstream out;
    out << "{\"type\":\"dhm\",\"parameters\":" << parametersJSON()
        << ",\"analytic\":{"
            << "\"omega0\":"          << num(r.omega0)
            << ",\"naturalFrequency\":" << num(r.naturalFrequency)
            << ",\"naturalPeriod\":"  << num(r.naturalPeriod)
            << ",\"beta\":"           << num(r.beta)
            << ",\"dampingRatio\":"   << num(r.dampingRatio)
            << ",\"criticalDamping\":" << num(r.criticalDamping)
            << ",\"omegaD\":"         << num(r.omegaD)
            << ",\"dampedFrequency\":" << num(r.dampedFrequency)
            << ",\"dampedPeriod\":"   << num(r.dampedPeriod)
            << ",\"qualityFactor\":"  << num(r.qualityFactor)
            << ",\"initialEnergy\":"  << num(r.initialEnergy)
            << ",\"regime\":\"" << regimeStr << "\""
        << "}}";
    return out.str();
}

// ---- Free-body diagram --------------------------------------------------

std::vector<ForceVector> DampedHarmonicMotionSimulation::forces() const {
    const double weight = mass_ * 9.81;
    return {
        {"Weight",        "W = mg",    ForceKind::Gravity,  Vector2D(0.0, -weight),         false},
        {"Normal",        "N",          ForceKind::Normal,   Vector2D(0.0, weight),           false},
        {"Spring force",  "F_s = -kx", ForceKind::Spring,   Vector2D(springForce(), 0.0),    false},
        {"Damping force", "F_d = -cv", ForceKind::Applied,  Vector2D(dampingForce(), 0.0),   false},
    };
}
