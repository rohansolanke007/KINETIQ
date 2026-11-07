#ifndef COLLISION_H
#define COLLISION_H

#include <vector>
#include <set>
#include <utility>
#include "Vector2D.h"
#include "ObjectManager.h"
#include "PhysicsObject.h"

// Collision
// ----------------------------------------------------------------
// A plain data record describing one collision event between two
// objects. Kept deliberately simple (no behaviour) - it is produced
// by CollisionManager and consumed by World/Statistics/UI.
// ----------------------------------------------------------------
struct Collision {
    int idA;
    int idB;
    Vector2D normal;      // direction from A to B, unit length
    double penetration;   // how much the two bounding circles overlap
};

// CollisionManager
// ----------------------------------------------------------------
// Detects and resolves collisions between all active PhysicsObjects.
//
// Design simplification (documented, not accidental): rather than
// implementing exact polygon-vs-polygon collision math for every
// Circle/Rectangle/Triangle combination - which is real geometry
// research, not a second-year OOP exercise - every shape exposes
// getBoundingRadius(), and collisions are detected/resolved using
// circle-circle math against those bounding radii. This keeps the
// physics "mathematically understandable" while still supporting
// any mix of shape types.
//
// OOP concepts demonstrated:
//   - STL usage: std::vector<Collision>, std::set<pair<int,int>>
//   - Works purely through the PhysicsObject public interface
//     (encapsulation - it never touches shape internals directly)
// ----------------------------------------------------------------
class CollisionManager {
public:
    static constexpr double kDefaultRestitution = 0.6;

    std::vector<Collision> detectCollisions(const ObjectManager<PhysicsObject>& objects);

    // Coefficient of restitution e = (speed of separation) / (speed of approach),
    // measured along the collision normal. e = 1 is perfectly elastic (kinetic
    // energy kept), e = 0 is perfectly inelastic (the bodies end with the same
    // velocity along the normal).
    double getRestitution() const { return restitution_; }
    void setRestitution(double e);
    void resolveCollisions(ObjectManager<PhysicsObject>& objects, const std::vector<Collision>& collisions);

private:
    double restitution_ = kDefaultRestitution;
};

#endif // COLLISION_H
