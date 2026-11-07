import { useCallback } from "react";
import type { PendulumInfo, PendulumState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "./useCanvasLoop";

interface Props {
  info: PendulumInfo | null;
  state: PendulumState | null;
  live: LiveFeed<PendulumState>;
  showVelocity: boolean;
}

/**
 * Draws the pendulum. The bob position, angle and speed come from the C++
 * snapshot; the canvas only maps metres of rod length to pixels.
 */
export function PendulumCanvas({ info, state, live, showVelocity }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;
      const L = p("length");
      const mass = p("mass");
      const theta0 = (p("angle") * Math.PI) / 180;
      const s = live.stateRef.current ?? state;
      const theta = s?.theta ?? theta0;

      // Fit the whole swing. Beyond 90 degrees the bob rises above the pivot,
      // so reserve headroom for that; sideways reach is L at 90 degrees or more.
      const reach = Math.abs(theta0) >= Math.PI / 2 ? L : L * Math.sin(Math.abs(theta0));
      const spanX = Math.max(2 * reach, 0.6 * L) * 1.2;
      const worldUp = Math.max(0, -L * Math.cos(theta0));
      const worldDown = L * 1.1;
      const scale = Math.min((w - 80) / spanX, (h - 110) / (worldUp + worldDown));
      const px = w / 2;
      const py = 50 + worldUp * scale;
      // screen y grows downward: the bob hangs L*cos(theta) below the pivot
      const bobX = px + L * Math.sin(theta) * scale;
      const bobY = py + L * Math.cos(theta) * scale;

      // ceiling
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 70, py);
      ctx.lineTo(px + 70, py);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      for (let x = px - 70; x < px + 70; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x - 6, py - 8);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // equilibrium line
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + L * scale * 1.1);
      ctx.stroke();
      ctx.restore();

      // swing arc between +-theta0 (the path the bob follows)
      if (Math.abs(theta0) > 1e-6) {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = c.muted;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const a0 = Math.PI / 2 - Math.abs(theta0);
        ctx.arc(px, py, L * scale, a0, Math.PI - a0);
        ctx.stroke();
        ctx.restore();

        // release position (ghost)
        ctx.save();
        ctx.strokeStyle = c.amber;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(
          px + L * Math.sin(theta0) * scale,
          py + L * Math.cos(theta0) * scale,
          9,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      // angle arc and label
      if (Math.abs(theta) > 0.02) {
        const r = Math.min(0.4 * L * scale, 70);
        ctx.strokeStyle = c.foreground;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        const start = Math.PI / 2;
        const end = Math.PI / 2 - theta;
        ctx.arc(px, py, r, Math.min(start, end), Math.max(start, end));
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.foreground;
        ctx.font = `500 12px ${c.font}`;
        ctx.textAlign = theta >= 0 ? "left" : "right";
        ctx.fillText(
          `θ = ${((theta * 180) / Math.PI).toFixed(1)}°`,
          px + (theta >= 0 ? 1 : -1) * (r + 8) * 0.6 + (theta >= 0 ? 4 : -4),
          py + r + 16,
        );
      }

      // rod
      ctx.strokeStyle = c.foreground;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(bobX, bobY);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // rod length label
      ctx.fillStyle = c.muted;
      ctx.font = `500 11.5px ${c.font}`;
      ctx.textAlign = "left";
      ctx.save();
      ctx.translate((px + bobX) / 2, (py + bobY) / 2);
      ctx.rotate(Math.atan2(bobY - py, bobX - px) - (bobX < px ? Math.PI : 0));
      ctx.textAlign = "center";
      ctx.fillText(`L = ${L.toFixed(2)} m`, 0, -8);
      ctx.restore();

      // tangential velocity vector
      if (showVelocity && s && info.analytic.maxSpeed > 1e-9) {
        const speed = s.omega * L; // signed tangential speed
        const len = (speed / info.analytic.maxSpeed) * 90;
        // d/dt of (sin t, cos t) is (cos t, -sin t) in screen coordinates
        const tx = Math.cos(theta);
        const ty = -Math.sin(theta);
        arrow(ctx, bobX, bobY, bobX + tx * len, bobY + ty * len, c.green, 2.25);
        if (Math.abs(len) > 16) {
          ctx.fillStyle = c.green;
          ctx.font = `600 11.5px ${c.font}`;
          ctx.textAlign = "left";
          ctx.fillText(
            `v = ${Math.abs(speed).toFixed(2)} m/s`,
            bobX + tx * len + 8,
            bobY + ty * len - 6,
          );
        }
      }

      // pivot and bob (radius grows with mass)
      const radius = 9 + 4.5 * Math.sqrt(mass);
      ctx.fillStyle = c.cyan;
      ctx.strokeStyle = c.foreground;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.arc(bobX, bobY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.foreground;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    },
    [info, state, live, showVelocity],
  );

  const { canvasRef, wrapRef } = useCanvasLoop(live, draw);
  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="h-full w-full" role="img" aria-label="Pendulum" />
    </div>
  );
}
