#ifndef PENDULUM_SIMULATION_H
#define PENDULUM_SIMULATION_H

#include "Environment.h"
#include "OscillatorSimulation.h"

#include <array>
#include <string>
#include <vector>

struct PendulumResults {
    double omega0 = 0.0;           // sqrt(g / L), small-angle angular frequency
    double smallAnglePeriod = 0.0; // T0 = 2 pi sqrt(L / g)
    double exactPeriod = 0.0;      // T  = 4 sqrt(L / g) K(sin(theta0 / 2))
    double maxSpeed = 0.0;         // bob speed at the lowest point
    double maxTension = 0.0;       // rod tension at the lowest point
    double totalEnergy = 0.0;      // m g L (1 - cos theta0), from the lowest point
};

// PendulumSimulation
// ----------------------------------------------------------------
// A point-mass bob on a massless rigid rod of length L, no friction:
//
//        theta'' = -(g / L) sin(theta)
//
// The FULL nonlinear equation is integrated (not sin(theta) ~ theta), with
// fourth-order Runge-Kutta, so large swings show their longer period.
// theta = 0 hangs straight down; positive theta swings to the right.
// Energy is measured from the lowest point of the swing.
//
// Mass does not change the motion (the equivalence principle in action) but
// scales energy and rod tension, so it is adjustable.
// ----------------------------------------------------------------
class PendulumSimulation : public OscillatorSimulation {
public:
    PendulumSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    std::string typeName() const override { return "pendulum"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::vector<ForceVector> forces() const override;
    std::string infoJSON() const override;

    // encapsulated physical properties
    double getLength() const { return length_; }
    double getMass() const { return mass_; }
    double getInitialAngleDegrees() const { return angle0Deg_; }
    double getGravity() const { return environment_.getGravity(); }
    void setLength(double metres);
    void setMass(double kilograms);
    void setInitialAngleDegrees(double degrees);
    void setGravity(double metresPerSecondSquared);

    // results and live state
    PendulumResults analytic() const;
    double angle() const { return state_[0]; }            // radians
    double angularVelocity() const { return state_[1]; }  // rad/s
    double angularAcceleration() const;
    double kineticEnergy() const;
    double potentialEnergy() const;
    double tension() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    std::vector<double> currentSample() const;

    Environment environment_;
    double initialEnergy_ = 0.0;
    double length_;
    double mass_;
    double angle0Deg_;
    std::array<double, 2> state_; // theta, omega
};

#endif // PENDULUM_SIMULATION_H
