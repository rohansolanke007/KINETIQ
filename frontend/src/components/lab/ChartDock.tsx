import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DockTab {
  id: string;
  label: string;
  content: ReactNode;
}

/** Tabbed area under the canvas. Only the active tab renders, so hidden charts cost nothing. */
export function ChartDock({ tabs }: { tabs: DockTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <section className="glass rounded-lg">
      <div
        role="tablist"
        aria-label="Graphs"
        className="flex gap-1 border-b border-border px-2 pt-2"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === current?.id}
            onClick={() => setActive(t.id)}
            className={cn(
              "rounded-t-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              t.id === current?.id
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-3">
        {current?.content}
      </div>
    </section>
  );
}
