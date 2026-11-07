import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WorldCanvas } from "@/components/physics/WorldCanvas";
import { TelemetryBar } from "@/components/simulator/TelemetryBar";
import { TransportBar, type ViewOptions } from "@/components/simulator/TransportBar";
import { ObjectsPanel } from "@/components/simulator/ObjectsPanel";
import { WorldPanel } from "@/components/simulator/WorldPanel";
import { ScenePanel } from "@/components/simulator/ScenePanel";
import { Inspector } from "@/components/simulator/Inspector";
import { BodyList, CollisionPanel } from "@/components/simulator/BodyList";
import { FormulaPanel } from "@/components/simulator/FormulaPanel";
import { FreeBodyDiagram } from "@/components/fbd/FreeBodyDiagram";
import type { FbdData } from "@/lib/physics/engine";
import { LabGraphs } from "@/components/simulator/LabGraphs";
import { SandboxAnalysisPanel } from "@/components/simulator/SandboxAnalysisPanel";
import { useSandboxAnalysis } from "@/lib/physics/useSandboxAnalysis";
import { useSim } from "@/lib/physics/SimulationContext";
import { scenePresets } from "@/lib/physics/scenes";
import { recordExplored } from "@/lib/progress";
import { useCollapsedSidebar, useLabShortcuts } from "@/lib/useLabWorkspace";
import { LabModuleTabs } from "@/components/lab/LabModuleTabs";

export const Route = createFileRoute("/lab")({
  validateSearch: (search: Record<string, unknown>): { scene?: string } =>
    typeof search["scene"] === "string" ? { scene: search["scene"] } : {},
  head: () => ({
    meta: [
      { title: "Simulation Lab — KINETIQ" },
      {
        name: "description",
        content:
          "Build bodies, tune gravity and friction, and watch the C++ physics engine respond in real time.",
      },
    ],
  }),
  component: LabPage,
});

function LabPage() {
  const sim = useSim();
  const { scene } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [view, setView] = useState<ViewOptions>({
    grid: true,
    vectors: true,
    forces: false,
    trails: true,
  });
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const appliedSceneRef = useRef<string | null>(null);

  const ready = sim.status === "ready";
  const { analysis, series: analysisSeries } = useSandboxAnalysis(sim);

  // Free-body diagram of the selected body: the same Force objects the engine applies each step.
  const [bodyForces, setBodyForces] = useState<FbdData | null>(null);
  useEffect(() => {
    const m = sim.module.current;
    if (!m || selectedId === null || typeof m.getBodyForcesJSON !== "function") {
      setBodyForces(null);
      return;
    }
    try {
      const json = m.getBodyForcesJSON(selectedId);
      setBodyForces(json === "null" ? null : (JSON.parse(json) as FbdData));
    } catch {
      setBodyForces(null);
    }
  }, [sim.state, selectedId, sim.module]);

  useCollapsedSidebar();

  // Take over (and pause) any dashboard demo, then honour ?scene=<id>.
  useEffect(() => {
    if (!ready) return;
    sim.adoptWorld();
    if (scene && appliedSceneRef.current !== scene) {
      const preset = scenePresets.find((p) => p.id === scene);
      if (preset) {
        appliedSceneRef.current = scene;
        sim.pause();
        sim.clearHistory();
        sim.call((m) => preset.build(m));
        setActiveScene(preset.id);
        setSelectedId(null);
        recordExplored({
          kind: "scene",
          id: preset.id,
          label: preset.name.charAt(0) + preset.name.slice(1).toLowerCase(),
          href: `/lab?scene=${preset.id}`,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, scene]);

  const restart = useCallback(() => {
    const idMap = sim.restart();
    if (!idMap) {
      toast.message("Reset restores the world as it was when you pressed Play.");
      return;
    }
    setSelectedId((id) => (id === null ? null : (idMap.get(id) ?? null)));
  }, [sim]);

  const snapshot = () => {
    sim.call((m) => {
      const blob = new Blob([m.getStateJSON()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kinetiq-state-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    toast.success("World state exported.");
  };

  useLabShortcuts({
    enabled: ready,
    running: sim.running,
    onPlay: sim.run,
    onPause: sim.pause,
    onStep: sim.stepOnce,
    onReset: restart,
  });

  const toggle = (key: keyof ViewOptions) => setView((v) => ({ ...v, [key]: !v[key] }));
  const empty = (sim.state?.objects.length ?? 0) === 0;

  return (
    <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:h-[calc(100dvh-3.5rem)] xl:flex-none">
      <h1 className="sr-only">Simulation Lab</h1>

      <LabModuleTabs />

      <TelemetryBar state={sim.state} status={sim.status} />

      {sim.status === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-[13px] text-red"
        >
          {sim.error ?? "The simulation could not be loaded."} Rebuild the engine with{" "}
          <code className="tech">make web</code> in <code className="tech">backend/</code> and copy
          the output to <code className="tech">frontend/public/</code>.
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[284px_minmax(0,1fr)_312px] xl:grid-rows-[minmax(0,1fr)]">
        {/* LEFT: objects and environment */}
        <div className="scroll-thin flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-1 [&>*]:shrink-0">
          <ObjectsPanel sim={sim} onCreated={setSelectedId} />
          <WorldPanel sim={sim} />
          <ScenePanel
            sim={sim}
            activeId={activeScene}
            onActiveChange={setActiveScene}
            onLoaded={() => setSelectedId(null)}
          />
        </div>

        {/* CENTER: canvas, transport, graphs */}
        <div className="scroll-thin order-first flex min-h-0 flex-col gap-3 xl:order-none xl:overflow-y-auto">
          <div className="glass relative min-h-[300px] flex-1 overflow-hidden rounded-lg">
            <WorldCanvas
              state={sim.state}
              live={sim.live}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDrag={(id, x, y) => sim.call((m) => m.setObjectPosition(id, x, y))}
              onHover={(p) => {
                if (cursorRef.current) {
                  cursorRef.current.textContent = p
                    ? `x ${p.x.toFixed(1)} m   y ${p.y.toFixed(1)} m`
                    : "";
                }
              }}
              showGrid={view.grid}
              showVectors={view.vectors}
              showForces={view.forces}
              showTrails={view.trails}
            />
            {empty && ready && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <p className="max-w-xs rounded-md border border-border bg-card/90 px-4 py-3 text-center text-[13px] text-muted-foreground">
                  The world is empty. Add an object on the left or load a scene to begin.
                </p>
              </div>
            )}
            <span
              ref={cursorRef}
              className="tech pointer-events-none absolute right-3 top-2.5 whitespace-pre text-[12px] text-muted-foreground"
              aria-hidden
            />
          </div>

          <TransportBar
            sim={sim}
            view={view}
            onToggle={toggle}
            onRestart={restart}
            onSnapshot={snapshot}
          />
          <LabGraphs sim={sim} analysisSeries={analysisSeries} />
        </div>

        {/* RIGHT: inspector */}
        <div className="scroll-thin flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-1 [&>*]:shrink-0">
          <Inspector sim={sim} selectedId={selectedId} onCleared={() => setSelectedId(null)} />
          <FreeBodyDiagram
            data={bodyForces}
            shape="circle"
            subtitle="Gravity and friction on the selected body"
            footnote="Walls and collisions act as impulses in this engine, so they are not drawn as forces."
            emptyText={
              selectedId === null
                ? "Select a body to see the forces acting on it."
                : "No continuous force acts on this body. Raise gravity (or friction, once it moves) in the Environment panel."
            }
          />
          <SandboxAnalysisPanel analysis={analysis} state={sim.state} />
          <FormulaPanel state={sim.state} selectedId={selectedId} />
          <BodyList state={sim.state} selectedId={selectedId} onSelect={setSelectedId} />
          <CollisionPanel state={sim.state} />
        </div>
      </div>
    </main>
  );
}
