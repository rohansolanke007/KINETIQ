import { Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { ActionButton, SegmentedControl } from "@/components/physics/ui";

export function SimTransport({
  running,
  finished,
  disabled,
  speed,
  onSpeed,
  onPlay,
  onPause,
  onStep,
  onReset,
  extra,
}: {
  running: boolean;
  finished: boolean;
  disabled: boolean;
  speed: number;
  onSpeed: (v: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-lg px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionButton
          tone={running ? "default" : "primary"}
          disabled={disabled || running}
          onClick={onPlay}
          title="Play (Space)"
        >
          <Play className="size-3.5" aria-hidden /> {finished ? "Replay" : "Play"}
        </ActionButton>
        <ActionButton disabled={disabled || !running} onClick={onPause} title="Pause (Space)">
          <Pause className="size-3.5" aria-hidden /> Pause
        </ActionButton>
        <ActionButton disabled={disabled} onClick={onStep} title="Advance one frame (N)">
          <StepForward className="size-3.5" aria-hidden /> Step
        </ActionButton>
        <ActionButton disabled={disabled} onClick={onReset} title="Back to the launch (R)">
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </ActionButton>
      </div>
      <div className="flex items-center gap-2 pl-1">
        <span className="label-micro">Speed</span>
        <div className="w-40">
          <SegmentedControl
            size="sm"
            value={speed}
            onChange={onSpeed}
            options={[
              { label: "0.25×", value: 0.25 },
              { label: "0.5×", value: 0.5 },
              { label: "1×", value: 1 },
              { label: "2×", value: 2 },
            ]}
          />
        </div>
      </div>
      {extra && <div className="ml-auto flex flex-wrap items-center gap-1.5">{extra}</div>}
    </div>
  );
}

/** Small on/off chip for canvas overlays. */
export function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "inline-flex h-8 items-center rounded-md border px-2.5 text-[12.5px] font-medium transition-colors " +
        (active
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground")
      }
    >
      {label}
    </button>
  );
}
