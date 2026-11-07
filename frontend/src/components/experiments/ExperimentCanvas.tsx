import { CollisionCanvas } from "@/components/collision/CollisionCanvas";
import { InclineCanvas } from "@/components/incline/InclineCanvas";
import { PendulumCanvas } from "@/components/oscillators/PendulumCanvas";
import { SpringCanvas } from "@/components/oscillators/SpringCanvas";
import { TrajectoryCanvas } from "@/components/projectile/TrajectoryCanvas";
import type {
  CollisionInfo,
  CollisionState,
  FbdData,
  InclineInfo,
  InclineState,
  PendulumInfo,
  PendulumState,
  ProjectileInfo,
  ProjectileState,
  ShmInfo,
  ShmState,
} from "@/lib/physics/engine";
import type { ModuleId } from "@/lib/analyticsConfig";
import type { LiveFeed } from "@/lib/physics/useSimModule";

/** Picks the right canvas for an experiment's simulation. Each canvas reads its own state shape. */
export function ExperimentCanvas({
  module,
  info,
  state,
  live,
  forces,
}: {
  module: ModuleId;
  info: unknown;
  state: unknown;
  live: LiveFeed<never>;
  forces: FbdData | null;
}) {
  switch (module) {
    case "projectile":
      return (
        <TrajectoryCanvas
          info={info as ProjectileInfo | null}
          state={state as ProjectileState | null}
          live={live as LiveFeed<ProjectileState>}
          showVectors
          showPrediction
        />
      );
    case "pendulum":
      return (
        <PendulumCanvas
          info={info as PendulumInfo | null}
          state={state as PendulumState | null}
          live={live as LiveFeed<PendulumState>}
          showVelocity
        />
      );
    case "shm":
      return (
        <SpringCanvas
          info={info as ShmInfo | null}
          state={state as ShmState | null}
          live={live as LiveFeed<ShmState>}
          showForce
        />
      );
    case "incline":
      return (
        <InclineCanvas
          info={info as InclineInfo | null}
          state={state as InclineState | null}
          forces={forces}
          live={live as LiveFeed<InclineState>}
          showForces
          showComponents={false}
        />
      );
    case "collision":
      return (
        <CollisionCanvas
          info={info as CollisionInfo | null}
          state={state as CollisionState | null}
          live={live as LiveFeed<CollisionState>}
        />
      );
  }
}
