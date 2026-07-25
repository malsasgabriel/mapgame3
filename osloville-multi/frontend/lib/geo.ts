/** Conversion between the bounded game board and the real Oslo map. */
export const OSLO_GAME_BOUNDS = {
  north: 59.97,
  south: 59.89,
  west: 10.62,
  east: 10.82,
} as const;

export const GAME_WORLD = { width: 2400, height: 1800 } as const;
export type WorldPoint = { x: number; y: number };

export function xyToLatLng(x: number, y: number) {
  return {
    lat: OSLO_GAME_BOUNDS.north - (y / GAME_WORLD.height) * (OSLO_GAME_BOUNDS.north - OSLO_GAME_BOUNDS.south),
    lng: OSLO_GAME_BOUNDS.west + (x / GAME_WORLD.width) * (OSLO_GAME_BOUNDS.east - OSLO_GAME_BOUNDS.west),
  };
}

export function latLngToXy(lat: number, lng: number): WorldPoint {
  return {
    x: ((lng - OSLO_GAME_BOUNDS.west) / (OSLO_GAME_BOUNDS.east - OSLO_GAME_BOUNDS.west)) * GAME_WORLD.width,
    y: ((OSLO_GAME_BOUNDS.north - lat) / (OSLO_GAME_BOUNDS.north - OSLO_GAME_BOUNDS.south)) * GAME_WORLD.height,
  };
}

export function clampWorldPoint(point: WorldPoint): WorldPoint {
  return {
    x: Math.max(40, Math.min(GAME_WORLD.width - 40, point.x)),
    y: Math.max(40, Math.min(GAME_WORLD.height - 40, point.y)),
  };
}
