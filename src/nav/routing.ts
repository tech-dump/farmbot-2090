import { ROAD_SEGMENTS } from "../world/roads";

export interface Point2 {
  x: number;
  z: number;
}

interface RoadNode extends Point2 {
  edges: Array<{ to: number; weight: number }>;
}

function buildGraph(): RoadNode[] {
  const nodes: RoadNode[] = [];
  const lookup = new Map<string, number>();

  const nodeIndex = (x: number, z: number): number => {
    const key = `${x.toFixed(1)}|${z.toFixed(1)}`;
    const existing = lookup.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const index = nodes.length;
    nodes.push({ x, z, edges: [] });
    lookup.set(key, index);
    return index;
  };

  for (const segment of ROAD_SEGMENTS) {
    const a = nodeIndex(segment.ax, segment.az);
    const b = nodeIndex(segment.bx, segment.bz);
    if (a === b) {
      continue;
    }
    const weight = Math.hypot(segment.bx - segment.ax, segment.bz - segment.az);
    nodes[a]!.edges.push({ to: b, weight });
    nodes[b]!.edges.push({ to: a, weight });
  }

  return nodes;
}

const GRAPH = buildGraph();

function nearestNode(point: Point2): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < GRAPH.length; index += 1) {
    const node = GRAPH[index]!;
    const distance = Math.hypot(node.x - point.x, node.z - point.z);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}

export interface Route {
  points: Point2[];
  length: number;
}

/**
 * Dijkstra over the road graph. The result is a drivable path: a short
 * connector from the start, the road nodes, and a connector to the target.
 */
export function findRoute(from: Point2, to: Point2): Route {
  if (GRAPH.length === 0) {
    return { points: [from, to], length: Math.hypot(to.x - from.x, to.z - from.z) };
  }

  const start = nearestNode(from);
  const goal = nearestNode(to);
  const count = GRAPH.length;
  const distances = new Array<number>(count).fill(Number.POSITIVE_INFINITY);
  const previous = new Array<number>(count).fill(-1);
  const visited = new Array<boolean>(count).fill(false);
  distances[start] = 0;

  for (let step = 0; step < count; step += 1) {
    let current = -1;
    let currentDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < count; index += 1) {
      if (!visited[index] && distances[index]! < currentDistance) {
        current = index;
        currentDistance = distances[index]!;
      }
    }
    if (current === -1) {
      break;
    }
    if (current === goal) {
      break;
    }
    visited[current] = true;
    for (const edge of GRAPH[current]!.edges) {
      if (visited[edge.to]) {
        continue;
      }
      const candidate = currentDistance + edge.weight;
      if (candidate < distances[edge.to]!) {
        distances[edge.to] = candidate;
        previous[edge.to] = current;
      }
    }
  }

  const nodePath: Point2[] = [];
  if (Number.isFinite(distances[goal]!)) {
    let current = goal;
    while (current !== -1) {
      const node = GRAPH[current]!;
      nodePath.push({ x: node.x, z: node.z });
      current = previous[current]!;
    }
    nodePath.reverse();
  }

  if (nodePath.length === 0) {
    const direct = Math.hypot(to.x - from.x, to.z - from.z);
    return { points: [from, to], length: direct };
  }

  const points: Point2[] = [{ x: from.x, z: from.z }, ...nodePath, { x: to.x, z: to.z }];
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    length += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return { points, length };
}
