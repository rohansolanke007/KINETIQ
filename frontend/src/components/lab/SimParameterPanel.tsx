import type { ReactNode } from "react";
import { Panel, SliderField } from "@/components/physics/ui";
import type { SimParameter } from "@/lib/physics/engine";

/**
 * Builds a slider for every parameter a C++ Simulation declares. Ranges,
 * units and steps come from C++, so the UI cannot drift from the engine.
 */
export function SimParameterPanel({
  title = "Parameters",
  subtitle = "Changing a value restarts the run",
  parameters,
  onChange,
  disabled,
  children,
}: {
  title?: string;
  subtitle?: string;
  parameters: SimParameter[] | undefined;
  onChange: (name: string, value: number) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <Panel title={title} subtitle={subtitle}>
      <div className="space-y-4">
        {(parameters ?? []).map((p) => (
          <SliderField
            key={p.name}
            label={p.label}
            unit={p.unit}
            min={p.min}
            max={p.max}
            step={p.step}
            value={p.value}
            disabled={disabled ?? false}
            onChange={(v) => onChange(p.name, v)}
          />
        ))}
        {children}
      </div>
    </Panel>
  );
}
