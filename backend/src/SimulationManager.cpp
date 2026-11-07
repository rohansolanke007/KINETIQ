#include "SimulationManager.h"
#include "Exceptions.h"
#include "CollisionSimulation.h"
#include "InclinedPlaneSimulation.h"
#include "PendulumSimulation.h"
#include "ProjectileSimulation.h"
#include "SHMSimulation.h"

std::unique_ptr<Simulation> SimulationFactory::create(const std::string& type) {
    if (type == "projectile") return std::unique_ptr<Simulation>(new ProjectileSimulation());
    if (type == "collision") return std::unique_ptr<Simulation>(new CollisionSimulation());
    if (type == "incline") return std::unique_ptr<Simulation>(new InclinedPlaneSimulation());
    if (type == "pendulum") return std::unique_ptr<Simulation>(new PendulumSimulation());
    if (type == "shm") return std::unique_ptr<Simulation>(new SHMSimulation());
    throw InvalidSimulationException("unknown simulation type '" + type + "'.");
}

std::vector<std::string> SimulationFactory::availableTypes() { return {"projectile", "pendulum", "shm", "incline", "collision"}; }

void SimulationManager::select(const std::string& type) { active_ = SimulationFactory::create(type); }

void SimulationManager::clear() { active_.reset(); }

Simulation& SimulationManager::active() {
    if (!active_) throw InvalidSimulationException("no simulation is selected.");
    return *active_;
}

const Simulation& SimulationManager::active() const {
    if (!active_) throw InvalidSimulationException("no simulation is selected.");
    return *active_;
}
