import type { PhysicsObjectState, PhysicsState } from "./engine";

/**
 * Display-only quantities derived from the C++ snapshot.
 *
 * NOTE: these are provisional. In the energy phase the C++ engine will report
 * kinetic, potential and total energy itself; this helper then goes away.
 * Potential energy is measured from the ground line y = 0 m.
 */
export function bodyEnergy(o: PhysicsObjectState, state: PhysicsState) {
  const v2 = o.vel.x * o.vel.x + o.vel.y * o.vel.y;
  const kinetic = o.isStatic ? 0 : 0.5 * o.mass * v2;
  const g = state.gravityEnabled ? state.gravity : 0;
  const potential = o.isStatic ? 0 : o.mass * g * o.pos.y;
  return { kinetic, potential, mechanical: kinetic + potential };
}

/** Net force on a body, F = m·a, from the acceleration the engine reported. */
export function netForce(o: PhysicsObjectState) {
  return { x: o.mass * o.acc.x, y: o.mass * o.acc.y };
}
