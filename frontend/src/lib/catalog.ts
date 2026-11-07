import { guidedExperiments } from "@/lib/experiments/guided";
import { experiments as lawDemos } from "@/lib/physics/experiments";
import { scenePresets } from "@/lib/physics/scenes";

/**
 * Single source for what the platform currently offers. Dashboard counts are
 * derived from the real scene and experiment registries, so they grow
 * automatically as modules are added.
 */
export type ConceptStatus = "available" | "planned";

export interface ConceptArea {
  id: string;
  name: string;
  description: string;
  status: ConceptStatus;
  /** Where the Explore button leads (only meaningful when available). */
  to:
    | "/lab"
    | "/lab/projectile"
    | "/lab/shm"
    | "/lab/pendulum"
    | "/lab/incline"
    | "/lab/collision"
    | "/experiments"
    | "/experiments/laws"
    | "/concepts";
}

export const conceptAreas: ConceptArea[] = [
  {
    id: "mechanics",
    name: "Classical mechanics",
    description: "Newton's laws, inertia, force and reaction, tested on a live C++ world.",
    status: "available",
    to: "/experiments/laws",
  },
  {
    id: "projectile",
    name: "Projectile motion",
    description: "Launch a body into a gravity field and watch its parabolic trajectory.",
    status: "available",
    to: "/lab/projectile",
  },
  {
    id: "oscillations",
    name: "Oscillations",
    description: "Springs, pendulums and simple harmonic motion.",
    status: "available",
    to: "/lab/shm",
  },
  {
    id: "circular",
    name: "Circular motion",
    description: "Centripetal force, angular velocity and orbital paths.",
    status: "planned",
    to: "/concepts",
  },
  {
    id: "energy-momentum",
    name: "Energy and momentum",
    description: "Kinetic energy, impulse and collisions between bodies.",
    status: "available",
    to: "/lab/collision",
  },
];

/** Dedicated simulations offered in the Simulation Lab (each a C++ Simulation subclass,
 *  except the sandbox, which wraps the original PhysicsEngine). */
export interface SimulationModule {
  id: string;
  label: string;
  to: "/lab" | "/lab/projectile" | "/lab/shm" | "/lab/pendulum" | "/lab/incline" | "/lab/collision";
}

export const simulationModules: SimulationModule[] = [
  { id: "sandbox", label: "Sandbox", to: "/lab" },
  { id: "projectile", label: "Projectile motion", to: "/lab/projectile" },
  { id: "shm", label: "Spring-mass (SHM)", to: "/lab/shm" },
  { id: "pendulum", label: "Pendulum", to: "/lab/pendulum" },
  { id: "incline", label: "Inclined plane", to: "/lab/incline" },
  { id: "collision", label: "Collisions", to: "/lab/collision" },
];

export const catalogStats = {
  modules: simulationModules.length,
  concepts: conceptAreas.length,
  conceptsAvailable: conceptAreas.filter((c) => c.status === "available").length,
  scenes: scenePresets.length,
  experiments: guidedExperiments.length + lawDemos.length,
  guidedExperiments: guidedExperiments.length,
  lawDemos: lawDemos.length,
};
