# WebAssembly API

`frontend/public/physics_engine.js` and `.wasm` expose the C++ `WebAPI` namespace through Embind. Load it
with `loadPhysicsEngine()` in `frontend/src/lib/physics/engine.ts`, which also holds the TypeScript types
for everything below.

Conventions: SI units; **x grows right, y grows up** (gravity is `(0, −m g)`); angles in degrees at the
API and radians inside series; all state crosses the boundary as a **JSON string**. C++ exceptions reach
JavaScript only as opaque numbers, so the `sim*` mutators return an error *message* instead of throwing
(an empty string means success).

## Sandbox world (the original engine)

| Function | Purpose |
|---|---|
| `createCircle(isStatic, mass, x, y, radius, vx, vy)` → id | Add a circle |
| `createRectangle(isStatic, mass, x, y, w, h, vx, vy)` → id | Add a rectangle |
| `createTriangle(isStatic, mass, x, y, base, height, vx, vy)` → id | Add a triangle |
| `removeObject(id)`, `setObjectPosition(id, x, y)`, `setObjectVelocity(id, vx, vy)`, `applyImpulse(id, fx, fy)` | Edit a body |
| `setGravity(g)`, `disableGravity()`, `setFriction(mu)`, `disableFriction()`, `setTimeStep(dt)` | Environment |
| `setRestitution(e)`, `setWallRestitution(e)` | Body and wall restitution, 0 to 1 (throw outside the range) |
| `pause()`, `resume()`, `step(n)`, `undo()`, `reset()` | Control |
| `getStateJSON()` | Time, bodies, gravity/friction/restitution, statistics, recent collisions |
| `getBodyForcesJSON(id)` | Gravity and friction on one body as a free-body diagram (`"null"` for unknown or static ids) |
| `getAnalysisJSON()` | Kinetic, potential and mechanical energy and momentum: totals and per body |
| `getAnalysisSeriesJSON(maxRows)` | Recorded series `t, ke, pe, e, px, py, p` (0 = all rows) |

## Dedicated simulations (`Simulation` hierarchy)

One simulation is active at a time, independent of the sandbox.

| Function | Purpose |
|---|---|
| `simCreate(type)` → error | `"projectile"`, `"pendulum"`, `"shm"`, `"incline"` or `"collision"` |
| `simDestroy()` | Release it |
| `simSetParameter(name, value)` → error | Validated against the simulation's declared range; restarts the run |
| `simReset()` → error | Back to the initial state with the same parameters |
| `simAdvance(seconds)` | Fixed-timestep driver (1/240 s steps; one call is clipped to 0.25 s) |
| `simStepFrame()` | Exactly 1/60 s of simulated time |
| `simStateJSON()` | Small per-frame snapshot (position, velocity, energy, measured results, ...) |
| `simInfoJSON()` | Parameter metadata with current values, analytic (formula) results, geometry |
| `simSeriesJSON(maxRows)` | Recorded channels with units (0 = all; ring buffer of 6 000 rows at 60 Hz) |
| `simForcesJSON()` | Free-body diagram: forces, resultant, equilibrium flag |

All return `"null"` when nothing is selected.

### Parameters (names are the `name` field of `parameters` in `simInfoJSON()`)

| Simulation | Parameters |
|---|---|
| projectile | `speed` 0 to 100 m/s, `angle` 0 to 90°, `gravity` 0.1 to 30, `height` 0 to 50 m, `mass` 0.1 to 100 kg |
| pendulum | `length` 0.2 to 5 m, `mass` 0.1 to 10 kg, `angle` −170 to 170°, `gravity` |
| shm | `mass` 0.1 to 20 kg, `k` 1 to 200 N/m, `displacement` −5 to 5 m |
| incline | `angle` 0 to 80°, `mass` 0.1 to 50 kg, `mu_s`, `mu_k` (0 to 1.5, `mu_k ≤ mu_s`), `gravity`, `applied` −100 to 100 N |
| collision | `m1`, `m2` 0.1 to 20 kg, `v1`, `v2` −20 to 20 m/s, `restitution` 0 to 1 |

### Recorded channels

| Simulation | Channels |
|---|---|
| projectile | `t x y vx vy speed ax ay ke pe e` |
| pendulum | `t theta omega alpha ke pe e` |
| shm | `t x v a ke pe e` |
| incline | `t s v a ke pe e heat` |
| collision | `t x1 x2 v1 v2 p1 p2 p k1 k2 ke` |

### Free-body diagram JSON

```json
{ "forces": [ { "name": "Weight", "label": "W = mg", "kind": "gravity",
                "x": 0, "y": -49.05, "magnitude": 49.05, "angleDeg": -90, "component": false } ],
  "resultant": { "x": 0, "y": 0, "magnitude": 0 },
  "equilibrium": true }
```

`kind` is `gravity`, `normal`, `friction`, `applied`, `tension` or `spring`. A force with
`"component": true` is a piece of another force (drawn dashed) and is not part of the resultant.

## Adding a new simulation

1. Subclass `Simulation` (or `OscillatorSimulation`), implement `initialize`, `update`, `reset`,
   `parameterSpecs`, `getParameter`, `applyParameter`, `stateJSON`, `infoJSON`, `seriesJSON`, and
   optionally `forces()`.
2. Register it in `SimulationFactory::create` and `availableTypes`.
3. Add the source file to `backend/build_web.sh` and run `make test` / `make web`.
4. Add its state and info types to `frontend/src/lib/physics/engine.ts`, a canvas, and a page that uses
   `SimLabLayout` and `useSimModule`.
