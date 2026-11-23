export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label: string;
}

export interface CircleHit {
  x: number;
  z: number;
  hit: boolean;
}

export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  colliders: readonly Collider[],
): CircleHit {
  let px = x;
  let pz = z;
  let hit = false;

  for (const collider of colliders) {
    const nearestX = Math.max(collider.minX, Math.min(px, collider.maxX));
    const nearestZ = Math.max(collider.minZ, Math.min(pz, collider.maxZ));
    const dx = px - nearestX;
    const dz = pz - nearestZ;
    const distanceSq = dx * dx + dz * dz;

    if (distanceSq >= radius * radius) {
      continue;
    }

    hit = true;
    const distance = Math.sqrt(distanceSq);

    if (distance > 0.0001) {
      const push = (radius - distance) / distance;
      px += dx * push;
      pz += dz * push;
    } else {
      const left = px - collider.minX;
      const right = collider.maxX - px;
      const top = pz - collider.minZ;
      const bottom = collider.maxZ - pz;
      const smallest = Math.min(left, right, top, bottom);
      if (smallest === left) {
        px = collider.minX - radius;
      } else if (smallest === right) {
        px = collider.maxX + radius;
      } else if (smallest === top) {
        pz = collider.minZ - radius;
      } else {
        pz = collider.maxZ + radius;
      }
    }
  }

  return { x: px, z: pz, hit };
}
