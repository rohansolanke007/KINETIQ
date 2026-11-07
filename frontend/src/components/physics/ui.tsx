import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** "KINETIC ENERGY" -> "Kinetic energy". Mixed-case text is left untouched. */
function sentence(text: string): string {
  if (text !== text.toUpperCase() || !/[A-Z]{2}/.test(text)) return text;
  return text.charAt(0) + text.slice(1).toLowerCase();
}

/** Applies sentence() to text children, leaving icons and elements alone. */
function sentenceNode(node: ReactNode): ReactNode {
  if (typeof node === "string") return sentence(node);
  if (Array.isArray(node)) return node.map((n) => sentenceNode(n));
  return node;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("glass flex min-h-0 flex-col rounded-lg", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {title && (
              <h2 className="text-[13px] font-semibold leading-tight">{sentence(title)}</h2>
            )}
            {subtitle && <p className="label-micro mt-1">{sentence(subtitle)}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={cn("scroll-thin min-h-0 flex-1 overflow-y-auto p-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

export function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-micro flex items-center justify-between">
        {sentence(label)}
        {suffix && <em className="tech not-italic opacity-80">{suffix}</em>}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  step = 0.5,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : ""}
      step={step}
      min={min}
      max={max}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      className={cn(
        "tech h-8 w-full rounded-md border border-input bg-background/60 px-2.5 text-[13px] text-foreground outline-none transition-colors focus:border-primary/70 focus:ring-2 focus:ring-ring/30",
        className,
      )}
    />
  );
}

/** Slider with an editable numeric readout. Values are clamped to [min, max]. */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}) {
  const safe = Number.isFinite(value) ? value : min;
  return (
    <div className={cn(disabled && "pointer-events-none opacity-50")}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="label-micro">{sentence(label)}</span>
        <span className="flex items-center gap-1">
          <NumberInput
            aria-label={label}
            value={value}
            step={step}
            min={min}
            max={max}
            className="h-7 w-[4.5rem] px-2 text-right text-[12.5px]"
            onChange={(v) => {
              if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
          />
          {unit && <span className="label-micro w-8">{unit}</span>}
        </span>
      </div>
      <Slider
        value={[Math.min(max, Math.max(min, safe))]}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => {
          if (v[0] !== undefined) onChange(v[0]);
        }}
      />
    </div>
  );
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      className="flex gap-0.5 rounded-md border border-border bg-background/50 p-0.5"
      role="group"
    >
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "tech flex-1 rounded px-2 font-medium transition-colors",
            size === "sm" ? "py-1 text-[11.5px]" : "py-1.5 text-[12.5px]",
            option.value === value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {sentence(option.label)}
        </button>
      ))}
    </div>
  );
}

export function ActionButton({
  children,
  onClick,
  tone = "default",
  className,
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "primary" | "danger" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        tone === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        tone === "default" &&
          "border border-border bg-secondary text-foreground hover:border-primary/40 hover:bg-accent",
        tone === "danger" &&
          "border border-destructive/40 text-destructive hover:bg-destructive/10",
        tone === "ghost" && "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      {sentenceNode(children)}
    </button>
  );
}

export function Readout({
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
    <div className="rounded-md border border-border bg-background/40 px-3 py-2">
      <div className="label-micro">{sentence(label)}</div>
      <div
        className="tech mt-0.5 text-[15px] font-medium"
        style={accent ? { color: accent } : undefined}
      >
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
