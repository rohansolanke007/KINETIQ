import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { RotationalDynamicsInfo, RotationalDynamicsState } from "@/lib/physics/engine";

const param = (info: RotationalDynamicsInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

const BODY_SHAPE_LABELS = [
  "Solid disc",
  "Solid cylinder",
  "Solid sphere",
  "Hollow sphere",
  "Thin ring",
  "Thin rod (centre)",
  "Thin rod (end)",
];

export function RotationalDynamicsLive({ state }: { state: RotationalDynamicsState | null }) {
  const shapeLabel = state ? (BODY_SHAPE_LABELS[state.shapeId] ?? "?") : "—";
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? "Running" : "Ready"}
    >
      <DataList>
        <DataRow label="Time t"               value={nf(state?.time, 3)}   unit="s" />
        <DataRow label="Shape"                value={shapeLabel}            unit="" />
        <DataRow label="Moment of inertia I"  value={nf(state?.I, 4)}      unit="kg·m²" />
        <DataRow label="Net torque τ"         value={nf(state?.torque, 4)} unit="N·m" />
        <DataRow label="Angular accel α"      value={nf(state?.alpha, 4)}  unit="rad/s²" />
        <DataRow label="Angular velocity ω"   value={nf(state?.omega, 4)}  unit="rad/s" />
        <DataRow label="Angular displ. θ"     value={nf(state?.theta, 4)}  unit="rad" />
        <DataRow label="Angular momentum L"   value={nf(state?.L, 4)}      unit="kg·m²/s" />
        <DataRow label="Rotational KE"        value={nf(state?.KE, 4)}     unit="J" accent="var(--amber)" />
        <DataRow label="Power P = τω"         value={nf(state?.P, 4)}      unit="W" />
        <DataRow label="Work W = τθ"          value={nf(state?.W, 4)}      unit="J" />
      </DataList>
    </Panel>
  );
}

export function RotationalDynamicsResults({ info }: { info: RotationalDynamicsInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  return (
    <Panel title="Results" subtitle="Analytic values from the current parameters">
      <DataList>
        <DataRow label="Body shape"            value={a.shapeLabel}           unit="" />
        <DataRow label="Formula"               value={a.shapeFormula}         unit="" />
        <DataRow label="Moment of inertia I"   value={nf(a.momentOfInertia, 4)} unit="kg·m²" accent="var(--cyan)" />
        <DataRow label="Torque τ = rF sin θ"   value={nf(a.torque, 4)}        unit="N·m" />
        <DataRow label="Angular accel α = τ/I" value={nf(a.angularAccel, 4)}  unit="rad/s²" />
      </DataList>
    </Panel>
  );
}

export function RotationalDynamicsEquations({ info }: { info: RotationalDynamicsInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const m = param(info, "mass");
  const r = param(info, "radius");
  const f = param(info, "force");
  const theta = param(info, "forceAngle");
  return (
    <Panel title="Equations" subtitle="Rotational dynamics formulae">
      <div className="space-y-2">
        <EquationCard
          formula="I = f(M, R)"
          substitution={a.shapeFormula}
          result={`I = ${nf(a.momentOfInertia, 3)} kg·m²`}
        />
        <EquationCard
          formula="τ = rF sin θ"
          substitution={`= ${nf(r, 2)} × ${nf(f, 1)} × sin(${nf(theta, 0)}°)`}
          result={`τ = ${nf(a.torque, 3)} N·m`}
        />
        <EquationCard
          formula="α = τ / I"
          substitution={`= ${nf(a.torque, 3)} / ${nf(a.momentOfInertia, 3)}`}
          result={`α = ${nf(a.angularAccel, 3)} rad/s²`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        τ_net = Iα assumes a fixed axis and constant I. L = Iω grows as α
        accelerates the body. KE_rot = ½Iω² is the rotational kinetic energy.
        Work done by torque: W = τθ for constant torque.
      </p>
    </Panel>
  );
}

export function RotationalDynamicsShapeSelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (shapeId: number) => void;
  disabled?: boolean;
}) {
  return (
    <Panel title="Body shape" subtitle="Affects the moment of inertia">
      <div className="space-y-1">
        {BODY_SHAPE_LABELS.map((label, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onChange(idx)}
            className={[
              "w-full rounded-md px-3 py-2 text-left text-[12px] font-medium transition-colors",
              value === idx
                ? "border border-primary/40 bg-primary/10 text-primary"
                : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
              disabled ? "pointer-events-none opacity-50" : "",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
    </Panel>
  );
}
