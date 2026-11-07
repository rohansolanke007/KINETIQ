import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { ShmInfo, ShmState } from "@/lib/physics/engine";

const param = (info: ShmInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

export function ShmLive({ state }: { state: ShmState | null }) {
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? "Oscillating" : "Released from rest"}
    >
      <DataList>
        <DataRow label="Time t" value={nf(state?.time)} unit="s" />
        <DataRow label="Displacement x" value={nf(state?.x, 3)} unit="m" />
        <DataRow label="Velocity v" value={nf(state?.v, 3)} unit="m/s" />
        <DataRow label="Acceleration a" value={nf(state?.a, 3)} unit="m/s²" />
        <DataRow label="Restoring force F = −kx" value={nf(state?.force, 3)} unit="N" />
        <DataRow label="Kinetic energy" value={nf(state?.energy.kinetic, 3)} unit="J" />
        <DataRow label="Spring energy" value={nf(state?.energy.potential, 3)} unit="J" />
        <DataRow
          label="Total energy"
          value={nf(state?.energy.total, 3)}
          unit="J"
          accent="var(--amber)"
        />
      </DataList>
      <p className="label-micro mt-2 leading-relaxed">
        Energy swaps between kinetic and spring energy; with no friction the total stays constant.
      </p>
    </Panel>
  );
}

export function ShmResults({ info, state }: { info: ShmInfo | null; state: ShmState | null }) {
  if (!info) return null;
  const a = info.analytic;
  const measured = state?.measuredPeriod ?? null;
  const diff = measured !== null ? ((measured - a.period) / a.period) * 100 : null;
  return (
    <Panel title="Results" subtitle="Formula against what the simulation measures">
      <DataList>
        <DataRow label="Angular frequency ω" value={nf(a.omega, 3)} unit="rad/s" />
        <DataRow label="Period T (formula)" value={nf(a.period, 3)} unit="s" />
        <DataRow label="Period (measured)" value={nf(measured, 3)} unit="s" accent="var(--cyan)" />
        <DataRow label="Frequency f" value={nf(a.frequency, 3)} unit="Hz" />
      </DataList>
      <p className="label-micro mt-2 flex items-center gap-1.5 leading-relaxed">
        {diff !== null ? (
          <>
            <Check className="size-3.5 text-green" aria-hidden />
            Measured period differs from the formula by {Math.abs(diff).toFixed(3)}%.
          </>
        ) : Math.abs(param(info, "displacement")) < 1e-9 ? (
          "Released at equilibrium, so it stays at rest."
        ) : (
          "The period is timed after the block has crossed equilibrium three times."
        )}
      </p>
      <div className="mt-3 border-t border-border pt-1">
        <DataList>
          <DataRow label="Amplitude A" value={nf(a.amplitude)} unit="m" />
          <DataRow label="Max speed ωA" value={nf(a.maxSpeed, 3)} unit="m/s" />
          <DataRow label="Max acceleration ω²A" value={nf(a.maxAcceleration, 3)} unit="m/s²" />
          <DataRow label="Max force kA" value={nf(a.maxForce, 3)} unit="N" />
          <DataRow label="Total energy ½kA²" value={nf(a.totalEnergy, 3)} unit="J" />
        </DataList>
      </div>
    </Panel>
  );
}

export function ShmEquations({ info }: { info: ShmInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const m = param(info, "mass");
  const k = param(info, "k");
  const x0 = param(info, "displacement");
  return (
    <Panel title="Equations" subtitle="Solved with velocity Verlet">
      <div className="space-y-2">
        <EquationCard
          formula="F = −kx"
          substitution={`= −${nf(k, 1)} × x`}
          result={`F max = ${nf(a.maxForce, 2)} N`}
        />
        <EquationCard
          formula="T = 2π √(m / k)"
          substitution={`= 2π √(${nf(m, 1)} / ${nf(k, 1)})`}
          result={`T = ${nf(a.period, 3)} s`}
        />
        <EquationCard
          formula="ω = √(k / m)"
          substitution={`= √(${nf(k, 1)} / ${nf(m, 1)})`}
          result={`ω = ${nf(a.omega, 3)} rad/s`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        Released from rest at x₀ = {nf(x0, 1)} m, the exact motion is x(t) = x₀ cos ωt. The period
        depends on m and k but not on the amplitude.
      </p>
    </Panel>
  );
}
