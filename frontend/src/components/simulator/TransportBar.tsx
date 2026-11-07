import {
  Camera,
  Eraser,
  Grid3x3,
  MoveUpRight,
  Pause,
  Play,
  RotateCcw,
  Route,
  StepForward,
  Undo2,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { ActionButton, SegmentedControl } from "@/components/physics/ui";
import type { Simulation } from "@/lib/physics/useSimulation";
import { cn } from "@/lib/utils";

function ViewToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-medium transition-colors",
        active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="hidden 2xl:inline">{label}</span>
    </button>
  );
}

export interface ViewOptions {
  grid: boolean;
  vectors: boolean;
  forces: boolean;
  trails: boolean;
}

export function TransportBar({
  sim,
  view,
  onToggle,
  onRestart,
  onSnapshot,
}: {
  sim: Simulation;
  view: ViewOptions;
  onToggle: (key: keyof ViewOptions) => void;
  onRestart: () => void;
  onSnapshot: () => void;
}) {
  const disabled = sim.status !== "ready";
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <ActionButton
          tone={sim.running ? "default" : "primary"}
          disabled={disabled || sim.running}
          onClick={sim.run}
          title="Play (Space)"
        >
          <Play className="size-3.5" aria-hidden /> Play
        </ActionButton>
        <ActionButton disabled={disabled || !sim.running} onClick={sim.pause} title="Pause (Space)">
          <Pause className="size-3.5" aria-hidden /> Pause
        </ActionButton>
        <ActionButton disabled={disabled} onClick={sim.stepOnce} title="Advance one time step (N)">
          <StepForward className="size-3.5" aria-hidden /> Step
        </ActionButton>
        <ActionButton
          disabled={disabled}
          onClick={onRestart}
          title="Restore the state from when the run started (R)"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </ActionButton>
      </div>

      <div className="flex items-center gap-2 pl-1">
        <span className="label-micro">Speed</span>
        <div className="w-40">
          <SegmentedControl
            size="sm"
            value={sim.speed}
            onChange={sim.setSpeed}
            options={[
              { label: "0.5×", value: 0.5 },
              { label: "1×", value: 1 },
              { label: "2×", value: 2 },
              { label: "4×", value: 4 },
            ]}
          />
        </div>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <ViewToggle
          icon={Grid3x3}
          label="Grid"
          active={view.grid}
          onClick={() => onToggle("grid")}
        />
        <ViewToggle
          icon={MoveUpRight}
          label="Velocity"
          active={view.vectors}
          onClick={() => onToggle("vectors")}
        />
        <ViewToggle
          icon={Waypoints}
          label="Forces"
          active={view.forces}
          onClick={() => onToggle("forces")}
        />
        <ViewToggle
          icon={Route}
          label="Trails"
          active={view.trails}
          onClick={() => onToggle("trails")}
        />
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ActionButton tone="ghost" onClick={sim.undo} disabled={disabled} title="Undo one C++ step">
          <Undo2 className="size-3.5" aria-hidden />
          <span className="sr-only">Undo</span>
        </ActionButton>
        <ActionButton
          tone="ghost"
          onClick={onSnapshot}
          disabled={disabled}
          title="Download world state as JSON"
        >
          <Camera className="size-3.5" aria-hidden />
          <span className="sr-only">Export snapshot</span>
        </ActionButton>
        <ActionButton
          tone="ghost"
          onClick={sim.resetWorld}
          disabled={disabled}
          title="Remove every body"
        >
          <Eraser className="size-3.5" aria-hidden />
          <span className="sr-only">Clear world</span>
        </ActionButton>
      </div>
    </div>
  );
}
