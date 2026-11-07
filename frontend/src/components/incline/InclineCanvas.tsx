import { useCallback } from "react";
import type { FbdData, FbdForce, InclineInfo, InclineState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: InclineInfo | null;
  state: InclineState | null;
  forces: FbdData | null;
  live: LiveFeed<InclineState>;
  showForces: boolean;
  showComponents: boolean;
}

const MAX_ARROW_PX = 64;

/**
 * Draws the ramp, the block and every force C++ reports. Geometry is in metres
 * with the slope's lower end at the origin; the force vectors come straight
 * from the engine's free-body diagram, so they follow the parameters.
 */
export function InclineCanvas({ info, state, forces, live, showForces, showComponents }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const angleDeg = info.parameters.find((p) => p.name === "angle")?.value ?? 0;
      const t = (angleDeg * Math.PI) / 180;
      const Ls = info.slope.length;
      const startS = info.slope.startDistance;
      const s = live.stateRef.current ?? state;
      const pos = s?.s ?? startS;

      const rise = Ls * Math.sin(t);
      const run = Ls * Math.cos(t);
      const worldW = run + 4;
      const worldH = rise + 3.4;
      const scale = Math.max(1, Math.min((w - 70) / worldW, (h - 80) / worldH));
      const ox = 36 + (w - 70 - worldW * scale) / 2 + 2 * scale; // slope bottom (world x = 0)
      const oy = h - 44; // ground level (world y = 0)
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy - y * scale;
      const up = { x: Math.cos(t), y: Math.sin(t) };
      const nrm = { x: -Math.sin(t), y: Math.cos(t) };

      // ground
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(-2), Y(0));
      ctx.lineTo(X(run + 1.8), Y(0));
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      for (let x = X(-2); x < X(run + 1.8); x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, Y(0));
        ctx.lineTo(x - 7, Y(0) + 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ramp
      if (rise > 1e-6) {
        ctx.fillStyle = c.muted;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.moveTo(X(0), Y(0));
        ctx.lineTo(X(run), Y(rise));
        ctx.lineTo(X(run), Y(0));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = c.foreground;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 2.25;
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(run), Y(rise));
      if (rise > 1e-6) ctx.lineTo(X(run), Y(0));
      ctx.stroke();
      ctx.globalAlpha = 1;

      // distance ticks along the slope (metres from the bottom)
      ctx.font = `11px ${c.font}`;
      ctx.fillStyle = c.muted;
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 1;
      ctx.textAlign = "center";
      for (let d = 0; d <= Ls + 1e-9; d += 1) {
        const px = X(d * up.x);
        const py = Y(d * up.y);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - nrm.x * 6, py + nrm.y * 6);
        ctx.stroke();
        if (d % 2 === 0) {
          // the last tick sits next to the ramp's vertical edge, so its label goes to the left
          const lx = px - nrm.x * 18 - (d === Ls ? 16 : 0);
          ctx.fillText(d === Ls ? `${d} m` : String(d), lx, py + nrm.y * 18 + 4);
        }
      }

      // angle arc at the bottom of the slope
      if (angleDeg > 0.1) {
        const r = Math.min(54, 0.35 * run * scale);
        ctx.strokeStyle = c.foreground;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(X(0), Y(0), r, -t, 0);
        ctx.stroke();
        ctx.fillStyle = c.foreground;
        ctx.font = `500 12px ${c.font}`;
        ctx.textAlign = "right";
        ctx.fillText(`θ = ${angleDeg.toFixed(1)}°`, X(0) - 10, Y(0) - 8);
      }

      // start marker (faint outline of where the block was released)
      const bw = 1.5;
      const bh = 0.9;
      const blockAt = (d: number) => ({
        x: X(d * up.x + nrm.x * (bh / 2)),
        y: Y(d * up.y + nrm.y * (bh / 2)),
      });
      const drawBlock = (d: number, fillAlpha: number, stroke: string, dashed: boolean) => {
        const p = blockAt(d);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(-t);
        ctx.fillStyle = c.blue;
        ctx.globalAlpha = fillAlpha;
        ctx.fillRect((-bw / 2) * scale, (-bh / 2) * scale, bw * scale, bh * scale);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        if (dashed) ctx.setLineDash([4, 4]);
        ctx.strokeRect((-bw / 2) * scale, (-bh / 2) * scale, bw * scale, bh * scale);
        ctx.restore();
      };
      if (Math.abs(pos - startS) > 0.05) drawBlock(startS, 0, c.muted, true);
      drawBlock(pos, 0.3, c.blue, false);

      // force arrows from the block's centre, in WORLD directions (y up)
      if (showForces && forces) {
        const centre = blockAt(pos);
        const kindColor: Record<FbdForce["kind"], string> = {
          gravity: c.purple,
          normal: c.blue,
          friction: c.red,
          applied: c.green,
          tension: c.cyan,
          spring: c.cyan,
        };
        const real = forces.forces.filter((f) => !f.component);
        const ref = Math.max(forces.resultant.magnitude, ...real.map((f) => f.magnitude), 1e-9);
        const k = MAX_ARROW_PX / ref;
        const draw1 = (f: FbdForce, dashed: boolean) => {
          const ex = centre.x + f.x * k;
          const ey = centre.y - f.y * k;
          const col = kindColor[f.kind];
          arrow(ctx, centre.x, centre.y, ex, ey, col, dashed ? 1.4 : 2.4, dashed);
          if (!dashed && f.magnitude * k > 10) {
            ctx.fillStyle = col;
            ctx.font = `600 11.5px ${c.font}`;
            const dx = ex - centre.x;
            const dy = ey - centre.y;
            const len = Math.hypot(dx, dy) || 1;
            ctx.textAlign = Math.abs(dx / len) < 0.3 ? "center" : dx > 0 ? "left" : "right";
            ctx.fillText(
              `${f.label} = ${f.magnitude.toFixed(1)} N`,
              ex + (dx / len) * 8,
              ey + (dy / len) * 10 + 4,
            );
          }
        };
        if (showComponents) forces.forces.filter((f) => f.component).forEach((f) => draw1(f, true));
        real.forEach((f) => draw1(f, false));
        const r = forces.resultant;
        if (r.magnitude * k > 4) {
          // The resultant is shifted sideways (perpendicular to itself) so it never hides a real force.
          const sx = centre.x + (r.y / r.magnitude) * 9;
          const sy = centre.y + (r.x / r.magnitude) * 9;
          arrow(ctx, sx, sy, sx + r.x * k, sy - r.y * k, c.amber, 3.5);
          ctx.fillStyle = c.amber;
          ctx.font = `600 11.5px ${c.font}`;
          ctx.textAlign = r.x >= 0 ? "left" : "right";
          ctx.fillText(
            `ΣF = ${r.magnitude.toFixed(1)} N`,
            sx + r.x * k + (r.x >= 0 ? 8 : -8),
            sy - r.y * k + 4,
          );
        }
      }

      // end-of-run banner
      if (s?.finished) {
        ctx.fillStyle = c.foreground;
        ctx.font = `600 13px ${c.font}`;
        ctx.textAlign = "right";
        ctx.fillText(s.regime === "bottom" ? "Reached the bottom" : "Reached the top", w - 16, 26);
      }
    },
    [info, state, forces, live, showForces, showComponents],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Block on an inclined plane with its forces"
      />
    </div>
  );
}
