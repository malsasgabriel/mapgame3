# Real Oslo map

The game map uses Leaflet with OpenStreetMap-compatible street tiles rather than a single background image. Game coordinates are projected into a bounded Oslo area so player movement, collectible placement, routes and landmark discovery remain authoritative game systems while landmarks appear at their real locations.

## Tile configuration

Development defaults are set in `.env.local.example`:

```dotenv
NEXT_PUBLIC_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_TILE_ATTRIBUTION=© OpenStreetMap contributors
```

For a public launch, use an authorised commercial or self-hosted provider and preserve its required attribution. The public OpenStreetMap tile service must not be used as an unbounded game CDN.
