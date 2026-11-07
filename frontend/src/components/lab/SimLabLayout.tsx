import type { ReactNode } from "react";
import { LabModuleTabs } from "@/components/lab/LabModuleTabs";
import { cn } from "@/lib/utils";

/**
 * Shared three-panel frame for every dedicated simulation module:
 * parameters on the left, canvas + transport (+ optional graphs) in the
 * centre, live values and results on the right.
 */
export function SimLabLayout({
  title,
  phase,
  tone,
  error,
  left,
  canvas,
  transport,
  below,
  right,
}: {
  title: string;
  phase: string;
  tone: "idle" | "running" | "done";
  error?: string | null;
  left: ReactNode;
  canvas: ReactNode;
  transport: ReactNode;
  below?: ReactNode;
  right: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1760px] flex-1 flex-col gap-3 p-3 sm:p-4 xl:h-[calc(100dvh-3.5rem)] xl:flex-none">
      <h1 className="sr-only">{title}</h1>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <LabModuleTabs />
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span
            className={cn(
              "size-2 rounded-full",
              tone === "running"
                ? "status-dot bg-green"
                : tone === "done"
                  ? "bg-primary"
                  : "bg-amber",
            )}
            aria-hidden
          />
          {phase}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red/40 bg-red/10 px-4 py-3 text-[13px] text-red"
        >
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[284px_minmax(0,1fr)_312px] xl:grid-rows-[minmax(0,1fr)]">
        <div className="scroll-thin flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-1 [&>*]:shrink-0">
          {left}
        </div>

        <div className="scroll-thin order-first flex min-h-0 flex-col gap-3 xl:order-none">
          <div className="glass relative min-h-[320px] flex-1 overflow-hidden rounded-lg">
            {canvas}
          </div>
          {transport}
          {below}
        </div>

        <div className="scroll-thin flex min-h-0 flex-col gap-3 xl:overflow-y-auto xl:pr-1 [&>*]:shrink-0">
          {right}
        </div>
      </div>
    </main>
  );
}
