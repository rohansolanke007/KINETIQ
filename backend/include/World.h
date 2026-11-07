#ifndef WORLD_H
#define WORLD_H

#include <vector>
#include <queue>
#include <stack>
#include <memory>
#include "Vector2D.h"
#include "PhysicsObject.h"
#include "Force.h"
#include "Collision.h"
#include "ObjectManager.h"
#include "SimulationState.h"
#include "Statistics.h"

// World
// ----------------------------------------------------------------
// Owns and manages the physical contents of the simulation: the
// objects, the global forces (gravity/friction), and the collision
// manager. World is responsible for advancing the simulation by one
// timestep (step()) and enforcing the simulation boundaries.
//
// World is deliberately kept separate from PhysicsEngine: World =
// physics STATE + rules, PhysicsEngine = simulation CONTROL
// (start/pause/resume/reset). This avoids a single "god object".
//
// OOP concepts / STL demonstrated:
//   - Composition (owns ObjectManager<PhysicsObject>, Forces, etc.)
//   - std::vector<unique_ptr<Force>>, std::queue<Collision>,
//     std::stack<SimulationState>
//   - Polymorphism (Force::apply, PhysicsObject::update)
// ----------------------------------------------------------------
class World {
private:
    ObjectManager<PhysicsObject> objects;

    std::unique_ptr<Force> gravity;   // nullptr = disabled
    std::unique_ptr<Force> friction;  // nullptr = disabled

    CollisionManager collisionManager;
    std::queue<Collision> recentCollisionEvents; // most recent frame's events
    int totalCollisionCount = 0;

    std::stack<SimulationState> history; // for undo

    double simulationTime = 0.0;
    Vector2D boundaryMin;
    Vector2D boundaryMax;
    double wallRestitution = 0.7; // fraction of speed kept when bouncing off a wall

public:
    World(const Vector2D& boundaryMin, const Vector2D& boundaryMax);

    int addObject(std::unique_ptr<PhysicsObject> obj);
    bool removeObject(int id);
    PhysicsObject* findObject(int id);

    // The continuous forces (gravity, friction) currently acting on one body,
    // read from the same Force objects step() applies. Empty if id is unknown.
    std::vector<ForceVector> forcesOn(int id);

    void setGravity(double g);
    void disableGravity();
    // Coefficient of restitution for body-body collisions and for walls.
    // Both are 0..1; 1 conserves kinetic energy, lower values dissipate it.
    void setRestitution(double e) { collisionManager.setRestitution(e); }
    double getRestitution() const { return collisionManager.getRestitution(); }
    void setWallRestitution(double e);
    double getWallRestitution() const { return wallRestitution; }

    void setFriction(double coefficient);
    void disableFriction();

    // One-shot impulse applied directly to a single object "right now"
    // (as opposed to gravity/friction, which act continuously every step).
    void applyImpulse(int id, const Vector2D& force);

    void step(double dt);
    void reset();
    void enforceBoundaries();

    void pushHistory();
    bool undo(); // returns false if there is nothing to undo

    void loadState(const SimulationState& state);

    const ObjectManager<PhysicsObject>& getObjects() const { return objects; }
    double getSimulationTime() const { return simulationTime; }
    std::vector<Collision> getRecentCollisionsSnapshot() const;
    int getTotalCollisionCount() const { return totalCollisionCount; }

    Vector2D getBoundaryMin() const { return boundaryMin; }
    Vector2D getBoundaryMax() const { return boundaryMax; }
    bool hasGravity() const { return gravity != nullptr; }
    double getGravity() const { return gravity ? static_cast<const GravityForce*>(gravity.get())->getG() : 0.0; }
    bool hasFriction() const { return friction != nullptr; }
    double getFriction() const { return friction ? static_cast<const FrictionForce*>(friction.get())->getCoefficient() : 0.0; }

    Statistics computeStatistics() const;
};

#endif // WORLD_H
