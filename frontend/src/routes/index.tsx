import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { WorldCanvas } from "@/components/physics/WorldCanvas";
import { TelemetryBar } from "@/components/simulator/TelemetryBar";
import { TransportBar } from "@/components/simulator/TransportBar";
import { CreatePanel } from "@/components/simulator/CreatePanel";
import { WorldPanel } from "@/components/simulator/WorldPanel";
import { ScenePanel } from "@/components/simulator/ScenePanel";
import { Inspector } from "@/components/simulator/Inspector";
import { BodyList, CollisionPanel } from "@/components/simulator/BodyList";
import { EnergyGraph } from "@/components/simulator/EnergyGraph";
import { VelocityGraph } from "@/components/simulator/VelocityGraph";
import { FormulaPanel } from "@/components/simulator/FormulaPanel";
import { useSimulation } from "@/lib/physics/useSimulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kinetiq — Physics Simulator" },
      {
        name: "description",
        content:
          "Build bodies, tune gravity and friction, and explore interactive physics simulations directly in your browser.",
      },
      { property: "og:title", content: "Kinetiq — Physics Simulator" },
      { property: "og:description", content: "An interactive 2D physics simulator for exploring mechanics and motion." },
    ],
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  const sim = useSimulation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showVectors, setShowVectors] = useState(true);

  const snapshot = () => {
    sim.call((m) => {
      const blob = new Blob([m.getStateJSON()], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `physics-state-${Date.now()}.json`;
      a.click();

      URL.revokeObjectURL(url);
    });

    toast.success("World state exported successfully.");
  };

  return (
    <main className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-3 p-3 sm:p-4">
      <h1 className="sr-only">Kinetiq physics simulator</h1>

      <TelemetryBar state={sim.state} status={sim.status} />

      {sim.status === "error" && (
        <div className="glass rounded-xl border-red/40 px-4 py-3 text-[12px] text-red">
          {sim.error ?? "The simulation could not be loaded."}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[290px_minmax(0,1fr)_300px]">

        {/* LEFT SIDEBAR */}
        <div className="scroll-thin flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-y-auto xl:max-h-none">
          <CreatePanel sim={sim} />
          <WorldPanel sim={sim} />
          <ScenePanel sim={sim} />
        </div>

        {/* CENTER */}
        <div className="flex min-h-0 flex-col gap-3">

          {/* UNDO / RUN / STEP / STOP BAR */}
          <TransportBar
            sim={sim}
            showGrid={showGrid}
            showVectors={showVectors}
            onToggleGrid={() => setShowGrid((v) => !v)}
            onToggleVectors={() => setShowVectors((v) => !v)}
            onSnapshot={snapshot}
          />

          {/* SIMULATION WORLD */}
          <div className="glass min-h-[500px] overflow-hidden rounded-xl">
            <WorldCanvas
              state={sim.state}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDrag={(id, x, y) =>
                sim.call((m) => m.setObjectPosition(id, x, y))
              }
              showGrid={showGrid}
              showVectors={showVectors}
            />
          </div>

          {/* GRAPHS BELOW SIMULATION */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <EnergyGraph
              energyHistory={sim.energyHistory}
            />

            <VelocityGraph
              velocityHistory={sim.velocityHistory}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="scroll-thin flex max-h-[calc(100vh-9rem)] flex-col gap-3 overflow-y-auto xl:max-h-none">

          {/* FORMULA + LIVE CALCULATION */}
          <FormulaPanel
            state={sim.state}
            selectedId={selectedId}
          />

          {/* SELECTED BODY */}
          <Inspector
            sim={sim}
            selectedId={selectedId}
            onCleared={() => setSelectedId(null)}
          />

          {/* ALL BODIES */}
          <BodyList
            state={sim.state}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* COLLISIONS */}
          <CollisionPanel state={sim.state} />
        </div>
      </div>
    </main>
  );
}