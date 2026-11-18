#ifndef CIRCULAR_MOTION_SIMULATION_H
#define CIRCULAR_MOTION_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <cmath>
#include <string>
#include <vector>

// Pre-computed analytic results for circular motion.
struct CircularMotionResults {
    double angularVelocity = 0.0;      // omega = v / r     (rad/s)
    double tangentialVelocity = 0.0;   // v = r * omega      (m/s)
    double centripetalAccel = 0.0;     // a_c = v^2 / r = r * omega^2  (m/s^2)
    double centripetalForce = 0.0;     // F_c = m * a_c      (N)
    double period = 0.0;               // T = 2 pi / omega   (s)
    double frequency = 0.0;            // f = 1 / T          (Hz)
};

// CircularMotionSimulation
// ----------------------------------------------------------------
// A point-mass moving on a circular track of radius r at constant
// (or accelerating) tangential speed.
//
// Primary mode: uniform circular motion.
//   - The user sets mass, radius, and tangential velocity v.
//   - omega = v / r;  a_c = v^2 / r;  F_c = m * a_c.
//   - The angular displacement theta advances as theta += omega * dt.
//
// Secondary mode: non-uniform (angular acceleration alpha != 0).
//   - omega(t) = omega0 + alpha * t
//   - theta(t) = theta0 + omega0 * t + 0.5 * alpha * t^2
//   - a_centripetal = r * omega^2;  a_tangential = r * alpha
//
// Recorded channels: t, theta (rad), omega (rad/s), v (m/s),
//                    a_c (m/s^2), F_c (N), alpha (rad/s^2)
// ----------------------------------------------------------------
class CircularMotionSimulation : public Simulation {
public:
    static constexpr std::size_t kSeriesCapacity = 6000;

    CircularMotionSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }

    std::string typeName() const override { return "circular"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override;

    CircularMotionResults analytic() const;

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    static constexpr double kPi = 3.14159265358979323846;

    // Parameters
    double mass_;        // kg  [0.1, 20]
    double radius_;      // m   [0.1, 20]
    double velocity_;    // m/s [0.1, 50]  tangential speed
    double alpha_;       // rad/s^2 [0, 10]  angular acceleration

    // Simulation state
    double theta_;       // accumulated angular displacement (rad)
    double omega_;       // current angular velocity (rad/s)

    // For the series recorder
    SeriesRecorder recorder_;

    std::vector<double> currentSample() const;
};

#endif // CIRCULAR_MOTION_SIMULATION_H
