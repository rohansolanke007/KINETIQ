#ifndef PROJECTILE_SIMULATION_H
#define PROJECTILE_SIMULATION_H

#include "Environment.h"
#include "Simulation.h"
#include "SeriesRecorder.h"
#include "Vector2D.h"

#include <array>
#include <string>
#include <vector>

// Closed-form results for a projectile launched from height h0.
// With h0 = 0 they reduce to the textbook formulas:
//   T = 2 u sin(theta) / g
//   H = u^2 sin^2(theta) / 2g
//   R = u^2 sin(2 theta) / g
struct ProjectileResults {
    double ux = 0.0;            // initial horizontal velocity, u cos(theta)
    double uy = 0.0;            // initial vertical velocity,   u sin(theta)
    double timeOfFlight = 0.0;  // T
    double apexTime = 0.0;      // time to reach the highest point
    double maxHeight = 0.0;     // H (measured from the ground, y = 0)
    double range = 0.0;         // R
    double impactSpeed = 0.0;
};

// ProjectileSimulation
// ----------------------------------------------------------------
// A body launched at speed u and angle theta under constant gravity g
// (no air resistance). Ground is the line y = 0, x grows to the right.
//
// Numerical method: velocity Verlet. For constant acceleration it is EXACT
// (it reproduces x = ut + 1/2 at^2 with no truncation error), so the
// simulated motion matches the analytic solution to machine precision. The
// landing instant inside a step is solved exactly, so the measured time of
// flight and range also match the formulas, independent of the timestep.
//
// OOP: inherits Simulation (inheritance + polymorphism), OWNS an
// Environment (composition), keeps its physical properties private with
// validated setters (encapsulation).
// ----------------------------------------------------------------
class ProjectileSimulation : public Simulation {
public:
    static constexpr double kMaxSpeed = 100.0;
    static constexpr double kMaxHeight = 50.0;
    static constexpr double kMinGravity = 0.1;
    static constexpr double kMaxGravity = 30.0;
    static constexpr std::size_t kSeriesCapacity = 6000;
    static constexpr std::size_t kPathPoints = 80;

    ProjectileSimulation();

    // ---- Simulation interface ----------------------------------
    void initialize() override;
    void update(double dt) override;
    void reset() override;
    std::string typeName() const override { return "projectile"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::vector<ForceVector> forces() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override;
    bool isFinished() const override { return finished_; }

    // ---- encapsulated physical properties ----------------------
    double getLaunchSpeed() const { return speed_; }
    double getLaunchAngleDegrees() const { return angleDeg_; }
    double getGravity() const { return environment_.getGravity(); }
    double getLaunchHeight() const { return height_; }
    double getMass() const { return mass_; }
    double kineticEnergy() const { return 0.5 * mass_ * velocity_.magnitudeSquared(); }
    double potentialEnergy() const { return mass_ * environment_.getGravity() * position_.y; }

    void setLaunchSpeed(double metresPerSecond);
    void setLaunchAngleDegrees(double degrees);
    void setGravity(double metresPerSecondSquared);
    void setLaunchHeight(double metres);
    void setMass(double kilograms); // does not change the path (no air drag) but scales the forces

    // ---- results -----------------------------------------------
    ProjectileResults analytic() const;            // from the formulas
    const Vector2D& position() const { return position_; }
    const Vector2D& velocity() const { return velocity_; }

private:
    void applyParameter(const std::string& name, double value) override;
    void record();
    static double toRadians(double degrees);

    Environment environment_;  // composition
    double speed_;
    double angleDeg_;
    double height_;
    double mass_;

    Vector2D position_;
    Vector2D velocity_;
    bool finished_;
    double measuredMaxHeight_;
    double initialEnergy_;
    double measuredApexTime_;  // NaN until the apex has been passed
    SeriesRecorder recorder_;
};

#endif // PROJECTILE_SIMULATION_H
