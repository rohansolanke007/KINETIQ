import { useState } from "react";
import { Check } from "lucide-react";
import { Panel } from "@/components/physics/ui";
import type { FbdData, FbdForce } from "@/lib/physics/engine";
import { cn } from "@/lib/utils";

const KIND_COLOR: Record<FbdForce["kind"], string> = {
  gravity: "var(--purple)",
  normal: "var(--blue)",
  friction: "var(--red)",
  applied: "var(--green)",
  tension: "var(--cyan)",
  spring: "var(--cyan)",
};
const RESULTANT_COLOR = "var(--amber)";

const W = 340;
const H = 270;
const CX = W / 2;
const CY = H / 2 - 4;
const MAX_LEN = 92;

/** Screen-space arrow. Force y points up, so screen y is flipped. */
function Arrow({
  dx,
  dy,
  color,
  width = 2.25,
  dashed = false,
  from = [0, 0],
}: {
  dx: number;
  dy: number;
  color: string;
  width?: number;
  dashed?: boolean;
  from?: [number, number];
}) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return null;
  const ux = dx / len;
  const uy = dy / len;
  const x1 = CX + from[0];
  const y1 = CY + from[1];
  const x2 = x1 + dx;
  const y2 = y1 + dy;
  const head = Math.min(9, len * 0.45);
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  return (
    <g stroke={color} fill={color} strokeLinecap="round" opacity={dashed ? 0.8 : 1}>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        strokeWidth={width}
        strokeDasharray={dashed ? "4 4" : undefined}
      />
      <polygon
        points={`${x2},${y2} ${bx - uy * head * 0.42},${by + ux * head * 0.42} ${bx + uy * head * 0.42},${by - ux * head * 0.42}`}
        stroke="none"
      />
    </g>
  );
}

function Label({
  x,
  y,
  dx,
  dy,
  color,
  text,
}: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  text: string;
}) {
  const len = Math.hypot(dx, dy) || 1;
  const tx = x + (dx / len) * 12;
  const ty = y + (dy / len) * 12 + 4;
  const anchor = Math.abs(dx / len) < 0.3 ? "middle" : dx > 0 ? "start" : "end";
  return (
    <text
      x={tx}
      y={ty}
      fill={color}
      textAnchor={anchor}
      fontSize="11.5"
      fontWeight="600"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {text}
    </text>
  );
}

const nf = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");

/**
 * Draws the forces C++ reports for the selected body. Every vector uses one
 * scale (arrow length is proportional to magnitude) and one coordinate system
 * (x right, y up), so directions and sizes are comparable at a glance.
 */
export function FreeBodyDiagram({
  data,
  shape = "block",
  rotationDeg = 0,
  subtitle,
  footnote,
  emptyText,
}: {
  data: FbdData | null;
  shape?: "block" | "circle";
  /** Rotates the block glyph (used for an incline). Counter-clockwise, degrees. */
  rotationDeg?: number;
  subtitle?: string;
  footnote?: string;
  /** Shown instead of the diagram when there are no forces. */
  emptyText?: string;
}) {
  const [showComponents, setShowComponents] = useState(true);

  if (!data || data.forces.length === 0) {
    return (
      <Panel title="Free-body diagram" subtitle={subtitle ?? "No forces to show"}>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {emptyText ?? "No forces to show."}
        </p>
      </Panel>
    );
  }

  const real = data.forces.filter((f) => !f.component);
  const components = data.forces.filter((f) => f.component);
  const reference = Math.max(data.resultant.magnitude, ...real.map((f) => f.magnitude), 1e-9);
  const k = MAX_LEN / reference; // pixels per newton, shared by every arrow
  const vec = (f: { x: number; y: number }) => ({ dx: f.x * k, dy: -f.y * k });

  // The resultant is drawn beside the body (shifted perpendicular to itself) so it never hides a real force.
  const r = data.resultant;
  const rv = vec(r);
  const rLen = Math.hypot(rv.dx, rv.dy);
  const shift: [number, number] = rLen > 0 ? [(-rv.dy / rLen) * 11, (rv.dx / rLen) * 11] : [0, 0];

  const bodyFill = "var(--card)";
  return (
    <Panel title="Free-body diagram" subtitle={subtitle ?? "Arrow length is proportional to force"}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Free-body diagram with ${real.length} forces. ${data.equilibrium ? "The forces balance." : `Net force ${nf(r.magnitude)} newtons.`}`}
      >
        {/* body */}
        <g transform={`rotate(${-rotationDeg} ${CX} ${CY})`}>
          {shape === "circle" ? (
            <circle
              cx={CX}
              cy={CY}
              r={12}
              fill={bodyFill}
              stroke="var(--foreground)"
              strokeWidth="1.75"
            />
          ) : (
            <rect
              x={CX - 17}
              y={CY - 11}
              width={34}
              height={22}
              rx={2}
              fill={bodyFill}
              stroke="var(--foreground)"
              strokeWidth="1.75"
            />
          )}
        </g>

        {/* components first (dashed, behind) */}
        {showComponents &&
          components.map((f) => {
            const v = vec(f);
            return (
              <Arrow
                key={`c-${f.name}`}
                dx={v.dx}
                dy={v.dy}
                color={KIND_COLOR[f.kind]}
                width={1.5}
                dashed
              />
            );
          })}

        {/* real forces */}
        {real.map((f) => {
          const v = vec(f);
          return <Arrow key={f.name} dx={v.dx} dy={v.dy} color={KIND_COLOR[f.kind]} />;
        })}
        {real.map((f) => {
          const v = vec(f);
          return (
            <Label
              key={`l-${f.name}`}
              x={CX + v.dx}
              y={CY + v.dy}
              dx={v.dx}
              dy={v.dy}
              color={KIND_COLOR[f.kind]}
              text={`${f.label} = ${nf(f.magnitude)} N`}
            />
          );
        })}

        {/* resultant */}
        {rLen > 2 && (
          <>
            <Arrow dx={rv.dx} dy={rv.dy} from={shift} color={RESULTANT_COLOR} width={3.5} />
            <Label
              x={CX + shift[0] + rv.dx}
              y={CY + shift[1] + rv.dy}
              dx={rv.dx}
              dy={rv.dy}
              color={RESULTANT_COLOR}
              text={`ΣF = ${nf(r.magnitude)} N`}
            />
          </>
        )}

        {/* axes */}
        <g stroke="var(--muted-foreground)" fill="var(--muted-foreground)" strokeWidth="1.25">
          <line x1="16" y1={H - 14} x2="40" y2={H - 14} />
          <polygon points={`44,${H - 14} 38,${H - 17} 38,${H - 11}`} stroke="none" />
          <line x1="16" y1={H - 14} x2="16" y2={H - 38} />
          <polygon points={`16,${H - 42} 13,${H - 36} 19,${H - 36}`} stroke="none" />
          <text x="48" y={H - 10} fontSize="11" stroke="none">
            x
          </text>
          <text x="9" y={H - 46} fontSize="11" stroke="none">
            y
          </text>
        </g>
        {data.equilibrium && (
          <text
            x={W / 2}
            y={22}
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="600"
            fill="var(--green)"
          >
            Forces balance: ΣF = 0
          </text>
        )}
      </svg>

      <div className="mt-1 flex items-center justify-between">
        <span className="label-micro">Forces on the body</span>
        {components.length > 0 && (
          <button
            type="button"
            onClick={() => setShowComponents((v) => !v)}
            aria-pressed={showComponents}
            className={cn(
              "rounded-md border px-2 py-0.5 text-[11.5px] font-medium transition-colors",
              showComponents
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            Components
          </button>
        )}
      </div>

      <ul className="mt-1.5 divide-y divide-border">
        {real.map((f) => (
          <li key={f.name} className="flex items-center gap-2 py-1.5 text-[13px]">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: KIND_COLOR[f.kind] }}
              aria-hidden
            />
            <span className="flex-1">{f.name}</span>
            <span className="tech font-medium">{nf(f.magnitude)} N</span>
            <span className="tech w-14 text-right text-[11.5px] text-muted-foreground">
              {nf(f.angleDeg, 0)}°
            </span>
          </li>
        ))}
        {showComponents &&
          components.map((f) => (
            <li
              key={f.name}
              className="flex items-center gap-2 py-1.5 text-[12.5px] text-muted-foreground"
            >
              <span
                className="size-2.5 shrink-0 rounded-full border border-dashed"
                style={{ borderColor: KIND_COLOR[f.kind] }}
                aria-hidden
              />
              <span className="flex-1">{f.name}</span>
              <span className="tech">{nf(f.magnitude)} N</span>
              <span className="tech w-14 text-right text-[11.5px]">{nf(f.angleDeg, 0)}°</span>
            </li>
          ))}
        <li className="flex items-center gap-2 py-1.5 text-[13px] font-semibold">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: RESULTANT_COLOR }}
            aria-hidden
          />
          <span className="flex-1">Resultant ΣF</span>
          <span className="tech">
            {data.equilibrium && (
              <Check className="mr-1 inline size-3.5 text-green" aria-label="balanced" />
            )}
            {nf(r.magnitude)} N
          </span>
          <span className="tech w-14 text-right text-[11.5px] font-normal text-muted-foreground">
            {r.magnitude > 1e-6 ? `${nf((Math.atan2(r.y, r.x) * 180) / Math.PI, 0)}°` : "—"}
          </span>
        </li>
      </ul>
      <p className="label-micro mt-2 leading-relaxed">
        Angles are measured from +x (right), counter-clockwise, with +y up. {footnote}
      </p>
    </Panel>
  );
}
