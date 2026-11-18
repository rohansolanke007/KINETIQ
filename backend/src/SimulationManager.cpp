#include "SimulationManager.h"
#include "Exceptions.h"
#include "AirResistanceSimulation.h"
#include "CircularMotionSimulation.h"
#include "CollisionSimulation.h"
#include "InclinedPlaneSimulation.h"
#include "OrbitalMechanicsSimulation.h"
#include "PendulumSimulation.h"
#include "ProjectileSimulation.h"
#include "RotationalDynamicsSimulation.h"
#include "SHMSimulation.h"

std::unique_ptr<Simulation> SimulationFactory::create(const std::string& type) {
    if (type == "projectile")  return std::unique_ptr<Simulation>(new ProjectileSimulation());
    if (type == "collision")   return std::unique_ptr<Simulation>(new CollisionSimulation());
    if (type == "incline")     return std::unique_ptr<Simulation>(new InclinedPlaneSimulation());
    if (type == "pendulum")    return std::unique_ptr<Simulation>(new PendulumSimulation());
    if (type == "shm")         return std::unique_ptr<Simulation>(new SHMSimulation());
    if (type == "circular")    return std::unique_ptr<Simulation>(new CircularMotionSimulation());
    if (type == "rotational")  return std::unique_ptr<Simulation>(new RotationalDynamicsSimulation());
    if (type == "drag")        return std::unique_ptr<Simulation>(new AirResistanceSimulation());
    if (type == "orbital")     return std::unique_ptr<Simulation>(new OrbitalMechanicsSimulation());
    throw InvalidSimulationException("unknown simulation type '" + type + "'.");
}

std::vector<std::string> SimulationFactory::availableTypes() {
    return {"projectile", "pendulum", "shm", "incline", "collision",
            "circular", "rotational", "drag", "orbital"};
}

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
