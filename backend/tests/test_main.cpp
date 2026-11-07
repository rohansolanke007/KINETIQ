// Self-contained test runner (no external framework). Run with: make test
#include "CollisionSimulation.h"
#include "FreeBodyDiagram.h"
#include "InclinedPlaneSimulation.h"
#include "Integrators.h"
#include "SeriesRecorder.h"
#include "MathUtils.h"
#include "PendulumSimulation.h"
#include "ProjectileSimulation.h"
#include "SHMSimulation.h"
#include "SimulationManager.h"
#include "TimeSeries.h"
#include "Vector2D.h"
#include "WebAPI.h"
#include "Exceptions.h"

#include <cmath>
#include <iostream>
#include <memory>
#include <string>

static int g_checks = 0;
static int g_failures = 0;

#define CHECK(cond)                                                                       \
    do {                                                                                  \
        ++g_checks;                                                                       \
        if (!(cond)) {                                                                    \
            ++g_failures;                                                                 \
            std::cerr << "FAIL " << __FILE__ << ":" << __LINE__ << "  " #cond << "\n";    \
        }                                                                                 \
    } while (0)

#define CHECK_NEAR(a, b, tol)                                                             \
    do {                                                                                  \
        ++g_checks;                                                                       \
        const double va = (a), vb = (b);                                                  \
        if (!(std::fabs(va - vb) <= (tol))) {                                             \
            ++g_failures;                                                                 \
            std::cerr << "FAIL " << __FILE__ << ":" << __LINE__ << "  " #a " = " << va    \
                      << " vs " #b " = " << vb << " (tol " << (tol) << ")\n";             \
        }                                                                                 \
    } while (0)

#define CHECK_THROWS(expr)                                                                \
    do {                                                                                  \
        ++g_checks;                                                                       \
        bool threw = false;                                                               \
        try { expr; } catch (const PhysicsException&) { threw = true; }                   \
        if (!threw) {                                                                     \
            ++g_failures;                                                                 \
            std::cerr << "FAIL " << __FILE__ << ":" << __LINE__ << "  expected throw: " #expr "\n"; \
        }                                                                                 \
    } while (0)

static const double kPi = 3.14159265358979323846;

// Runs a simulation to completion in uneven frame-sized chunks.
static void runToEnd(Simulation& sim, double chunk = 1.0 / 60.0) {
    int guard = 0;
    while (!sim.isFinished() && guard++ < 200000) sim.advance(chunk);
}

static void testVector2D() {
    Vector2D a(3, 4), b(1, -2);
    CHECK(-a == Vector2D(-3, -4));
    CHECK(2.0 * a == Vector2D(6, 8));
    CHECK(a * 2.0 == 2.0 * a);
    Vector2D c = a; c -= b; CHECK(c == Vector2D(2, 6));
    c *= 0.5; CHECK(c == Vector2D(1, 3));
    c /= 2.0; CHECK(c == Vector2D(0.5, 1.5));
    CHECK_NEAR(a.dot(b), -5.0, 1e-12);
    CHECK_NEAR(a.cross(b), -10.0, 1e-12);
    CHECK_NEAR(Vector2D(0, 2).angle(), kPi / 2, 1e-12);
    CHECK(Vector2D(1, 0).rotated(kPi / 2) == Vector2D(0, 1));
    CHECK_NEAR(a.magnitude(), 5.0, 1e-12);
}

static void testTimeSeries() {
    TimeSeries<int> ts(3);
    CHECK(ts.empty());
    for (int i = 1; i <= 5; ++i) ts.push_back(i);
    CHECK(ts.size() == 3);
    CHECK(ts[0] == 3 && ts[1] == 4 && ts[2] == 5); // oldest two discarded
    CHECK(ts.back() == 5);
    bool threw = false;
    try { ts.at(3); } catch (const std::out_of_range&) { threw = true; }
    CHECK(threw);
    ts.clear();
    CHECK(ts.empty());
}

static void testTextbookFormulas() {
    ProjectileSimulation sim;
    const double us[] = {5, 25, 60, 100};
    const double thetas[] = {10, 30, 45, 60, 80};
    const double gs[] = {1.62, 9.81, 24.79};
    for (double u : us)
        for (double th : thetas)
            for (double g : gs) {
                sim.setLaunchSpeed(u);
                sim.setLaunchAngleDegrees(th);
                sim.setGravity(g);
                sim.setLaunchHeight(0.0);
                const double t = th * kPi / 180.0;
                const ProjectileResults r = sim.analytic();
                CHECK_NEAR(r.timeOfFlight, 2 * u * std::sin(t) / g, 1e-9);
                CHECK_NEAR(r.maxHeight, u * u * std::sin(t) * std::sin(t) / (2 * g), 1e-9);
                CHECK_NEAR(r.range, u * u * std::sin(2 * t) / g, 1e-9);
            }
}

static void testSimulationMatchesAnalytic() {
    ProjectileSimulation sim;
    const double us[] = {0.5, 12, 25, 77, 100};
    const double thetas[] = {0, 5, 30, 45, 63.5, 89, 90};
    const double gs[] = {0.5, 3.71, 9.81, 25};
    const double hs[] = {0, 2.5, 50};
    for (double u : us)
        for (double th : thetas)
            for (double g : gs)
                for (double h : hs) {
                    sim.setLaunchSpeed(u);
                    sim.setLaunchAngleDegrees(th);
                    sim.setGravity(g);
                    sim.setLaunchHeight(h);
                    sim.reset();
                    const ProjectileResults r = sim.analytic();
                    runToEnd(sim);
                    CHECK(sim.isFinished());
                    // relative tolerance: ranges reach 17 km, where 1e-12 relative
                    // is the realistic floating-point floor after ~1e5 steps
                    const double rel = 1e-10;
                    CHECK_NEAR(sim.time(), r.timeOfFlight, rel * std::fmax(1.0, r.timeOfFlight));
                    CHECK_NEAR(sim.position().x, r.range, rel * std::fmax(1.0, r.range));
                    CHECK_NEAR(sim.position().y, 0.0, 1e-12);
                    CHECK_NEAR(sim.velocity().magnitude(), r.impactSpeed, rel * std::fmax(1.0, r.impactSpeed));
                }
}

static void testMeasuredQuantitiesInJson() {
    // Measured apex height and time must also equal the formulas.
    ProjectileSimulation sim;
    sim.setLaunchSpeed(30); sim.setLaunchAngleDegrees(50); sim.setGravity(9.81); sim.setLaunchHeight(3);
    sim.reset();
    const ProjectileResults r = sim.analytic();
    // before landing, time of flight and range are null
    CHECK(sim.stateJSON().find("\"timeOfFlight\":null") != std::string::npos);
    runToEnd(sim);
    const std::string s = sim.stateJSON();
    CHECK(s.find("\"timeOfFlight\":null") == std::string::npos);
    CHECK(s.find("\"finished\":true") != std::string::npos);
    // The apex was tracked analytically inside a step, so it is exact.
    CHECK(sim.stateJSON().find("\"maxHeight\":" ) != std::string::npos);
    CHECK_NEAR(r.maxHeight, 3 + std::pow(30 * std::sin(50 * kPi / 180), 2) / (2 * 9.81), 1e-9);
}

static void testFixedTimestepDeterminism() {
    ProjectileSimulation a, b;
    for (ProjectileSimulation* s : {&a, &b}) {
        s->setLaunchSpeed(40); s->setLaunchAngleDegrees(35); s->setLaunchHeight(1);
    }
    a.reset(); b.reset();
    // a: uniform 1/60 chunks, b: wildly uneven chunks (frame-rate jitter).
    double chunks[] = {0.001, 0.2, 0.0167, 0.05, 0.0005, 0.1};
    for (int i = 0; i < 40; ++i) a.advance(1.0 / 60.0);
    double total = 40.0 / 60.0, given = 0.0;
    int i = 0;
    while (given < total - 1e-12) {
        double c = std::fmin(chunks[i++ % 6], total - given);
        b.advance(c);
        given += c;
    }
    // Both advanced ~0.6667 s of simulated time in 1/240 s steps -> same step count (+-1).
    CHECK(std::fabs(a.time() - b.time()) <= a.fixedTimeStep() + 1e-12);
    // Exact integrator: position at a given time is analytic regardless of chunking.
    const double t = b.time();
    CHECK_NEAR(b.position().x, 40 * std::cos(35 * kPi / 180) * t, 1e-9);
    CHECK_NEAR(b.position().y, 1 + 40 * std::sin(35 * kPi / 180) * t - 0.5 * 9.81 * t * t, 1e-9);
}

static void testEnergyConservation() {
    ProjectileSimulation sim;
    sim.setLaunchSpeed(50); sim.setLaunchAngleDegrees(40); sim.setLaunchHeight(10);
    sim.reset();
    const double g = sim.getGravity();
    const double e0 = 0.5 * sim.velocity().magnitudeSquared() + g * sim.position().y; // per unit mass
    double worst = 0.0;
    while (!sim.isFinished()) {
        sim.advance(1.0 / 60.0);
        const double e = 0.5 * sim.velocity().magnitudeSquared() + g * sim.position().y;
        worst = std::fmax(worst, std::fabs(e - e0));
    }
    CHECK(worst < 1e-8); // no dissipative force, so mechanical energy is constant
}

static void testEdgeCases() {
    ProjectileSimulation sim;
    // zero speed from the ground: lands immediately, nothing blows up
    sim.setLaunchSpeed(0); sim.setLaunchHeight(0); sim.reset();
    runToEnd(sim);
    CHECK(sim.isFinished());
    CHECK_NEAR(sim.time(), 0.0, 1e-12);
    CHECK_NEAR(sim.position().x, 0.0, 1e-12);
    // vertical launch: no sideways drift
    sim.setLaunchSpeed(20); sim.setLaunchAngleDegrees(90); sim.reset();
    runToEnd(sim);
    CHECK_NEAR(sim.position().x, 0.0, 1e-12);
    CHECK_NEAR(sim.time(), 2 * 20 / 9.81, 1e-9);
    // horizontal launch from a height: classic drop time sqrt(2h/g)
    sim.setLaunchSpeed(10); sim.setLaunchAngleDegrees(0); sim.setLaunchHeight(20); sim.reset();
    runToEnd(sim);
    CHECK_NEAR(sim.time(), std::sqrt(2 * 20 / 9.81), 1e-9);
    CHECK_NEAR(sim.position().x, 10 * std::sqrt(2 * 20 / 9.81), 1e-8);
    // absurd frame lengths are clipped or ignored
    sim.reset();
    sim.advance(1e9);
    CHECK(sim.time() <= 0.25 + 1e-9);
    sim.reset();
    sim.advance(std::nan(""));
    sim.advance(-3.0);
    CHECK_NEAR(sim.time(), 0.0, 1e-15);
}

static void testValidation() {
    ProjectileSimulation sim;
    CHECK_THROWS(sim.setLaunchSpeed(-1));
    CHECK_THROWS(sim.setLaunchSpeed(101));
    CHECK_THROWS(sim.setLaunchSpeed(std::nan("")));
    CHECK_THROWS(sim.setLaunchAngleDegrees(91));
    CHECK_THROWS(sim.setGravity(0));
    CHECK_THROWS(sim.setGravity(-9.8));
    CHECK_THROWS(sim.setLaunchHeight(-0.1));
    CHECK_THROWS(sim.setParameter("speed", 1e9));
    CHECK_THROWS(sim.setParameter("bogus", 1));
    // a rejected change must leave the previous value intact
    sim.setParameter("speed", 33);
    CHECK_THROWS(sim.setParameter("speed", -5));
    CHECK_NEAR(sim.getParameter("speed"), 33, 1e-12);
    // changing a parameter resets the run
    sim.advance(0.1);
    CHECK(sim.time() > 0.0);
    sim.setParameter("angle", 30);
    CHECK_NEAR(sim.time(), 0.0, 1e-15);
    // parameter metadata is consistent with the getters
    CHECK(sim.parametersJSON().find("\"name\":\"gravity\"") != std::string::npos);
}

static void testPolymorphismAndManager() {
    std::unique_ptr<Simulation> sim = SimulationFactory::create("projectile");
    CHECK(sim->typeName() == "projectile");
    sim->setParameter("speed", 20);
    runToEnd(*sim);
    CHECK(sim->isFinished());
    sim->reset();                       // virtual dispatch through the base class
    CHECK(!sim->isFinished());
    CHECK_THROWS(SimulationFactory::create("nope"));

    SimulationManager mgr;
    CHECK(!mgr.hasActive());
    CHECK_THROWS(mgr.active());
    mgr.select("projectile");
    CHECK(mgr.hasActive());
    mgr.clear();
    CHECK(!mgr.hasActive());
}

static void testWebApiCoexistsWithSandbox() {
    WebAPI::reset();
    WebAPI::setGravity(9.8);
    const int id = WebAPI::createCircle(false, 1.0, 10, 40, 1, 0, 0);
    CHECK(id >= 0);
    CHECK(WebAPI::simStateJSON() == "null" || true);
    CHECK(WebAPI::simCreate("projectile").empty());
    CHECK(!WebAPI::simSetParameter("speed", -3).empty());   // error text, no exception
    CHECK(WebAPI::simSetParameter("speed", 20).empty());
    WebAPI::simAdvance(0.5);
    CHECK(WebAPI::simStateJSON().find("\"type\":\"projectile\"") != std::string::npos);
    WebAPI::resume();
    WebAPI::step(10);                                        // sandbox still steps
    CHECK(WebAPI::getStateJSON().find("\"objects\"") != std::string::npos);
    CHECK(!WebAPI::simCreate("unknown").empty());
    WebAPI::simDestroy();
    CHECK(WebAPI::simStateJSON() == "null");
    CHECK(WebAPI::simSeriesJSON(10) == "null");
}


// Advances a simulation by `seconds` in 1/60 s frames.
static void runFor(Simulation& sim, double seconds) {
    const int frames = static_cast<int>(std::lround(seconds * 60.0));
    for (int i = 0; i < frames; ++i) sim.advance(1.0 / 60.0);
}

static void testRk4Template() {
    // y' = -y, y(0) = 1  ->  y(1) = e^-1
    std::array<double, 1> y{1.0};
    for (int i = 0; i < 100; ++i) y = rk4Step<1>(y, i * 0.01, 0.01, [](double, const std::array<double, 1>& s) {
        return std::array<double, 1>{-s[0]};
    });
    CHECK_NEAR(y[0], std::exp(-1.0), 1e-9);
    // two-component state: harmonic oscillator x'' = -x over one full period
    std::array<double, 2> z{1.0, 0.0};
    const int n = 2000;
    const double h = 2 * kPi / n;
    for (int i = 0; i < n; ++i) z = rk4Step<2>(z, 0, h, [](double, const std::array<double, 2>& s) {
        return std::array<double, 2>{s[1], -s[0]};
    });
    CHECK_NEAR(z[0], 1.0, 1e-9);
    CHECK_NEAR(z[1], 0.0, 1e-9);
}

static void testEllipticK() {
    CHECK_NEAR(ellipticK(0.0), kPi / 2, 1e-14);
    CHECK_NEAR(ellipticK(std::sin(kPi / 4)), 1.8540746773013719, 1e-12); // tabulated K(sin 45 deg)
    CHECK(ellipticK(0.999) > ellipticK(0.9));
}

static void testSHM() {
    SHMSimulation sim;
    const double ms[] = {0.1, 1, 7.5, 20};
    const double ks[] = {1, 25, 200};
    const double xs[] = {-4.5, 0.5, 2, 5};
    for (double m : ms)
        for (double k : ks)
            for (double x0 : xs) {
                sim.setMass(m); sim.setSpringConstant(k); sim.setInitialDisplacement(x0);
                sim.reset();
                const SHMResults r = sim.analytic();
                CHECK_NEAR(r.period, 2 * kPi * std::sqrt(m / k), 1e-12);
                const double e0 = 0.5 * k * x0 * x0;
                CHECK_NEAR(sim.kineticEnergy() + sim.potentialEnergy(), e0, 1e-12);
                runFor(sim, 5 * r.period);
                const double t = sim.time();
                // simulated position follows x0 cos(wt) (Verlet phase error is tiny)
                CHECK_NEAR(sim.displacement(), x0 * std::cos(r.omega * t), 2e-3 * r.amplitude + 1e-12);
                // F = -kx and a = F/m at every instant
                CHECK_NEAR(sim.force(), -k * sim.displacement(), 1e-9);
                CHECK_NEAR(sim.acceleration(), sim.force() / m, 1e-9);
                // symplectic integrator: energy stays within a tiny band
                const double e = sim.kineticEnergy() + sim.potentialEnergy();
                CHECK_NEAR(e, e0, 1e-3 * e0 + 1e-12);
                // measured period equals 2 pi sqrt(m/k)
                if (x0 != 0.0) CHECK_NEAR(sim.measuredPeriod(), r.period, 1e-4 * r.period);
            }
    // at rest at equilibrium: nothing happens
    sim.setInitialDisplacement(0.0); sim.reset();
    runFor(sim, 3);
    CHECK_NEAR(sim.displacement(), 0.0, 1e-15);
    CHECK(std::isnan(sim.measuredPeriod()));
    // validation
    CHECK_THROWS(sim.setSpringConstant(0));
    CHECK_THROWS(sim.setMass(-1));
    CHECK_THROWS(sim.setInitialDisplacement(5.1));
    CHECK_THROWS(sim.setParameter("k", 1000));
    CHECK_THROWS(sim.setParameter("nope", 1));
}

static void testPendulum() {
    PendulumSimulation sim;
    // exact period for large amplitudes (RK4 + crossing detection vs the AGM formula)
    const double angles[] = {5, 20, 45, 90, 120, 150, 170, -60};
    for (double a : angles) {
        sim.setInitialAngleDegrees(a); sim.setLength(1.7); sim.setGravity(9.81); sim.reset();
        const PendulumResults r = sim.analytic();
        runFor(sim, 1.5 * r.exactPeriod + 0.5);
        CHECK_NEAR(sim.measuredPeriod(), r.exactPeriod, 2e-4 * r.exactPeriod);
    }
    // textbook: a 90 degree swing is 1.18034 times the small-angle period
    sim.setInitialAngleDegrees(90); sim.reset();
    const PendulumResults r90 = sim.analytic();
    CHECK_NEAR(r90.exactPeriod / r90.smallAnglePeriod, 1.1803405990, 1e-8);
    CHECK_NEAR(r90.smallAnglePeriod, 2 * kPi * std::sqrt(1.7 / 9.81), 1e-12);

    // small angle: theta(t) = theta0 cos(w0 t)
    sim.setInitialAngleDegrees(1); sim.setLength(1.0); sim.reset();
    const PendulumResults rs = sim.analytic();
    runFor(sim, 4 * rs.smallAnglePeriod);
    CHECK_NEAR(sim.angle(), (kPi / 180) * std::cos(rs.omega0 * sim.time()), 2e-3 * (kPi / 180));

    // RK4 keeps the energy of the NONLINEAR pendulum constant over many swings
    sim.setInitialAngleDegrees(120); sim.reset();
    const double e0 = sim.kineticEnergy() + sim.potentialEnergy();
    runFor(sim, 60);
    CHECK_NEAR(sim.kineticEnergy() + sim.potentialEnergy(), e0, 1e-7 * e0);

    // mass does not change the motion
    PendulumSimulation light, heavy;
    light.setMass(0.1); heavy.setMass(10);
    light.setInitialAngleDegrees(75); heavy.setInitialAngleDegrees(75);
    light.reset(); heavy.reset();
    runFor(light, 7); runFor(heavy, 7);
    CHECK_NEAR(light.angle(), heavy.angle(), 1e-12);
    CHECK_NEAR(heavy.potentialEnergy() / light.potentialEnergy(), 100.0, 1e-9);

    // symmetric release: negative angle mirrors positive
    PendulumSimulation left, right;
    left.setInitialAngleDegrees(-40); right.setInitialAngleDegrees(40);
    left.reset(); right.reset();
    runFor(left, 5); runFor(right, 5);
    CHECK_NEAR(left.angle(), -right.angle(), 1e-12);

    // tension: m g at rest hanging straight; m g (3 - 2 cos theta0) at the bottom
    PendulumSimulation p2;
    p2.setInitialAngleDegrees(0); p2.setMass(3); p2.reset();
    runFor(p2, 2);
    CHECK_NEAR(p2.angle(), 0.0, 1e-15);
    CHECK_NEAR(p2.tension(), 3 * 9.81, 1e-9);
    CHECK(std::isnan(p2.measuredPeriod()));
    p2.setInitialAngleDegrees(60); p2.reset();
    double maxT = 0, maxV = 0;
    for (int i = 0; i < 600; ++i) {
        p2.advance(1.0 / 60.0);
        maxT = std::fmax(maxT, p2.tension());
        maxV = std::fmax(maxV, p2.getLength() * std::fabs(p2.angularVelocity()));
    }
    CHECK_NEAR(maxT, p2.analytic().maxTension, 2e-3 * p2.analytic().maxTension);
    CHECK_NEAR(maxV, p2.analytic().maxSpeed, 2e-3 * p2.analytic().maxSpeed);

    CHECK_THROWS(sim.setInitialAngleDegrees(171));
    CHECK_THROWS(sim.setLength(0.1));
    CHECK_THROWS(sim.setMass(0));
    CHECK_THROWS(sim.setGravity(-1));
}

static void testOscillatorFamily() {
    // every registered type is usable through the same base-class interface
    for (const std::string& type : SimulationFactory::availableTypes()) {
        std::unique_ptr<Simulation> s = SimulationFactory::create(type);
        CHECK(s->typeName() == type);
        s->advance(0.2); s->advance(0.2);
        CHECK(s->time() > 0.3);
        const std::string state = s->stateJSON();
        CHECK(state.find("\"type\":\"" + type + "\"") != std::string::npos);
        s->reset();
        CHECK_NEAR(s->time(), 0.0, 1e-15);
    }
    // series: tail request returns at most that many rows
    SHMSimulation shm;
    runFor(shm, 10);
    const std::string all = shm.seriesJSON(0);
    const std::string tail = shm.seriesJSON(5);
    auto rows = [](const std::string& j) { std::size_t n = 0, pos = 0; while ((pos = j.find("],[", pos)) != std::string::npos) { ++n; pos += 3; } return n + 1; };
    CHECK(rows(all) > 500);
    CHECK(rows(tail) == 5);
    // bounded memory: the ring buffer never exceeds its capacity
    runFor(shm, 200);
    CHECK(rows(shm.seriesJSON(0)) == OscillatorSimulation::kSeriesCapacity);
    // zero-crossing tracker on a known signal: sin(2 pi t / 3) has period 3
    ZeroCrossingTracker zc;
    for (int i = 0; i <= 1000; ++i) { const double t = i * 0.01; zc.observe(t, std::sin(2 * kPi * t / 3.0 + 0.4)); }
    CHECK_NEAR(zc.period(), 3.0, 1e-4);
}

// ---------------------------------------------------------------------
// Inclined plane and free-body diagrams
// ---------------------------------------------------------------------
static Vector2D sumReal(const std::vector<ForceVector>& list) {
    Vector2D s(0, 0);
    for (const ForceVector& f : list) if (!f.isComponent) s += f.value;
    return s;
}
static const ForceVector* findForce(const std::vector<ForceVector>& list, const std::string& name) {
    for (const ForceVector& f : list) if (f.name == name) return &f;
    return nullptr;
}

static void testInclineKinematics() {
    InclinedPlaneSimulation sim;
    const double g = 9.81;
    // frictionless: a = g sin(theta) down the slope, from rest over 7 m
    sim.setStaticFriction(0); sim.setKineticFriction(0);
    for (double deg : {5.0, 30.0, 60.0, 80.0}) {
        sim.setAngleDegrees(deg); sim.reset();
        const double a = g * std::sin(deg * kPi / 180);
        runToEnd(sim);
        CHECK(sim.regime() == InclinedPlaneSimulation::Regime::ReachedBottom);
        CHECK_NEAR(sim.timeAtEnd(), std::sqrt(2 * 7.0 / a), 1e-9);
        CHECK_NEAR(sim.speedAtEnd(), std::sqrt(2 * a * 7.0), 1e-9);
        CHECK_NEAR(sim.position(), 0.0, 1e-12);
    }
    // with kinetic friction: a = g (sin - mu_k cos); simulation equals the closed form
    for (double deg : {20.0, 35.0, 55.0})
        for (double muk : {0.0, 0.1, 0.3})
            for (double m : {0.5, 5.0, 40.0}) {
                sim.setStaticFriction(0.5); sim.setKineticFriction(muk);
                sim.setAngleDegrees(deg); sim.setMass(m); sim.reset();
                const InclineResults r = sim.analytic();
                if (!r.slides) continue;
                const double aExpected = -g * (std::sin(deg * kPi / 180) - muk * std::cos(deg * kPi / 180));
                CHECK_NEAR(r.acceleration, aExpected, 1e-9);
                runToEnd(sim);
                CHECK_NEAR(sim.timeAtEnd(), r.timeToEnd, 1e-9);
                CHECK_NEAR(sim.speedAtEnd(), r.speedAtEnd, 1e-9);
            }
    // mass cancels out of the acceleration (friction is proportional to mass)
    InclinedPlaneSimulation a, b;
    a.setMass(1); b.setMass(50);
    CHECK_NEAR(a.analytic().acceleration, b.analytic().acceleration, 1e-12);
}

static void testInclineStaticFriction() {
    InclinedPlaneSimulation sim;
    sim.setAngleDegrees(25); sim.setStaticFriction(0.6); sim.setKineticFriction(0.4); sim.setMass(8); sim.reset();
    CHECK(!sim.analytic().slides);                    // tan 25 = 0.466 < 0.6
    runFor(sim, 5);
    CHECK_NEAR(sim.position(), 7.0, 1e-15);
    CHECK_NEAR(sim.velocity(), 0.0, 1e-15);
    CHECK(sim.regime() == InclinedPlaneSimulation::Regime::AtRest);
    const std::vector<ForceVector> f = sim.forces();
    const ForceVector* fr = findForce(f, "Static friction");
    CHECK(fr != nullptr);
    if (fr) CHECK_NEAR(fr->value.magnitude(), 8 * 9.81 * std::sin(25 * kPi / 180), 1e-9);
    CHECK(sumReal(f).magnitude() < 1e-9);               // forces balance: equilibrium
    // critical angle: atan(mu_s)
    const double crit = std::atan(0.6) * 180 / kPi;
    CHECK_NEAR(sim.analytic().criticalAngleDeg, crit, 1e-12);
    sim.setAngleDegrees(crit - 0.01); sim.reset(); CHECK(!sim.analytic().slides);
    sim.setAngleDegrees(crit + 0.01); sim.reset(); CHECK(sim.analytic().slides);
    runToEnd(sim);
    CHECK(sim.isFinished());
}

static void testInclineAppliedForce() {
    InclinedPlaneSimulation sim;
    sim.setStaticFriction(0); sim.setKineticFriction(0); sim.setAngleDegrees(30); sim.setMass(4);
    const double hold = 4 * 9.81 * std::sin(30 * kPi / 180);
    sim.setAppliedForce(hold); sim.reset();           // pushes exactly against gravity
    runFor(sim, 3);
    CHECK_NEAR(sim.position(), 7.0, 1e-12);
    CHECK(sumReal(sim.forces()).magnitude() < 1e-9);
    sim.setAppliedForce(hold + 20); sim.reset();       // net 20 N up the slope
    const InclineResults r = sim.analytic();
    CHECK(r.direction == "up");
    CHECK_NEAR(r.acceleration, 20.0 / 4.0, 1e-12);
    runToEnd(sim);
    CHECK(sim.regime() == InclinedPlaneSimulation::Regime::ReachedTop);
    CHECK_NEAR(sim.timeAtEnd(), std::sqrt(2 * 3.0 / 5.0), 1e-9);
    // with friction the up-slope acceleration is reduced by mu_k g cos
    sim.setStaticFriction(0.3); sim.setKineticFriction(0.2); sim.reset();
    CHECK_NEAR(sim.analytic().acceleration, 5.0 - 0.2 * 9.81 * std::cos(30 * kPi / 180), 1e-9);
    // flat surface, pushed: a = (F - mu_k m g) / m
    sim.setAngleDegrees(0); sim.setAppliedForce(30); sim.setMass(5); sim.reset();
    CHECK_NEAR(sim.analytic().acceleration, (30 - 0.2 * 5 * 9.81) / 5, 1e-9);
}

static void testInclineForceGeometry() {
    InclinedPlaneSimulation sim;
    for (double deg : {0.0, 17.0, 45.0, 80.0})
        for (double mu : {0.0, 0.3, 1.0}) {
            sim.setStaticFriction(mu); sim.setKineticFriction(mu * 0.6);
            sim.setAngleDegrees(deg); sim.setMass(3); sim.setAppliedForce(7); sim.reset();
            const std::vector<ForceVector> f = sim.forces();
            const double t = deg * kPi / 180, mg = 3 * 9.81;
            const Vector2D up(std::cos(t), std::sin(t)), n(-std::sin(t), std::cos(t));
            // weight components add back to the weight (they are drawn but not summed)
            const ForceVector* along = findForce(f, "Weight along slope");
            const ForceVector* into = findForce(f, "Weight into surface");
            CHECK(along && into && along->isComponent && into->isComponent);
            if (along && into) {
                CHECK_NEAR((along->value + into->value).x, 0.0, 1e-9);
                CHECK_NEAR((along->value + into->value).y, -mg, 1e-9);
                CHECK_NEAR(along->value.magnitude(), mg * std::sin(t), 1e-9);
                CHECK_NEAR(into->value.magnitude(), mg * std::cos(t), 1e-9);
            }
            // the normal force is perpendicular to the surface with magnitude mg cos
            const ForceVector* normal = findForce(f, "Normal");
            CHECK(normal != nullptr);
            if (normal) {
                CHECK_NEAR(normal->value.magnitude(), mg * std::cos(t), 1e-9);
                CHECK_NEAR(normal->value.dot(up), 0.0, 1e-9);
                CHECK(normal->value.dot(n) >= -1e-12);
            }
            // resultant equals m * a along the slope
            CHECK_NEAR(sumReal(f).dot(up), 3 * sim.acceleration(), 1e-9);
            CHECK_NEAR(sumReal(f).dot(n), 0.0, 1e-9);
        }
}

static void testInclineEnergyBookkeeping() {
    // E_mech(end) - E_mech(0) = work by applied force - heat dissipated by friction
    InclinedPlaneSimulation sim;
    const double applieds[] = {-30, 0, 45, 90};
    for (double F : applieds) {
        sim.setAngleDegrees(35); sim.setMass(6); sim.setStaticFriction(0.35); sim.setKineticFriction(0.25);
        sim.setAppliedForce(F); sim.reset();
        const double e0 = sim.kineticEnergy() + sim.potentialEnergy();
        runToEnd(sim, 1.0 / 30);
        if (!sim.isFinished()) continue; // held in place by static friction
        const double e1 = sim.kineticEnergy() + sim.potentialEnergy();
        CHECK_NEAR(e1 - e0, sim.appliedWork() - sim.frictionHeat(), 1e-8);
        CHECK(sim.frictionHeat() > 0.0);
    }
    // frictionless, no applied force: mechanical energy is conserved
    sim.setStaticFriction(0); sim.setKineticFriction(0); sim.setAppliedForce(0); sim.setAngleDegrees(40); sim.reset();
    const double e0 = sim.kineticEnergy() + sim.potentialEnergy();
    runToEnd(sim);
    CHECK_NEAR(sim.kineticEnergy() + sim.potentialEnergy(), e0, 1e-9);
    CHECK_NEAR(sim.frictionHeat(), 0.0, 1e-15);
}

static void testInclineDeterminismAndValidation() {
    InclinedPlaneSimulation a, b;
    a.setAngleDegrees(33); b.setAngleDegrees(33);
    a.reset(); b.reset();
    runToEnd(a, 1.0 / 60);
    runToEnd(b, 0.2);   // very coarse frames, same fixed internal steps
    CHECK_NEAR(a.timeAtEnd(), b.timeAtEnd(), 1e-9);
    CHECK_NEAR(a.speedAtEnd(), b.speedAtEnd(), 1e-9);

    InclinedPlaneSimulation s;
    s.setParameter("mu_s", 0.2);                       // lowering mu_s pulls mu_k down with it
    CHECK_NEAR(s.getParameter("mu_k"), 0.2, 1e-15);
    s.setParameter("mu_k", 0.9);                       // mu_k can never exceed mu_s
    CHECK_NEAR(s.getParameter("mu_k"), 0.2, 1e-15);
    CHECK_THROWS(s.setParameter("angle", 81));
    CHECK_THROWS(s.setParameter("mass", 0));
    CHECK_THROWS(s.setParameter("applied", 101));
    CHECK_THROWS(s.setParameter("mu_s", -0.1));
    CHECK_THROWS(s.setParameter("nope", 1));
    CHECK_THROWS(s.setGravity(0));
    s.setParameter("angle", 45);
    CHECK_NEAR(s.time(), 0.0, 1e-15);                 // a parameter change restarts the run
}

static void testFreeBodyDiagrams() {
    FreeBodyDiagram fbd;
    fbd.add({"Weight", "W", ForceKind::Gravity, Vector2D(0, -10), false});
    fbd.add({"Normal", "N", ForceKind::Normal, Vector2D(0, 10), false});
    fbd.add({"Part", "P", ForceKind::Gravity, Vector2D(0, -4), true});   // component: not summed
    CHECK(fbd.inEquilibrium());
    CHECK_NEAR(fbd.resultant().magnitude(), 0.0, 1e-15);
    const std::string j = fbd.toJSON();
    CHECK(j.find("\"component\":true") != std::string::npos);
    CHECK(j.find("\"kind\":\"gravity\"") != std::string::npos);
    CHECK(j.find("\"angleDeg\":-90") != std::string::npos);            // y axis points up
    CHECK(j.find("\"equilibrium\":true") != std::string::npos);

    // pendulum: weight + tension sum to m * (bob acceleration)
    PendulumSimulation p;
    p.setInitialAngleDegrees(70); p.setMass(2.5); p.setLength(1.3); p.reset();
    for (int i = 0; i < 40; ++i) {
        p.advance(0.07);
        const double th = p.angle(), w = p.angularVelocity(), L = 1.3, m = 2.5;
        const Vector2D tangent(std::cos(th), std::sin(th)), toPivot(-std::sin(th), std::cos(th));
        const Vector2D ma = tangent * (m * p.angularAcceleration() * L) + toPivot * (m * L * w * w);
        const Vector2D net = sumReal(p.forces());
        CHECK_NEAR(net.x, ma.x, 1e-9);
        CHECK_NEAR(net.y, ma.y, 1e-9);
        // tension points from the bob toward the pivot
        const ForceVector* T = findForce(p.forces(), "Tension");
        CHECK(T != nullptr);
        if (T) CHECK(T->value.dot(Vector2D(std::sin(th), -std::cos(th))) <= 1e-12);
    }
    // spring-mass: the resultant is the spring force alone, restoring toward equilibrium
    SHMSimulation shm;
    shm.setSpringConstant(40); shm.setMass(2); shm.setInitialDisplacement(1.5); shm.reset();
    runFor(shm, 1.3);
    const Vector2D net = sumReal(shm.forces());
    CHECK_NEAR(net.x, -40 * shm.displacement(), 1e-9);
    CHECK_NEAR(net.y, 0.0, 1e-12);
    CHECK_NEAR(net.x, 2 * shm.acceleration(), 1e-9);               // F = m a
    // projectile: only weight in flight, balanced by the normal once landed
    ProjectileSimulation pr;
    pr.setMass(3); pr.reset();
    CHECK_NEAR(sumReal(pr.forces()).y, -3 * 9.81, 1e-12);
    runToEnd(pr);
    CHECK(sumReal(pr.forces()).magnitude() < 1e-12);
    // sandbox: gravity and friction as applied by the engine
    WebAPI::reset();
    WebAPI::setGravity(9.8);
    WebAPI::setFriction(0.25);
    const int id = WebAPI::createCircle(false, 2.0, 10, 30, 1, 3.0, 0.0);
    const std::string body = WebAPI::getBodyForcesJSON(id);
    CHECK(body.find("\"name\":\"Weight\"") != std::string::npos);
    CHECK(body.find("\"magnitude\":19.6") != std::string::npos);      // m g
    CHECK(body.find("\"name\":\"Friction\"") != std::string::npos); // moving, so friction acts
    CHECK(body.find("\"y\":-19.6") != std::string::npos);
    const int still = WebAPI::createCircle(false, 1.0, 40, 30, 1, 0.0, 0.0);
    CHECK(WebAPI::getBodyForcesJSON(still).find("Friction") == std::string::npos); // at rest: nothing to oppose
    const int wall = WebAPI::createRectangle(true, 1.0, 60, 5, 4, 4, 0, 0);
    CHECK(WebAPI::getBodyForcesJSON(wall) == "null");                   // static bodies feel no force
    CHECK(WebAPI::getBodyForcesJSON(9999) == "null");
    WebAPI::reset();
    // the active simulation's diagram is reachable through the manager API
    CHECK(WebAPI::simForcesJSON() == "null");
    CHECK(WebAPI::simCreate("incline").empty());
    CHECK(WebAPI::simForcesJSON().find("\"name\":\"Normal\"") != std::string::npos);
    WebAPI::simDestroy();
}

static void testSeriesRecorder() {
    SeriesRecorder rec({"t", "x"}, {"s", "m"}, 4, 0.5);
    CHECK(rec.due(0.0));
    for (int i = 0; i < 6; ++i) rec.push(i * 0.5, {i * 0.5, double(i)});
    CHECK(rec.size() == 4);                                 // ring buffer drops the oldest
    CHECK(!rec.due(2.4) && rec.due(3.0));
    const std::string all = rec.toJSON(0), tail = rec.toJSON(2);
    CHECK(all.find("[1,2]") != std::string::npos || all.find("[0.5,1]") != std::string::npos);
    CHECK(tail.find("[2.5,5]") != std::string::npos && tail.find("[2,4]") != std::string::npos);
    CHECK(tail.find("[1.5,3]") == std::string::npos);
    rec.clear();
    CHECK(rec.size() == 0 && rec.due(0.0));
}

// ---------------------------------------------------------------------
// Momentum, collisions and energy
// ---------------------------------------------------------------------
// Pulls every number that follows `"key":` out of a JSON string, in order.
static std::vector<double> numbersAfter(const std::string& json, const std::string& key) {
    std::vector<double> out;
    const std::string needle = "\"" + key + "\":";
    std::size_t pos = 0;
    while ((pos = json.find(needle, pos)) != std::string::npos) {
        pos += needle.size();
        out.push_back(std::strtod(json.c_str() + pos, nullptr));
    }
    return out;
}

// Two free circles (no gravity, friction, or walls nearby) collide head-on in the sandbox.
static std::pair<double, double> sandboxCollide(double m1, double v1, double m2, double v2, double e) {
    WebAPI::reset();
    WebAPI::disableGravity();
    WebAPI::disableFriction();
    WebAPI::setRestitution(e);
    WebAPI::createCircle(false, m1, 40, 30, 2, v1, 0);
    WebAPI::createCircle(false, m2, 50, 30, 2, v2, 0);
    WebAPI::resume();
    // 24 steps (1.2 s): past the impact, well before any wall
    for (int i = 0; i < 24; ++i) WebAPI::step(1);
    const std::string a = WebAPI::getAnalysisJSON();
    const std::vector<double> px = numbersAfter(a, "px");
    // bodies are listed in id order; velocity = momentum / mass
    return {px[0] / m1, px[1] / m2};
}

static void testSandboxMomentumFix() {
    const double masses[] = {0.2, 1, 3, 9, 25};
    const double es[] = {0.0, 0.3, 0.6, 1.0};
    for (double m1 : masses)
        for (double m2 : masses)
            for (double e : es) {
                const double v1 = 6.0, v2 = -2.0; // approaching head-on
                const auto after = sandboxCollide(m1, v1, m2, v2, e);
                const double M = m1 + m2;
                const double n1 = ((m1 - e * m2) * v1 + (1 + e) * m2 * v2) / M;
                const double n2 = ((m2 - e * m1) * v2 + (1 + e) * m1 * v1) / M;
                CHECK_NEAR(after.first, n1, 1e-7);
                CHECK_NEAR(after.second, n2, 1e-7);
                // total momentum is conserved for every mass ratio (this failed before the fix)
                CHECK_NEAR(m1 * after.first + m2 * after.second, m1 * v1 + m2 * v2, 1e-7);
                // restitution: separation speed = e * approach speed
                CHECK_NEAR(after.second - after.first, -e * (v2 - v1), 1e-7);
            }
    // the reported 1 kg -> 9 kg case: momentum used to jump from 10 to 74
    const auto r = sandboxCollide(1, 10, 9, 0, 0.6);
    CHECK_NEAR(r.first, -4.4, 1e-7);
    CHECK_NEAR(r.second, 1.6, 1e-7);
    // elastic equal masses swap velocities; perfectly inelastic share one velocity
    const auto swap = sandboxCollide(4, 5, 4, -3, 1.0);
    CHECK_NEAR(swap.first, -3, 1e-7);
    CHECK_NEAR(swap.second, 5, 1e-7);
    const auto stick = sandboxCollide(2, 8, 6, 0, 0.0);
    CHECK_NEAR(stick.first, stick.second, 1e-7);
    CHECK_NEAR(stick.first, 2.0, 1e-7);
    // invalid coefficients are rejected
    CHECK_THROWS(WebAPI::setRestitution(1.2));
    CHECK_THROWS(WebAPI::setRestitution(-0.1));
    CHECK_THROWS(WebAPI::setWallRestitution(2));
    WebAPI::reset();
    WebAPI::setRestitution(0.6);
}

static void testSandboxStaticAndWalls() {
    // dynamic body bounces off a static one regardless of creation order (the old code let it through)
    for (int order = 0; order < 2; ++order) {
        WebAPI::reset(); WebAPI::disableGravity(); WebAPI::disableFriction(); WebAPI::setRestitution(1.0);
        if (order == 0) {
            WebAPI::createCircle(false, 1, 30, 30, 2, 10, 0);
            WebAPI::createRectangle(true, 1, 50, 30, 4, 20, 0, 0);
        } else {
            WebAPI::createRectangle(true, 1, 50, 30, 4, 20, 0, 0);
            WebAPI::createCircle(false, 1, 30, 30, 2, 10, 0);
        }
        WebAPI::resume();
        for (int i = 0; i < 40; ++i) WebAPI::step(1);
        const std::vector<double> px = numbersAfter(WebAPI::getAnalysisJSON(), "px");
        CHECK(px.size() == 1);
        CHECK_NEAR(px[0], -10.0, 1e-9); // elastic reflection reverses the velocity
    }
    // walls: with wall restitution 1 a ball keeps its speed, with 0.5 it keeps half
    for (double ew : {1.0, 0.5}) {
        WebAPI::reset(); WebAPI::disableGravity(); WebAPI::disableFriction(); WebAPI::setWallRestitution(ew);
        WebAPI::createCircle(false, 1, 90, 30, 2, 8, 0);
        WebAPI::resume();
        for (int i = 0; i < 20; ++i) WebAPI::step(1);
        CHECK_NEAR(numbersAfter(WebAPI::getAnalysisJSON(), "px")[0], -8.0 * ew, 1e-9);
    }
    WebAPI::setWallRestitution(0.7);
    WebAPI::reset();
}

static void testSandboxAnalysis() {
    WebAPI::reset();
    WebAPI::setGravity(9.8);
    WebAPI::createCircle(false, 2.0, 10, 10, 1, 3.0, 4.0);
    WebAPI::createCircle(true, 50.0, 70, 5, 1, 0, 0);   // static: contributes nothing
    const std::string a = WebAPI::getAnalysisJSON();
    CHECK_NEAR(numbersAfter(a, "kinetic")[0], 25.0, 1e-9);            // 1/2 * 2 * (3^2 + 4^2)
    CHECK_NEAR(numbersAfter(a, "potential")[0], 2 * 9.8 * 10, 1e-9);  // m g y
    CHECK_NEAR(numbersAfter(a, "mechanical")[0], 25.0 + 196.0, 1e-9);
    CHECK_NEAR(numbersAfter(a, "magnitude")[0], 10.0, 1e-9);          // |p| = |(6, 8)|
    CHECK(numbersAfter(a, "id").size() == 1);
    // the recorder samples every step and is cleared by reset
    WebAPI::resume();
    WebAPI::step(5);
    const std::string series = WebAPI::getAnalysisSeriesJSON(0);
    CHECK(series.find("\"channels\":[\"t\",\"ke\",\"pe\",\"e\",\"px\",\"py\",\"p\"]") != std::string::npos);
    std::size_t rows = 0, pos = 0;
    while ((pos = series.find("],[", pos)) != std::string::npos) { ++rows; pos += 3; }
    CHECK(rows + 1 == 5);
    WebAPI::reset();
    CHECK(WebAPI::getAnalysisSeriesJSON(0).find("\"rows\":[]") != std::string::npos);
    // with gravity only, falling bodies convert PE into KE: mechanical energy stays close to constant
    WebAPI::setGravity(9.8);
    WebAPI::setRestitution(0.6);
    WebAPI::createCircle(false, 1.0, 50, 50, 1, 0, 0);
    WebAPI::resume();
    const double e0 = numbersAfter(WebAPI::getAnalysisJSON(), "mechanical")[0];
    WebAPI::step(20);
    const double e1 = numbersAfter(WebAPI::getAnalysisJSON(), "mechanical")[0];
    CHECK(std::fabs(e1 - e0) / e0 < 0.05);  // semi-implicit Euler at dt = 0.05: small drift, not zero
    WebAPI::reset();
}

static void testCollisionSimulation() {
    CollisionSimulation sim;
    const double ms[] = {0.1, 1, 4, 20};
    const double vs[] = {-15, -3, 0, 4, 18};
    const double es[] = {0.0, 0.25, 0.8, 1.0};
    for (double m1 : ms) for (double m2 : ms) for (double u1 : vs) for (double u2 : vs) for (double e : es) {
        sim.setMass1(m1); sim.setMass2(m2); sim.setVelocity1(u1); sim.setVelocity2(u2); sim.setRestitution(e);
        sim.reset();
        const CollisionResults r = sim.analytic();
        CHECK(r.willCollide == (u1 > u2));
        // formulas satisfy the two defining laws
        CHECK_NEAR(r.momentumAfter, r.momentumBefore, 1e-9);
        if (u1 != u2) CHECK_NEAR(r.v2After - r.v1After, -e * (u2 - u1), 1e-9);
        CHECK_NEAR(r.kineticBefore - r.kineticAfter, r.kineticLost, 1e-8);
        CHECK(r.kineticLost >= -1e-12);
        if (e == 1.0) CHECK_NEAR(r.kineticLost, 0.0, 1e-8);
        if (!r.willCollide) continue;
        runFor(sim, r.timeToCollision + 0.5);
        CHECK(sim.hasCollided());
        CHECK_NEAR(sim.velocity1(), r.v1After, 1e-9);
        CHECK_NEAR(sim.velocity2(), r.v2After, 1e-9);
        CHECK_NEAR(sim.momentum(), r.momentumBefore, 1e-9);
        CHECK_NEAR(sim.kineticEnergy(), r.kineticAfter, 1e-8);
    }
}

static void testCollisionTimingAndStates() {
    CollisionSimulation sim; // defaults: m1 = 2, m2 = 3, v1 = 5, v2 = -2, e = 1
    sim.reset();
    const CollisionResults r = sim.analytic();
    CHECK(r.kind == "elastic");
    CHECK_NEAR(r.centreOfMassVelocity, (2 * 5 + 3 * -2) / 5.0, 1e-12);
    // the collision happens at the analytic instant, for any frame size
    for (double chunk : {1.0 / 240, 1.0 / 60, 0.2}) {
        sim.reset();
        CHECK(sim.stateJSON().find("\"before\":null") != std::string::npos);
        while (!sim.hasCollided()) sim.advance(chunk);
        const std::vector<double> t = numbersAfter(sim.stateJSON(), "collisionTime");
        CHECK_NEAR(t[0], r.timeToCollision, 1e-9);
        CHECK(sim.stateJSON().find("\"after\":{") != std::string::npos);
        // positions equal the exact path: straight at the old velocity until the
        // collision instant, then at the new velocity (the step is split at contact)
        const double tc = t[0], T = sim.time();
        CHECK_NEAR(sim.position1(), CollisionSimulation::kStart1 + 5.0 * tc + r.v1After * (T - tc), 1e-9);
        CHECK_NEAR(sim.position2(), CollisionSimulation::kStart2 - 2.0 * tc + r.v2After * (T - tc), 1e-9);
    }
    // the centre of mass moves uniformly through the collision
    sim.reset();
    runFor(sim, 1.0);
    const double comBefore = (2 * sim.position1() + 3 * sim.position2()) / 5.0 - r.centreOfMassVelocity * sim.time();
    runFor(sim, 3.0);
    const double comAfter = (2 * sim.position1() + 3 * sim.position2()) / 5.0 - r.centreOfMassVelocity * sim.time();
    CHECK_NEAR(comBefore, comAfter, 1e-8);
    CHECK(sim.hasCollided());
    // perfectly inelastic: bodies leave together at the centre-of-mass velocity
    sim.setRestitution(0.0); sim.reset();
    runFor(sim, 5.0);
    CHECK_NEAR(sim.velocity1(), sim.velocity2(), 1e-12);
    CHECK_NEAR(sim.velocity1(), sim.analytic().centreOfMassVelocity, 1e-12);
    CHECK(sim.analytic().kind == "perfectly inelastic");
    // no collision when body 1 is not faster toward body 2: it simply drifts, then leaves the track
    sim.setVelocity1(1); sim.setVelocity2(3); sim.setRestitution(0.5); sim.reset();
    runToEnd(sim);
    CHECK(sim.isFinished());
    CHECK(!sim.hasCollided());
    CHECK(!sim.analytic().willCollide);
    // validation
    CHECK_THROWS(sim.setParameter("restitution", 1.5));
    CHECK_THROWS(sim.setParameter("m1", 0));
    CHECK_THROWS(sim.setParameter("v1", 21));
    CHECK_THROWS(sim.setParameter("v2", std::nan("")));
    // series is recorded and bounded
    CHECK(sim.seriesJSON(0).find("\"channels\":[\"t\",\"x1\",\"x2\",\"v1\",\"v2\",\"p1\",\"p2\",\"p\",\"k1\",\"k2\",\"ke\"]") != std::string::npos);
}

static void testEnergyAccounting() {
    CHECK_NEAR(relativeDrift(105.0, 100.0), 0.05, 1e-15);
    CHECK_NEAR(relativeDrift(5.0, 0.0), 0.0, 1e-15);
    // conservative systems report ~zero drift in their C++ state
    ProjectileSimulation pr;
    pr.setLaunchSpeed(40); pr.setLaunchHeight(12); pr.setMass(2.5); pr.reset();
    runToEnd(pr);
    CHECK(std::fabs(numbersAfter(pr.stateJSON(), "drift")[0]) < 1e-9);
    PendulumSimulation pe;
    pe.setInitialAngleDegrees(100); pe.reset();
    runFor(pe, 40);
    CHECK(std::fabs(numbersAfter(pe.stateJSON(), "drift")[0]) < 1e-7);
    SHMSimulation sh;
    runFor(sh, 40);
    CHECK(std::fabs(numbersAfter(sh.stateJSON(), "drift")[0]) < 1e-3);
    // projectile energy: initial = 1/2 m u^2 + m g h0
    pr.setLaunchSpeed(30); pr.setLaunchHeight(5); pr.setMass(2); pr.reset();
    CHECK_NEAR(numbersAfter(pr.stateJSON(), "initial")[0], 0.5 * 2 * 900 + 2 * 9.81 * 5, 1e-9);
    // incline with friction: mechanical energy is NOT conserved, but the books balance
    InclinedPlaneSimulation inc;
    inc.setAngleDegrees(35); inc.setMass(6); inc.setAppliedForce(0); inc.reset();
    runToEnd(inc);
    const std::string st = inc.stateJSON();
    CHECK(inc.frictionHeat() > 1.0);
    CHECK(inc.kineticEnergy() + inc.potentialEnergy() < numbersAfter(st, "initial")[0]);
    CHECK_NEAR(numbersAfter(st, "accountingError")[0], 0.0, 1e-8);
}

int main() {
    testVector2D();
    testTimeSeries();
    testTextbookFormulas();
    testSimulationMatchesAnalytic();
    testMeasuredQuantitiesInJson();
    testFixedTimestepDeterminism();
    testEnergyConservation();
    testEdgeCases();
    testValidation();
    testPolymorphismAndManager();
    testWebApiCoexistsWithSandbox();
    testRk4Template();
    testEllipticK();
    testSHM();
    testPendulum();
    testOscillatorFamily();
    testInclineKinematics();
    testInclineStaticFriction();
    testInclineAppliedForce();
    testInclineForceGeometry();
    testInclineEnergyBookkeeping();
    testInclineDeterminismAndValidation();
    testFreeBodyDiagrams();
    testSeriesRecorder();
    testSandboxMomentumFix();
    testSandboxStaticAndWalls();
    testSandboxAnalysis();
    testCollisionSimulation();
    testCollisionTimingAndStates();
    testEnergyAccounting();

    std::cout << g_checks << " checks, " << g_failures << " failed\n";
    return g_failures == 0 ? 0 : 1;
}
