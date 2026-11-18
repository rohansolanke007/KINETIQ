import { useCallback } from "react";
import type { AirResistanceInfo, AirResistanceState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: AirResistanceInfo | null;
  state: AirResistanceState | null;
  live: LiveFeed<AirResistanceState>;
}

/**
 * Canvas for the Air Resistance & Terminal Velocity simulation.
 *
 * 1D mode (falling object):
 *   - Vertical shaft with height scale
 *   - Ball at current position
 *   - Gravity force vector (downward, red)
 *   - Drag force vector (upward when falling, blue)
 *   - Net force vector (green)
 *   - Velocity vector (cyan, alongside ball)
 *   - Terminal velocity reference dashed line
 *
 * 2D mode (projectile):
 *   - Parabolic trajectory traced
 *   - Velocity and drag vectors on the projectile
 */
export function DragCanvas({ info, state, live }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const s = live.stateRef.current ?? state;
      const a = info.analytic;

      const projMode = s?.projMode ?? a.projMode;
      const y        = s?.y         ?? 0;
      const vy       = s?.vy        ?? 0;
      const vx       = s?.vx        ?? 0;
      const Fd       = s?.dragForce ?? 0;
      const Fg       = s?.gravityForce ?? (a.mass * a.gravity);
      const speed    = s?.speed     ?? 0;
      const vt       = s?.terminalVelocity ?? a.terminalVelocity;
      const time     = s?.time      ?? 0;

      if (projMode) {
        // ---- 2D PROJECTILE MODE ----
        const x = s?.x ?? 0;

        // Determine display scale from info
        const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;
        const launchSpeed = p("launchSpeed");
        const angleDeg    = p("launchAngle");
        const grav        = p("gravity") || 9.81;

        // Rough max range (ideal, no drag) for scale
        const angleRad = angleDeg * Math.PI / 180;
        const maxRange = launchSpeed * launchSpeed * Math.sin(2 * angleRad) / grav;
        const maxH     = launchSpeed * launchSpeed * Math.sin(angleRad) ** 2 / (2 * grav);

        const pad = 40;
        const scaleX = (w - 2 * pad) / Math.max(maxRange, 1);
        const scaleY = (h - 2 * pad) / Math.max(maxH * 1.3, 1);
        const scale  = Math.min(scaleX, scaleY);

        const toCanvasX = (wx: number) => pad + wx * scale;
        const toCanvasY = (wy: number) => h - pad - wy * scale;

        // Ground line
        ctx.strokeStyle = c.muted;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h - pad);
        ctx.lineTo(w, h - pad);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Current ball position
        const bx = toCanvasX(x);
        const by = toCanvasY(Math.max(y, 0));
        const br = 10;

        ctx.fillStyle = c.blue;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Velocity vector
        if (speed > 0.1) {
          const vscale = Math.min(50, 15 + speed * 1.5);
          arrow(ctx, bx, by, bx + (vx / speed) * vscale, by - (vy / speed) * vscale, c.cyan, 2.5);
          ctx.fillStyle = c.cyan;
          ctx.font = `600 11px ${c.font}`;
          ctx.textAlign = "left";
          ctx.fillText(`v=${speed.toFixed(1)} m/s`, bx + (vx / speed) * vscale + 5, by - (vy / speed) * vscale - 3);
        }

        // Drag vector (oppose velocity)
        if (Fd > 0.1 && speed > 0.1) {
          const fscale = Math.min(45, 10 + Fd * 0.5);
          arrow(ctx, bx, by, bx - (vx / speed) * fscale, by + (vy / speed) * fscale, c.red, 2);
          ctx.fillStyle = c.red;
          ctx.font = `600 10px ${c.font}`;
          ctx.textAlign = "right";
          ctx.fillText(`Fd=${Fd.toFixed(1)}N`, bx - (vx / speed) * fscale - 3, by + (vy / speed) * fscale + 12);
        }

        // HUD
        ctx.fillStyle = c.muted;
        ctx.font = `500 11px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`t = ${time.toFixed(2)} s`, 12, 18);
        ctx.fillText(`x = ${x.toFixed(1)} m`, 12, 32);
        ctx.fillText(`y = ${y.toFixed(1)} m`, 12, 46);
        return;
      }

      // ---- 1D FREE-FALL MODE ----
      const p = (n: string) => info.parameters.find((q) => q.name === n)?.value ?? 0;
      const initH = p("initHeight");

      // Layout: vertical shaft
      const padX = w / 2;      // centred
      const padTop = 30;
      const padBot = 40;
      const shaftH = h - padTop - padBot;
      const scale  = shaftH / Math.max(initH, 1);

      // Map physics y (0=ground, initH=top) to canvas (top=padTop, bottom=h-padBot)
      const toCanvasY = (physY: number) => h - padBot - physY * scale;

      // Ground
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(padX - 60, h - padBot);
      ctx.lineTo(padX + 60, h - padBot);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.muted;
      ctx.font = `500 10px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText("Ground  (y = 0)", padX, h - padBot + 14);

      // Height ruler marks
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      const markCount = Math.min(5, Math.floor(initH / 10));
      for (let i = 1; i <= markCount; i++) {
        const phy = (initH * i) / (markCount + 1);
        const cy  = toCanvasY(phy);
        ctx.beginPath();
        ctx.moveTo(padX - 55, cy);
        ctx.lineTo(padX + 55, cy);
        ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = c.muted;
        ctx.font = `400 9px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`${phy.toFixed(0)}m`, padX + 60, cy + 3);
        ctx.globalAlpha = 0.25;
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Terminal velocity line
      if (vt > 0.5) {
        // The y where terminal velocity would be reached (approximate)
        ctx.strokeStyle = c.amber;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padX - 55, padTop);
        ctx.lineTo(padX + 55, padTop);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.amber;
        ctx.font = `600 10px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`v_t = ${vt.toFixed(2)} m/s`, padX + 60, padTop + 3);
      }

      // Ball position
      const ballY  = toCanvasY(Math.max(y, 0));
      const ballR  = 16;

      ctx.fillStyle = c.blue;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(padX, ballY, ballR, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.blue;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(padX, ballY, ballR, 0, 2 * Math.PI);
      ctx.stroke();

      // Ball height label
      ctx.fillStyle = c.foreground;
      ctx.font = `600 10px ${c.font}`;
      ctx.textAlign = "right";
      ctx.fillText(`${y.toFixed(1)} m`, padX - 24, ballY + 4);

      // Gravity force (downward, red)
      const FgScale = Math.min(70, 15 + Fg * 0.6);
      arrow(ctx, padX, ballY + ballR, padX, ballY + ballR + FgScale, c.red, 2.5);
      ctx.fillStyle = c.red;
      ctx.font = `600 10px ${c.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`Fg=${Fg.toFixed(1)}N`, padX + 5, ballY + ballR + FgScale - 2);

      // Drag force (upward, blue)
      if (Fd > 0.05) {
        const FdScale = Math.min(60, 10 + Fd * 0.6);
        arrow(ctx, padX, ballY - ballR, padX, ballY - ballR - FdScale, c.cyan, 2.5);
        ctx.fillStyle = c.cyan;
        ctx.font = `600 10px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`Fd=${Fd.toFixed(1)}N`, padX + 5, ballY - ballR - FdScale + 12);
      }

      // Velocity label
      const absVy = Math.abs(vy);
      ctx.fillStyle = c.muted;
      ctx.font = `500 11px ${c.font}`;
      ctx.textAlign = "right";
      ctx.fillText(`|vy| = ${absVy.toFixed(2)} m/s`, padX - 25, ballY - ballR - 8);

      // HUD
      ctx.fillStyle = c.muted;
      ctx.font = `500 11px ${c.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`t = ${time.toFixed(2)} s`, 12, 18);
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
        aria-label="Air resistance simulation"
      />
    </div>
  );
}
