/**
 * Thin typed bridge to the EXISTING C++ physics engine compiled to
 * WebAssembly with Emscripten (public/physics_engine.js + .wasm).
 *
 * No physics is implemented here. Every simulation operation is delegated
 * to the global Emscripten `Module` object exactly as described in
 * docs/WASM_API.md.
 */

export interface PhysicsModule {
  reset(): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;

  setTimeStep(dt: number): void;
  getTimeStep(): number;

  setGravity(g: number): void;
  disableGravity(): void;
  setFriction(coefficient: number): void;
  disableFriction(): void;

  createCircle(
    isStatic: boolean,
    mass: number,
    x: number,
    y: number,
    radius: number,
    vx: number,
    vy: number,
  ): number;
  createRectangle(
    isStatic: boolean,
    mass: number,
    x: number,
    y: number,
    width: number,
    height: number,
    vx: number,
    vy: number,
  ): number;
  createTriangle(
    isStatic: boolean,
    mass: number,
    x: number,
    y: number,
    base: number,
    height: number,
    vx: number,
    vy: number,
  ): number;

  removeObject(id: number): boolean;
  setObjectPosition(id: number, x: number, y: number): void;
  setObjectVelocity(id: number, vx: number, vy: number): void;
  applyImpulse(id: number, fx: number, fy: number): void;

  step(count: number): void;
  undo(): boolean;

  getStateJSON(): string;

  // ---- Dedicated simulations (C++ Simulation hierarchy) ----
  // Mutating calls return "" on success or an error message.
  simCreate(type: string): string;
  simDestroy(): void;
  simSetParameter(name: string, value: number): string;
  simReset(): string;
  simAdvance(seconds: number): void;
  simStepFrame(): void;
  simStateJSON(): string;
  simInfoJSON(): string;
  simSeriesJSON(maxRows: number): string;
  simForcesJSON(): string;
  /** Gravity and friction on one sandbox body; "null" for unknown or static ids. */
  getBodyForcesJSON(id: number): string;

  // ---- Sandbox restitution and energy/momentum analysis ----
  setRestitution(e: number): void;
  setWallRestitution(e: number): void;
  getAnalysisJSON(): string;
  getAnalysisSeriesJSON(maxRows: number): string;
}

/** True when the loaded WebAssembly build includes the Simulation API. */
export function supportsSimulations(module: PhysicsModule): boolean {
  return typeof module.simCreate === "function";
}

/** Parameter metadata supplied by C++ (ranges live in one place). */
export interface SimParameter {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  value: number;
}

export interface ProjectileAnalytic {
  ux: number;
  uy: number;
  timeOfFlight: number;
  apexTime: number;
  maxHeight: number;
  range: number;
  impactSpeed: number;
}

export interface ProjectileInfo {
  type: "projectile";
  parameters: SimParameter[];
  analytic: ProjectileAnalytic;
  /** Predicted trajectory as [x, y] points in metres. */
  predictedPath: [number, number][];
}

export interface ProjectileState {
  type: "projectile";
  time: number;
  finished: boolean;
  position: Vec2;
  velocity: Vec2 & { speed: number };
  acceleration: Vec2;
  measured: {
    timeOfFlight: number | null;
    range: number | null;
    maxHeight: number | null;
    apexTime: number | null;
  };
  energy: EnergyReport;
  progress: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface PhysicsObjectState {
  id: number;
  kind: string;
  isStatic: boolean;
  shape: "Circle" | "Rectangle" | "Triangle" | string;
  shapeType: number;
  shapeParams: number[];
  mass: number;
  pos: Vec2;
  vel: Vec2;
  acc: Vec2;
  radius: number;
}

export interface CollisionEvent {
  a: number;
  b: number;
  penetration: number;
}

export interface PhysicsState {
  time: number;
  timeStep: number;
  paused: boolean;
  gravity: number;
  friction: number;
  gravityEnabled: boolean;
  /** Body-body restitution (absent in builds that predate the energy phase). */
  restitution?: number;
  wallRestitution?: number;
  frictionEnabled: boolean;
  boundaryMin: Vec2;
  boundaryMax: Vec2;
  stats: {
    objects: number;
    dynamic: number;
    static: number;
    kineticEnergy: number;
    collisions: number;
  };
  recentCollisions: CollisionEvent[];
  objects: PhysicsObjectState[];
}

declare global {
  interface Window {
    Module?: Partial<PhysicsModule> & Record<string, unknown>;
  }
}

let loader: Promise<PhysicsModule> | null = null;

export function loadPhysicsEngine(): Promise<PhysicsModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("The C++ engine can only load in the browser."));
  }
  if (loader) return loader;

  loader = new Promise<PhysicsModule>((resolve, reject) => {
    const existing = window.Module;
    if (existing && typeof existing.getStateJSON === "function") {
      resolve(existing as PhysicsModule);
      return;
    }

    // Emscripten reads the global `Module` object when physics_engine.js runs.
    window.Module = {
      locateFile: (path: string) => `/${path}`,
      onRuntimeInitialized: function () {
        window.dispatchEvent(new Event("physics-engine-ready"));
        resolve(window.Module as unknown as PhysicsModule);
      },
    } as NonNullable<Window["Module"]>;

    const script = document.createElement("script");
    script.src = "/physics_engine.js";
    script.async = true;
    script.onerror = () => reject(new Error("Could not load physics_engine.js"));
    document.head.appendChild(script);
  });

  return loader;
}

export function readState(module: PhysicsModule): PhysicsState {
  return JSON.parse(module.getStateJSON()) as PhysicsState;
}

/** Emscripten throws numeric pointers for C++ exceptions; normalise to text. */
export function engineErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "number") return "The C++ engine rejected that operation.";
  return "Unknown engine error.";
}

export interface PendulumInfo {
  type: "pendulum";
  parameters: SimParameter[];
  analytic: {
    omega0: number;
    smallAnglePeriod: number;
    exactPeriod: number;
    maxSpeed: number;
    maxTension: number;
    totalEnergy: number;
  };
}

export interface PendulumState {
  type: "pendulum";
  time: number;
  finished: boolean;
  theta: number;
  thetaDeg: number;
  omega: number;
  alpha: number;
  bob: Vec2;
  speed: number;
  tension: number;
  energy: EnergyReport;
  measuredPeriod: number | null;
}

export interface ShmInfo {
  type: "shm";
  parameters: SimParameter[];
  analytic: {
    omega: number;
    period: number;
    frequency: number;
    amplitude: number;
    maxSpeed: number;
    maxAcceleration: number;
    maxForce: number;
    totalEnergy: number;
  };
}

export interface ShmState {
  type: "shm";
  time: number;
  finished: boolean;
  x: number;
  v: number;
  a: number;
  force: number;
  energy: EnergyReport;
  measuredPeriod: number | null;
}

/** One force in a free-body diagram. World coordinates: x right, y up. */
export interface FbdForce {
  name: string;
  label: string;
  kind: "gravity" | "normal" | "friction" | "applied" | "tension" | "spring";
  x: number;
  y: number;
  magnitude: number;
  angleDeg: number;
  /** A piece of another force (drawn dashed, not part of the resultant). */
  component: boolean;
}

export interface FbdData {
  forces: FbdForce[];
  resultant: { x: number; y: number; magnitude: number };
  equilibrium: boolean;
}

export interface InclineInfo {
  type: "incline";
  parameters: SimParameter[];
  slope: { length: number; startDistance: number };
  analytic: {
    normalForce: number;
    weightAlongSlope: number;
    weightPerpendicular: number;
    maxStaticFriction: number;
    kineticFriction: number;
    criticalAngleDeg: number;
    netForce: number;
    friction: number;
    acceleration: number;
    slides: boolean;
    direction: "down" | "up" | "none";
    timeToEnd: number | null;
    speedAtEnd: number | null;
  };
}

export interface InclineState {
  type: "incline";
  time: number;
  finished: boolean;
  regime: "static" | "sliding" | "bottom" | "top";
  s: number;
  v: number;
  a: number;
  position: Vec2;
  energy: {
    kinetic: number;
    potential: number;
    mechanical: number;
    frictionHeat: number;
    appliedWork: number;
    initial: number;
    /** E_mech + heat - work(applied) - E_initial: zero when the books balance. */
    accountingError: number;
  };
  measured: { timeToEnd: number | null; speedAtEnd: number | null };
}

/** Energy and momentum of the sandbox, computed by the C++ engine. */
export interface SandboxAnalysis {
  time: number;
  kinetic: number;
  potential: number;
  mechanical: number;
  momentum: { x: number; y: number; magnitude: number };
  bodies: {
    id: number;
    mass: number;
    kinetic: number;
    potential: number;
    px: number;
    py: number;
  }[];
}

export interface CollisionInfo {
  type: "collision";
  parameters: SimParameter[];
  track: { length: number; start1: number; start2: number; radius1: number; radius2: number };
  analytic: {
    willCollide: boolean;
    timeToCollision: number | null;
    v1After: number;
    v2After: number;
    momentumBefore: number;
    momentumAfter: number;
    kineticBefore: number;
    kineticAfter: number;
    kineticLost: number;
    centreOfMassVelocity: number;
    kind: "elastic" | "inelastic" | "perfectly inelastic";
  };
}

export interface CollisionSnapshot {
  v1: number;
  v2: number;
  momentum: number;
  kinetic: number;
}

export interface CollisionState {
  type: "collision";
  time: number;
  finished: boolean;
  collided: boolean;
  x1: number;
  x2: number;
  v1: number;
  v2: number;
  p1: number;
  p2: number;
  momentum: number;
  kinetic: { k1: number; k2: number; total: number };
  collisionTime: number | null;
  before: CollisionSnapshot | null;
  after: CollisionSnapshot | null;
}

/** Energy block reported by the conservative simulations. */
export interface EnergyReport {
  kinetic: number;
  potential: number;
  total: number;
  initial: number;
  /** Relative change of the total from its initial value. */
  drift: number;
}

// ---- Circular Motion -----------------------------------------------

export interface CircularMotionAnalytic {
  angularVelocity: number;      // omega = v / r   (rad/s)
  tangentialVelocity: number;   // v               (m/s)
  centripetalAccel: number;     // a_c = v² / r    (m/s²)
  centripetalForce: number;     // F_c = m·a_c     (N)
  period: number;               // T = 2π / omega  (s)
  frequency: number;            // f = 1 / T       (Hz)
  radius: number;               // r               (m)
  mass: number;                 // m               (kg)
}

export interface CircularMotionInfo {
  type: "circular";
  parameters: SimParameter[];
  analytic: CircularMotionAnalytic;
}

export interface CircularMotionState {
  type: "circular";
  time: number;
  finished: boolean;
  theta: number;       // cumulative angular displacement (rad)
  thetaDeg: number;    // degrees
  omega: number;       // current angular velocity (rad/s)
  alpha: number;       // angular acceleration (rad/s²)
  v: number;           // tangential velocity (m/s)
  ac: number;          // centripetal acceleration (m/s²)
  Fc: number;          // centripetal force (N)
  pos: Vec2;           // position on circle (m)
}

// ---- Rotational Dynamics -------------------------------------------

export interface RotationalDynamicsAnalytic {
  momentOfInertia: number;  // I      (kg·m²)
  torque: number;           // τ      (N·m)
  angularAccel: number;     // α      (rad/s²)
  shapeId: number;          // 0–6
  shapeLabel: string;
  shapeFormula: string;
  radius: number;
  mass: number;
}

export interface RotationalDynamicsInfo {
  type: "rotational";
  parameters: SimParameter[];
  analytic: RotationalDynamicsAnalytic;
}

export interface RotationalDynamicsState {
  type: "rotational";
  time: number;
  finished: boolean;
  theta: number;    // angular displacement (rad)
  thetaDeg: number;
  omega: number;    // angular velocity (rad/s)
  alpha: number;    // angular acceleration (rad/s²)
  torque: number;   // applied net torque (N·m)
  I: number;        // moment of inertia (kg·m²)
  L: number;        // angular momentum (kg·m²/s)
  KE: number;       // rotational kinetic energy (J)
  P: number;        // rotational power (W)
  W: number;        // work done by torque (J)
  shapeId: number;
}

// ---- Air Resistance & Terminal Velocity ----------------------------

export interface AirResistanceAnalytic {
  terminalVelocity: number;   // v_t  (m/s)
  gravityForce: number;       // mg   (N)
  dragMode: number;           // 0=none, 1=linear, 2=quadratic
  projMode: boolean;          // 2D projectile mode?
  mass: number;
  gravity: number;
  linearDrag: number;
  dragCoeff: number;
  crossSection: number;
  airDensity: number;
}

export interface AirResistanceInfo {
  type: "drag";
  parameters: SimParameter[];
  analytic: AirResistanceAnalytic;
}

export interface AirResistanceState {
  type: "drag";
  time: number;
  finished: boolean;
  x: number;              // horizontal position (m) — always 0 in 1D mode
  y: number;              // vertical position (m)
  vx: number;             // horizontal velocity (m/s)
  vy: number;             // vertical velocity (m/s)
  ax: number;             // horizontal acceleration (m/s²)
  ay: number;             // vertical acceleration (m/s²)
  speed: number;          // |v| (m/s)
  dragForce: number;      // |F_d| (N)
  gravityForce: number;   // mg (N)
  netForce: number;       // net force magnitude (N)
  reynoldsNumber: number; // Re (dimensionless)
  terminalVelocity: number; // v_t (m/s)
  dragMode: number;       // 0/1/2
  projMode: boolean;      // true = 2D projectile
}

// ---- Orbital Mechanics --------------------------------------------

export interface OrbitalMechanicsAnalytic {
  circularVelocity: number;    // v_circ = sqrt(GM/r)   (m/s)
  escapeVelocity: number;      // v_esc  = sqrt(2GM/r)  (m/s)
  orbitalPeriod: number;       // T = 2π√(r³/GM)        (s)
  gravForce: number;           // F = GMm/r²            (N)
  potentialEnergy: number;     // U = -GMm/r            (J)
  totalEnergy: number;         // E = -GMm/2r           (J)
  angularMomentum: number;     // L = m*v_circ*r        (kg·m²/s)
  gravFieldStrength: number;   // g = GM/r²             (m/s²)
  gravPotential: number;       // V = -GM/r             (J/kg)
  altitude: number;            // r - R_body            (m)
  bodyId: number;              // 0–4
  bodyName: string;
  bodyRadius: number;          // (m)
  mu: number;                  // GM  (m³/s²)
  mass: number;                // satellite mass (kg)
}

export interface OrbitalMechanicsInfo {
  type: "orbital";
  parameters: SimParameter[];
  analytic: OrbitalMechanicsAnalytic;
}

export interface OrbitalMechanicsState {
  type: "orbital";
  time: number;
  finished: boolean;
  x: number;               // satellite x position (m)
  y: number;               // satellite y position (m)
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  r: number;               // distance from central body centre (m)
  altitude: number;        // r - R_body (m)
  speed: number;           // |v| (m/s)
  gravForce: number;       // F = GMm/r²  (N)
  potentialEnergy: number; // U = -GMm/r  (J)
  totalEnergy: number;     // E = KE + U  (J)
  angularMomentum: number; // L = m(x*vy - y*vx)  (kg·m²/s)
  circularVelocity: number;// sqrt(GM/r)  (m/s) at current r
  escapeVelocity: number;  // sqrt(2GM/r) (m/s) at current r
  bodyId: number;
  bodyRadius: number;
}
