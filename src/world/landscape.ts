import { Color3 } from "@babylonjs/core/Maths/math.color";
import { LOCATIONS } from "../nav/locations";
import { ROAD_SEGMENTS } from "./roads";

export const LAKE = {
  x: -460,
  z: -320,
  radius: 82,
  shore: 122,
};

interface LakeInfo {
  x: number;
  z: number;
  radius: number;
  shore: number;
  level: number;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash2(x: number, z: number): number {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
}

export function rawHeight(x: number, z: number): number {
  const basin =
    5.2 * Math.sin(x * 0.0081 + 0.4) * Math.cos(z * 0.0076 - 0.3) +
    2.4 * Math.sin(x * 0.021 + z * 0.017) +
    1.3 * Math.cos(x * 0.037 - z * 0.029);

  const duneBand = smoothstep(230, 380, x) * smoothstep(60, 160, z);
  const dunes = duneBand * (2.6 + 1.8 * Math.sin(x * 0.035 + z * 0.021));

  const distance = Math.hypot(x, z);
  const rim = Math.max(0, (distance - 430) / 170);
  const ridge = rim * rim * 46 * (0.72 + 0.28 * Math.sin(Math.atan2(z, x) * 5 + 1.2));

  return basin + dunes + ridge;
}

const LOCATION_BASE: ReadonlyMap<string, number> = new Map(
  LOCATIONS.map((location) => [location.id, rawHeight(location.x, location.z)]),
);

const SEGMENTS = ROAD_SEGMENTS.map((segment) => {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lengthSq = Math.max(0.0001, dx * dx + dz * dz);
  return {
    ...segment,
    dx,
    dz,
    lengthSq,
    flatten: segment.width * 0.5 + 10,
  };
});

interface NearestPoint {
  distance: number;
  x: number;
  z: number;
}

function nearestOnSegment(x: number, z: number, segment: (typeof SEGMENTS)[number]): NearestPoint {
  const t = Math.min(1, Math.max(0, ((x - segment.ax) * segment.dx + (z - segment.az) * segment.dz) / segment.lengthSq));
  const px = segment.ax + segment.dx * t;
  const pz = segment.az + segment.dz * t;
  return { distance: Math.hypot(x - px, z - pz), x: px, z: pz };
}

const LAKE_LEVEL = rawHeight(LAKE.x, LAKE.z) - 1.2;

export const LAKE_INFO: LakeInfo = {
  ...LAKE,
  level: LAKE_LEVEL,
};

export function nearestRoadDistance(x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const segment of SEGMENTS) {
    const nearest = nearestOnSegment(x, z, segment);
    if (nearest.distance < best) {
      best = nearest.distance;
    }
  }
  return best;
}

export function heightAt(x: number, z: number): number {
  let height = rawHeight(x, z);

  let strongest = 0;
  let target = height;

  for (const location of LOCATIONS) {
    const distance = Math.hypot(x - location.x, z - location.z);
    if (distance >= location.flatten) {
      continue;
    }
    const influence = 1 - smoothstep(location.flatten * 0.5, location.flatten, distance);
    if (influence > strongest) {
      strongest = influence;
      target = LOCATION_BASE.get(location.id) ?? height;
    }
  }

  for (const segment of SEGMENTS) {
    const nearest = nearestOnSegment(x, z, segment);
    if (nearest.distance >= segment.flatten) {
      continue;
    }
    const influence = 1 - smoothstep(segment.flatten * 0.35, segment.flatten, nearest.distance);
    if (influence > strongest) {
      strongest = influence;
      target = rawHeight(nearest.x, nearest.z);
    }
  }

  height = height * (1 - strongest) + target * strongest;

  const lakeDistance = Math.hypot(x - LAKE_INFO.x, z - LAKE_INFO.z);
  if (lakeDistance < LAKE_INFO.shore) {
    const shoreBlend = 1 - smoothstep(LAKE_INFO.radius * 0.55, LAKE_INFO.shore, lakeDistance);
    const depth = 4.6 * (1 - Math.min(1, lakeDistance / LAKE_INFO.radius) ** 2);
    const floor = LAKE_INFO.level - depth;
    height = height * (1 - shoreBlend) + floor * shoreBlend;
  }

  return height;
}

export interface TerrainNormal {
  x: number;
  y: number;
  z: number;
}

export function normalAt(x: number, z: number): TerrainNormal {
  const e = 1.4;
  const dhdx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dhdz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  const length = Math.hypot(dhdx, 1, dhdz);
  return {
    x: -dhdx / length,
    y: 1 / length,
    z: -dhdz / length,
  };
}

const COLORS = {
  green: new Color3(0.3, 0.36, 0.2),
  dry: new Color3(0.46, 0.42, 0.27),
  red: new Color3(0.55, 0.31, 0.2),
  rock: new Color3(0.4, 0.37, 0.33),
  sand: new Color3(0.62, 0.55, 0.4),
};

function mixColor(out: Color3, from: Color3, to: Color3, amount: number): Color3 {
  out.set(
    from.r + (to.r - from.r) * amount,
    from.g + (to.g - from.g) * amount,
    from.b + (to.b - from.b) * amount,
  );
  return out;
}

const scratch = new Color3();

export function terrainColorAt(x: number, z: number, height: number): Color3 {
  const noise = hash2(x * 0.7, z * 0.7);
  const dryAmount = smoothstep(0.35, 0.85, noise) * 0.55;
  mixColor(scratch, COLORS.green, COLORS.dry, dryAmount);

  const plainsDistance = Math.hypot(x - 380, z - 220);
  const redAmount = (1 - smoothstep(120, 330, plainsDistance)) * 0.85;
  mixColor(scratch, scratch, COLORS.red, redAmount);

  const rockAmount = smoothstep(17, 38, height);
  mixColor(scratch, scratch, COLORS.rock, rockAmount);

  const lakeDistance = Math.hypot(x - LAKE_INFO.x, z - LAKE_INFO.z);
  const sandAmount = (1 - smoothstep(LAKE_INFO.radius * 0.9, LAKE_INFO.shore, lakeDistance)) * 0.8;
  mixColor(scratch, scratch, COLORS.sand, sandAmount);

  const variation = 0.92 + hash2(x + 31.7, z - 12.3) * 0.16;
  scratch.scaleInPlace(variation);
  return scratch.clone();
}
