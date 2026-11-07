#ifndef INCLINED_PLANE_SIMULATION_H
#define INCLINED_PLANE_SIMULATION_H

#include "Environment.h"
#include "SeriesRecorder.h"
#include "Simulation.h"

#include <string>
#include <vector>

struct InclineResults {
    double normalForce = 0.0;          // N = m g cos(theta)
    double weightAlongSlope = 0.0;     // m g sin(theta)
    double weightPerpendicular = 0.0;  // m g cos(theta)
    double maxStaticFriction = 0.0;    // mu_s N
    double kineticFriction = 0.0;      // mu_k N
    double criticalAngleDeg = 0.0;     // atan(mu_s): steepest slope where it can still stay put
    double netForceAlongSlope = 0.0;   // resultant at the start (up-slope positive)
    double frictionAlongSlope = 0.0;   // friction at the start (up-slope positive)
    double acceleration = 0.0;         // along the slope, up-slope positive
    bool slides = false;               // does it start to move from rest?
    std::string direction;             // "down", "up" or "none"
    double timeToEnd = 0.0;            // time to reach the end of the slope (if it slides)
    double speedAtEnd = 0.0;
};

// InclinedPlaneSimulation
// ----------------------------------------------------------------
// A block on a rough incline of angle theta. Axes along the slope:
//     u = (cos t, sin t)   up the slope        n = (-sin t, cos t)  away from the surface
// Forces: weight (0, -mg), normal N = mg cos t along n, Coulomb friction along
// u, and an optional applied force along u (positive = up the slope).
//
// FRICTION MODEL (Coulomb, stick/slip):
//   * At rest, static friction cancels the net pull exactly as long as
//     |F_pull| <= mu_s N, where F_pull = F_applied - m g sin t.
//   * Once it slides, kinetic friction mu_k N opposes the velocity.
//   * If sliding stops (velocity reaches 0) the static test is repeated.
//
// NUMERICAL METHOD: within each regime the acceleration is constant, so the
// kinematics s += v t + a t^2 / 2 are EXACT. update() splits a step at the
// instant velocity reaches zero or the block reaches an end of the slope, so
// stick/slip transitions land on the right instant for any timestep.
//
// The slope is kSlopeLength long; the block starts kStartDistance from the
// bottom, at rest.
// ----------------------------------------------------------------
class InclinedPlaneSimulation : public Simulation {
public:
    static constexpr double kSlopeLength = 10.0;   // metres
    static constexpr double kStartDistance = 7.0;  // metres from the bottom
    static constexpr std::size_t kSeriesCapacity = 6000;

    enum class Regime { AtRest, Sliding, ReachedBottom, ReachedTop };

    InclinedPlaneSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    std::string typeName() const override { return "incline"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override { return recorder_.toJSON(maxRows); }
    std::vector<ForceVector> forces() const override;
    bool isFinished() const override { return regime_ == Regime::ReachedBottom || regime_ == Regime::ReachedTop; }

    // encapsulated physical properties
    double getAngleDegrees() const { return angleDeg_; }
    double getMass() const { return mass_; }
    double getStaticFriction() const { return muS_; }
    double getKineticFriction() const { return muK_; }
    double getGravity() const { return environment_.getGravity(); }
    double getAppliedForce() const { return applied_; }
    void setAngleDegrees(double degrees);
    void setMass(double kilograms);
    void setStaticFriction(double mu);   // lowers mu_k too if it would exceed mu_s
    void setKineticFriction(double mu);  // limited to mu_s
    void setGravity(double metresPerSecondSquared);
    void setAppliedForce(double newtons);

    // results
    InclineResults analytic() const;
    double position() const { return s_; }        // metres along the slope from the bottom
    double velocity() const { return v_; }        // along the slope, up positive
    double acceleration() const { return a_; }
    Regime regime() const { return regime_; }
    double kineticEnergy() const { return 0.5 * mass_ * v_ * v_; }
    double potentialEnergy() const;
    double frictionHeat() const { return frictionHeat_; }  // work dissipated by kinetic friction
    double appliedWork() const { return appliedWork_; }    // work done by the applied force
    double timeAtEnd() const { return endTime_; }          // NaN until the end is reached
    double speedAtEnd() const { return endSpeed_; }

    // forces along the slope, up-slope positive (exposed for tests and the UI)
    double normalForce() const;
    double pullAlongSlope() const;   // applied - m g sin(theta), friction excluded
    double frictionAlongSlope() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    bool sticks() const;
    static double sign(double x) { return x > 0.0 ? 1.0 : (x < 0.0 ? -1.0 : 0.0); }
    double earliestHit(double a, double v, double within, double* target) const;
    void record();

    Environment environment_;
    double angleDeg_;
    double mass_;
    double muS_;
    double muK_;
    double applied_;

    double s_;
    double v_;
    double a_;
    Regime regime_;
    double frictionHeat_;
    double appliedWork_;
    double endTime_;
    double endSpeed_;
    double initialMechanical_ = 0.0;
    SeriesRecorder recorder_;
};

#endif // INCLINED_PLANE_SIMULATION_H
