import { useCallback } from "react";
import type { OrbitalMechanicsInfo, OrbitalMechanicsState } from "@/lib/physics/engine";
import type { LiveFeed, SeriesData } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: OrbitalMechanicsInfo | null;
  state: OrbitalMechanicsState | null;
  live: LiveFeed<OrbitalMechanicsState>;
  series: SeriesData | null;
}

const BODY_COLORS: Record<number, string> = {
  0: "#4fc3f7", // Earth — light blue
  1: "#bdbdbd", // Moon  — grey
  2: "#ef5350", // Mars  — red
  3: "#ffa726", // Jupiter — orange
  4: "#fff176", // Sun   — yellow
};

const BODY_SIZES: Record<number, number> = {
  0: 20, // Earth
  1: 12, // Moon
  2: 15, // Mars
  3: 28, // Jupiter
  4: 32, // Sun
};

/**
 * Canvas for Orbital Mechanics.
 * - Central body at canvas centre, scaled to fit
 * - Satellite at scaled position
 * - Gravitational force vector (toward central body)
 * - Velocity vector (tangential)
 * - Trail of past positions from series data
 * - HUD with key quantities
 */
export function OrbitalCanvas({ info, state, live, series }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const s = live.stateRef.current ?? state;
      const a = info.analytic;

      const bodyId     = s?.bodyId     ?? a.bodyId;
      const bodyRadius = s?.bodyRadius ?? a.bodyRadius;
      const sx         = s?.x          ?? (bodyRadius + a.altitude);
      const sy         = s?.y          ?? 0;
      const vx         = s?.vx         ?? 0;
      const vy         = s?.vy         ?? (a.circularVelocity);
      const speed      = s?.speed      ?? a.circularVelocity;
      const r          = s?.r          ?? (bodyRadius + a.altitude);
      const Fg         = s?.gravForce  ?? a.gravForce;
      const time       = s?.time       ?? 0;
      const alt        = s?.altitude   ?? a.altitude;

      // ---- Determine display scale ----
      // Scale so the initial orbit radius fills ~40% of the smaller canvas dimension
      const refR     = bodyRadius + a.altitude;
      const halfMin  = Math.min(w, h) / 2;
      const scale    = halfMin * 0.42 / Math.max(refR, 1); // px/m

      const cx = w / 2;
      const cy = h / 2;

      // ---- Draw orbital reference circle (ideal circular orbit radius) ----
      const refPx = refR * scale;
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, refPx, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // ---- Draw orbit trail from series data ----
      if (series && series.channels) {
        const xi = series.channels.indexOf("x");
        const yi = series.channels.indexOf("y");
        if (xi >= 0 && yi >= 0 && series.rows.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = c.cyan;
          ctx.globalAlpha = 0.35;
          ctx.lineWidth = 1.5;
          const rows = series.rows;
          const stride = Math.max(1, Math.floor(rows.length / 800));
          for (let i = 0; i < rows.length; i += stride) {
            const rx = cx + (rows[i]![xi]! * scale);
            const ry = cy - (rows[i]![yi]! * scale); // canvas y down
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // ---- Central body ----
      const bodyColor = BODY_COLORS[bodyId] ?? "#4fc3f7";
      const bodyPx    = BODY_SIZES[bodyId] ?? 20;
      ctx.fillStyle = bodyColor;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, bodyPx, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, bodyPx + 3, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Central body label
      ctx.fillStyle = c.foreground;
      ctx.font = `600 10px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText(a.bodyName, cx, cy + bodyPx + 14);

      // ---- Satellite position ----
      const spx = cx + sx * scale;
      const spy = cy - sy * scale; // canvas y is flipped
      const satR = 7;

      ctx.fillStyle = c.amber;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(spx, spy, satR, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ---- Gravitational force vector (toward central body) ----
      if (r > 1 && Fg > 0) {
        const dx = cx - spx;
        const dy = cy - spy;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const fScale = Math.min(55, 15 + Math.log10(Math.max(Fg, 1)) * 8);
          const fx2 = spx + (dx / len) * fScale;
          const fy2 = spy + (dy / len) * fScale;
          arrow(ctx, spx, spy, fx2, fy2, "#ef5350", 2.5);
        }
      }

      // ---- Velocity vector (tangent to orbit) ----
      if (speed > 1) {
        const vScale = Math.min(60, 20 + Math.log10(Math.max(speed, 1)) * 6);
        const nvx = vx / speed;
        const nvy = vy / speed;
        arrow(ctx, spx, spy, spx + nvx * vScale, spy - nvy * vScale, c.cyan, 2.5);
      }

      // ---- Radius line (central body → satellite) ----
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(spx, spy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // ---- HUD ----
      const formatSI = (v: number, digits = 3) => {
        if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(digits)}G`;
        if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(digits)}M`;
        if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(digits)}k`;
        return v.toFixed(digits);
      };

      ctx.fillStyle = c.muted;
      ctx.font = `500 11px ${c.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`t = ${formatSI(time, 1)} s`, 12, 18);
      ctx.fillText(`r = ${formatSI(r, 2)} m`, 12, 32);
      ctx.fillText(`alt = ${formatSI(alt, 2)} m`, 12, 46);
      ctx.fillText(`v = ${formatSI(speed, 2)} m/s`, 12, 60);
      ctx.fillStyle = c.cyan;
      ctx.fillText(`v_circ = ${formatSI(a.circularVelocity, 2)} m/s`, 12, 74);
      ctx.fillStyle = c.amber;
      ctx.fillText(`v_esc = ${formatSI(a.escapeVelocity, 2)} m/s`, 12, 88);

      // Legend
      ctx.textAlign = "right";
      ctx.fillStyle = "#ef5350";
      ctx.fillText("▶ Gravity", w - 10, 18);
      ctx.fillStyle = c.cyan;
      ctx.fillText("▶ Velocity", w - 10, 32);
    },
    [info, state, live, series],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Orbital mechanics simulation"
      />
    </div>
  );
}
