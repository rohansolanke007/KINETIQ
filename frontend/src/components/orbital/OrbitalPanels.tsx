import { Panel } from "@/components/physics/ui";
import { DataList, DataRow, EquationCard } from "@/components/lab/DataRows";
import { nf } from "@/components/lab/format";
import type { OrbitalMechanicsInfo, OrbitalMechanicsState } from "@/lib/physics/engine";
import { cn } from "@/lib/utils";

// ---- Central body selector ----------------------------------------

const BODIES = [
  { id: 0, label: "Earth",   emoji: "🌍" },
  { id: 1, label: "Moon",    emoji: "🌙" },
  { id: 2, label: "Mars",    emoji: "🔴" },
  { id: 3, label: "Jupiter", emoji: "🟠" },
  { id: 4, label: "Sun",     emoji: "☀️" },
];

export function OrbitalBodySelect({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (id: number) => void;
  disabled: boolean;
}) {
  return (
    <Panel title="Central body" subtitle="Select the gravitational centre">
      <div className="flex flex-wrap gap-1.5">
        {BODIES.map((b) => (
          <button
            key={b.id}
            disabled={disabled}
            onClick={() => onChange(b.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
              value === b.id
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border text-muted-foreground hover:border-muted-foreground",
            )}
          >
            <span>{b.emoji}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

// ---- Live values --------------------------------------------------

const formatSI = (v: number | undefined, unit: string, digits = 4): [string, string] => {
  if (v === undefined || v === null) return ["—", unit];
  const abs = Math.abs(v);
  if (abs >= 1e12) return [`${(v / 1e12).toFixed(digits)} T`, unit];
  if (abs >= 1e9)  return [`${(v / 1e9).toFixed(digits)} G`, unit];
  if (abs >= 1e6)  return [`${(v / 1e6).toFixed(digits)} M`, unit];
  if (abs >= 1e3)  return [`${(v / 1e3).toFixed(digits)} k`, unit];
  return [v.toFixed(digits), unit];
};

export function OrbitalLive({ state }: { state: OrbitalMechanicsState | null }) {
  const [rVal, rU]   = formatSI(state?.r,                "m", 3);
  const [altVal,altU]= formatSI(state?.altitude,         "m", 3);
  const [spV, spU]   = formatSI(state?.speed,            "m/s", 3);
  const [vcV, vcU]   = formatSI(state?.circularVelocity, "m/s", 3);
  const [veV, veU]   = formatSI(state?.escapeVelocity,   "m/s", 3);
  const [FgV, FgU]   = formatSI(state?.gravForce,        "N", 4);
  const [UV, UU]     = formatSI(state?.potentialEnergy,  "J", 4);
  const [EV, EU]     = formatSI(state?.totalEnergy,      "J", 4);
  const [LV, LU]     = formatSI(state?.angularMomentum,  "kg·m²/s", 4);

  return (
    <Panel
      title="Live values"
      subtitle={state && state.time > 0 ? (state.finished ? "Crashed" : "Running") : "Ready"}
    >
      <DataList>
        <DataRow label="Time t"             value={formatSI(state?.time, "s", 2)[0]}   unit="s" />
        <DataRow label="Orbital radius r"   value={rVal}   unit={rU} />
        <DataRow label="Altitude"           value={altVal} unit={altU} />
        <DataRow label="Speed |v|"          value={spV}    unit={spU} accent="var(--cyan)" />
        <DataRow label="Circular velocity"  value={vcV}    unit={vcU} />
        <DataRow label="Escape velocity"    value={veV}    unit={veU} />
        <DataRow label="Gravity force Fg"   value={FgV}    unit={FgU} accent="var(--red)" />
        <DataRow label="Potential energy U" value={UV}     unit={UU} />
        <DataRow label="Total energy E"     value={EV}     unit={EU} accent="var(--green)" />
        <DataRow label="Angular momentum L" value={LV}     unit={LU} accent="var(--amber)" />
      </DataList>
    </Panel>
  );
}

// ---- Analytic results --------------------------------------------

export function OrbitalResults({
  info,
  state,
}: {
  info: OrbitalMechanicsInfo | null;
  state: OrbitalMechanicsState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  return (
    <Panel title="Results" subtitle={`Circular orbit at ${a.bodyName}, h = ${nf(a.altitude / 1000, 1)} km`}>
      <DataList>
        <DataRow label="Body"                       value={a.bodyName} />
        <DataRow label="Orbital radius r"           value={nf(a.altitude + a.bodyRadius, 0)} unit="m" />
        <DataRow label="Altitude h"                 value={nf(a.altitude / 1000, 2)}         unit="km" />
        <DataRow label="GM  (μ)"                    value={nf(a.mu, 4)}                       unit="m³/s²" />
        <DataRow label="Circular velocity v_circ"   value={nf(a.circularVelocity, 2)}         unit="m/s" accent="var(--cyan)" />
        <DataRow label="Escape velocity v_esc"      value={nf(a.escapeVelocity, 2)}           unit="m/s" accent="var(--amber)" />
        <DataRow label="Orbital period T"           value={nf(a.orbitalPeriod, 2)}            unit="s" />
        <DataRow label="Gravitational force"        value={nf(a.gravForce, 4)}                unit="N" accent="var(--red)" />
        <DataRow label="Potential energy U"         value={nf(a.potentialEnergy, 4)}          unit="J" />
        <DataRow label="Total energy E (circular)"  value={nf(a.totalEnergy, 4)}              unit="J" accent="var(--green)" />
        <DataRow label="Field strength g"           value={nf(a.gravFieldStrength, 4)}        unit="m/s²" />
        <DataRow label="Gravitational potential V"  value={nf(a.gravPotential, 4)}            unit="J/kg" />
      </DataList>
    </Panel>
  );
}

// ---- Equations ---------------------------------------------------

export function OrbitalEquations({
  info,
  state,
}: {
  info: OrbitalMechanicsInfo | null;
  state: OrbitalMechanicsState | null;
}) {
  if (!info) return null;
  const a = info.analytic;
  const r = state?.r ?? (a.altitude + a.bodyRadius);

  return (
    <Panel title="Equations" subtitle="Applied from current parameters">
      <div className="space-y-2">
        <EquationCard
          formula="F = GM m / r²"
          substitution={`μ = ${nf(a.mu, 4)} m³/s²`}
          result={`F = ${nf(a.gravForce, 4)} N`}
        />
        <EquationCard
          formula="v_circ = √(GM / r)"
          substitution={`= √(${nf(a.mu, 4)} / ${nf(r, 0)})`}
          result={`v_circ = ${nf(a.circularVelocity, 2)} m/s`}
        />
        <EquationCard
          formula="v_esc = √(2GM / r)"
          result={`v_esc = ${nf(a.escapeVelocity, 2)} m/s`}
        />
        <EquationCard
          formula="T = 2π √(r³ / GM)"
          result={`T = ${nf(a.orbitalPeriod, 2)} s`}
        />
        <EquationCard
          formula="U = −GM m / r"
          result={`U = ${nf(a.potentialEnergy, 4)} J`}
        />
        <EquationCard
          formula="E = −GM m / 2r"
          result={`E = ${nf(a.totalEnergy, 4)} J  (circular)`}
        />
      </div>
      <p className="label-micro mt-3 leading-relaxed">
        Integration uses velocity Verlet (a = −μ r̂ / r²) at 240 steps per
        second with sub-steps for stability. Mass of the satellite does not
        affect v_circ or T — only the central body matters.
      </p>
    </Panel>
  );
}
