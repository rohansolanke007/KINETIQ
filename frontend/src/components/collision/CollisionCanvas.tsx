import { useCallback } from "react";
import type { CollisionInfo, CollisionState } from "@/lib/physics/engine";
import type { LiveFeed } from "@/lib/physics/useSimModule";
import { arrow, readPalette } from "@/components/physics/canvasKit";
import { useCanvasLoop } from "@/components/oscillators/useCanvasLoop";

interface Props {
  info: CollisionInfo | null;
  state: CollisionState | null;
  live: LiveFeed<CollisionState>;
}

/** Two bodies on a track. Positions, sizes and velocities all come from C++. */
export function CollisionCanvas({ info, state, live }: Props) {
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      if (!info) return;
      const c = readPalette();
      const p = (n: string) => info.parameters.find((x) => x.name === n)?.value ?? 0;
      const s = live.stateRef.current ?? state;
      const L = info.track.length;
      const scale = (w - 90) / L;
      const x0 = 45;
      const floorY = h * 0.64;
      const X = (x: number) => x0 + x * scale;
      const x1 = s?.x1 ?? info.track.start1;
      const x2 = s?.x2 ?? info.track.start2;
      const v1 = s?.v1 ?? p("v1");
      const v2 = s?.v2 ?? p("v2");
      const r1 = info.track.radius1 * scale;
      const r2 = info.track.radius2 * scale;

      // track and ruler
      ctx.strokeStyle = c.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(0), floorY);
      ctx.lineTo(X(L), floorY);
      ctx.stroke();
      ctx.font = `11px ${c.font}`;
      ctx.fillStyle = c.muted;
      ctx.textAlign = "center";
      ctx.lineWidth = 1;
      for (let m = 0; m <= L; m += 5) {
        ctx.beginPath();
        ctx.moveTo(X(m), floorY);
        ctx.lineTo(X(m), floorY + 6);
        ctx.stroke();
        ctx.fillText(String(m), X(m), floorY + 20);
      }
      ctx.fillText("position x (m)", X(L / 2), floorY + 40);

      // collision flash: a ring around the contact for a moment
      const tc = s?.collisionTime ?? null;
      if (s && tc !== null && s.time - tc < 0.35) {
        const fade = 1 - (s.time - tc) / 0.35;
        const contact = X(x1) + r1;
        ctx.strokeStyle = c.amber;
        ctx.globalAlpha = Math.max(0, fade);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(contact, floorY - Math.max(r1, r2), 18 + (1 - fade) * 36, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      const body = (x: number, r: number, color: string, label: string, v: number, row: number) => {
        const cx = X(x);
        const cy = floorY - r;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.25;
        ctx.stroke();
        ctx.fillStyle = c.foreground;
        ctx.font = `600 12px ${c.font}`;
        ctx.textAlign = "center";
        ctx.fillText(label, cx, cy + 4);
        // velocity arrow above the body (px per m/s grows with the track scale)
        const k = scale * 0.5;
        const ay = floorY - 2 * Math.max(r1, r2) - 24 - row * 0;
        if (Math.abs(v) > 1e-9) {
          arrow(ctx, cx, ay, cx + v * k, ay, color, 2.5);
          ctx.fillStyle = color;
          ctx.font = `600 11.5px ${c.font}`;
          ctx.textAlign = v >= 0 ? "left" : "right";
          ctx.fillText(`${v.toFixed(2)} m/s`, cx + v * k + (v >= 0 ? 8 : -8), ay + 4);
        } else {
          ctx.fillStyle = color;
          ctx.font = `600 11.5px ${c.font}`;
          ctx.textAlign = "center";
          ctx.fillText("0 m/s", cx, ay + 4);
        }
      };
      body(x1, r1, c.blue, `${p("m1").toFixed(1)} kg`, v1, 0);
      body(x2, r2, c.cyan, `${p("m2").toFixed(1)} kg`, v2, 1);

      // the velocities before the impact, dashed, once the collision has happened
      if (s?.before) {
        const k = scale * 0.5;
        const ay = floorY - 2 * Math.max(r1, r2) - 62;
        const draw1 = (x: number, v: number, color: string) => {
          if (Math.abs(v) < 1e-9) return;
          arrow(ctx, X(x), ay, X(x) + v * k, ay, color, 1.5, true);
        };
        draw1(x1, s.before.v1, c.blue);
        draw1(x2, s.before.v2, c.cyan);
        ctx.fillStyle = c.muted;
        ctx.font = `500 11px ${c.font}`;
        ctx.textAlign = "left";
        ctx.fillText("dashed: velocities before the collision", 16, ay - 12);
      }

      // phase label
      ctx.fillStyle = c.foreground;
      ctx.font = `600 13px ${c.font}`;
      ctx.textAlign = "right";
      ctx.fillText(
        s?.collided ? "After the collision" : s?.finished ? "No collision" : "Before the collision",
        w - 16,
        26,
      );
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
        aria-label="Two bodies colliding on a track"
      />
    </div>
  );
}
