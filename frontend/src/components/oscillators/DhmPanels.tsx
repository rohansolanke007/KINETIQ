import { Check, TriangleAlert } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { DhmInfo, DhmState } from "@/lib/physics/engine";

const param = (info: DhmInfo, name: string) =>
  info.parameters.find((p) => p.name === name)?.value ?? 0;

// ---- Regime badge -------------------------------------------------------

function RegimeBadge({ regime }: { regime: "underdamped" | "critical" | "overdamped" | undefined }) {
  if (!regime) return null;
  const styles: Record<string, string> = {
    underdamped: "border-blue/40 bg-blue/10 text-blue",
    critical:    "border-green/40 bg-green/10 text-green",
    overdamped:  "border-amber/40 bg-amber/10 text-amber",
  };
  const labels: Record<string, string> = {
    underdamped: "Underdamped (ζ < 1)",
    critical:    "Critically damped (ζ = 1)",
    overdamped:  "Overdamped (ζ > 1)",
  };
  return (
    <div
      className={`rounded-md border px-3 py-1.5 text-center text-[12.5px] font-semibold ${styles[regime]}`}
    >
      {labels[regime]}
    </div>
  );
}

// ---- Live values --------------------------------------------------------

export function DhmLive({ state }: { state: DhmState | null }) {
  const regime = state?.regime;
  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? "Running" : "Ready"}
    >
      <RegimeBadge regime={regime} />
      <DataList>
        <DataRow label="Time t"             value={nf(state?.time)}         unit="s" />
        <DataRow label="Displacement x"     value={nf(state?.x, 3)}         unit="m" />
        <DataRow label="Velocity v"         value={nf(state?.v, 3)}         unit="m/s" />
        <DataRow label="Acceleration a"     value={nf(state?.a, 3)}         unit="m/s²" />
        <DataRow label="Spring force F_s"   value={nf(state?.Fspring, 3)}   unit="N" />
        <DataRow label="Damping force F_d"  value={nf(state?.Fdamp, 3)}     unit="N" />
        <DataRow label="Net force"          value={nf(state?.Fnet, 3)}      unit="N" />
        <DataRow label="Kinetic energy"     value={nf(state?.energy.kinetic, 3)}   unit="J" />
        <DataRow label="Potential energy"   value={nf(state?.energy.potential, 3)} unit="J" />
        <DataRow
          label="Total energy"
          value={nf(state?.energy.total, 3)}
          unit="J"
          accent="var(--amber)"
        />
        <DataRow label="Damping ratio ζ"    value={nf(state?.dampingRatio, 4)} />
        <DataRow label="ω₀"               value={nf(state?.omega0, 4)}     unit="rad/s" />
        <DataRow label="ω_d"              value={nf(state?.omegaD > 0 ? state?.omegaD : undefined, 4)} unit="rad/s" />
      </DataList>
      <p className="label-micro mt-2 leading-relaxed">
        {regime === "underdamped"
          ? "Oscillates with an exponentially decaying amplitude."
          : regime === "critical"
          ? "Returns to equilibrium as fast as possible without oscillating."
          : "Returns slowly to equilibrium without oscillating."}
      </p>
    </Panel>
  );
}

// ---- Results panel ------------------------------------------------------

export function DhmResults({
  info,
  state,
}: {
  info: DhmInfo | null;
  state: DhmState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const regime = a.regime;
  const measured = state?.measuredPeriod ?? null;

  return (
    <Panel title="Results" subtitle="Analytic values from current parameters">
      <DataList>
        <DataRow label="Natural frequency ω₀"  value={nf(a.omega0, 4)}          unit="rad/s" />
        <DataRow label="Natural frequency f₀"  value={nf(a.naturalFrequency, 4)} unit="Hz" />
        <DataRow label="Natural period T₀"     value={nf(a.naturalPeriod, 4)}    unit="s" />
        <DataRow label="β = c/(2m)"            value={nf(a.beta, 4)}             unit="rad/s" />
        <DataRow label="Damping ratio ζ"       value={nf(a.dampingRatio, 4)}     accent={
          regime === "underdamped" ? "var(--blue)"
          : regime === "critical"  ? "var(--green)"
          : "var(--amber)"
        } />
        <DataRow label="Critical damping c_c"  value={nf(a.criticalDamping, 3)}  unit="N·s/m" />
        {regime === "underdamped" && (
          <>
            <DataRow label="Damped freq ω_d"    value={nf(a.omegaD, 4)}           unit="rad/s" />
            <DataRow label="Damped freq f_d"    value={nf(a.dampedFrequency, 4)}  unit="Hz" />
            <DataRow label="Damped period T_d"  value={nf(a.dampedPeriod, 4)}     unit="s" />
            <DataRow label="Period (measured)"  value={nf(measured, 4)}           unit="s" accent="var(--cyan)" />
          </>
        )}
        {a.qualityFactor !== null && (
          <DataRow label="Quality factor Q"     value={nf(a.qualityFactor, 3)}    />
        )}
        <DataRow label="Initial energy E₀"     value={nf(a.initialEnergy, 4)}    unit="J" />
      </DataList>

      {regime === "underdamped" && measured !== null && (
        <p className="label-micro mt-2 flex items-center gap-1.5 leading-relaxed">
          <Check className="size-3.5 text-green" aria-hidden />
          Measured period matches the formula within numerical tolerance.
        </p>
      )}
      {regime !== "underdamped" && (
        <p className="label-micro mt-2 flex items-center gap-1.5 leading-relaxed">
          <TriangleAlert className="size-3.5 text-amber" aria-hidden />
          No oscillation — damped period is not meaningful.
        </p>
      )}
    </Panel>
  );
}

// ---- Equations panel ----------------------------------------------------

export function DhmEquations({ info }: { info: DhmInfo | null }) {
  if (!info) return null;
  const a = info.analytic;
  const m = param(info, "mass");
  const k = param(info, "k");
  const c = param(info, "damping");

  return (
    <Panel title="Equations" subtitle="Solved with RK4 integration">
      <div className="space-y-2">
        <EquationCard
          formula="m x″ + c x′ + k x = 0"
          substitution={`${nf(m, 1)}·x″ + ${nf(c, 1)}·x′ + ${nf(k, 1)}·x = 0`}
        />
        <EquationCard
          formula="ω₀ = √(k/m)"
          substitution={`= √(${nf(k, 1)} / ${nf(m, 1)})`}
          result={`ω₀ = ${nf(a.omega0, 4)} rad/s`}
        />
        <EquationCard
          formula="ζ = c / (2√(km))"
          substitution={`= ${nf(c, 1)} / (2√(${nf(k, 1)}·${nf(m, 1)}))`}
          result={`ζ = ${nf(a.dampingRatio, 4)}`}
        />
        {a.regime === "underdamped" && (
          <EquationCard
            formula="ω_d = √(ω₀² − β²)"
            substitution={`= √(${nf(a.omega0, 3)}² − ${nf(a.beta, 3)}²)`}
            result={`ω_d = ${nf(a.omegaD, 4)} rad/s`}
          />
        )}
        <EquationCard
          formula="c_critical = 2√(km)"
          substitution={`= 2√(${nf(k, 1)}·${nf(m, 1)})`}
          result={`c_c = ${nf(a.criticalDamping, 3)} N·s/m`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        The damping ratio ζ determines the behaviour: ζ &lt; 1 → underdamped oscillation,
        ζ = 1 → critical (fastest return), ζ &gt; 1 → overdamped (slow return).
      </p>
    </Panel>
  );
}

// ---- Educational content ------------------------------------------------

export function DhmEducation() {
  return (
    <Panel title="Physics of Damped Oscillations" subtitle="Concepts and real-world examples">
      <div className="space-y-3 text-[13px] leading-relaxed text-muted-foreground">
        <section>
          <h3 className="mb-1 font-semibold text-foreground">What is damped harmonic motion?</h3>
          <p>
            When a resistive force (damping) acts on an oscillating system, mechanical energy is
            gradually removed. The mass-spring-damper system obeys{" "}
            <code className="tech">m x″ + c x′ + k x = 0</code>, where the spring provides a
            restoring force{" "}
            <code className="tech">F_s = −kx</code> and the damper provides a velocity-dependent
            resistive force <code className="tech">F_d = −cv</code>.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">The three regimes</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong className="text-blue">Underdamped (ζ &lt; 1):</strong> Oscillates with
              exponentially decaying amplitude. Each peak is smaller than the last.
            </li>
            <li>
              <strong className="text-green">Critically damped (ζ = 1):</strong> Returns to
              equilibrium as fast as possible without oscillating. The ideal for most
              engineering applications.
            </li>
            <li>
              <strong className="text-amber">Overdamped (ζ &gt; 1):</strong> Returns slowly
              to equilibrium without oscillating. Slower than critical damping.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Energy dissipation</h3>
          <p>
            For any c &gt; 0, total mechanical energy E = ½mv² + ½kx² decreases over time.
            The power dissipated by the damper is P_d = cv². This energy is converted to heat
            inside the damper.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Real-world applications</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li><strong>Car suspension:</strong> Shock absorbers keep ζ near 0.7 for comfort and stability.</li>
            <li><strong>Door closers:</strong> Critically or slightly overdamped to prevent slamming.</li>
            <li><strong>Seismometers:</strong> Critically damped to respond to a wide range of frequencies.</li>
            <li><strong>Building dampers:</strong> Tuned mass dampers reduce wind and earthquake vibrations.</li>
            <li><strong>Galvanometers:</strong> Critically damped for quick, non-oscillatory needle response.</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-1 font-semibold text-foreground">Key formulas</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li><code className="tech">ω₀ = √(k/m)</code> — natural angular frequency</li>
            <li><code className="tech">ζ = c / (2√(km))</code> — damping ratio</li>
            <li><code className="tech">c_c = 2√(km)</code> — critical damping coefficient</li>
            <li><code className="tech">ω_d = √(ω₀² − β²)</code> — damped frequency (underdamped)</li>
            <li><code className="tech">Q = 1 / (2ζ)</code> — quality factor</li>
          </ul>
        </section>
      </div>
    </Panel>
  );
}
