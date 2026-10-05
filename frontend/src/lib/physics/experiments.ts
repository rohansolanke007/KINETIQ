import type { PhysicsModule, PhysicsState } from "./engine";
import { fmt, speedOf } from "./format";

export interface Readout {
  label: string;
  value: string;
  unit?: string;
}

export interface CalculationVariable {
  symbol: string;
  label: string;
  value: string;
  unit?: string;
}

export interface Calculation {
  formula: string;
  variables: CalculationVariable[];
  substitution: string;
  result: string;
}

export interface Experiment {
  id: string;
  law: string;
  name: string;
  formula: string;
  description: string;
  explanation: string;
  build: (m: PhysicsModule) => void;
  readouts: (state: PhysicsState | null) => Readout[];
  calculation: (state: PhysicsState | null) => Calculation;
}

const dyn = (s: PhysicsState | null) =>
  (s?.objects ?? []).filter((o) => !o.isStatic);

const byIndex = (s: PhysicsState | null, i: number) =>
  dyn(s)[i] ?? null;

const momentumTotal = (s: PhysicsState | null) =>
  dyn(s).reduce((sum, o) => sum + o.mass * o.vel.x, 0);

const floor = (m: PhysicsModule) =>
  m.createRectangle(true, 1, 50, 2, 96, 4, 0, 0);

export const experiments: Experiment[] = [
  {
    id: "inertia",
    law: "NEWTON'S FIRST LAW",
    name: "INERTIA",
    formula: "ΣF = 0  ⇒  v = constant",
    description:
      "With gravity and friction switched off, a body keeps its velocity forever.",
    explanation:
      "Both bodies are released with different speeds and no forces act on them. The C++ engine keeps each velocity unchanged, so the separation grows linearly with time.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      m.createCircle(false, 2, 10, 45, 2.5, 6, 0);
      m.createCircle(false, 2, 10, 20, 2.5, 12, 0);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "BODY A SPEED",
        value: fmt(
          speedOf(byIndex(s, 0)?.vel ?? { x: 0, y: 0 })
        ),
        unit: "m/s",
      },
      {
        label: "BODY B SPEED",
        value: fmt(
          speedOf(byIndex(s, 1)?.vel ?? { x: 0, y: 0 })
        ),
        unit: "m/s",
      },
      {
        label: "NET FORCE",
        value: "0.00",
        unit: "N",
      },
    ],

    calculation: (s) => {
      const v = speedOf(
        byIndex(s, 0)?.vel ?? { x: 0, y: 0 }
      );

      return {
        formula: "ΣF = 0  ⇒  v = constant",

        variables: [
          {
            symbol: "ΣF",
            label: "Net force",
            value: "0.00",
            unit: "N",
          },
          {
            symbol: "v",
            label: "Body A speed",
            value: fmt(v),
            unit: "m/s",
          },
        ],

        substitution: "ΣF = 0 N  ⇒  v = constant",

        result: `Velocity remains constant at ${fmt(v)} m/s`,
      };
    },
  },

  {
    id: "f-ma",
    law: "NEWTON'S SECOND LAW",
    name: "FORCE, MASS, ACCELERATION",
    formula: "F = m · a",
    description:
      "Identical impulses on different masses produce different accelerations.",
    explanation:
      "Three bodies of 1, 4 and 10 kg sit in a gravity-free world. Run the experiment and apply the same impulse to each: the lighter mass gains the most speed, exactly as F = m·a predicts.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      const a = m.createCircle(false, 1, 12, 48, 2, 0, 0);
      const b = m.createCircle(false, 4, 12, 30, 2.8, 0, 0);
      const c = m.createCircle(false, 10, 12, 12, 3.6, 0, 0);

      m.applyImpulse(a, 20, 0);
      m.applyImpulse(b, 20, 0);
      m.applyImpulse(c, 20, 0);

      m.pause();
    },

    readouts: (s) =>
      dyn(s).map((o, i) => ({
        label: `m = ${fmt(o.mass, 0)} kg · v`,
        value: fmt(speedOf(o.vel)),
        unit: "m/s",
      })),

    calculation: (s) => {
      const body = byIndex(s, 0);

      const mass = body?.mass ?? 1;
      const force = 20;
      const acceleration = force / mass;

      return {
        formula: "F = m · a",

        variables: [
          {
            symbol: "F",
            label: "Applied force",
            value: fmt(force),
            unit: "N",
          },
          {
            symbol: "m",
            label: "Mass",
            value: fmt(mass),
            unit: "kg",
          },
          {
            symbol: "a",
            label: "Acceleration",
            value: fmt(acceleration),
            unit: "m/s²",
          },
        ],

        substitution: `a = F / m = ${fmt(force)} / ${fmt(mass)}`,

        result: `Acceleration = ${fmt(acceleration)} m/s²`,
      };
    },
  },

  {
    id: "action-reaction",
    law: "NEWTON'S THIRD LAW",
    name: "ACTION & REACTION",
    formula: "F₁₂ = −F₂₁",
    description:
      "Two bodies collide head-on and push each other apart.",
    explanation:
      "The C++ collision response applies equal and opposite impulses. Total momentum along x stays constant while each body reverses.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      m.createCircle(false, 4, 20, 30, 3, 10, 0);
      m.createCircle(false, 4, 80, 30, 3, -10, 0);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "BODY A vₓ",
        value: fmt(byIndex(s, 0)?.vel.x ?? 0),
        unit: "m/s",
      },
      {
        label: "BODY B vₓ",
        value: fmt(byIndex(s, 1)?.vel.x ?? 0),
        unit: "m/s",
      },
      {
        label: "TOTAL pₓ",
        value: fmt(momentumTotal(s)),
        unit: "kg·m/s",
      },
    ],

    calculation: (s) => {
      const vA = byIndex(s, 0)?.vel.x ?? 0;
      const vB = byIndex(s, 1)?.vel.x ?? 0;

      return {
        formula: "F₁₂ = −F₂₁",

        variables: [
          {
            symbol: "F₁₂",
            label: "Force on body A",
            value: "F",
            unit: "N",
          },
          {
            symbol: "F₂₁",
            label: "Force on body B",
            value: "−F",
            unit: "N",
          },
          {
            symbol: "v₁",
            label: "Body A velocity",
            value: fmt(vA),
            unit: "m/s",
          },
          {
            symbol: "v₂",
            label: "Body B velocity",
            value: fmt(vB),
            unit: "m/s",
          },
        ],

        substitution: "F₁₂ + F₂₁ = 0",

        result: "Forces are equal in magnitude and opposite in direction.",
      };
    },
  },

  {
    id: "gravity",
    law: "UNIFORM GRAVITY",
    name: "FREE FALL",
    formula: "a = g,  y = y₀ − ½gt²",
    description:
      "Different masses fall with the same acceleration.",
    explanation:
      "Gravity is set to 9.8 m/s². The engine gives every mass the same downward acceleration, so the three bodies stay level as they fall.",

    build: (m) => {
      m.reset();
      m.setGravity(9.8);
      m.disableFriction();

      floor(m);

      m.createCircle(false, 1, 25, 55, 2, 0, 0);
      m.createCircle(false, 6, 50, 55, 2.6, 0, 0);
      m.createCircle(false, 15, 75, 55, 3.2, 0, 0);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "TIME",
        value: fmt(s?.time ?? 0),
        unit: "s",
      },
      {
        label: "LIGHT BODY vᵧ",
        value: fmt(byIndex(s, 0)?.vel.y ?? 0),
        unit: "m/s",
      },
      {
        label: "HEAVY BODY vᵧ",
        value: fmt(byIndex(s, 2)?.vel.y ?? 0),
        unit: "m/s",
      },
    ],

    calculation: (s) => {
      const t = s?.time ?? 0;
      const g = 9.8;
      const y0 = 55;

      const displacement = 0.5 * g * t ** 2;
      const y = y0 - displacement;

      return {
        formula: "y = y₀ − ½gt²",

        variables: [
          {
            symbol: "g",
            label: "Gravitational acceleration",
            value: fmt(g),
            unit: "m/s²",
          },
          {
            symbol: "t",
            label: "Time",
            value: fmt(t),
            unit: "s",
          },
          {
            symbol: "y₀",
            label: "Initial height",
            value: fmt(y0),
            unit: "m",
          },
        ],

        substitution: `y = ${fmt(y0)} − ½ × ${fmt(g)} × (${fmt(t)})²`,

        result: `Height ≈ ${fmt(y)} m`,
      };
    },
  },

  {
    id: "projectile",
    law: "PROJECTILE MOTION",
    name: "PARABOLIC TRAJECTORY",
    formula:
      "x = v₀cosθ·t,  y = v₀sinθ·t − ½gt²",
    description:
      "A launched body traces a parabola under constant gravity.",
    explanation:
      "Horizontal velocity stays constant while vertical velocity is changed by gravity in the C++ integrator, producing the classic parabola.",

    build: (m) => {
      m.reset();
      m.setGravity(9.8);
      m.disableFriction();

      floor(m);

      m.createCircle(false, 2, 6, 6, 1.6, 20, 26);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "HEIGHT",
        value: fmt(byIndex(s, 0)?.pos.y ?? 0),
        unit: "m",
      },
      {
        label: "RANGE",
        value: fmt(byIndex(s, 0)?.pos.x ?? 0),
        unit: "m",
      },
      {
        label: "vₓ",
        value: fmt(byIndex(s, 0)?.vel.x ?? 0),
        unit: "m/s",
      },
      {
        label: "vᵧ",
        value: fmt(byIndex(s, 0)?.vel.y ?? 0),
        unit: "m/s",
      },
    ],

    calculation: (s) => {
      const body = byIndex(s, 0);

      const vx = body?.vel.x ?? 20;
      const vy = body?.vel.y ?? 26;
      const t = s?.time ?? 0;

      const x = 6 + vx * t;
      const y = 6 + vy * t - 0.5 * 9.8 * t ** 2;

      return {
        formula:
          "x = v₀ₓt   |   y = y₀ + v₀ᵧt − ½gt²",

        variables: [
          {
            symbol: "v₀ₓ",
            label: "Horizontal velocity",
            value: fmt(vx),
            unit: "m/s",
          },
          {
            symbol: "v₀ᵧ",
            label: "Vertical velocity",
            value: fmt(vy),
            unit: "m/s",
          },
          {
            symbol: "g",
            label: "Gravity",
            value: "9.8",
            unit: "m/s²",
          },
          {
            symbol: "t",
            label: "Time",
            value: fmt(t),
            unit: "s",
          },
        ],

        substitution: `x = 6 + ${fmt(vx)} × ${fmt(t)}`,

        result: `Current position ≈ (${fmt(x)}, ${fmt(y)}) m`,
      };
    },
  },

  {
    id: "momentum",
    law: "CONSERVATION OF MOMENTUM",
    name: "UNEQUAL MASS IMPACT",
    formula:
      "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂",
    description:
      "A fast light body strikes a slow heavy body.",
    explanation:
      "Watch the total momentum readout: the C++ collision solver redistributes velocity between the bodies but the sum stays essentially unchanged.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      m.createCircle(false, 2, 15, 30, 2.2, 16, 0);
      m.createCircle(false, 10, 70, 30, 4, 0, 0);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "LIGHT vₓ",
        value: fmt(byIndex(s, 0)?.vel.x ?? 0),
        unit: "m/s",
      },
      {
        label: "HEAVY vₓ",
        value: fmt(byIndex(s, 1)?.vel.x ?? 0),
        unit: "m/s",
      },
      {
        label: "TOTAL pₓ",
        value: fmt(momentumTotal(s)),
        unit: "kg·m/s",
      },
    ],

    calculation: (s) => {
      const a = byIndex(s, 0);
      const b = byIndex(s, 1);

      const m1 = a?.mass ?? 2;
      const m2 = b?.mass ?? 10;

      const u1 = 16;
      const u2 = 0;

      const initialMomentum = m1 * u1 + m2 * u2;
      const finalMomentum = momentumTotal(s);

      return {
        formula:
          "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂",

        variables: [
          {
            symbol: "m₁",
            label: "Light mass",
            value: fmt(m1),
            unit: "kg",
          },
          {
            symbol: "u₁",
            label: "Light initial velocity",
            value: fmt(u1),
            unit: "m/s",
          },
          {
            symbol: "m₂",
            label: "Heavy mass",
            value: fmt(m2),
            unit: "kg",
          },
          {
            symbol: "u₂",
            label: "Heavy initial velocity",
            value: fmt(u2),
            unit: "m/s",
          },
        ],

        substitution: `pᵢ = (${fmt(m1)} × ${fmt(u1)}) + (${fmt(m2)} × ${fmt(u2)})`,

        result: `Initial pₓ = ${fmt(initialMomentum)} kg·m/s · Current pₓ = ${fmt(finalMomentum)} kg·m/s`,
      };
    },
  },

  {
    id: "energy",
    law: "KINETIC ENERGY",
    name: "ENERGY & SPEED",
    formula: "KE = ½mv²",
    description:
      "Energy grows with the square of speed, not linearly.",
    explanation:
      "Three equal masses travel at 4, 8 and 12 m/s. The engine's kinetic energy total shows the quadratic relationship immediately.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      m.createCircle(false, 2, 10, 48, 2.4, 4, 0);
      m.createCircle(false, 2, 10, 30, 2.4, 8, 0);
      m.createCircle(false, 2, 10, 12, 2.4, 12, 0);

      m.pause();
    },

    readouts: (s) =>
      dyn(s).map((o) => ({
        label: `v = ${fmt(speedOf(o.vel), 1)} m/s · KE`,
        value: fmt(
          0.5 * o.mass * speedOf(o.vel) ** 2
        ),
        unit: "J",
      })),

    calculation: (s) => {
      const body = byIndex(s, 0);

      const mass = body?.mass ?? 2;
      const velocity = speedOf(
        body?.vel ?? { x: 4, y: 0 }
      );

      const ke = 0.5 * mass * velocity ** 2;

      return {
        formula: "KE = ½mv²",

        variables: [
          {
            symbol: "m",
            label: "Mass",
            value: fmt(mass),
            unit: "kg",
          },
          {
            symbol: "v",
            label: "Velocity",
            value: fmt(velocity),
            unit: "m/s",
          },
        ],

        substitution: `KE = ½ × ${fmt(mass)} × (${fmt(velocity)})²`,

        result: `Kinetic Energy = ${fmt(ke)} J`,
      };
    },
  },

  {
    id: "friction",
    law: "KINETIC FRICTION",
    name: "SLIDING & STOPPING",
    formula: "f = μ · N",
    description:
      "Sliding blocks lose speed to the engine's friction model.",
    explanation:
      "Two blocks start at the same speed with friction enabled at μ = 0.3. Their speeds decay until they come to rest.",

    build: (m) => {
      m.reset();
      m.setGravity(9.8);
      m.setFriction(0.3);

      floor(m);

      m.createRectangle(false, 4, 10, 6.5, 6, 3, 18, 0);
      m.createRectangle(false, 12, 10, 12, 6, 3, 18, 0);

      m.pause();
    },

    readouts: (s) => [
      {
        label: "μ",
        value: fmt(s?.friction ?? 0),
      },
      {
        label: "BLOCK A SPEED",
        value: fmt(
          speedOf(
            byIndex(s, 0)?.vel ?? { x: 0, y: 0 }
          )
        ),
        unit: "m/s",
      },
      {
        label: "BLOCK B SPEED",
        value: fmt(
          speedOf(
            byIndex(s, 1)?.vel ?? { x: 0, y: 0 }
          )
        ),
        unit: "m/s",
      },
    ],

    calculation: (s) => {
      const mu = s?.friction ?? 0.3;
      const body = byIndex(s, 0);

      const mass = body?.mass ?? 4;
      const g = 9.8;
      const normal = mass * g;
      const friction = mu * normal;

      return {
        formula: "f = μ · N",

        variables: [
          {
            symbol: "μ",
            label: "Coefficient of friction",
            value: fmt(mu),
          },
          {
            symbol: "N",
            label: "Normal force",
            value: fmt(normal),
            unit: "N",
          },
          {
            symbol: "m",
            label: "Mass",
            value: fmt(mass),
            unit: "kg",
          },
        ],

        substitution: `f = ${fmt(mu)} × ${fmt(normal)}`,

        result: `Friction force = ${fmt(friction)} N`,
      };
    },
  },

  {
    id: "impulse",
    law: "IMPULSE–MOMENTUM THEOREM",
    name: "IMPULSE CHANGES MOMENTUM",
    formula: "J = Δp = m·Δv",
    description:
      "A single impulse instantly changes a body's momentum.",
    explanation:
      "The body starts at rest. Use APPLY IMPULSE in the inspector or run the experiment: momentum jumps by exactly the impulse delivered by the C++ engine.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      const id = m.createCircle(
        false,
        5,
        20,
        30,
        3,
        0,
        0
      );

      m.applyImpulse(id, 30, 10);
      m.pause();
    },

    readouts: (s) => [
      {
        label: "MASS",
        value: fmt(byIndex(s, 0)?.mass ?? 0),
        unit: "kg",
      },
      {
        label: "MOMENTUM",
        value: fmt(
          (byIndex(s, 0)?.mass ?? 0) *
            speedOf(
              byIndex(s, 0)?.vel ?? {
                x: 0,
                y: 0,
              }
            )
        ),
        unit: "kg·m/s",
      },
      {
        label: "SPEED",
        value: fmt(
          speedOf(
            byIndex(s, 0)?.vel ?? {
              x: 0,
              y: 0,
            }
          )
        ),
        unit: "m/s",
      },
    ],

    calculation: (s) => {
      const body = byIndex(s, 0);

      const mass = body?.mass ?? 5;
      const speed = speedOf(
        body?.vel ?? { x: 0, y: 0 }
      );

      const momentum = mass * speed;

      return {
        formula: "J = Δp = m·Δv",

        variables: [
          {
            symbol: "m",
            label: "Mass",
            value: fmt(mass),
            unit: "kg",
          },
          {
            symbol: "Δv",
            label: "Change in velocity",
            value: fmt(speed),
            unit: "m/s",
          },
          {
            symbol: "J",
            label: "Impulse",
            value: "≈ 58.31",
            unit: "N·s",
          },
        ],

        substitution: `Δp = ${fmt(mass)} × ${fmt(speed)}`,

        result: `Momentum = ${fmt(momentum)} kg·m/s`,
      };
    },
  },

  {
    id: "collision-chain",
    law: "MULTI-BODY COLLISIONS",
    name: "COLLISION CHAIN",
    formula: "Σp = constant",
    description:
      "One moving body transfers motion through a line of resting bodies.",
    explanation:
      "A row of equal spheres is struck from the left. The engine resolves each contact in turn and momentum travels along the chain.",

    build: (m) => {
      m.reset();
      m.disableGravity();
      m.disableFriction();

      m.createCircle(false, 3, 10, 30, 2.4, 18, 0);

      for (let i = 0; i < 4; i++) {
        m.createCircle(
          false,
          3,
          45 + i * 5.2,
          30,
          2.4,
          0,
          0
        );
      }

      m.pause();
    },

    readouts: (s) => [
      {
        label: "BODIES",
        value: String(s?.stats.objects ?? 0),
      },
      {
        label: "CONTACTS",
        value: String(s?.stats.collisions ?? 0),
      },
      {
        label: "TOTAL pₓ",
        value: fmt(momentumTotal(s)),
        unit: "kg·m/s",
      },
      {
        label: "TOTAL KE",
        value: fmt(s?.stats.kineticEnergy ?? 0),
        unit: "J",
      },
    ],

    calculation: (s) => {
      const totalMomentum = momentumTotal(s);
      const kineticEnergy = s?.stats.kineticEnergy ?? 0;

      return {
        formula: "Σp = constant",

        variables: [
          {
            symbol: "Σp",
            label: "Total momentum",
            value: fmt(totalMomentum),
            unit: "kg·m/s",
          },
          {
            symbol: "KE",
            label: "Total kinetic energy",
            value: fmt(kineticEnergy),
            unit: "J",
          },
          {
            symbol: "n",
            label: "Number of bodies",
            value: String(s?.stats.objects ?? 0),
          },
        ],

        substitution: `Σp = ${fmt(totalMomentum)} kg·m/s`,

        result: `Total momentum remains approximately ${fmt(totalMomentum)} kg·m/s`,
      };
    },
  },
];