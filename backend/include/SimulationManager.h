#ifndef SIMULATION_MANAGER_H
#define SIMULATION_MANAGER_H

#include "Simulation.h"

#include <memory>
#include <string>
#include <vector>

// SimulationFactory
// ----------------------------------------------------------------
// Creates the concrete experiment for a type name. Callers receive a
// unique_ptr<Simulation> and treat every experiment identically
// (polymorphism). New experiments are added in one place.
// ----------------------------------------------------------------
class SimulationFactory {
public:
    static std::unique_ptr<Simulation> create(const std::string& type);
    static std::vector<std::string> availableTypes();
};

// SimulationManager
// ----------------------------------------------------------------
// Owns the ONE active experiment (composition: the manager owns it through
// a base-class pointer) and forwards commands to it. It is independent of
// the sandbox PhysicsEngine, so both can coexist.
// ----------------------------------------------------------------
class SimulationManager {
public:
    void select(const std::string& type);  // replaces the active experiment
    void clear();
    bool hasActive() const { return static_cast<bool>(active_); }

    // Throws InvalidSimulationException when nothing is selected.
    Simulation& active();
    const Simulation& active() const;

private:
    std::unique_ptr<Simulation> active_;
};

#endif // SIMULATION_MANAGER_H
