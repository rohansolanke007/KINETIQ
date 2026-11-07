import type { SeriesLine } from "@/components/lab/SeriesChart";

/** The dedicated C++ simulations that record a time series. */
export type ModuleId = "projectile" | "pendulum" | "shm" | "incline" | "collision";

export interface ChartSpec {
  id: string;
  title: string;
  lines: SeriesLine[];
}

const c = {
  cyan: "var(--cyan)",
  blue: "var(--blue)",
  purple: "var(--purple)",
  amber: "var(--amber)",
  red: "var(--red)",
  green: "var(--green)",
};

const energyCharts = (heat = false): ChartSpec[] => [
  {
    id: "ke",
    title: "Kinetic energy vs time",
    lines: [{ channel: "ke", label: "Kinetic", color: c.cyan }],
  },
  {
    id: "pe",
    title: "Potential energy vs time",
    lines: [{ channel: "pe", label: "Potential", color: c.purple }],
  },
  {
    id: "e",
    title: "Total mechanical energy vs time",
    lines: [
      { channel: "e", label: "Total", color: c.amber },
      ...(heat ? [{ channel: "heat", label: "Heat from friction", color: c.red }] : []),
    ],
  },
];

/**
 * Which recorded channels make each graph. Channel names are the ones the
 * C++ SeriesRecorder of that simulation declares.
 */
export const moduleCharts: Record<ModuleId, ChartSpec[]> = {
  projectile: [
    {
      id: "pos",
      title: "Position vs time",
      lines: [
        { channel: "x", label: "x", color: c.blue },
        { channel: "y", label: "y", color: c.cyan },
      ],
    },
    {
      id: "vel",
      title: "Velocity vs time",
      lines: [
        { channel: "vx", label: "vx", color: c.blue },
        { channel: "vy", label: "vy", color: c.purple },
      ],
    },
    {
      id: "acc",
      title: "Acceleration vs time",
      lines: [
        { channel: "ax", label: "ax", color: c.blue },
        { channel: "ay", label: "ay", color: c.purple },
      ],
    },
    ...energyCharts(),
  ],
  pendulum: [
    {
      id: "pos",
      title: "Angular position vs time",
      lines: [{ channel: "theta", label: "θ", color: c.cyan }],
    },
    {
      id: "vel",
      title: "Angular velocity vs time",
      lines: [{ channel: "omega", label: "ω", color: c.purple }],
    },
    {
      id: "acc",
      title: "Angular acceleration vs time",
      lines: [{ channel: "alpha", label: "α", color: c.blue }],
    },
    ...energyCharts(),
  ],
  shm: [
    {
      id: "pos",
      title: "Displacement vs time",
      lines: [{ channel: "x", label: "x", color: c.cyan }],
    },
    {
      id: "vel",
      title: "Velocity vs time",
      lines: [{ channel: "v", label: "v", color: c.purple }],
    },
    {
      id: "acc",
      title: "Acceleration vs time",
      lines: [{ channel: "a", label: "a", color: c.blue }],
    },
    ...energyCharts(),
  ],
  incline: [
    {
      id: "pos",
      title: "Position along the slope vs time",
      lines: [{ channel: "s", label: "s", color: c.cyan }],
    },
    {
      id: "vel",
      title: "Velocity vs time",
      lines: [{ channel: "v", label: "v", color: c.purple }],
    },
    {
      id: "acc",
      title: "Acceleration vs time",
      lines: [{ channel: "a", label: "a", color: c.blue }],
    },
    ...energyCharts(true),
  ],
  // Two bodies on a frictionless track: no potential energy, and the acceleration is zero
  // except during the instantaneous impact, so momentum replaces those two graphs.
  collision: [
    {
      id: "pos",
      title: "Position vs time",
      lines: [
        { channel: "x1", label: "x₁", color: c.blue },
        { channel: "x2", label: "x₂", color: c.cyan },
      ],
    },
    {
      id: "vel",
      title: "Velocity vs time",
      lines: [
        { channel: "v1", label: "v₁", color: c.blue },
        { channel: "v2", label: "v₂", color: c.cyan },
      ],
    },
    {
      id: "mom",
      title: "Momentum vs time",
      lines: [
        { channel: "p1", label: "p₁", color: c.blue },
        { channel: "p2", label: "p₂", color: c.cyan },
        { channel: "p", label: "Total", color: c.amber },
      ],
    },
    {
      id: "ke",
      title: "Kinetic energy vs time",
      lines: [
        { channel: "k1", label: "KE₁", color: c.blue },
        { channel: "k2", label: "KE₂", color: c.cyan },
        { channel: "ke", label: "Total", color: c.amber },
      ],
    },
  ],
};

export const moduleLabels: Record<ModuleId, string> = {
  projectile: "Projectile motion",
  pendulum: "Pendulum",
  shm: "Spring-mass (SHM)",
  incline: "Inclined plane",
  collision: "Collisions",
};

/** Print-friendly colours for the PDF report (the app's CSS variables do not exist there). */
export const PRINT_COLOR: Record<string, string> = {
  "var(--cyan)": "#0e7490",
  "var(--blue)": "#1d4ed8",
  "var(--purple)": "#7c3aed",
  "var(--amber)": "#b45309",
  "var(--red)": "#b91c1c",
  "var(--green)": "#15803d",
};
