// Deterministic A* nav grid. The old random obstacle generation made routes
// differ between tabs and occasionally cut diagonally through blocked cells.
const GRID_W = 60;
const GRID_H = 45;
const MAP_W = 2400;
const MAP_H = 1800;

type GridPoint = { gx: number; gy: number };
type WorldPoint = { x: number; y: number };
type PathNode = GridPoint & { g: number; h: number; f: number; parent: PathNode | null };

const toGrid = (x: number, y: number): GridPoint => ({
  gx: Math.max(0, Math.min(GRID_W - 1, Math.floor((x / MAP_W) * GRID_W))),
  gy: Math.max(0, Math.min(GRID_H - 1, Math.floor((y / MAP_H) * GRID_H))),
});
const toWorld = (gx: number, gy: number): WorldPoint => ({ x: ((gx + 0.5) / GRID_W) * MAP_W, y: ((gy + 0.5) / GRID_H) * MAP_H });
const keyOf = ({ gx, gy }: GridPoint) => `${gx},${gy}`;

const blocked = new Set<string>();
// Oslofjord / deep-water edge. Hand-authored deterministic cells give all
// players the same paths and leave the landmark area navigable.
for (let gx = 0; gx < GRID_W; gx += 1) {
  for (let gy = 40; gy < GRID_H; gy += 1) blocked.add(`${gx},${gy}`);
}
for (let gx = 0; gx < 12; gx += 1) {
  for (let gy = 35; gy < 40; gy += 1) blocked.add(`${gx},${gy}`);
}
for (let gx = 46; gx < GRID_W; gx += 1) {
  for (let gy = 37; gy < 40; gy += 1) blocked.add(`${gx},${gy}`);
}

function isBlocked(point: GridPoint) {
  return point.gx < 0 || point.gx >= GRID_W || point.gy < 0 || point.gy >= GRID_H || blocked.has(keyOf(point));
}

function nearestWalkable(point: GridPoint): GridPoint {
  if (!isBlocked(point)) return point;
  for (let radius = 1; radius < Math.max(GRID_W, GRID_H); radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (const dy of [-radius, radius]) {
        const candidate = { gx: point.gx + dx, gy: point.gy + dy };
        if (!isBlocked(candidate)) return candidate;
      }
    }
    for (let dy = -radius + 1; dy <= radius - 1; dy += 1) {
      for (const dx of [-radius, radius]) {
        const candidate = { gx: point.gx + dx, gy: point.gy + dy };
        if (!isBlocked(candidate)) return candidate;
      }
    }
  }
  return point;
}

export function findPath(startX: number, startY: number, endX: number, endY: number): WorldPoint[] {
  const start = nearestWalkable(toGrid(startX, startY));
  const end = nearestWalkable(toGrid(endX, endY));
  const heuristic = (point: GridPoint) => Math.hypot(end.gx - point.gx, end.gy - point.gy);
  const open: PathNode[] = [{ ...start, g: 0, h: heuristic(start), f: heuristic(start), parent: null }];
  const closed = new Set<string>();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = keyOf(current);
    if (current.gx === end.gx && current.gy === end.gy) {
      const path: WorldPoint[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.push(toWorld(node.gx, node.gy));
        node = node.parent;
      }
      path.reverse();
      // End with the requested tap if that cell is valid, otherwise the safe
      // shoreline cell is the intentional destination.
      path.push(isBlocked(toGrid(endX, endY)) ? toWorld(end.gx, end.gy) : { x: endX, y: endY });
      return path;
    }
    closed.add(currentKey);

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
      const next = { gx: current.gx + dx, gy: current.gy + dy };
      if (closed.has(keyOf(next)) || isBlocked(next)) continue;
      // Do not squeeze through two blocked orthogonal neighbours diagonally.
      if (dx !== 0 && dy !== 0 && (isBlocked({ gx: current.gx + dx, gy: current.gy }) || isBlocked({ gx: current.gx, gy: current.gy + dy }))) continue;

      const g = current.g + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
      const existing = open.find(node => node.gx === next.gx && node.gy === next.gy);
      if (existing && existing.g <= g) continue;
      if (existing) open.splice(open.indexOf(existing), 1);
      const h = heuristic(next);
      open.push({ ...next, g, h, f: g + h, parent: current });
    }
  }

  // This should only happen with a malformed nav grid; remain responsive.
  return [{ x: startX, y: startY }, { x: endX, y: endY }];
}
