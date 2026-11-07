import { useCallback } from "react";
import type { ShmInfo, ShmState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, niceStep, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "./useCanvasLoop";

interface Props {
  info: ShmInfo | null;
  state: ShmState | null;
  live: LiveFeed<ShmState>;
  showForce: boolean;
}

/** Draws the horizontal spring-mass system from the C++ displacement x. */
export function SpringCanvas({ info, state, live, showForce }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;
      const mass = p("mass");
      const amp = Math.max(info.analytic.amplitude, 0.5);
      const s = live.stateRef.current ?? state;
      const x = s?.x ?? p("displacement");

      const padL = 56;
      const padR = 28;
      const availW = w - padL - padR;
      const scale = (availW * 0.36) / amp; // pixels per metre
      const wallX = padL;
      const eqX = padL + availW * 0.55;
      const floorY = h * 0.62;
      const side = 40 + 7 * Math.cbrt(mass);
      const blockCx = eqX + x * scale;
      const blockLeft = blockCx - side / 2;
      const blockTop = floorY - side;

      // floor
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wallX, floorY);
      ctx.lineTo(w - padR + 10, floorY);
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      for (let fx = wallX; fx < w - padR; fx += 12) {
        ctx.beginPath();
        ctx.moveTo(fx, floorY);
        ctx.lineTo(fx - 7, floorY + 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // wall
      ctx.fillStyle = c.muted;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(wallX - 14, floorY - side - 24, 14, side + 24);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wallX, floorY - side - 24);
      ctx.lineTo(wallX, floorY);
      ctx.stroke();

      // equilibrium line and ruler
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(eqX, floorY - side - 36);
      ctx.lineTo(eqX, floorY + 34);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = c.muted;
      ctx.font = `500 11.5px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText("equilibrium", eqX, floorY - side - 42);

      const step = niceStep(amp / 2.5);
      ctx.font = `11px ${c.font}`;
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 1;
      const reach = Math.ceil((amp * 1.3) / step) * step;
      for (let t = -reach; t <= reach + 1e-9; t += step) {
        const tx = eqX + t * scale;
        if (tx < wallX + 4 || tx > w - padR) continue;
        ctx.beginPath();
        ctx.moveTo(tx, floorY + 16);
        ctx.lineTo(tx, floorY + 22);
        ctx.stroke();
        ctx.fillText(String(Math.round(t * 100) / 100), tx, floorY + 36);
      }
      ctx.fillText("x (m)", eqX, floorY + 54);

      // spring coils from the wall to the block (compressed or stretched)
      const coils = 14;
      const startX = wallX;
      const endX = blockLeft;
      const midY = floorY - side / 2;
      const lead = 10;
      ctx.strokeStyle = c.cyan;
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(startX, midY);
      ctx.lineTo(startX + lead, midY);
      const span = Math.max(endX - startX - 2 * lead, 4);
      for (let i = 0; i < coils * 2; i++) {
        const cx = startX + lead + (span * (i + 0.5)) / (coils * 2);
        ctx.lineTo(cx, midY + (i % 2 === 0 ? -14 : 14));
      }
      ctx.lineTo(endX - lead, midY);
      ctx.lineTo(endX, midY);
      ctx.stroke();

      // block (size grows with mass)
      ctx.fillStyle = c.blue;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(blockLeft, blockTop, side, side);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.blue;
      ctx.lineWidth = 2;
      ctx.strokeRect(blockLeft, blockTop, side, side);
      ctx.fillStyle = c.foreground;
      ctx.font = `600 12px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText(`${mass.toFixed(1)} kg`, blockCx, midY + 4);

      // displacement arrow from equilibrium to the block centre
      if (Math.abs(x) > 0.02) {
        const ay = blockTop - 18;
        arrow(ctx, eqX, ay, blockCx, ay, c.amber, 2);
        ctx.fillStyle = c.amber;
        ctx.font = `600 12px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`x = ${x.toFixed(2)} m`, (eqX + blockCx) / 2, ay - 8);
      }

      // Restoring force F = -kx, drawn clear of the coils below the ruler;
      // its length is proportional to |F| and it points back toward equilibrium.
      if (showForce && s && info.analytic.maxForce > 1e-9 && Math.abs(s.force) > 1e-6) {
        const len = (s.force / info.analytic.maxForce) * Math.min(110, availW * 0.18);
        const fy = floorY + 80;
        ctx.save();
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = c.green;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(blockCx, floorY + 24);
        ctx.lineTo(blockCx, fy);
        ctx.stroke();
        ctx.restore();
        arrow(ctx, blockCx, fy, blockCx + len, fy, c.green, 2.5);
        ctx.fillStyle = c.green;
        ctx.font = `600 11.5px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`F = ${s.force.toFixed(1)} N`, blockCx + len / 2, fy + 18);
      }
    },
    [info, state, live, showForce],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Spring-mass system"
      />
    </div>
  );
}
