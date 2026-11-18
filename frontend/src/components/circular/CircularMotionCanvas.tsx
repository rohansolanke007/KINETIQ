import { useCallback } from "react";
import type { CircularMotionInfo, CircularMotionState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: CircularMotionInfo | null;
  state: CircularMotionState | null;
  live: LiveFeed<CircularMotionState>;
}

/**
 * Draws the circular motion simulation:
 * - Circular track
 * - Rotating particle (sized by mass)
 * - Radius vector
 * - Tangential velocity vector
 * - Centripetal acceleration vector (toward centre)
 * - Angular displacement arc indicator
 * - Rotation direction arrow
 */
export function CircularMotionCanvas({ info, state, live }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;

      const mass   = p("mass");
      const radius = p("radius");
      const alpha  = p("alpha");

      const s = live.stateRef.current ?? state;
      const theta  = s?.theta  ?? 0;
      const omega  = s?.omega  ?? info.analytic.angularVelocity;
      const v      = s?.v      ?? info.analytic.tangentialVelocity;
      const ac     = s?.ac     ?? info.analytic.centripetalAccel;
      const Fc     = s?.Fc     ?? info.analytic.centripetalForce;

      // Layout — keep track centred in a generous circle
      const cx = w / 2;
      const cy = h / 2;
      const pad = 56;
      const trackR = Math.min(w, h) / 2 - pad;
      const scale  = trackR / Math.max(radius, 0.1); // px/m

      // Particle position in canvas coords (y axis flipped)
      const px = cx + radius * scale * Math.cos(theta);
      const py = cy - radius * scale * Math.sin(theta); // minus: canvas y is down
      const particleR = 7 + 2.5 * Math.cbrt(mass);

      // ---- Circular track ----
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, trackR, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // ---- Axis cross ----
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx - trackR - 10, cy); ctx.lineTo(cx + trackR + 10, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - trackR - 10); ctx.lineTo(cx, cy + trackR + 10); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // ---- Centre dot ----
      ctx.fillStyle = c.muted;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ---- Angular displacement arc ----
      if (Math.abs(theta) > 0.02) {
        const arcR = trackR * 0.32;
        ctx.strokeStyle = c.amber;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, 0, -theta, theta < 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Label
        const midAngle = -theta / 2;
        const lx = cx + (arcR + 14) * Math.cos(midAngle);
        const ly = cy + (arcR + 14) * Math.sin(midAngle);
        ctx.fillStyle = c.amber;
        ctx.font = `600 11px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`θ = ${(theta % (2 * Math.PI)).toFixed(2)} rad`, lx, ly);
      }

      // ---- Radius vector ----
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // ---- Particle ----
      ctx.fillStyle = c.blue;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(px, py, particleR, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.blue;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(px, py, particleR, 0, 2 * Math.PI);
      ctx.stroke();

      // ---- Tangential velocity vector (perpendicular to radius, in direction of motion) ----
      if (v > 0.05) {
        // Tangential direction: (-sin theta, cos theta) in math coords → (-sin, -cos) in canvas coords
        const vScale = Math.min(60, 20 + v * 4);
        const tvx = -Math.sin(theta);
        const tvy =  Math.cos(theta); // in math y; canvas y is flipped: use -cos
        const tvxC = tvx;
        const tvyC = -tvy;
        const vx2 = px + vScale * tvxC;
        const vy2 = py + vScale * tvyC;
        arrow(ctx, px, py, vx2, vy2, c.cyan, 2.5);
        ctx.fillStyle = c.cyan;
        ctx.font = `600 11px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`v = ${v.toFixed(2)} m/s`, vx2 + 5, vy2 - 3);
      }

      // ---- Centripetal acceleration vector (toward centre) ----
      if (ac > 0.05) {
        const acScale = Math.min(55, 12 + ac * 2.5);
        // Direction: from particle toward centre
        const dx = cx - px;
        const dy = cy - py;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          const nx = dx / len;
          const ny = dy / len;
          const ax2 = px + acScale * nx;
          const ay2 = py + acScale * ny;
          arrow(ctx, px, py, ax2, ay2, c.green, 2.5);
          ctx.fillStyle = c.green;
          ctx.font = `600 11px ${c.font}`;
          ctx.textAlign = "right";
          ctx.fillText(`aₒ = ${ac.toFixed(2)} m/s²`, ax2 - 5, ay2 + 14);
        }
      }

      // ---- Rotation direction indicator (arc arrow at outer edge) ----
      const dirR = trackR + 20;
      const arcSpan = 0.5;
      const startA = -0.25;
      ctx.strokeStyle = c.purple;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, dirR, startA, startA + arcSpan, false);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Arrowhead tip at end of arc
      {
        const tipA = startA + arcSpan;
        const tx = cx + dirR * Math.cos(tipA);
        const ty = cy + dirR * Math.sin(tipA);
        const tangA = tipA + Math.PI / 2;
        const ax = tx + 7 * Math.cos(tangA);
        const ay = ty + 7 * Math.sin(tangA);
        ctx.fillStyle = c.purple;
        ctx.beginPath();
        ctx.arc(ax, ay, 3.5, 0, 2 * Math.PI);
        ctx.fill();
      }

      // ---- HUD labels ----
      ctx.fillStyle = c.foreground;
      ctx.font = `500 11.5px ${c.font}`;
      ctx.textAlign = "left";
      const lx0 = 12;
      ctx.fillStyle = c.muted;
      ctx.fillText(`ω = ${omega.toFixed(3)} rad/s`, lx0, 18);
      ctx.fillText(`Fc = ${Fc.toFixed(2)} N`, lx0, 34);
      ctx.fillText(`α = ${alpha.toFixed(2)} rad/s²`, lx0, 50);

      // Radius label
      {
        const midX = (cx + px) / 2;
        const midY = (cy + py) / 2;
        ctx.fillStyle = c.muted;
        ctx.font = `500 10.5px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`r = ${radius.toFixed(1)} m`, midX + 10, midY - 8);
      }

      // Mass label on particle
      ctx.fillStyle = c.foreground;
      ctx.font = `600 10px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText(`${mass.toFixed(1)} kg`, px, py + 3);
    },
    [info, state, live],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Circular motion simulation"
      />
    </div>
  );
}
