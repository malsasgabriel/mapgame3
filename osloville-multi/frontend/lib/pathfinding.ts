// Simple A* on grid for Oslo map
// Grid 60x45, blocked = water/buildings

const GRID_W = 60, GRID_H = 45;
const MAP_W = 2400, MAP_H = 1800;

function toGrid(x: number, y: number) { return { gx: Math.floor(x / MAP_W * GRID_W), gy: Math.floor(y / MAP_H * GRID_H) }; }
function toWorld(gx: number, gy: number) { return { x: (gx + 0.5) / GRID_W * MAP_W, y: (gy + 0.5) / GRID_H * MAP_H }; }

// Blocked cells - fjord water + some buildings
const blocked = new Set<string>();
// water bottom
for (let gx = 0; gx < GRID_W; gx++) for (let gy = 35; gy < GRID_H; gy++) if (Math.random() < 0.6) blocked.add(`${gx},${gy}`);
// Opera water
for (let gx = 32; gx < 42; gx++) for (let gy = 28; gy < 35; gy++) if (Math.random() < 0.4) blocked.add(`${gx},${gy}`);

function isBlocked(gx: number, gy: number) {
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return true;
  return blocked.has(`${gx},${gy}`);
}

export function findPath(startX: number, startY: number, endX: number, endY: number): {x:number,y:number}[] {
  const start = toGrid(startX, startY);
  const end = toGrid(endX, endY);
  const open: any[] = [{ ...start, g: 0, h: Math.hypot(end.gx - start.gx, end.gy - start.gy), f: 0, parent: null }];
  const closed = new Set<string>();
  open[0].f = open[0].g + open[0].h;
  const cameFrom = new Map<string, any>();

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const key = `${cur.gx},${cur.gy}`;
    if (cur.gx === end.gx && cur.gy === end.gy) {
      const path: {x:number,y:number}[] = [];
      let node: any = cur;
      while (node) { path.push(toWorld(node.gx, node.gy)); node = node.parent; }
      path.reverse();
      // smooth: add actual end
      path.push({ x: endX, y: endY });
      return path;
    }
    closed.add(key);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for (const [dx,dy] of dirs) {
      const ng = { gx: cur.gx + dx, gy: cur.gy + dy };
      const ngKey = `${ng.gx},${ng.gy}`;
      if (closed.has(ngKey) || isBlocked(ng.gx, ng.gy)) continue;
      const g = cur.g + (dx && dy ? 1.4 : 1);
      const h = Math.hypot(end.gx - ng.gx, end.gy - ng.gy);
      const f = g + h;
      const existing = open.find(o => o.gx === ng.gx && o.gy === ng.gy);
      if (!existing || g < existing.g) {
        if (existing) open.splice(open.indexOf(existing),1);
        open.push({ ...ng, g, h, f, parent: cur });
      }
    }
  }
  // fallback direct
  return [{ x: startX, y: startY }, { x: endX, y: endY }];
}
