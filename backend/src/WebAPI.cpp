#include "WebAPI.h"
#include "PhysicsEngine.h"
#include "Exceptions.h"
#include "SeriesRecorder.h"
#include "SimulationManager.h"
#include <iomanip>
#include <sstream>
#include <memory>
#include <cmath>

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#endif

namespace {
    // The browser owns one long-lived simulation instance.
    PhysicsEngine engine(Vector2D(0.0, 0.0), Vector2D(100.0, 60.0), 0.05);

    // Recording of the sandbox totals (energy, momentum) for graphs and export.
    SeriesRecorder sandboxRecorder({"t", "ke", "pe", "e", "px", "py", "p"},
                                   {"s", "J", "J", "J", "kg\xC2\xB7m/s", "kg\xC2\xB7m/s", "kg\xC2\xB7m/s"}, 6000, 0.01);
    double lastRecordedTime = -1.0;

    struct SandboxTotals {
        double kinetic = 0.0, potential = 0.0, px = 0.0, py = 0.0;
    };

    // Sums over the dynamic bodies. Potential energy is m g (y - yFloor).
    SandboxTotals sandboxTotals(const World& world, std::ostringstream* bodies) {
        SandboxTotals t;
        const double g = world.hasGravity() ? world.getGravity() : 0.0;
        const double floorY = world.getBoundaryMin().y;
        bool first = true;
        for (const auto& pair : world.getObjects().getAll()) {
            const PhysicsObject* obj = pair.second.get();
            if (obj->isStatic()) continue;
            const double m = obj->getMass();
            const Vector2D v = obj->getVelocity();
            const double ke = 0.5 * m * (v.x * v.x + v.y * v.y);
            const double pe = m * g * (obj->getPosition().y - floorY);
            t.kinetic += ke;
            t.potential += pe;
            t.px += m * v.x;
            t.py += m * v.y;
            if (bodies) {
                if (!first) *bodies << ",";
                first = false;
                *bodies << "{\"id\":" << obj->getId() << ",\"mass\":" << m << ",\"kinetic\":" << ke
                        << ",\"potential\":" << pe << ",\"px\":" << m * v.x << ",\"py\":" << m * v.y << "}";
            }
        }
        return t;
    }

    void recordSandbox() {
        const World& world = engine.getWorld();
        const double now = world.getSimulationTime();
        if (now < lastRecordedTime) sandboxRecorder.clear(); // undo or reset moved time backwards
        lastRecordedTime = now;
        const SandboxTotals t = sandboxTotals(world, nullptr);
        sandboxRecorder.push(now, {now, t.kinetic, t.potential, t.kinetic + t.potential, t.px, t.py,
                                   std::hypot(t.px, t.py)});
    }

    // The dedicated-simulation manager (separate from the sandbox engine).
    SimulationManager simulations;

    void ensureFinite(double value, const char* name) {
        if (!std::isfinite(value)) {
            throw InvalidSimulationException(std::string(name) + " must be finite.");
        }
    }

    std::string shapeParamsJSON(const Shape* shape) {
        std::ostringstream out;
        out << "[";
        switch (shape->getType()) {
            case ShapeType::CIRCLE: {
                const auto* c = static_cast<const Circle*>(shape);
                out << c->getRadius();
                break;
            }
            case ShapeType::RECTANGLE: {
                const auto* r = static_cast<const Rectangle*>(shape);
                out << r->getWidth() << "," << r->getHeight();
                break;
            }
            case ShapeType::TRIANGLE: {
                const auto* t = static_cast<const Triangle*>(shape);
                out << t->getBase() << "," << t->getHeight();
                break;
            }
        }
        out << "]";
        return out.str();
    }

}

namespace WebAPI {

void reset() {
    sandboxRecorder.clear();
    lastRecordedTime = -1.0;
    engine.getWorld().reset();
    engine.setTimeStep(0.05);
    engine.resume();
}

void pause() { engine.pause(); }
void resume() { engine.resume(); }
bool isPaused() { return engine.isPaused(); }

void setTimeStep(double dt) {
    ensureFinite(dt, "Time step");
    engine.setTimeStep(dt);
}

double getTimeStep() { return engine.getTimeStep(); }

void setGravity(double g) {
    ensureFinite(g, "Gravity");
    if (g == 0.0) engine.getWorld().disableGravity();
    else engine.getWorld().setGravity(g);
}

void disableGravity() { engine.getWorld().disableGravity(); }

void setFriction(double coefficient) {
    ensureFinite(coefficient, "Friction coefficient");
    if (coefficient <= 0.0) engine.getWorld().disableFriction();
    else engine.getWorld().setFriction(coefficient);
}

void disableFriction() { engine.getWorld().disableFriction(); }

int createCircle(bool isStatic, double mass, double x, double y,
                 double radius, double vx, double vy) {
    ensureFinite(mass, "Mass"); ensureFinite(x, "X"); ensureFinite(y, "Y");
    ensureFinite(radius, "Radius"); ensureFinite(vx, "Velocity X"); ensureFinite(vy, "Velocity Y");
    std::unique_ptr<Shape> shape = std::make_unique<Circle>(radius);
    std::unique_ptr<PhysicsObject> obj;
    if (isStatic) obj = std::make_unique<StaticObject>(Vector2D(x, y), std::move(shape));
    else obj = std::make_unique<DynamicObject>(mass, Vector2D(x, y), std::move(shape));
    obj->setVelocity(Vector2D(vx, vy));
    return engine.getWorld().addObject(std::move(obj));
}

int createRectangle(bool isStatic, double mass, double x, double y,
                    double width, double height, double vx, double vy) {
    ensureFinite(mass, "Mass"); ensureFinite(x, "X"); ensureFinite(y, "Y");
    ensureFinite(width, "Width"); ensureFinite(height, "Height");
    ensureFinite(vx, "Velocity X"); ensureFinite(vy, "Velocity Y");
    std::unique_ptr<Shape> shape = std::make_unique<Rectangle>(width, height);
    std::unique_ptr<PhysicsObject> obj;
    if (isStatic) obj = std::make_unique<StaticObject>(Vector2D(x, y), std::move(shape));
    else obj = std::make_unique<DynamicObject>(mass, Vector2D(x, y), std::move(shape));
    obj->setVelocity(Vector2D(vx, vy));
    return engine.getWorld().addObject(std::move(obj));
}

int createTriangle(bool isStatic, double mass, double x, double y,
                   double base, double height, double vx, double vy) {
    ensureFinite(mass, "Mass"); ensureFinite(x, "X"); ensureFinite(y, "Y");
    ensureFinite(base, "Base"); ensureFinite(height, "Height");
    ensureFinite(vx, "Velocity X"); ensureFinite(vy, "Velocity Y");
    std::unique_ptr<Shape> shape = std::make_unique<Triangle>(base, height);
    std::unique_ptr<PhysicsObject> obj;
    if (isStatic) obj = std::make_unique<StaticObject>(Vector2D(x, y), std::move(shape));
    else obj = std::make_unique<DynamicObject>(mass, Vector2D(x, y), std::move(shape));
    obj->setVelocity(Vector2D(vx, vy));
    return engine.getWorld().addObject(std::move(obj));
}

bool removeObject(int id) { return engine.getWorld().removeObject(id); }

void setObjectPosition(int id, double x, double y) {
    ensureFinite(x, "X"); ensureFinite(y, "Y");
    PhysicsObject* obj = engine.getWorld().findObject(id);
    if (!obj) throw InvalidObjectException("No object with id " + std::to_string(id) + ".");
    obj->setPosition(Vector2D(x, y));
}

void setObjectVelocity(int id, double vx, double vy) {
    ensureFinite(vx, "Velocity X"); ensureFinite(vy, "Velocity Y");
    PhysicsObject* obj = engine.getWorld().findObject(id);
    if (!obj) throw InvalidObjectException("No object with id " + std::to_string(id) + ".");
    obj->setVelocity(Vector2D(vx, vy));
}

void applyImpulse(int id, double fx, double fy) {
    ensureFinite(fx, "Force X"); ensureFinite(fy, "Force Y");
    engine.getWorld().applyImpulse(id, Vector2D(fx, fy));
}

void step(int count) {
    if (count < 0) throw InvalidSimulationException("Step count cannot be negative.");
    // One step at a time so every step's energy and momentum is recorded.
    for (int i = 0; i < count; ++i) {
        if (engine.runSteps(1) > 0) recordSandbox();
    }
}

bool undo() {
    const bool ok = engine.getWorld().undo();
    if (ok) recordSandbox();
    return ok;
}

void setRestitution(double e) { engine.getWorld().setRestitution(e); }
void setWallRestitution(double e) { engine.getWorld().setWallRestitution(e); }

std::string getAnalysisJSON() {
    const World& world = engine.getWorld();
    std::ostringstream bodies;
    bodies << std::setprecision(10);
    const SandboxTotals t = sandboxTotals(world, &bodies);
    std::ostringstream out;
    out << std::setprecision(10);
    out << "{\"time\":" << world.getSimulationTime() << ",\"kinetic\":" << t.kinetic
        << ",\"potential\":" << t.potential << ",\"mechanical\":" << t.kinetic + t.potential
        << ",\"momentum\":{\"x\":" << t.px << ",\"y\":" << t.py << ",\"magnitude\":" << std::hypot(t.px, t.py)
        << "},\"bodies\":[" << bodies.str() << "]}";
    return out.str();
}

std::string getAnalysisSeriesJSON(int maxRows) {
    return sandboxRecorder.toJSON(maxRows > 0 ? static_cast<std::size_t>(maxRows) : 0);
}

std::string getStateJSON() {
    std::ostringstream out;
    out << std::setprecision(10);
    const World& world = engine.getWorld();
    Statistics stats = world.computeStatistics();

    out << "{\"time\":" << world.getSimulationTime()
        << ",\"timeStep\":" << engine.getTimeStep()
        << ",\"paused\":" << (engine.isPaused() ? "true" : "false")
        << ",\"gravity\":" << world.getGravity()
        << ",\"friction\":" << world.getFriction()
        << ",\"gravityEnabled\":" << (world.hasGravity() ? "true" : "false")
        << ",\"frictionEnabled\":" << (world.hasFriction() ? "true" : "false")
        << ",\"restitution\":" << world.getRestitution()
        << ",\"wallRestitution\":" << world.getWallRestitution()
        << ",\"boundaryMin\":{\"x\":" << world.getBoundaryMin().x << ",\"y\":" << world.getBoundaryMin().y << "}"
        << ",\"boundaryMax\":{\"x\":" << world.getBoundaryMax().x << ",\"y\":" << world.getBoundaryMax().y << "}"
        << ",\"stats\":{\"objects\":" << stats.objectCount
        << ",\"dynamic\":" << stats.dynamicCount
        << ",\"static\":" << stats.staticCount
        << ",\"kineticEnergy\":" << stats.totalKineticEnergy
        << ",\"collisions\":" << stats.totalCollisions << "}"
        << ",\"recentCollisions\":[";

    auto collisions = world.getRecentCollisionsSnapshot();
    for (size_t i = 0; i < collisions.size(); ++i) {
        const auto& c = collisions[i];
        if (i) out << ",";
        out << "{\"a\":" << c.idA << ",\"b\":" << c.idB
            << ",\"penetration\":" << c.penetration << "}";
    }
    out << "],\"objects\":[";

    size_t index = 0;
    for (const auto& pair : world.getObjects().getAll()) {
        const PhysicsObject* obj = pair.second.get();
        Vector2D pos = obj->getPosition();
        Vector2D vel = obj->getVelocity();
        Vector2D acc = obj->getAcceleration();
        const Shape* shape = obj->getShape();
        if (index++) out << ",";
        out << "{\"id\":" << obj->getId()
            << ",\"kind\":\"" << obj->getKindName() << "\""
            << ",\"isStatic\":" << (obj->isStatic() ? "true" : "false")
            << ",\"shape\":\"" << shape->getName() << "\""
            << ",\"shapeType\":" << static_cast<int>(shape->getType())
            << ",\"shapeParams\":" << shapeParamsJSON(shape)
            << ",\"mass\":" << obj->getMass()
            << ",\"pos\":{\"x\":" << pos.x << ",\"y\":" << pos.y << "}"
            << ",\"vel\":{\"x\":" << vel.x << ",\"y\":" << vel.y << "}"
            << ",\"acc\":{\"x\":" << acc.x << ",\"y\":" << acc.y << "}"
            << ",\"radius\":" << shape->getBoundingRadius()
            << "}";
    }
    out << "]}";
    return out.str();
}

} // namespace WebAPI

namespace WebAPI {
std::string getBodyForcesJSON(int id) {
    const std::vector<ForceVector> list = engine.getWorld().forcesOn(id);
    if (list.empty()) return "null";
    FreeBodyDiagram diagram;
    for (const ForceVector& f : list) diagram.add(f);
    return diagram.toJSON();
}
} // namespace WebAPI

// ---- Dedicated simulations -------------------------------------------
// Each wrapper converts C++ exceptions into messages the UI can show.
namespace WebAPI {

std::string simCreate(const std::string& type) {
    try {
        simulations.select(type);
        return "";
    } catch (const std::exception& e) {
        return e.what();
    }
}

void simDestroy() { simulations.clear(); }

std::string simSetParameter(const std::string& name, double value) {
    try {
        simulations.active().setParameter(name, value);
        return "";
    } catch (const std::exception& e) {
        return e.what();
    }
}

std::string simReset() {
    try {
        simulations.active().reset();
        return "";
    } catch (const std::exception& e) {
        return e.what();
    }
}

void simAdvance(double seconds) {
    if (simulations.hasActive()) simulations.active().advance(seconds);
}

void simStepFrame() {
    if (simulations.hasActive()) simulations.active().stepFrame();
}

std::string simStateJSON() { return simulations.hasActive() ? simulations.active().stateJSON() : "null"; }
std::string simInfoJSON() { return simulations.hasActive() ? simulations.active().infoJSON() : "null"; }
std::string simSeriesJSON(int maxRows) {
    return simulations.hasActive()
               ? simulations.active().seriesJSON(maxRows > 0 ? static_cast<std::size_t>(maxRows) : 0)
               : "null";
}

std::string simForcesJSON() {
    return simulations.hasActive() ? simulations.active().forcesJSON() : "null";
}

} // namespace WebAPI

#ifdef __EMSCRIPTEN__
EMSCRIPTEN_BINDINGS(mini_physics_engine) {
    using namespace emscripten;
    function("reset", &WebAPI::reset);
    function("pause", &WebAPI::pause);
    function("resume", &WebAPI::resume);
    function("isPaused", &WebAPI::isPaused);
    function("setTimeStep", &WebAPI::setTimeStep);
    function("getTimeStep", &WebAPI::getTimeStep);
    function("setGravity", &WebAPI::setGravity);
    function("disableGravity", &WebAPI::disableGravity);
    function("setFriction", &WebAPI::setFriction);
    function("disableFriction", &WebAPI::disableFriction);
    function("createCircle", &WebAPI::createCircle);
    function("createRectangle", &WebAPI::createRectangle);
    function("createTriangle", &WebAPI::createTriangle);
    function("removeObject", &WebAPI::removeObject);
    function("setObjectPosition", &WebAPI::setObjectPosition);
    function("setObjectVelocity", &WebAPI::setObjectVelocity);
    function("applyImpulse", &WebAPI::applyImpulse);
    function("step", &WebAPI::step, allow_raw_pointers());
    function("undo", &WebAPI::undo);
    function("getStateJSON", &WebAPI::getStateJSON);
    function("setRestitution", &WebAPI::setRestitution);
    function("setWallRestitution", &WebAPI::setWallRestitution);
    function("getAnalysisJSON", &WebAPI::getAnalysisJSON);
    function("getAnalysisSeriesJSON", &WebAPI::getAnalysisSeriesJSON);
    function("simCreate", &WebAPI::simCreate);
    function("simDestroy", &WebAPI::simDestroy);
    function("simSetParameter", &WebAPI::simSetParameter);
    function("simReset", &WebAPI::simReset);
    function("simAdvance", &WebAPI::simAdvance);
    function("simStepFrame", &WebAPI::simStepFrame);
    function("simStateJSON", &WebAPI::simStateJSON);
    function("simInfoJSON", &WebAPI::simInfoJSON);
    function("simSeriesJSON", &WebAPI::simSeriesJSON);
    function("simForcesJSON", &WebAPI::simForcesJSON);
    function("getBodyForcesJSON", &WebAPI::getBodyForcesJSON);
}
#endif
