import { Panel } from "@/components/physics/ui";
import { scenePresets } from "@/lib/physics/scenes";
import { recordExplored } from "@/lib/progress";
import type { Simulation } from "@/lib/physics/useSimulation";
import { cn } from "@/lib/utils";

export function ScenePanel({
  sim,
  onLoaded,
  activeId,
  onActiveChange,
}: {
  sim: Simulation;
  onLoaded: () => void;
  activeId: string | null;
  onActiveChange: (id: string) => void;
}) {
  return (
    <Panel title="Scenes" subtitle="Ready-to-run setups built through the C++ API">
      <div className="space-y-1.5">
        {scenePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={sim.status !== "ready"}
            onClick={() => {
              sim.pause();
              sim.clearHistory();
              sim.call((m) => preset.build(m));
              onLoaded();
              onActiveChange(preset.id);
              recordExplored({
                kind: "scene",
                id: preset.id,
                label: preset.name.charAt(0) + preset.name.slice(1).toLowerCase(),
                href: `/lab?scene=${preset.id}`,
              });
            }}
            className={cn(
              "w-full rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-40",
              activeId === preset.id
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-background/40 hover:border-primary/30 hover:bg-accent",
            )}
          >
            <div className="text-[13px] font-medium">
              {preset.name.charAt(0) + preset.name.slice(1).toLowerCase()}
            </div>
            <p className="label-micro mt-0.5 leading-snug">{preset.description}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}
