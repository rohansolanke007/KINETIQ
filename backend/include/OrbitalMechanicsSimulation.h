#ifndef ORBITAL_MECHANICS_SIMULATION_H
#define ORBITAL_MECHANICS_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <cmath>
#include <string>
#include <vector>

// Pre-computed analytic results for orbital mechanics (always for circular orbit
// at the current orbital radius).
struct OrbitalMechanicsResults {
    double circularVelocity = 0.0;    // v_circ = sqrt(GM/r)        (m/s)
    double escapeVelocity = 0.0;      // v_esc  = sqrt(2GM/r)       (m/s)
    double orbitalPeriod = 0.0;       // T = 2pi*sqrt(r^3/GM)       (s)
    double gravForce = 0.0;           // F = GMm/r^2                (N)
    double potentialEnergy = 0.0;     // U = -GMm/r                 (J)
    double totalEnergy = 0.0;         // E_circular = -GMm/(2r)     (J)
    double angularMomentum = 0.0;     // L = m*v*r (circular)       (kg m²/s)
    double gravFieldStrength = 0.0;   // g = GM/r^2                 (m/s²)
    double gravPotential = 0.0;       // V = -GM/r                  (J/kg)
    double altitude = 0.0;            // r - R_body                 (m)
};

// OrbitalMechanicsSimulation
// ----------------------------------------------------------------
// Simulates a satellite orbiting a central body under gravity only.
// Newton's universal gravitation:
//   F = G M m / r²   (always attractive, toward central body)
//   a = -mu * r_vec / |r_vec|^3,  where mu = G*M
//
// Integration uses velocity Verlet (leapfrog):
//   v_half = v + 0.5 * a(r) * dt
//   r_new  = r + v_half * dt
//   a_new  = accel(r_new)
//   v_new  = v_half + 0.5 * a_new * dt
//
// The satellite starts at (r0, 0) with velocity (0, v_tang) + radial kick.
// r0 = central_body_radius + altitude.
//
// Selectable central bodies (via bodyId_ parameter):
//   0 = Earth, 1 = Moon, 2 = Mars, 3 = Jupiter, 4 = Sun
//
// Collision with the surface (r <= R_body) ends the simulation.
//
// Recorded channels:
//   t, r, speed, vx, vy, Fg, U, E, L, x, y
// ----------------------------------------------------------------
class OrbitalMechanicsSimulation : public Simulation {
public:
    static constexpr std::size_t kSeriesCapacity = 6000;

    // Central body data (accurate SI values)
    struct CentralBodyData {
        const char* name;
        double GM;      // gravitational parameter mu = G*M  (m^3/s^2)
        double radius;  // mean surface radius  (m)
    };

    static const CentralBodyData kBodies[5];

    OrbitalMechanicsSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    bool isFinished() const override { return finished_; }
    // Override advance() to allow large time steps (numerical stability is
    // handled internally by the adaptive substep mechanism in update()).
    void advance(double seconds) override;

    std::string typeName() const override { return "orbital"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override;

    OrbitalMechanicsResults analytic() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    static constexpr double kG  = 6.67430e-11;   // N m²/kg²
    static constexpr double kPi = 3.14159265358979323846;

    // ---- Parameters ----
    double mass_;           // satellite mass     kg  [1, 1e6]
    double altitude_;       // orbital altitude   m   [1e4, 1e8]
    double tangVelocity_;   // initial tangential velocity m/s [0, 50000]
    double radVelocity_;    // initial radial velocity     m/s [-5000, 5000]
    int    bodyId_;         // central body index 0–4

    // ---- Derived from bodyId_ ----
    double mu_;             // GM for selected body
    double bodyRadius_;     // surface radius for selected body

    // ---- Simulation state ----
    double x_, y_;          // satellite position (m); central body at origin
    double vx_, vy_;        // satellite velocity (m/s)
    double ax_, ay_;        // satellite acceleration (m/s²) — updated each step
    double t_;              // simulation time (s)
    bool   finished_;       // true when satellite hits the central body surface

    // ---- Series recorder ----
    SeriesRecorder recorder_;

    // ---- Helpers ----
    // Gravitational acceleration vector at (px, py).
    void gravAccel(double px, double py, double& ax_out, double& ay_out) const;
    // Distance from origin.
    double distFromCentre(double px, double py) const;

    std::vector<double> currentSample() const;
};

#endif // ORBITAL_MECHANICS_SIMULATION_H
