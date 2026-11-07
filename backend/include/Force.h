#ifndef FORCE_H
#define FORCE_H

#include <string>
#include "FreeBodyDiagram.h"
#include "Vector2D.h"

class PhysicsObject; // forward declaration - Force only needs a reference/pointer

// Force (Abstract Base Class)
// ----------------------------------------------------------------
// Represents anything that can push/pull a PhysicsObject.
// Each concrete Force knows HOW to compute and apply itself to a
// given object; the caller (World) does not need to know the details.
//
// OOP concepts demonstrated:
//   - Abstract class / pure virtual apply()
//   - Runtime polymorphism (World stores Force* / holds them uniformly)
//   - Inheritance (GravityForce, FrictionForce, AppliedForce)
// ----------------------------------------------------------------
class Force {
public:
    virtual ~Force() = default;

    // What this force contributes to `obj` right now, WITHOUT changing it.
    // Each concrete force supplies its own law here (runtime polymorphism).
    virtual Vector2D forceOn(const PhysicsObject& obj) const = 0;
    virtual ForceKind kind() const = 0;
    virtual std::string getName() const = 0;

    // Adds forceOn(obj) to the object (template method: shared by all forces).
    // Reading the force with forceOn() and applying it therefore always agree,
    // which is what lets a free-body diagram show exactly what the engine does.
    void apply(PhysicsObject& obj) const;
};

class GravityForce : public Force {
private:
    double g; // gravitational acceleration (m/s^2), e.g. 9.8
public:
    explicit GravityForce(double g = 9.8);
    Vector2D forceOn(const PhysicsObject& obj) const override;
    ForceKind kind() const override { return ForceKind::Gravity; }
    std::string getName() const override { return "Gravity"; }
    double getG() const { return g; }
};

class FrictionForce : public Force {
private:
    double coefficient; // simplified friction coefficient (0..1)
public:
    explicit FrictionForce(double coefficient = 0.1);
    Vector2D forceOn(const PhysicsObject& obj) const override;
    ForceKind kind() const override { return ForceKind::Friction; }
    std::string getName() const override { return "Friction"; }
    double getCoefficient() const { return coefficient; }
};

class AppliedForce : public Force {
private:
    Vector2D force;
public:
    explicit AppliedForce(const Vector2D& force);
    Vector2D forceOn(const PhysicsObject& obj) const override;
    ForceKind kind() const override { return ForceKind::Applied; }
    std::string getName() const override { return "AppliedForce"; }
};

#endif // FORCE_H
