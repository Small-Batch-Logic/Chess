# Critical Review: Transit Chess
**Date:** 2026-05-12
**Subject:** Deep Analysis of Mechanics, Balance, and UX

## 1. The "Random Walker" Problem (AI Depth)
The most significant issue is that the "System" is not an opponent; it's a random walker. 
- **The Issue:** The code shows the AI simply picks a random stop within its range. It doesn't attempt to dodge the player or intercept the player's path proactively.
- **Impact:** Once a player understands the mechanics, the game loses its "Chess" quality. It becomes a simple task of "catch the random dot" rather than a battle of wits.
- **Suggestion:** Implement a basic minimax or heuristic-based movement where the AI tries to maximize its distance from the player's current path or move toward a specific goal.

## 2. Information Asymmetry
The game provides perfect information. You see the System's full path and current location at all times.
- **The Issue:** There is no "hunt." In a transit-themed game about "intercepting the system," there should be an element of tracking.
- **Suggestion:** Introduce a "last seen" mechanic where the red path only updates every 2-3 moves, or give the System a "stealth" mode where it disappears for a few turns.

## 3. Piece Imbalance
- **The Issue:** The **Local Bus** (1.5km) is statistically underpowered given the scale of the Spokane map. 
- **Impact:** Players will spend 90% of the game on **Subway/LRT** or **Express**. The Local Bus only becomes relevant for the final "surgical" move.
- **Suggestion:** Give the Local Bus a special ability (e.g., "Transfer anywhere" or "Ignore line restrictions once every 5 moves") to make it a viable strategic choice rather than a range-limiter.

## 4. UI/UX Accessibility
- **The Issue:** The design uses extremely small font sizes (`text-[9px]`, `text-[8px]`).
- **Impact:** While it looks "technical" and "premium," it is a nightmare for accessibility. The "Last Update" text and "Fleet Selection" sub-labels are barely legible on standard monitors.
- **Suggestion:** Bump minimum font sizes to 12px. The "technical precision" aesthetic can be maintained through borders and spacing rather than tiny text.

## 5. Sterile Interaction
- **The Issue:** The game feels "quiet." Moving to a stop has no tactile or auditory feedback.
- **Impact:** There's no sense of momentum. 
- **Suggestion:** Add subtle transit-related sound effects (a bus bell for moves, a subway hum for LRT jumps) and map animations (pulsing the destination stop on click).

## 6. The "Stock" Leaflet Feel
- **The Issue:** Despite the beautiful custom CSS for the sidebar, the map itself feels like a standard web map.
- **Suggestion:** Use a custom "Dark Mode" or "Monochrome Blue" map tile set to match the "technical arena" vibe of the sidebar. The current light Carto tiles feel a bit too much like a generic "find a restaurant" map.
