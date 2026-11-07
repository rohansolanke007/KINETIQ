import type { ReactNode } from "react";

/** One label/value line in a definition list. */
export function DataRow({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="tech text-[13.5px] font-medium" style={accent ? { color: accent } : undefined}>
        {value}
        {unit && value !== "—" && (
          <span className="ml-1 text-[11.5px] font-normal text-muted-foreground">{unit}</span>
        )}
      </dd>
    </div>
  );
}

export function DataList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-border">{children}</dl>;
}

/** One equation card: symbolic form, substituted numbers, and the C++ value. */
export function EquationCard({
  formula,
  substitution,
  result,
}: {
  formula: string;
  substitution?: string;
  result?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 px-3 py-2.5">
      <div className="tech text-[14px] font-semibold text-primary">{formula}</div>
      {substitution && (
        <div className="tech mt-1 text-[12.5px] text-muted-foreground">{substitution}</div>
      )}
      {result && <div className="tech mt-0.5 text-[13.5px] font-medium">{result}</div>}
    </div>
  );
}
