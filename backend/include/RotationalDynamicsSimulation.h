#ifndef ROTATIONAL_DYNAMICS_SIMULATION_H
#define ROTATIONAL_DYNAMICS_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <cmath>
#include <string>
#include <vector>

// Body shape identifiers for moment-of-inertia selection.
enum class BodyShape {
    SolidDisc = 0,       // I = 0.5 M R^2
    SolidCylinder = 1,   // I = 0.5 M R^2  (same as disc for uniform solid)
    SolidSphere = 2,     // I = 0.4 M R^2
    HollowSphere = 3,    // I = (2/3) M R^2
    ThinRing = 4,        // I = M R^2
    ThinRodCentre = 5,   // I = M L^2 / 12  (uses radius_ as half-length)
    ThinRodEnd = 6,      // I = M L^2 / 3   (uses radius_ as length)
};

// Pre-computed analytic results for rotational dynamics.
struct RotationalDynamicsResults {
    double momentOfInertia = 0.0;    // I  (kg·m^2)
    double torque = 0.0;             // tau = r F sin(theta)  (N·m)
    double angularAccel = 0.0;       // alpha = tau / I  (rad/s^2)
    double angularMomentum = 0.0;    // L = I * omega  (kg·m^2/s)
    double rotKineticEnergy = 0.0;   // KE_rot = 0.5 I omega^2  (J)
    double rotPower = 0.0;           // P = tau * omega  (W)
    double workDone = 0.0;           // W = tau * theta  (J, constant torque)
};

// RotationalDynamicsSimulation
// ----------------------------------------------------------------
// A rigid body rotating about a fixed axis under applied torque.
//
// Newton's 2nd law for rotation:  tau_net = I * alpha
//
// Integration uses velocity Verlet on (theta, omega):
//   omega(t+h) = omega(t) + alpha * h
//   theta(t+h) = theta(t) + omega(t) * h + 0.5 * alpha * h^2
//
// (alpha is constant for a constant applied force, which is the
// model here — the force magnitude and angle are fixed parameters.)
//
// Recorded channels:
//   t, theta (rad), omega (rad/s), alpha (rad/s^2),
//   torque (N·m), KE_rot (J), L (kg·m^2/s)
// ----------------------------------------------------------------
class RotationalDynamicsSimulation : public Simulation {
public:
    static constexpr std::size_t kSeriesCapacity = 6000;

    RotationalDynamicsSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }

    std::string typeName() const override { return "rotational"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override;

    RotationalDynamicsResults analytic() const;

    // Computed moment of inertia for the current shape/mass/radius.
    double momentOfInertia() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    static constexpr double kPi = 3.14159265358979323846;

    // Parameters
    double mass_;         // kg   [0.1, 50]
    double radius_;       // m    [0.1, 5]  (or length for rods)
    double force_;        // N    [0, 500]  applied force magnitude
    double forceAngleDeg_;// deg  [0, 360]  angle between r and F
    double omega0_;       // rad/s [0, 20]  initial angular velocity
    int    shapeId_;      // 0–6 mapping to BodyShape

    // Simulation state
    double theta_;        // angular displacement (rad)
    double omega_;        // current angular velocity (rad/s)

    // Series recorder
    SeriesRecorder recorder_;

    std::vector<double> currentSample() const;

    // Applied torque: tau = r * F * sin(forceAngleRad)
    double computeTorque() const;
    // Alpha = tau / I (safe: returns 0 if I is effectively zero)
    double computeAlpha() const;
};

#endif // ROTATIONAL_DYNAMICS_SIMULATION_H
