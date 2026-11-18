import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { CircularMotionInfo, CircularMotionState } from "@/lib/physics/engine";

const param = (info: CircularMotionInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

export function CircularMotionLive({ state }: { state: CircularMotionState | null }) {
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? "Running" : "Ready"}
    >
      <DataList>
        <DataRow label="Time t"                       value={nf(state?.time, 3)}     unit="s" />
        <DataRow label="Angular displacement θ"       value={nf(state?.theta, 4)}    unit="rad" />
        <DataRow label="Angular velocity ω"           value={nf(state?.omega, 4)}    unit="rad/s" />
        <DataRow label="Angular acceleration α"       value={nf(state?.alpha, 4)}    unit="rad/s²" />
        <DataRow label="Tangential velocity v"        value={nf(state?.v, 4)}        unit="m/s" />
        <DataRow label="Centripetal acceleration aₒ"  value={nf(state?.ac, 4)}       unit="m/s²" />
        <DataRow label="Centripetal force Fc"         value={nf(state?.Fc, 4)}       unit="N" accent="var(--amber)" />
      </DataList>
    </Panel>
  );
}

export function CircularMotionResults({ info, state }: { info: CircularMotionInfo | null; state: CircularMotionState | null }) {
  if (!info) return null;
  const a = info.analytic;
  return (
    <Panel title="Results" subtitle="Analytic values from the current parameters">
      <DataList>
        <DataRow label="Angular velocity ω = v/r"       value={nf(a.angularVelocity, 4)}    unit="rad/s" />
        <DataRow label="Tangential velocity v = rω"     value={nf(a.tangentialVelocity, 4)} unit="m/s" />
        <DataRow label="Centripetal accel aₒ = v²/r"   value={nf(a.centripetalAccel, 4)}   unit="m/s²" />
        <DataRow label="Centripetal force Fc = maₒ"    value={nf(a.centripetalForce, 4)}   unit="N" accent="var(--cyan)" />
        <DataRow label="Time period T = 2π/ω"          value={nf(a.period, 4)}             unit="s" />
        <DataRow label="Frequency f = 1/T"             value={nf(a.frequency, 4)}          unit="Hz" />
      </DataList>
      {state && (
        <div className="mt-3 border-t border-border pt-2">
          <DataList>
            <DataRow label="Live θ (cumulative)"  value={nf(state.theta, 3)}    unit="rad" />
            <DataRow label="Live θ in degrees"    value={nf(state.thetaDeg, 2)} unit="°" />
          </DataList>
        </div>
      )}
    </Panel>
  );
}

export function CircularMotionEquations({ info }: { info: CircularMotionInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const m = param(info, "mass");
  const r = param(info, "radius");
  const v = param(info, "velocity");
  return (
    <Panel title="Equations" subtitle="Applied from the current parameters">
      <div className="space-y-2">
        <EquationCard
          formula="ω = v / r"
          substitution={`= ${nf(v, 2)} / ${nf(r, 2)}`}
          result={`ω = ${nf(a.angularVelocity, 3)} rad/s`}
        />
        <EquationCard
          formula="aₒ = v² / r"
          substitution={`= ${nf(v, 2)}² / ${nf(r, 2)}`}
          result={`aₒ = ${nf(a.centripetalAccel, 3)} m/s²`}
        />
        <EquationCard
          formula="Fc = m·aₒ"
          substitution={`= ${nf(m, 1)} × ${nf(a.centripetalAccel, 3)}`}
          result={`Fc = ${nf(a.centripetalForce, 3)} N`}
        />
        <EquationCard
          formula="T = 2π / ω"
          substitution={`= 2π / ${nf(a.angularVelocity, 3)}`}
          result={`T = ${nf(a.period, 3)} s`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        For uniform circular motion, v and ω are constant. If α ≠ 0, ω and v
        grow linearly with time and the centripetal acceleration increases as
        aₒ = r·ω².
      </p>
    </Panel>
  );
}
