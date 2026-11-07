#ifndef SIMULATION_H
#define SIMULATION_H

#include "FreeBodyDiagram.h"

#include <cstddef>
#include <string>
#include <vector>

// Simulation
// ----------------------------------------------------------------
// Abstract base class for every dedicated physics experiment
// (projectile, pendulum, spring-mass, inclined plane, ...).
//
// OOP concepts demonstrated:
//   - ABSTRACTION: callers (the SimulationManager, the WebAssembly API,
//     the tests) work only with this interface and never need to know
//     which concrete experiment is running.
//   - RUNTIME POLYMORPHISM: update(), reset(), stateJSON() ... are pure
//     virtual; each subclass supplies its own physics.
//   - TEMPLATE METHOD PATTERN: advance() and setParameter() are
//     NON-virtual algorithms that call the virtual hooks, so the fixed
//     timestep loop and parameter validation are written exactly once.
//   - ENCAPSULATION: time and the accumulator are private; subclasses
//     touch them only through the protected helpers below.
//
// Fixed timestep: advance(seconds) converts real elapsed time into a whole
// number of update(fixedDt) calls. Physics therefore never depends on the
// browser's frame rate, which keeps results deterministic and stable.
// ----------------------------------------------------------------

// Describes one user-adjustable parameter. The frontend builds its sliders
// from this metadata, so valid ranges live in exactly one place (C++).
struct ParameterSpec {
    std::string name;   // machine name used with setParameter()
    std::string label;  // human readable
    std::string unit;
    double minValue;
    double maxValue;
    double step;
    double defaultValue;
};

class Simulation {
public:
    virtual ~Simulation() = default;

    // ---- abstract interface -------------------------------------
    // Builds the initial state from the current parameters.
    virtual void initialize() = 0;
    // Advances the physics by exactly dt seconds.
    virtual void update(double dt) = 0;
    // Returns to the initial state, keeping the current parameters.
    virtual void reset() = 0;

    virtual std::string typeName() const = 0;
    virtual std::vector<ParameterSpec> parameterSpecs() const = 0;
    virtual double getParameter(const std::string& name) const = 0;

    // JSON snapshots (transport only; the browser never simulates).
    virtual std::string stateJSON() const = 0;   // small, read every frame
    virtual std::string infoJSON() const = 0;    // analytic results, changes with parameters
    // Recorded time series for graphs/CSV. maxRows = 0 returns everything,
    // otherwise only the most recent maxRows samples (keeps live polling cheap).
    virtual std::string seriesJSON(std::size_t maxRows) const = 0;

    // Forces acting on the simulated body right now, in world coordinates
    // (x right, y up). Experiments with a body override this; the default is
    // "no body". Used to build the free-body diagram.
    virtual std::vector<ForceVector> forces() const { return {}; }

    // Simulations that end by themselves (e.g. a projectile landing)
    // override this; the default is "runs forever".
    virtual bool isFinished() const { return false; }

    // ---- concrete, shared behaviour -----------------------------
    // Validates against parameterSpecs(), applies the change, then resets.
    void setParameter(const std::string& name, double value);

    // Converts elapsed real time into fixed update() steps.
    void advance(double seconds);
    // One display frame (1/60 s) of simulated time; used by "Step".
    void stepFrame();

    std::string parametersJSON() const;
    // Free-body diagram of the current forces (forces + resultant) as JSON.
    std::string forcesJSON() const;

    double time() const { return time_; }
    double fixedTimeStep() const { return fixedDt_; }

protected:
    explicit Simulation(double fixedDt = 1.0 / 240.0);

    // Hook called by setParameter() after validation succeeds.
    virtual void applyParameter(const std::string& name, double value) = 0;

    // Subclasses move simulated time only through these helpers.
    void addTime(double dt) { time_ += dt; }
    void resetClock();

private:
    double fixedDt_;
    double time_;
    double accumulator_;
};

#endif // SIMULATION_H
