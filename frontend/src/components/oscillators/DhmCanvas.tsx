import { useCallback } from "react";
import type { DhmInfo, DhmState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, niceStep, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "./useCanvasLoop";

interface Props {
  info: DhmInfo | null;
  state: DhmState | null;
  live: LiveFeed<DhmState>;
  showDamper: boolean;
  showForces: boolean;
}

/**
 * Draws a horizontal spring-mass-damper system.
 * The mass position comes from the C++ engine's displacement x.
 */
export function DhmCanvas({ info, state, live, showDamper, showForces }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;
      const mass = p("mass");
      const x0 = p("displacement");

      // Compute the display amplitude from the analytic initial energy so the
      // scale doesn't jump when the mass crosses zero.
      const amp = Math.max(Math.sqrt((2.0 * info.analytic.initialEnergy) / Math.max(p("k"), 1e-9)), Math.abs(x0), 0.1);

      const s = live.stateRef.current ?? state;
      const x = s?.x ?? x0;
      const regime = s?.regime ?? info.analytic.regime;

      const padL = 56;
      const padR = 28;
      const availW = w - padL - padR;
      const scale = (availW * 0.36) / amp;
      const wallX = padL;
      const eqX = padL + availW * 0.55;
      const floorY = h * 0.62;
      const side = 40 + 7 * Math.cbrt(mass);
      const blockCx = eqX + x * scale;
      const blockLeft = blockCx - side / 2;
      const blockTop = floorY - side;

      // ---- Floor ----
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

      // ---- Wall ----
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

      // ---- Equilibrium line ----
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

      // ---- Ruler ----
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

      // ---- Spring coils (wall → block) ----
      const coils = 14;
      const midY = floorY - side / 2;
      const lead = 10;
      // Spring goes from wall to left edge of block
      const springEndX = blockLeft;
      ctx.strokeStyle = c.cyan;
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(wallX, midY);
      ctx.lineTo(wallX + lead, midY);
      const span = Math.max(springEndX - wallX - 2 * lead, 4);
      for (let i = 0; i < coils * 2; i++) {
        const cx = wallX + lead + (span * (i + 0.5)) / (coils * 2);
        ctx.lineTo(cx, midY + (i % 2 === 0 ? -14 : 14));
      }
      ctx.lineTo(springEndX - lead, midY);
      ctx.lineTo(springEndX, midY);
      ctx.stroke();

      // ---- Damper (drawn above the spring, below the block top) ----
      if (showDamper) {
        const damperY = blockTop - 14;
        const damperEndX = blockLeft;
        const damperStartX = wallX + 4;
        const bodyLen = Math.max(damperEndX - damperStartX - 30, 10);
        const pistonX = damperStartX + bodyLen;
        const halfH = 7;

        ctx.strokeStyle = c.purple;
        ctx.lineWidth = 1.75;
        ctx.globalAlpha = 0.9;

        // cylinder body
        ctx.strokeRect(damperStartX, damperY - halfH, bodyLen, halfH * 2);
        // piston rod from cylinder to block
        ctx.beginPath();
        ctx.moveTo(pistonX, damperY);
        ctx.lineTo(damperEndX, damperY);
        ctx.stroke();
        // connect to wall
        ctx.beginPath();
        ctx.moveTo(damperStartX, damperY);
        ctx.lineTo(wallX, damperY);
        ctx.stroke();
        // piston cross bar inside cylinder
        const pistonPos = damperStartX + bodyLen * 0.6;
        ctx.beginPath();
        ctx.moveTo(pistonPos, damperY - halfH + 2);
        ctx.lineTo(pistonPos, damperY + halfH - 2);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = c.purple;
        ctx.font = `500 10px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText("damper", damperStartX + bodyLen / 2, damperY - halfH - 5);
      }

      // ---- Block ----
      // Colour reflects regime
      const blockColor =
        regime === "underdamped" ? c.blue
        : regime === "critical"  ? c.green
        : c.amber;
      ctx.fillStyle = blockColor;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(blockLeft, blockTop, side, side);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = blockColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(blockLeft, blockTop, side, side);
      ctx.fillStyle = c.foreground;
      ctx.font = `600 12px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText(`${mass.toFixed(1)} kg`, blockCx, midY + 4);

      // ---- Displacement arrow ----
      if (Math.abs(x) > 0.02) {
        const ay = blockTop - 18;
        arrow(ctx, eqX, ay, blockCx, ay, c.amber, 2);
        ctx.fillStyle = c.amber;
        ctx.font = `600 12px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(`x = ${x.toFixed(2)} m`, (eqX + blockCx) / 2, ay - 8);
      }

      // ---- Force arrows ----
      if (showForces && s) {
        const maxF = Math.max(Math.abs(s.Fspring), Math.abs(s.Fdamp), 1e-9);
        const fScale = Math.min(80, availW * 0.15) / maxF;
        const fy = floorY + 76;

        const drawForce = (force: number, color: string, label: string, yOff: number) => {
          if (Math.abs(force) < 1e-6) return;
          const len = force * fScale;
          const fy2 = fy + yOff;
          ctx.save();
          ctx.setLineDash([2, 4]);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.moveTo(blockCx, floorY + 24);
          ctx.lineTo(blockCx, fy2);
          ctx.stroke();
          ctx.restore();
          arrow(ctx, blockCx, fy2, blockCx + len, fy2, color, 2.5);
          ctx.fillStyle = color;
          ctx.font = `600 11px ${c.font}`;
          ctx.textAlign = "center";
          ctx.fillText(`${label}: ${force.toFixed(1)} N`, blockCx + len / 2, fy2 + 15);
        };

        drawForce(s.Fspring, c.green, "F_s", 0);
        drawForce(s.Fdamp, c.red, "F_d", 28);
      }

      // ---- Regime label ----
      const regimeLabel =
        regime === "underdamped" ? "Underdamped"
        : regime === "critical"  ? "Critically damped"
        : "Overdamped";
      const regimeColor =
        regime === "underdamped" ? c.blue
        : regime === "critical"  ? c.green
        : c.amber;
      ctx.fillStyle = regimeColor;
      ctx.font = `700 12px ${c.font}`;
      ctx.textAlign = "right";
      ctx.fillText(regimeLabel, w - padR, 20);
    },
    [info, state, live, showDamper, showForces],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label="Spring-mass-damper system"
      />
    </div>
  );
}
