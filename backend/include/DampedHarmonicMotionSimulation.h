#ifndef DAMPED_HARMONIC_MOTION_SIMULATION_H
#define DAMPED_HARMONIC_MOTION_SIMULATION_H

#include "OscillatorSimulation.h"

#include <string>
#include <vector>

// DampingRegime
// ----------------------------------------------------------------
// The three qualitative behaviours of a damped oscillator,
// determined by the damping ratio ζ = c / (2 sqrt(km)).
// ----------------------------------------------------------------
enum class DampingRegime {
    Underdamped,    // ζ < 1 : oscillates with decaying amplitude
    Critical,       // ζ = 1 : fastest return without oscillation
    Overdamped      // ζ > 1 : slow exponential return
};

// DampedHarmonicResults
// ----------------------------------------------------------------
// Analytic (formula-derived) results for the current parameter set.
// ----------------------------------------------------------------
struct DampedHarmonicResults {
    double omega0 = 0.0;          // ω₀ = √(k/m)          rad/s
    double naturalFrequency = 0.0;// f₀ = ω₀/(2π)         Hz
    double naturalPeriod = 0.0;   // T₀ = 2π/ω₀           s
    double beta = 0.0;            // β  = c/(2m)           rad/s
    double dampingRatio = 0.0;    // ζ  = c/(2√(km))       dimensionless
    double criticalDamping = 0.0; // c_c = 2√(km)          N·s/m
    double omegaD = 0.0;          // ω_d = √(ω₀²-β²)      rad/s (underdamped only)
    double dampedFrequency = 0.0; // f_d = ω_d/(2π)        Hz
    double dampedPeriod = 0.0;    // T_d = 2π/ω_d          s
    double qualityFactor = 0.0;   // Q   = 1/(2ζ)
    double initialEnergy = 0.0;   // E₀  = ½mv₀² + ½kx₀²  J
    DampingRegime regime = DampingRegime::Underdamped;
};

// DampedHarmonicMotionSimulation
// ----------------------------------------------------------------
// Implements: m x'' + c x' + k x = 0
//
// Numerical method: RK4 (more robust than velocity Verlet for the
// dissipative damping term). Time is subdivided so that the
// sub-step is small relative to the fastest timescale (ω₀ h < 0.05).
//
// Series channels: t, x, v, a, ke, pe, e, Fspring, Fdamp, Fnet
// ----------------------------------------------------------------
class DampedHarmonicMotionSimulation : public OscillatorSimulation {
public:
    DampedHarmonicMotionSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }

    std::string typeName() const override { return "dhm"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::vector<ForceVector> forces() const override;
    std::string infoJSON() const override;

    // Physical state accessors
    double displacement()    const { return x_; }
    double velocity()        const { return v_; }
    double acceleration()    const { return computeAccel(x_, v_); }
    double springForce()     const { return -springK_ * x_; }
    double dampingForce()    const { return -damping_ * v_; }
    double netForce()        const { return springForce() + dampingForce(); }
    double kineticEnergy()   const { return 0.5 * mass_ * v_ * v_; }
    double potentialEnergy() const { return 0.5 * springK_ * x_ * x_; }
    double totalEnergy()     const { return kineticEnergy() + potentialEnergy(); }

    // Analytic results from current parameters
    DampedHarmonicResults analytic() const;

    // Public parameter setters with validation (used by tests and applyParameter)
    void setMass(double kg);
    void setSpringConstant(double npm);
    void setDampingCoefficient(double nsm);
    void setInitialDisplacement(double m);
    void setInitialVelocity(double ms);

protected:
    void applyParameter(const std::string& name, double value) override;

private:

    // RK4 acceleration: a = (-kx - cv) / m
    double computeAccel(double x, double v) const;

    // One RK4 sub-step of size h, updates x_ and v_ in-place
    void rk4Step(double h);

    // Build series sample row
    std::vector<double> currentSample() const;

    double mass_;        // m  (kg)
    double springK_;     // k  (N/m)
    double damping_;     // c  (N·s/m)
    double x0_;          // initial displacement (m)
    double v0_;          // initial velocity (m/s)

    double x_;           // current displacement
    double v_;           // current velocity

    double initialEnergy_;
};

#endif // DAMPED_HARMONIC_MOTION_SIMULATION_H
