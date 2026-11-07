#ifndef SHM_SIMULATION_H
#define SHM_SIMULATION_H

#include "OscillatorSimulation.h"

#include <string>
#include <vector>

struct SHMResults {
    double omega = 0.0;       // sqrt(k / m)
    double period = 0.0;      // T = 2 pi sqrt(m / k)
    double frequency = 0.0;   // f = 1 / T
    double amplitude = 0.0;   // |x0|
    double maxSpeed = 0.0;    // omega * A at the equilibrium point
    double maxAcceleration = 0.0;
    double maxForce = 0.0;    // k * A at the turning points
    double totalEnergy = 0.0; // 1/2 k A^2
};

// SHMSimulation
// ----------------------------------------------------------------
// A mass on an ideal horizontal spring (no friction, no damping):
//
//        F = -k x,        m x'' = -k x
//
// x is the displacement from the equilibrium position; the block is
// released from rest at x0, so the amplitude is |x0|.
//
// Numerical method: velocity Verlet, a symplectic integrator. It keeps the
// total energy bounded for as long as the simulation runs, instead of
// drifting like explicit Euler. Time is split into substeps so that
// omega * h stays below 0.02.
// ----------------------------------------------------------------
class SHMSimulation : public OscillatorSimulation {
public:
    SHMSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    std::string typeName() const override { return "shm"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::vector<ForceVector> forces() const override;
    std::string infoJSON() const override;

    // encapsulated physical properties
    double getMass() const { return mass_; }
    double getSpringConstant() const { return springK_; }
    double getInitialDisplacement() const { return x0_; }
    void setMass(double kilograms);
    void setSpringConstant(double newtonsPerMetre);
    void setInitialDisplacement(double metres);

    SHMResults analytic() const;
    double displacement() const { return x_; }
    double velocity() const { return v_; }
    double force() const { return -springK_ * x_; }
    double acceleration() const { return -springK_ * x_ / mass_; }
    double kineticEnergy() const { return 0.5 * mass_ * v_ * v_; }
    double potentialEnergy() const { return 0.5 * springK_ * x_ * x_; }

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    static constexpr double kGravity = 9.81; // only sets the (cancelling) weight and normal
    std::vector<double> currentSample() const;

    double initialEnergy_ = 0.0;
    double mass_;
    double springK_;
    double x0_;
    double x_;
    double v_;
};

#endif // SHM_SIMULATION_H
