#ifndef COLLISION_SIMULATION_H
#define COLLISION_SIMULATION_H

#include "SeriesRecorder.h"
#include "Simulation.h"

#include <string>
#include <vector>

// Closed-form outcome of a head-on collision (1D), from the conservation of
// momentum and the definition of the coefficient of restitution e.
struct CollisionResults {
    bool willCollide = false;
    double timeToCollision = 0.0;
    double v1After = 0.0, v2After = 0.0;
    double momentumBefore = 0.0, momentumAfter = 0.0;
    double kineticBefore = 0.0, kineticAfter = 0.0;
    double kineticLost = 0.0;          // 1/2 mu (1 - e^2) v_rel^2
    double centreOfMassVelocity = 0.0; // unchanged by the collision
    std::string kind;                  // "elastic", "inelastic" or "perfectly inelastic"
};

// CollisionSimulation
// ----------------------------------------------------------------
// Two bodies on a frictionless line. Body 1 starts on the left of body 2 and
// they collide head-on (or catch up) when body 1 is faster toward body 2.
//
//   v1' = ((m1 - e m2) v1 + (1 + e) m2 v2) / (m1 + m2)
//   v2' = ((m2 - e m1) v2 + (1 + e) m1 v1) / (m1 + m2)
//
// e = 1 : elastic        (kinetic energy conserved)
// e = 0 : perfectly inelastic (the bodies leave together)
// 0<e<1 : inelastic      (some kinetic energy becomes heat/deformation)
// Momentum is conserved for every e because the forces between the bodies are
// equal and opposite.
//
// Numerical method: between collisions the velocities are constant, so
// positions advance exactly. update() splits a step at the instant of contact,
// so the collision happens at the exact right time for any timestep.
// ----------------------------------------------------------------
class CollisionSimulation : public Simulation {
public:
    static constexpr double kTrackLength = 40.0;
    static constexpr double kStart1 = 8.0;
    static constexpr double kStart2 = 32.0;
    static constexpr std::size_t kSeriesCapacity = 6000;

    CollisionSimulation();

    void initialize() override;
    void update(double dt) override;
    void reset() override { initialize(); }
    std::string typeName() const override { return "collision"; }
    std::vector<ParameterSpec> parameterSpecs() const override;
    double getParameter(const std::string& name) const override;
    std::string stateJSON() const override;
    std::string infoJSON() const override;
    std::string seriesJSON(std::size_t maxRows) const override { return recorder_.toJSON(maxRows); }
    bool isFinished() const override { return finished_; }

    // encapsulated physical properties
    double getMass1() const { return m1_; }
    double getMass2() const { return m2_; }
    double getVelocity1() const { return u1_; }
    double getVelocity2() const { return u2_; }
    double getRestitution() const { return e_; }
    void setMass1(double kilograms);
    void setMass2(double kilograms);
    void setVelocity1(double metresPerSecond);
    void setVelocity2(double metresPerSecond);
    void setRestitution(double e);

    CollisionResults analytic() const;
    double radius1() const;
    double radius2() const;
    double position1() const { return x1_; }
    double position2() const { return x2_; }
    double velocity1() const { return v1_; }
    double velocity2() const { return v2_; }
    bool hasCollided() const { return collided_; }
    double momentum() const { return m1_ * v1_ + m2_ * v2_; }
    double kineticEnergy() const { return 0.5 * m1_ * v1_ * v1_ + 0.5 * m2_ * v2_ * v2_; }

protected:
    void applyParameter(const std::string& name, double value) override;

private:
    void collide();
    void record();
    static double radiusFor(double mass);

    double m1_, m2_;
    double u1_, u2_; // initial velocities (parameters)
    double e_;
    double x1_, x2_, v1_, v2_;
    bool collided_;
    bool finished_;
    double collisionTime_;
    // snapshots taken at the instant of the collision
    double before1_, before2_, after1_, after2_;
    SeriesRecorder recorder_;
};

#endif // COLLISION_SIMULATION_H
