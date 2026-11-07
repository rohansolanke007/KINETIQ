#include "Force.h"
#include "PhysicsObject.h"

// ----------------------- Force (shared behaviour) -----------------------

void Force::apply(PhysicsObject& obj) const {
    const Vector2D f = forceOn(obj);
    if (f.x != 0.0 || f.y != 0.0) obj.applyForce(f);
}

// ----------------------- GravityForce -----------------------

GravityForce::GravityForce(double g) : g(g) {}

Vector2D GravityForce::forceOn(const PhysicsObject& obj) const {
    if (obj.isStatic()) return Vector2D(0.0, 0.0); // gravity has no visible effect on immovable bodies
    // Fg = m * g, acting downward (negative Y)
    return Vector2D(0.0, -obj.getMass() * g);
}

// ----------------------- FrictionForce -----------------------

FrictionForce::FrictionForce(double coefficient) : coefficient(coefficient) {}

Vector2D FrictionForce::forceOn(const PhysicsObject& obj) const {
    if (obj.isStatic()) return Vector2D(0.0, 0.0);
    Vector2D vel = obj.getVelocity();
    if (vel.magnitude() < 1e-6) return Vector2D(0.0, 0.0); // nothing to oppose

    // Simplified kinetic friction model: a force opposing the direction
    // of motion, proportional to normal force (approximated as m*g)
    // and the friction coefficient. This is intentionally simplified
    // (no real normal-force/contact computation) to stay within the
    // "mathematically understandable" scope of the project.
    const double gConst = 9.8;
    double frictionMag = coefficient * obj.getMass() * gConst;
    return vel.normalized() * (-frictionMag);
}

// ----------------------- AppliedForce -----------------------

AppliedForce::AppliedForce(const Vector2D& force) : force(force) {}

Vector2D AppliedForce::forceOn(const PhysicsObject& obj) const {
    if (obj.isStatic()) return Vector2D(0.0, 0.0);
    return force;
}
