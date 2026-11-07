import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { PendulumInfo, PendulumState } from "@/lib/physics/engine";

const param = (info: PendulumInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

export function PendulumLive({ state }: { state: PendulumState | null }) {
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? "Swinging" : "Released from rest"}
    >
      <DataList>
        <DataRow label="Time t" value={nf(state?.time)} unit="s" />
        <DataRow label="Angle θ" value={nf(state?.thetaDeg, 1)} unit="°" />
        <DataRow label="Angular velocity ω" value={nf(state?.omega, 3)} unit="rad/s" />
        <DataRow label="Angular acceleration α" value={nf(state?.alpha, 3)} unit="rad/s²" />
        <DataRow label="Bob speed" value={nf(state?.speed, 3)} unit="m/s" />
        <DataRow label="Rod tension" value={nf(state?.tension, 3)} unit="N" />
        <DataRow label="Kinetic energy" value={nf(state?.energy.kinetic, 3)} unit="J" />
        <DataRow label="Potential energy" value={nf(state?.energy.potential, 3)} unit="J" />
        <DataRow
          label="Total energy"
          value={nf(state?.energy.total, 3)}
          unit="J"
          accent="var(--amber)"
        />
      </DataList>
      <p className="label-micro mt-2 leading-relaxed">
        Energy is measured from the lowest point. With no friction the total stays constant.
      </p>
    </Panel>
  );
}

export function PendulumResults({
  info,
  state,
}: {
  info: PendulumInfo | null;
  state: PendulumState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const measured = state?.measuredPeriod ?? null;
  const diff = measured !== null ? ((measured - a.exactPeriod) / a.exactPeriod) * 100 : null;
  return (
    <Panel title="Period" subtitle="Formula against what the simulation measures">
      <DataList>
        <DataRow label="Small-angle T₀" value={nf(a.smallAnglePeriod, 3)} unit="s" />
        <DataRow label="Exact T (this amplitude)" value={nf(a.exactPeriod, 3)} unit="s" />
        <DataRow
          label="Measured in simulation"
          value={nf(measured, 3)}
          unit="s"
          accent="var(--cyan)"
        />
      </DataList>
      <p className="label-micro mt-2 flex items-center gap-1.5 leading-relaxed">
        {diff !== null ? (
          <>
            <Check className="size-3.5 text-green" aria-hidden />
            Measured period differs from the exact value by {Math.abs(diff).toFixed(3)}%.
          </>
        ) : Math.abs(param(info, "angle")) < 1e-9 ? (
          "Released at θ = 0, so it stays at rest."
        ) : (
          "The period is timed after the bob has passed the bottom three times."
        )}
      </p>
      <div className="mt-3 border-t border-border pt-1">
        <DataList>
          <DataRow label="Speed at the bottom" value={nf(a.maxSpeed, 3)} unit="m/s" />
          <DataRow label="Tension at the bottom" value={nf(a.maxTension, 3)} unit="N" />
          <DataRow label="Total energy" value={nf(a.totalEnergy, 3)} unit="J" />
        </DataList>
      </div>
    </Panel>
  );
}

export function PendulumEquations({ info }: { info: PendulumInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const L = param(info, "length");
  const g = param(info, "gravity");
  const th = param(info, "angle");
  const ratio = a.smallAnglePeriod > 0 ? (a.exactPeriod / a.smallAnglePeriod - 1) * 100 : 0;
  return (
    <Panel title="Equations" subtitle="Solved with 4th-order Runge-Kutta">
      <div className="space-y-2">
        <EquationCard
          formula="θ″ = −(g / L) sin θ"
          substitution={`= −(${nf(g)} / ${nf(L)}) sin θ`}
        />
        <EquationCard
          formula="T₀ = 2π √(L / g)"
          substitution={`= 2π √(${nf(L)} / ${nf(g)})`}
          result={`T₀ = ${nf(a.smallAnglePeriod, 3)} s`}
        />
        <EquationCard
          formula="T = 4 √(L / g) · K(sin θ₀/2)"
          substitution={`θ₀ = ${nf(th, 1)}°`}
          result={`T = ${nf(a.exactPeriod, 3)} s`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        The engine integrates the full sin θ, not the small-angle shortcut. At this amplitude the
        true period is {nf(ratio, 2)}% longer than T₀. The bob's mass does not change the motion; it
        only scales energy and tension.
      </p>
    </Panel>
  );
}
