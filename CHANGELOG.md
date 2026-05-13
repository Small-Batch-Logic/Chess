# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **Fleet Management**: Control 3 distinct buses simultaneously to coordinate a trap.
- **Smart Opponent**: The System now actively targets a Terminal Hub and avoids player buses.
- **Auto-Dispatch**: Initial pieces are automatically stationed at major hubs for immediate start.
- **Map Auto-Framing**: Viewport automatically pans and zooms to keep all active pieces in frame.
- **System Tracking**: Red dashed trails and pulsing animations show the System's recent movement history.
- **Level of Detail (LOD)**: Map de-clutters minor stops when zoomed out for better operational oversight.

### Changed
- **Terminology**: Pivoted from military/sports terms ("Arena", "Deployment") to transit ops language ("Network", "Operations Center").
- **Win Condition**: Shifted from line-crossing (Tron-style) to exact stop capture (Chess-style).

## [0.1.0] - 2026-05-12

### Added
- **Core Gameplay**: Turn-based "Interception" logic against "The System".
- **Network-Aware Movement**: Integrated Atlas API to enforce moves along real transit routes.
- **Fleet Selection**: Three distinct vehicle types (Local, Express, Rapid) with varying ranges.
- **Light Mode UI**: Professional "SaaS-style" aesthetic with high-contrast map tiles.
- **Tutorial**: Interactive "Rulebook" overlay for new players.
- **Status HUD**: Real-time match tracking and move history.
- **Network Context**: Background GeoJSON rendering of the actual transit network.
