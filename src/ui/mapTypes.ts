import type { Waypoint } from "../nav/gps";
import type { Point2 } from "../nav/routing";
import type { LocationKind } from "../nav/locations";
import type { VehicleKind } from "../vehicles/vehicles";

export interface MapState {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  vehicles: Array<{ x: number; z: number; kind: VehicleKind; active: boolean }>;
  waypoint: Waypoint | null;
  route: Point2[];
  discovered: ReadonlySet<string>;
  driving: boolean;
}

export const KIND_COLORS: Record<LocationKind, string> = {
  farm: "#9bd45a",
  village: "#e2a45a",
  market: "#e8c45c",
  research: "#8cc7d8",
  hq: "#b28ce8",
  highway: "#b8b8ae",
  water: "#66c4d8",
  solar: "#e8d05c",
  plains: "#c47a52",
  service: "#d8d0b8",
  crash: "#7ff0e2",
};
