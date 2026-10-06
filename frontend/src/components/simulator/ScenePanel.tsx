import { Panel } from "@/components/physics/ui";
import { scenePresets } from "@/lib/physics/scenes";
import type { Simulation } from "@/lib/physics/useSimulation";

export function ScenePanel({ sim }: { sim: Simulation }) {
  return (
    <Panel title="SCENE PRESETS" subtitle="Each preset is ready to run">
      <div className="space-y-2">
        {scenePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={sim.status !== "ready"}
            onClick={() => {
              sim.pause();
              sim.call((m) => preset.build(m));
            }}
            className="w-full rounded-md border border-border bg-background/40 px-3 py-2 text-left transition-all hover:border-primary/40 hover:bg-accent disabled:opacity-40"
          >
            <div className="tech text-[10px] tracking-[0.14em] text-foreground">{preset.name}</div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{preset.description}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}
