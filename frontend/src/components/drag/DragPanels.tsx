import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { AirResistanceInfo, AirResistanceState } from "@/lib/physics/engine";
import { cn } from "@/lib/utils";

// ---- Drag mode selector ----------------------------------------

const DRAG_MODES = [
  { id: 0, label: "No drag",        desc: "F_d = 0" },
  { id: 1, label: "Linear drag",    desc: "F_d = b·v" },
  { id: 2, label: "Quadratic drag", desc: "F_d = ½ρC_dAv²" },
];

export function DragModeSelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (mode: number) => void;
  disabled: boolean;
}) {
  return (
    <Panel title="Drag model" subtitle="Select the air-resistance regime">
      <div className="flex gap-2">
        {DRAG_MODES.map((m) => (
          <button
            key={m.id}
            disabled={disabled}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex-1 rounded-md border px-2 py-2 text-center text-[12px] transition-colors",
              value === m.id
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            <div className="font-medium">{m.label}</div>
            <div className="mt-0.5 text-[10.5px] opacity-70">{m.desc}</div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ---- Live values ------------------------------------------------

export function DragLive({ state }: { state: AirResistanceState | null }) {
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? (state.finished ? "Finished" : "Running") : "Ready"}
    >
      <DataList>
        <DataRow label="Time t"              value={nf(state?.time, 3)}              unit="s" />
        <DataRow label="Position y"          value={nf(state?.y, 3)}                 unit="m" />
        <DataRow label="Velocity vy"         value={nf(state?.vy, 4)}                unit="m/s" />
        <DataRow label="Speed |v|"           value={nf(state?.speed, 4)}             unit="m/s" />
        <DataRow label="Accel. ay"           value={nf(state?.ay, 4)}                unit="m/s²" />
        <DataRow label="Drag force Fd"       value={nf(state?.dragForce, 4)}         unit="N"   accent="var(--red)" />
        <DataRow label="Gravity force Fg"    value={nf(state?.gravityForce, 4)}      unit="N"   accent="var(--amber)" />
        <DataRow label="Net force"           value={nf(state?.netForce, 4)}          unit="N"   accent="var(--green)" />
        <DataRow label="Reynolds number Re"  value={nf(state?.reynoldsNumber, 3)}    unit="" />
        <DataRow label="Terminal velocity"   value={nf(state?.terminalVelocity, 4)}  unit="m/s" accent="var(--cyan)" />
      </DataList>
    </Panel>
  );
}

// ---- Analytic results -------------------------------------------

export function DragResults({
  info,
  state,
}: {
  info: AirResistanceInfo | null;
  state: AirResistanceState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const dragModeLabel = ["None", "Linear  F_d = b·v", "Quadratic  F_d = ½ρC_dAv²"][a.dragMode] ?? "—";

  return (
    <Panel title="Results" subtitle="Analytic values from current parameters">
      <DataList>
        <DataRow label="Drag model"          value={dragModeLabel} />
        <DataRow label="Gravity force mg"    value={nf(a.gravityForce, 4)}      unit="N" />
        <DataRow label="Terminal velocity"   value={a.terminalVelocity > 0 ? nf(a.terminalVelocity, 4) : "—"} unit={a.terminalVelocity > 0 ? "m/s" : ""} accent="var(--cyan)" />
        {state && (
          <>
            <DataRow label="Live speed"      value={nf(state.speed, 4)}         unit="m/s" />
            <DataRow label="Live drag force" value={nf(state.dragForce, 4)}     unit="N"   accent="var(--red)" />
          </>
        )}
      </DataList>
    </Panel>
  );
}

// ---- Equations --------------------------------------------------

export function DragEquations({ info }: { info: AirResistanceInfo | null }) {
  if (!info) return null;
  const a = info.analytic;

  const dragModeNode = a.dragMode === 0
    ? null
    : a.dragMode === 1
      ? (
        <>
          <EquationCard
            formula="F_d = b · v"
            substitution={`b = ${nf(a.linearDrag, 3)} kg/s`}
            result={`v_t = mg/b = ${nf(a.terminalVelocity, 3)} m/s`}
          />
          <EquationCard
            formula="v_t = mg / b"
            substitution={`= ${nf(a.mass, 2)} × ${nf(a.gravity, 2)} / ${nf(a.linearDrag, 3)}`}
            result={`v_t = ${nf(a.terminalVelocity, 4)} m/s`}
          />
        </>
      )
      : (
        <>
          <EquationCard
            formula="F_d = ½ρC_d A v²"
            substitution={`ρ=${nf(a.airDensity,3)} kg/m³  Cd=${nf(a.dragCoeff,2)}  A=${nf(a.crossSection,4)} m²`}
          />
          <EquationCard
            formula="v_t = √(2mg / ρC_d A)"
            substitution={`= √(2×${nf(a.mass,2)}×${nf(a.gravity,2)} / (${nf(a.airDensity,3)}×${nf(a.dragCoeff,2)}×${nf(a.crossSection,4)}))`}
            result={`v_t = ${nf(a.terminalVelocity, 4)} m/s`}
          />
        </>
      );

  return (
    <Panel title="Equations" subtitle="Applied from current parameters">
      <div className="space-y-2">
        <EquationCard formula="ma = mg − F_d" />
        {dragModeNode}
        <EquationCard
          formula="Re = ρ v L / μ"
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        Drag opposes velocity. For quadratic drag the terminal velocity is
        reached asymptotically; the simulation uses velocity Verlet integration
        at 240 steps per second.
      </p>
    </Panel>
  );
}
