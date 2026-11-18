#ifndef AIR_RESISTANCE_SIMULATION_H
#define AIR_RESISTANCE_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <cmath>
#include <string>
#include <vector>

// Pre-computed analytic results for air resistance.
struct AirResistanceResults {
    double terminalVelocity = 0.0;    // v_t  (m/s)
    double dragForce = 0.0;           // F_d at current velocity (N)
    double netForce = 0.0;            // F_net = mg - F_d  (N)
    double acceleration = 0.0;        // a = F_net / m  (m/s²)
    double reynoldsNumber = 0.0;      // Re = rho v L / mu  (dimensionless)
    double gravityForce = 0.0;        // mg  (N)
};

// AirResistanceSimulation
// ----------------------------------------------------------------
// Simulates vertical free-fall (1D) and 2D projectile motion with
// configurable air resistance: none, linear drag, or quadratic drag.
//
// DRAG MODES
//   0 — no air resistance: a = -g (or +g if falling)
//   1 — linear drag:      F_d = b * v  (opposes motion)
//   2 — quadratic drag:   F_d = 0.5 * rho * Cd * A * v²  (opposes motion)
//
// COORDINATE CONVENTION (1D falling mode):
//   y is positive upward. Gravity acts in the -y direction.
//   The object can start with any initial velocity (upward or downward).
//   Drag always opposes the velocity direction.
//
// 2D PROJECTILE MODE (dragMode == 1 or 2):
//   x is horizontal, y is vertical (positive up).
//   Launch angle theta from horizontal, initial speed v0.
//
// Terminal velocity (dragMode 1): v_t = m*g / b
// Terminal velocity (dragMode 2): v_t = sqrt(2*m*g / (rho*Cd*A))
//
// Integration: velocity Verlet (Störmer–Verlet) with sub-steps for stability.
//
// Recorded channels:
//   t, y, vy, ay, vx, ax, Fd, Fn, Re  (falling-mode reference y is height)
// ----------------------------------------------------------------
class AirResistanceSimulation : public Simulation {
public:
    static constexpr std::size_t kSeriesCapacity = 6000;

    AirResistanceSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    bool isFinished() const override { return finished_; }

    std::string typeName() const override { return "drag"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override;

    AirResistanceResults analytic() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    static constexpr double kPi = 3.14159265358979323846;

    // ---- Parameters ----
    double mass_;           // kg   [0.01, 100]
    double gravity_;        // m/s² [0, 25]
    double initVy_;         // m/s  [-50, 50]  initial vertical velocity (+up)
    double initHeight_;     // m    [1, 500]   initial height
    double dragCoeff_;      // Cd   [0.05, 2]   drag coefficient (quadratic)
    double crossSection_;   // m²   [0.001, 5]  reference area
    double airDensity_;     // kg/m³ [0.1, 2]
    double linearDrag_;     // b    kg/s [0.001, 20]  linear drag coefficient
    int    dragMode_;       // 0=none, 1=linear, 2=quadratic
    // Projectile parameters (2D mode when projMode_ == true)
    bool   projMode_;       // true = 2D projectile; false = 1D free-fall
    double launchAngleDeg_; // deg  [0, 90]
    double launchSpeed_;    // m/s  [1, 200]
    // Characteristic length for Reynolds number
    double charLength_;     // m    [0.001, 2]
    double dynViscosity_;   // Pa·s [1e-6, 0.1]  dynamic viscosity of air

    // ---- Simulation state ----
    double x_, y_;          // position (m); x=0 in 1D mode
    double vx_, vy_;        // velocity (m/s)
    double ax_, ay_;        // acceleration (m/s²)
    bool   finished_;       // true when object hits the ground (y <= 0)

    // ---- Series recorder ----
    SeriesRecorder recorder_;

    // ---- Helpers ----
    // Compute drag acceleration components given current velocity.
    // Returns {ax_drag, ay_drag} — drag decelerates in the direction of velocity.
    void computeAcceleration(double vx, double vy, double& ax_out, double& ay_out) const;
    // Compute drag force magnitude from speed.
    double dragForceMagnitude(double speed) const;
    // Terminal velocity for current parameters.
    double terminalVelocity() const;

    std::vector<double> currentSample() const;
};

#endif // AIR_RESISTANCE_SIMULATION_H
