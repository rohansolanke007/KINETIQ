import type {
  CollisionInfo,
  CollisionState,
  InclineInfo,
  InclineState,
  PendulumInfo,
  PendulumState,
  ProjectileInfo,
  ProjectileState,
  ShmInfo,
  ShmState,
} from "@/lib/physics/engine";
import type { SeriesData } from "@/lib/physics/useSimModule";
import { moduleCharts, type ChartSpec, type ModuleId } from "@/lib/analyticsConfig";

/** One quantity compared between the formula (calculated in C++) and the simulation. */
export interface ResultRow {
  label: string;
  unit: string;
  formula: number | null;
  measured: number | null;
  digits: number;
}

export interface Evaluation {
  results: ResultRow[];
  /** True once the run has produced everything the experiment needs to record. */
  complete: boolean;
}

export interface Equation {
  /** Display form (Unicode). */
  text: string;
  /** ASCII form for the PDF, whose built-in font has no Greek letters. */
  plain: string;
  note?: string;
}

export interface GuidedExperiment {
  id: string;
  title: string;
  summary: string;
  module: ModuleId;
  /** The C++ simulation type created for this experiment. */
  simType: string;
  objective: string;
  theory: string[];
  equations: Equation[];
  /** Initial conditions, applied through the C++ parameter API when the experiment opens. */
  initial: Record<string, number>;
  /** Parameters the student may change (all others are fixed by the experiment). */
  adjustable: string[];
  tasks: string[];
  /** Hint shown while the run is not yet complete. */
  waitingFor: string;
  charts: ChartSpec[];
  evaluate: (info: unknown, state: unknown, series: SeriesData | null) => Evaluation;
}

/** Percentage difference between measured and formula values; null if either is missing. */
export function errorPercent(r: ResultRow): number | null {
  if (r.formula === null || r.measured === null) return null;
  if (r.formula === 0) return Math.abs(r.measured - r.formula);
  return (Math.abs(r.measured - r.formula) / Math.abs(r.formula)) * 100;
}

function column(series: SeriesData | null, channel: string): number[] {
  if (!series) return [];
  const i = series.channels.indexOf(channel);
  return i < 0 ? [] : series.rows.map((r) => r[i] ?? 0);
}

const maxOf = (values: number[]) => (values.length ? Math.max(...values) : null);

const pick = (module: ModuleId, ids: string[]) =>
  moduleCharts[module].filter((c) => ids.includes(c.id));

export const guidedExperiments: GuidedExperiment[] = [
  {
    id: "projectile-verification",
    title: "Projectile motion verification",
    summary: "Check T, H and R against the simulation for different launch angles.",
    module: "projectile",
    simType: "projectile",
    objective:
      "Verify that the time of flight, maximum height and horizontal range of a projectile agree with the kinematic formulas, and find which launch angle gives the longest range.",
    theory: [
      "With no air resistance, the horizontal velocity stays constant and the vertical motion is uniformly accelerated by gravity g. The launch velocity u at angle θ splits into u cos θ (horizontal) and u sin θ (vertical).",
      "Setting the height back to zero gives the time of flight, the highest point is where the vertical velocity reaches zero, and the range is horizontal speed times time of flight. For a given speed the range is largest at 45°.",
    ],
    equations: [
      { text: "T = 2u sin θ / g", plain: "T = 2 u sin(theta) / g" },
      { text: "H = u² sin² θ / 2g", plain: "H = u^2 sin^2(theta) / 2g" },
      { text: "R = u² sin 2θ / g", plain: "R = u^2 sin(2 theta) / g" },
    ],
    initial: { speed: 30, angle: 45, gravity: 9.81, height: 0, mass: 1 },
    adjustable: ["speed", "angle", "gravity"],
    tasks: [
      "Run the launch at 45° and record the observation.",
      "Repeat at 30° and 60° and compare the ranges: they are equal, because sin 2θ is the same.",
      "Change gravity (try the Moon's 1.62 m/s²) and see how T, H and R scale.",
    ],
    waitingFor: "Press Play and let the projectile land.",
    charts: pick("projectile", ["pos", "vel"]),
    evaluate: (infoRaw, stateRaw) => {
      const info = infoRaw as ProjectileInfo;
      const s = stateRaw as ProjectileState;
      const a = info.analytic;
      return {
        complete: s.finished,
        results: [
          {
            label: "Time of flight T",
            unit: "s",
            formula: a.timeOfFlight,
            measured: s.measured.timeOfFlight,
            digits: 3,
          },
          {
            label: "Maximum height H",
            unit: "m",
            formula: a.maxHeight,
            measured: s.finished ? s.measured.maxHeight : null,
            digits: 3,
          },
          {
            label: "Horizontal range R",
            unit: "m",
            formula: a.range,
            measured: s.measured.range,
            digits: 3,
          },
        ],
      };
    },
  },
  {
    id: "energy-conservation",
    title: "Conservation of mechanical energy",
    summary:
      "A frictionless pendulum trades potential and kinetic energy; the total stays constant.",
    module: "pendulum",
    simType: "pendulum",
    objective:
      "Show that kinetic plus potential energy stays constant for a pendulum, and that this depends on there being no dissipative force.",
    theory: [
      "Gravity is a conservative force and the rod's tension is always perpendicular to the motion, so it does no work. The bob's mechanical energy is therefore constant: all potential energy at the top of the swing becomes kinetic energy at the bottom, and back again.",
      "Energy is measured from the lowest point. Because the bob's mass appears in both energies, the swing itself does not depend on it. Friction or air drag would remove energy and the swing would die away.",
    ],
    equations: [
      { text: "KE = ½ m v²", plain: "KE = (1/2) m v^2" },
      { text: "PE = m g h = m g L (1 − cos θ)", plain: "PE = m g h = m g L (1 - cos(theta))" },
      { text: "E = KE + PE = constant", plain: "E = KE + PE = constant" },
    ],
    initial: { length: 1.5, mass: 1, angle: 40, gravity: 9.81 },
    adjustable: ["length", "mass", "angle", "gravity"],
    tasks: [
      "Let the pendulum swing for at least one full period, then record.",
      "Open the Energy graph: KE and PE mirror each other while the total is flat.",
      "Change the angle and the mass and confirm the total energy changes but stays constant during each swing.",
    ],
    waitingFor: "Press Play and let it swing for one full period.",
    charts: pick("pendulum", ["pos", "e"]),
    evaluate: (infoRaw, stateRaw, series) => {
      const info = infoRaw as PendulumInfo;
      const s = stateRaw as PendulumState;
      const e0 = info.analytic.totalEnergy;
      return {
        complete: s.time >= info.analytic.exactPeriod && e0 > 0,
        results: [
          {
            label: "Initial mechanical energy",
            unit: "J",
            formula: e0,
            measured: s.energy.initial,
            digits: 4,
          },
          {
            label: "Peak kinetic energy (bottom)",
            unit: "J",
            formula: e0,
            measured: maxOf(column(series, "ke")),
            digits: 4,
          },
          {
            label: "Peak potential energy (top)",
            unit: "J",
            formula: e0,
            measured: maxOf(column(series, "pe")),
            digits: 4,
          },
          {
            label: "Energy drift",
            unit: "%",
            formula: 0,
            measured: s.energy.drift * 100,
            digits: 5,
          },
        ],
      };
    },
  },
  {
    id: "collision-lab",
    title: "Elastic and inelastic collision",
    summary: "Compare momentum and kinetic energy before and after a head-on collision.",
    module: "collision",
    simType: "collision",
    objective:
      "Verify that momentum is conserved in every collision, and that kinetic energy is conserved only when the collision is elastic (e = 1).",
    theory: [
      "The two bodies push on each other with equal and opposite forces, so the total momentum cannot change. The coefficient of restitution e is the ratio of the speed of separation to the speed of approach: e = 1 for an elastic collision, e = 0 when the bodies stick together.",
      "For 0 < e < 1 some kinetic energy is turned into heat and deformation. The amount lost is ½ μ (1 − e²) v_rel², where μ is the reduced mass.",
    ],
    equations: [
      { text: "m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′", plain: "m1 v1 + m2 v2 = m1 v1' + m2 v2'" },
      { text: "e = (v₂′ − v₁′) / (v₁ − v₂)", plain: "e = (v2' - v1') / (v1 - v2)" },
      {
        text: "ΔKE = ½ μ (1 − e²) v_rel²",
        plain: "dKE = (1/2) mu (1 - e^2) v_rel^2, mu = m1 m2 / (m1 + m2)",
      },
    ],
    initial: { m1: 2, m2: 3, v1: 5, v2: -2, restitution: 1 },
    adjustable: ["m1", "m2", "v1", "v2", "restitution"],
    tasks: [
      "Record an elastic collision (e = 1): kinetic energy is unchanged.",
      "Record a perfectly inelastic collision (e = 0): the bodies leave together and kinetic energy drops.",
      "Try equal masses with e = 1 and see the bodies exchange velocities.",
    ],
    waitingFor: "Press Play and wait for the bodies to collide.",
    charts: pick("collision", ["mom", "ke"]),
    evaluate: (infoRaw, stateRaw) => {
      const info = infoRaw as CollisionInfo;
      const s = stateRaw as CollisionState;
      const a = info.analytic;
      const after = s.after;
      const before = s.before;
      return {
        complete: after !== null,
        results: [
          {
            label: "Velocity v₁′ after",
            unit: "m/s",
            formula: a.v1After,
            measured: after?.v1 ?? null,
            digits: 3,
          },
          {
            label: "Velocity v₂′ after",
            unit: "m/s",
            formula: a.v2After,
            measured: after?.v2 ?? null,
            digits: 3,
          },
          {
            label: "Total momentum after",
            unit: "kg·m/s",
            formula: a.momentumBefore,
            measured: after?.momentum ?? null,
            digits: 3,
          },
          {
            label: "Kinetic energy after",
            unit: "J",
            formula: a.kineticAfter,
            measured: after?.kinetic ?? null,
            digits: 3,
          },
          {
            label: "Kinetic energy lost",
            unit: "J",
            formula: a.kineticLost,
            measured: before && after ? before.kinetic - after.kinetic : null,
            digits: 3,
          },
        ],
      };
    },
  },
  {
    id: "shm-lab",
    title: "Simple harmonic motion",
    summary: "Measure the period of a mass on a spring and compare it with 2π√(m/k).",
    module: "shm",
    simType: "shm",
    objective:
      "Measure the period of a spring-mass oscillator and confirm that it depends on the mass and the spring constant but not on the amplitude.",
    theory: [
      "A spring pulls the mass back toward equilibrium with a force proportional to the displacement, F = −kx. Newton's second law then gives motion x(t) = x₀ cos ωt with angular frequency ω = √(k/m).",
      "The period T = 2π/ω grows with the mass and shrinks with the stiffness. Doubling the amplitude does not change it, and the total energy ½kA² stays constant when nothing damps the motion.",
    ],
    equations: [
      { text: "F = −kx", plain: "F = -k x" },
      { text: "T = 2π √(m / k)", plain: "T = 2 pi sqrt(m / k)" },
      { text: "ω = √(k / m)", plain: "omega = sqrt(k / m)" },
    ],
    initial: { mass: 1, k: 25, displacement: 2 },
    adjustable: ["mass", "k", "displacement"],
    tasks: [
      "Let the block complete one and a quarter oscillations, then record.",
      "Double the mass and note that T increases by √2.",
      "Change only the displacement and confirm that T does not change.",
    ],
    waitingFor: "Press Play; the period is timed after three crossings of equilibrium.",
    charts: pick("shm", ["pos", "vel"]),
    evaluate: (infoRaw, stateRaw) => {
      const info = infoRaw as ShmInfo;
      const s = stateRaw as ShmState;
      const a = info.analytic;
      const T = s.measuredPeriod;
      return {
        complete: T !== null,
        results: [
          { label: "Period T", unit: "s", formula: a.period, measured: T, digits: 4 },
          {
            label: "Angular frequency ω",
            unit: "rad/s",
            formula: a.omega,
            measured: T !== null ? (2 * Math.PI) / T : null,
            digits: 4,
          },
          {
            label: "Total energy ½kA²",
            unit: "J",
            formula: a.totalEnergy,
            measured: s.energy.total,
            digits: 4,
          },
        ],
      };
    },
  },
  {
    id: "incline-friction",
    title: "Friction on an inclined plane",
    summary: "Find when a block slides, and compare its acceleration with g(sin θ − μk cos θ).",
    module: "incline",
    simType: "incline",
    objective:
      "Investigate how the angle and the friction coefficients decide whether a block slides, and verify its acceleration and time to reach the end of the slope.",
    theory: [
      "The weight splits into a component mg sin θ down the slope and mg cos θ into the surface, which the normal force N cancels. Static friction can hold the block as long as the pull along the slope stays below μs N.",
      "Beyond the critical angle θc = arctan μs the block slides, and kinetic friction μk N opposes the motion. The mass cancels out of the acceleration.",
    ],
    equations: [
      { text: "N = mg cos θ", plain: "N = m g cos(theta)" },
      { text: "a = g (sin θ − μk cos θ)", plain: "a = g (sin(theta) - mu_k cos(theta))" },
      { text: "tan θc = μs", plain: "tan(theta_c) = mu_s" },
    ],
    initial: { angle: 30, mass: 5, mu_s: 0.5, mu_k: 0.3, gravity: 9.81, applied: 0 },
    adjustable: ["angle", "mass", "mu_s", "mu_k"],
    tasks: [
      "Record the default run: the block slides because tan 30° = 0.577 exceeds μs = 0.5.",
      "Raise μs to 0.7 so that static friction holds it, and record again.",
      "Lower the angle below θc and watch the block stay put; compare θc with arctan μs.",
    ],
    waitingFor:
      "Press Play. A sliding block is recorded when it reaches the end; a held block after one second.",
    charts: pick("incline", ["pos", "vel"]),
    evaluate: (infoRaw, stateRaw) => {
      const info = infoRaw as InclineInfo;
      const s = stateRaw as InclineState;
      const a = info.analytic;
      const held = s.regime === "static" && s.time >= 1;
      return {
        complete: s.finished || held,
        results: [
          {
            label: "Acceleration along the slope",
            unit: "m/s²",
            formula: a.acceleration,
            measured: s.finished || held ? s.a : null,
            digits: 4,
          },
          {
            label: "Time to reach the end",
            unit: "s",
            formula: a.timeToEnd,
            measured: s.measured.timeToEnd,
            digits: 4,
          },
          {
            label: "Speed at the end",
            unit: "m/s",
            formula: a.speedAtEnd,
            measured: s.measured.speedAtEnd,
            digits: 4,
          },
          {
            label: "Critical angle θc",
            unit: "°",
            formula: a.criticalAngleDeg,
            measured: null,
            digits: 2,
          },
        ],
      };
    },
  },
];

export function getGuidedExperiment(id: string): GuidedExperiment | undefined {
  return guidedExperiments.find((e) => e.id === id);
}
