import { useCallback } from "react";
import type { RotationalDynamicsInfo, RotationalDynamicsState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: RotationalDynamicsInfo | null;
  state: RotationalDynamicsState | null;
  live: LiveFeed<RotationalDynamicsState>;
}

const SHAPE_LABELS = [
  "Solid disc",
  "Solid cylinder",
  "Solid sphere",
  "Hollow sphere",
  "Thin ring",
  "Thin rod (centre)",
  "Thin rod (end)",
];

/**
 * Draws the rotational dynamics simulation:
 * - Rotating rigid body (shape-matched visual)
 * - Fixed axis of rotation
 * - Applied force and lever arm
 * - Torque direction indicator
 * - Angular velocity arc arrow
 */
export function RotationalDynamicsCanvas({ info, state, live }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;

      const mass       = p("mass");
      const radius     = p("radius");
      const force      = p("force");
      const forceAngle = p("forceAngle");
      const shapeId    = Math.round(p("shape"));

      const s = live.stateRef.current ?? state;
      const theta  = s?.theta  ?? 0;
      const omega  = s?.omega  ?? 0;
      const torque = s?.torque ?? info.analytic.torque;
      const KE     = s?.KE     ?? 0;
      const alpha  = s?.alpha  ?? info.analytic.angularAccel;
      const I      = s?.I      ?? info.analytic.momentOfInertia;

      const cx = w / 2;
      const cy = h * 0.46;
      const bodyR = Math.min(w, h) * 0.26;

      // ---- Axis of rotation ----
      ctx.strokeStyle = c.muted;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, cy - bodyR - 24);
      ctx.lineTo(cx, cy + bodyR + 24);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Axis label
      ctx.fillStyle = c.muted;
      ctx.font = `500 10.5px ${c.font}`;
      ctx.textAlign = "center";
      ctx.fillText("axis", cx, cy - bodyR - 30);

      // ---- Rotate the entire body by theta ----
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-theta); // minus: canvas y-axis is flipped

      // ---- Draw shape ----
      if (shapeId === 5 || shapeId === 6) {
        // Rod: draw as a rectangle centred at axis (shapeId 5) or from axis to end (shapeId 6)
        const length = radius;
        const thick = 10 + 2.5 * Math.cbrt(mass);
        ctx.fillStyle = c.blue;
        ctx.globalAlpha = 0.28;
        if (shapeId === 5) {
          // Centre: half on each side
          ctx.fillRect(-bodyR, -thick / 2, 2 * bodyR, thick);
        } else {
          // End: extends from 0 to bodyR
          ctx.fillRect(0, -thick / 2, bodyR, thick);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = 2.5;
        if (shapeId === 5) {
          ctx.strokeRect(-bodyR, -thick / 2, 2 * bodyR, thick);
          // Label length dimension
          ctx.fillStyle = c.muted;
          ctx.font = `500 10px ${c.font}`;
          ctx.textAlign = "center";
          ctx.fillText(`L = ${length.toFixed(1)} m`, 0, -thick / 2 - 8);
        } else {
          ctx.strokeRect(0, -thick / 2, bodyR, thick);
          ctx.fillStyle = c.muted;
          ctx.font = `500 10px ${c.font}`;
          ctx.textAlign = "center";
          ctx.fillText(`L = ${length.toFixed(1)} m`, bodyR / 2, -thick / 2 - 8);
        }
      } else if (shapeId === 4) {
        // Thin ring
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = 10 + 1.5 * Math.cbrt(mass);
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(0, 0, bodyR, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Radius line
        ctx.strokeStyle = c.muted;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(bodyR, 0);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      } else {
        // Filled disc / cylinder / sphere
        const fillAlpha = shapeId === 3 ? 0.12 : 0.28; // hollow sphere is lighter
        ctx.fillStyle = c.blue;
        ctx.globalAlpha = fillAlpha;
        ctx.beginPath();
        ctx.arc(0, 0, bodyR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = shapeId === 3 ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, bodyR, 0, 2 * Math.PI);
        ctx.stroke();

        if (shapeId !== 3) {
          // Add a spoke to show rotation
          ctx.strokeStyle = c.blue;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(bodyR, 0);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // ---- Centre dot ----
      ctx.fillStyle = c.foreground;
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.restore(); // undo rotation

      // ---- Radius label ----
      ctx.fillStyle = c.muted;
      ctx.font = `500 10px ${c.font}`;
      ctx.textAlign = "left";
      ctx.fillText(`R = ${radius.toFixed(1)} m`, cx + 6, cy + 14);

      // ---- Applied force arrow at the rim ----
      if (force > 0.1) {
        // Force is applied at (R, 0) in the body frame, which in the lab frame is:
        const rimAngle = -theta; // current orientation of the "right" rim point
        const rimX = cx + bodyR * Math.cos(rimAngle);
        const rimY = cy + bodyR * Math.sin(rimAngle);

        // Force direction: forceAngle degrees from positive x in world frame
        const forceDirRad = (forceAngle * Math.PI) / 180;
        const fScale = Math.min(50, 15 + force * 0.1);
        const fEndX = rimX + fScale * Math.cos(-forceDirRad);
        const fEndY = rimY + fScale * Math.sin(-forceDirRad);
        arrow(ctx, rimX, rimY, fEndX, fEndY, c.amber, 2.5);
        ctx.fillStyle = c.amber;
        ctx.font = `600 10.5px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(`F = ${force.toFixed(0)} N`, fEndX + 5, fEndY);

        // Lever arm line (from axis to rim along radius)
        ctx.strokeStyle = c.purple;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(rimX, rimY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.purple;
        ctx.font = `500 10px ${c.font}`;
        ctx.textAlign = "center";
        const lmX = (cx + rimX) / 2;
        const lmY = (cy + rimY) / 2 - 10;
        ctx.fillText("r", lmX, lmY);
      }

      // ---- Angular velocity arc arrow ----
      if (Math.abs(omega) > 0.01) {
        const arcR2 = bodyR + 30;
        const arcSpan = Math.min(Math.PI * 0.6, Math.abs(omega) * 0.3 + 0.4);
        const startA2 = -0.3;
        ctx.strokeStyle = c.cyan;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const ccw = omega < 0;
        ctx.arc(cx, cy, arcR2, startA2, startA2 + arcSpan * (ccw ? -1 : 1), ccw);
        ctx.stroke();
        ctx.globalAlpha = 1;
        // Arrowhead
        const tipA2 = startA2 + arcSpan * (ccw ? -1 : 1);
        const tax = cx + arcR2 * Math.cos(tipA2);
        const tay = cy + arcR2 * Math.sin(tipA2);
        ctx.fillStyle = c.cyan;
        ctx.beginPath();
        ctx.arc(tax, tay, 4, 0, 2 * Math.PI);
        ctx.fill();
        // ω label
        ctx.fillStyle = c.cyan;
        ctx.font = `600 11px ${c.font}`;
        ctx.textAlign = "center";
        const labA = startA2 + arcSpan * (ccw ? -0.5 : 0.5);
        ctx.fillText(`ω = ${omega.toFixed(2)} rad/s`, cx + (arcR2 + 24) * Math.cos(labA), cy + (arcR2 + 24) * Math.sin(labA));
      }

      // ---- Torque direction label ----
      if (Math.abs(torque) > 0.01) {
        const sign = torque > 0 ? "↺" : "↻";
        ctx.fillStyle = c.green;
        ctx.font = `700 20px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText(sign, 10, h - 36);
        ctx.font = `600 11px ${c.font}`;
        ctx.fillText(`τ = ${torque.toFixed(2)} N·m`, 36, h - 36);
      }

      // ---- HUD ----
      ctx.fillStyle = c.muted;
      ctx.font = `500 11px ${c.font}`;
      ctx.textAlign = "right";
      const rx = w - 10;
      ctx.fillText(`Shape: ${SHAPE_LABELS[shapeId] ?? "?"}`, rx, 18);
      ctx.fillText(`m = ${mass.toFixed(1)} kg`, rx, 34);
      ctx.fillText(`I = ${I.toFixed(3)} kg·m²`, rx, 50);
      ctx.fillText(`α = ${alpha.toFixed(3)} rad/s²`, rx, 66);
      ctx.fillText(`KE = ${KE.toFixed(2)} J`, rx, 82);
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
        aria-label="Rotational dynamics simulation"
      />
    </div>
  );
}
