#ifndef ENVIRONMENT_H
#define ENVIRONMENT_H

#include "Exceptions.h"
#include <cmath>

// Environment
// ----------------------------------------------------------------
// The physical surroundings of an experiment. Simulations OWN an
// Environment (composition) instead of each re-implementing gravity
// validation. Grows later with fields such as air drag.
//
// Encapsulation: the field is private; setGravity() rejects values that
// would make the physics meaningless.
// ----------------------------------------------------------------
class Environment {
public:
    static constexpr double kEarthGravity = 9.81;
    static constexpr double kMaxGravity = 100.0;

    explicit Environment(double gravity = kEarthGravity) : gravity_(kEarthGravity) {
        setGravity(gravity);
    }

    double getGravity() const { return gravity_; }

    // Gravity must be a finite, strictly positive magnitude in m/s^2
    // (it always acts downward, in the -y direction).
    void setGravity(double g) {
        if (!std::isfinite(g) || g <= 0.0 || g > kMaxGravity) {
            throw InvalidSimulationException("gravity must be greater than 0 and at most 100 m/s^2.");
        }
        gravity_ = g;
    }

private:
    double gravity_;
};

#endif // ENVIRONMENT_H
