export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return target + (current - target) * Math.exp(-smoothing * dt);
}

export function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(target, current + maxDelta);
  }
  return Math.max(target, current - maxDelta);
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
