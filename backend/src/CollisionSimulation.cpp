#include "CollisionSimulation.h"
#include "Exceptions.h"
#include "JsonUtil.h"

#include <cmath>
#include <limits>
#include <sstream>

namespace {
const double kNaN = std::numeric_limits<double>::quiet_NaN();
}

CollisionSimulation::CollisionSimulation()
    : Simulation(), m1_(2.0), m2_(3.0), u1_(5.0), u2_(-2.0), e_(1.0), x1_(kStart1), x2_(kStart2), v1_(0.0), v2_(0.0),
      collided_(false), finished_(false), collisionTime_(kNaN), before1_(0.0), before2_(0.0), after1_(0.0),
      after2_(0.0),
      recorder_({"t", "x1", "x2", "v1", "v2", "p1", "p2", "p", "k1", "k2", "ke"},
                {"s", "m", "m", "m/s", "m/s", "kg\xC2\xB7m/s", "kg\xC2\xB7m/s", "kg\xC2\xB7m/s", "J", "J", "J"},
                kSeriesCapacity) {
    initialize();
}

// Bodies are drawn and collide as discs whose radius grows with mass^(1/3)
// (equal density), so heavier bodies look and behave bigger.
double CollisionSimulation::radiusFor(double mass) { return 0.6 + 0.35 * std::cbrt(mass); }
double CollisionSimulation::radius1() const { return radiusFor(m1_); }
double CollisionSimulation::radius2() const { return radiusFor(m2_); }

void CollisionSimulation::setMass1(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 20.0) throw InvalidMassException("mass 1 must be between 0.1 and 20 kg.");
    m1_ = m;
}
void CollisionSimulation::setMass2(double m) {
    if (!std::isfinite(m) || m < 0.1 || m > 20.0) throw InvalidMassException("mass 2 must be between 0.1 and 20 kg.");
    m2_ = m;
}
void CollisionSimulation::setVelocity1(double v) {
    if (!std::isfinite(v) || std::fabs(v) > 20.0) throw InvalidSimulationException("velocity 1 must be between -20 and 20 m/s.");
    u1_ = v;
}
void CollisionSimulation::setVelocity2(double v) {
    if (!std::isfinite(v) || std::fabs(v) > 20.0) throw InvalidSimulationException("velocity 2 must be between -20 and 20 m/s.");
    u2_ = v;
}
void CollisionSimulation::setRestitution(double e) {
    if (!std::isfinite(e) || e < 0.0 || e > 1.0) {
        throw InvalidSimulationException("coefficient of restitution must be between 0 and 1.");
    }
    e_ = e;
}

std::vector<ParameterSpec> CollisionSimulation::parameterSpecs() const {
    return {
        {"m1", "Mass 1", "kg", 0.1, 20.0, 0.1, 2.0},
        {"m2", "Mass 2", "kg", 0.1, 20.0, 0.1, 3.0},
        {"v1", "Initial velocity 1", "m/s", -20.0, 20.0, 0.5, 5.0},
        {"v2", "Initial velocity 2", "m/s", -20.0, 20.0, 0.5, -2.0},
        {"restitution", "Coefficient of restitution e", "", 0.0, 1.0, 0.01, 1.0},
    };
}

double CollisionSimulation::getParameter(const std::string& name) const {
    if (name == "m1") return m1_;
    if (name == "m2") return m2_;
    if (name == "v1") return u1_;
    if (name == "v2") return u2_;
    if (name == "restitution") return e_;
    throw InvalidSimulationException("unknown parameter '" + name + "' for collision.");
}

void CollisionSimulation::applyParameter(const std::string& name, double value) {
    if (name == "m1") setMass1(value);
    else if (name == "m2") setMass2(value);
    else if (name == "v1") setVelocity1(value);
    else if (name == "v2") setVelocity2(value);
    else if (name == "restitution") setRestitution(value);
}

CollisionResults CollisionSimulation::analytic() const {
    CollisionResults r;
    const double M = m1_ + m2_;
    const double closing = u1_ - u2_;
    const double gap = kStart2 - kStart1 - (radius1() + radius2());
    r.willCollide = closing > 1e-12;
    r.timeToCollision = r.willCollide ? gap / closing : kNaN;
    r.v1After = ((m1_ - e_ * m2_) * u1_ + (1.0 + e_) * m2_ * u2_) / M;
    r.v2After = ((m2_ - e_ * m1_) * u2_ + (1.0 + e_) * m1_ * u1_) / M;
    r.momentumBefore = m1_ * u1_ + m2_ * u2_;
    r.momentumAfter = m1_ * r.v1After + m2_ * r.v2After;
    r.kineticBefore = 0.5 * m1_ * u1_ * u1_ + 0.5 * m2_ * u2_ * u2_;
    r.kineticAfter = 0.5 * m1_ * r.v1After * r.v1After + 0.5 * m2_ * r.v2After * r.v2After;
    const double mu = m1_ * m2_ / M; // reduced mass
    r.kineticLost = 0.5 * mu * (1.0 - e_ * e_) * closing * closing;
    r.centreOfMassVelocity = r.momentumBefore / M;
    r.kind = e_ >= 1.0 ? "elastic" : (e_ <= 0.0 ? "perfectly inelastic" : "inelastic");
    return r;
}

void CollisionSimulation::initialize() {
    resetClock();
    x1_ = kStart1;
    x2_ = kStart2;
    v1_ = u1_;
    v2_ = u2_;
    collided_ = false;
    finished_ = false;
    collisionTime_ = kNaN;
    before1_ = before2_ = after1_ = after2_ = 0.0;
    recorder_.clear();
    record();
}

// Apply the impulse. The formulas conserve momentum exactly and satisfy
// v2' - v1' = -e (v2 - v1).
void CollisionSimulation::collide() {
    const double M = m1_ + m2_;
    before1_ = v1_;
    before2_ = v2_;
    const double n1 = ((m1_ - e_ * m2_) * v1_ + (1.0 + e_) * m2_ * v2_) / M;
    const double n2 = ((m2_ - e_ * m1_) * v2_ + (1.0 + e_) * m1_ * v1_) / M;
    v1_ = n1;
    v2_ = n2;
    after1_ = n1;
    after2_ = n2;
    collided_ = true;
    collisionTime_ = time();
}

void CollisionSimulation::update(double dt) {
    if (!(dt > 0.0) || finished_) return;
    double remaining = dt;

    if (!collided_) {
        const double closing = v1_ - v2_;
        if (closing > 1e-12) {
            const double gap = x2_ - x1_ - (radius1() + radius2());
            const double tau = gap > 0.0 ? gap / closing : 0.0;
            if (tau <= remaining) {
                // advance exactly to the instant of contact, then collide
                x1_ += v1_ * tau;
                x2_ += v2_ * tau;
                addTime(tau);
                remaining -= tau;
                collide();
            }
        }
    }
    x1_ += v1_ * remaining;
    x2_ += v2_ * remaining;
    addTime(remaining);

    // the run ends when either body leaves the track
    if (x1_ < 0.0 || x1_ > kTrackLength || x2_ < 0.0 || x2_ > kTrackLength) finished_ = true;
    if (recorder_.due(time()) || finished_) record();
}

void CollisionSimulation::record() {
    recorder_.push(time(), {time(), x1_, x2_, v1_, v2_, m1_ * v1_, m2_ * v2_, momentum(), 0.5 * m1_ * v1_ * v1_,
                            0.5 * m2_ * v2_ * v2_, kineticEnergy()});
}

std::string CollisionSimulation::stateJSON() const {
    using namespace JsonUtil;
    std::ostringstream out;
    out << "{\"type\":\"collision\",\"time\":" << num(time()) << ",\"finished\":" << (finished_ ? "true" : "false")
        << ",\"collided\":" << (collided_ ? "true" : "false") << ",\"x1\":" << num(x1_) << ",\"x2\":" << num(x2_)
        << ",\"v1\":" << num(v1_) << ",\"v2\":" << num(v2_) << ",\"p1\":" << num(m1_ * v1_) << ",\"p2\":" << num(m2_ * v2_)
        << ",\"momentum\":" << num(momentum()) << ",\"kinetic\":{\"k1\":" << num(0.5 * m1_ * v1_ * v1_)
        << ",\"k2\":" << num(0.5 * m2_ * v2_ * v2_) << ",\"total\":" << num(kineticEnergy()) << "}"
        << ",\"collisionTime\":" << num(collisionTime_);
    if (collided_) {
        out << ",\"before\":{\"v1\":" << num(before1_) << ",\"v2\":" << num(before2_)
            << ",\"momentum\":" << num(m1_ * before1_ + m2_ * before2_)
            << ",\"kinetic\":" << num(0.5 * m1_ * before1_ * before1_ + 0.5 * m2_ * before2_ * before2_) << "}"
            << ",\"after\":{\"v1\":" << num(after1_) << ",\"v2\":" << num(after2_)
            << ",\"momentum\":" << num(m1_ * after1_ + m2_ * after2_)
            << ",\"kinetic\":" << num(0.5 * m1_ * after1_ * after1_ + 0.5 * m2_ * after2_ * after2_) << "}";
    } else {
        out << ",\"before\":null,\"after\":null";
    }
    out << "}";
    return out.str();
}

std::string CollisionSimulation::infoJSON() const {
    using namespace JsonUtil;
    const CollisionResults r = analytic();
    std::ostringstream out;
    out << "{\"type\":\"collision\",\"parameters\":" << parametersJSON()
        << ",\"track\":{\"length\":" << num(kTrackLength) << ",\"start1\":" << num(kStart1)
        << ",\"start2\":" << num(kStart2) << ",\"radius1\":" << num(radius1()) << ",\"radius2\":" << num(radius2()) << "}"
        << ",\"analytic\":{\"willCollide\":" << (r.willCollide ? "true" : "false")
        << ",\"timeToCollision\":" << num(r.timeToCollision) << ",\"v1After\":" << num(r.v1After)
        << ",\"v2After\":" << num(r.v2After) << ",\"momentumBefore\":" << num(r.momentumBefore)
        << ",\"momentumAfter\":" << num(r.momentumAfter) << ",\"kineticBefore\":" << num(r.kineticBefore)
        << ",\"kineticAfter\":" << num(r.kineticAfter) << ",\"kineticLost\":" << num(r.kineticLost)
        << ",\"centreOfMassVelocity\":" << num(r.centreOfMassVelocity) << ",\"kind\":" << quote(r.kind) << "}}";
    return out.str();
}
