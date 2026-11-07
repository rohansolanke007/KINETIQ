# Changelog

All changes made on top of the original KINETIQ sandbox, in the order they were built. The original
engine, its WebAssembly API and its scenes are preserved.

## Phase 9: verification and documentation
- README, WebAssembly API reference, real screenshots, Playwright end-to-end suite (43 checks).
- Applied the project's own Prettier config (it was shipped without its leading dot, so it was never
  found); `npm run lint` now reports 0 errors.
- Performance review: production-mode build holds ~60 fps on every page; graphs are decimated to 360
  points and refresh at 5 Hz.
- Removed dead code (`EnergyGraph`, frontend-sampled energy history).

## Phase 8: analytics and experiments
- Analytics page: six C++-recorded graphs per simulation, time window, CSV export with units.
- Five guided experiments with theory, equations, observations, notes and PDF reports (jsPDF).
- The ten Newton's-law demonstrations moved to `/experiments/laws`.

## Phase 7: energy and momentum
- **Fixed**: momentum was not conserved in collisions between unequal masses; a dynamic body hitting a
  static one created first passed through it.
- Restitution for bodies and walls is configurable (defaults unchanged).
- `CollisionSimulation`; sandbox energy and momentum analysis (C++) with a recorded series.
- Energy tab with a conservation verdict on every module.

## Phase 6: inclined plane and free-body diagrams
- `InclinedPlaneSimulation` with stick/slip Coulomb friction and exact kinematics.
- `FreeBodyDiagram`; `Force::apply` refactored into the template-method pair `forceOn` / `apply`.
- Free-body diagrams on every module and for the selected sandbox body.
- `SeriesRecorder` replaced three copies of recording code.

## Phase 5: pendulum and simple harmonic motion
- `OscillatorSimulation`, `PendulumSimulation` (RK4, exact large-angle period), `SHMSimulation` (velocity Verlet).
- `rk4Step<N>` function template, `ellipticK`, measured period by zero-crossing detection.

## Phase 4: simulation framework and projectile motion
- Abstract `Simulation` with a fixed-timestep driver; `SimulationFactory`, `SimulationManager`.
- `ProjectileSimulation`; `Environment`; `TimeSeries<T>`; extra `Vector2D` operators.
- Generic `sim*` WebAssembly API; the unit-test suite (`make test`).

## Phases 2 and 3: interface
- New design system (dark navy, electric blue and cyan, Inter), sidebar navigation, dashboard with a live
  engine hero, three-panel Simulation Lab, physics inspector.
- Shared simulation provider; canvases draw from a per-frame feed while panels refresh at 10 Hz.
- Sandbox Reset restores the state at the start of the run.

## Phase 1: assessment
- Documented the architecture and the defects listed in the README.
