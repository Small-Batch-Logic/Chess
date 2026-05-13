# Improvement Proposals: Elevating Transit Chess
**Date:** 2026-05-12
**Subject:** Roadmap for Depth and Player Engagement

To transform **Board Control** from a technical demo into a compelling game, I recommend the following tiered improvements:

## 1. The "Mission" Update (High Priority)
Give the game a "Point B" to resolve the goal confusion.
- **The "High-Value Target":** At the start of the game, spawn a "Terminal" or "Airport" stop on the opposite side of the map.
- **System Goal:** The System is trying to reach that terminal.
- **Player Goal:** Intercept the System *before* it reaches the terminal.
- **Benefit:** This creates a natural "A-to-B" narrative while keeping your interception mechanic.

## 2. The "Intelligence" Update (Medium Priority)
Replace perfect information with "Transit Intelligence."
- **Fog of War:** Only show the System's location if it is within 5km of the Player.
- **Scanning:** Add a "Scanner" ability (rechargeable) that reveals the System's last 3 positions.
- **Benefit:** This turns the game into a "Hunt," making the interception feel like a hard-won victory.

## 3. The "Specialized Fleet" Update (Medium Priority)
Give the pieces unique "Transit Powers" beyond just range.
- **Local Bus:** "Short-Cut." Can move to *any* stop within 1km, even if it's not on a connected line (simulating walking/transferring).
- **Express:** "High Speed." Can move twice in one turn, but only in a straight line.
- **Subway/LRT:** "Signal Priority." Can "freeze" a nearby System move for 1 turn.
- **Benefit:** Makes the piece selection a strategic choice rather than just a distance calculation.

## 4. The "Sensory" Update (Low Priority)
Improve the "Feel" and "Juice" of the game.
- **Dynamic Camera:** Implement `map.panTo()` so the camera automatically centers between the Player and the System after each move.
- **Map Styling:** Use a dark, "Cyber-Transit" map style (e.g., Carto Dark Matter or Mapbox Studio).
- **Typography:** Increase font sizes to at least 12px for better accessibility.

## 5. The "Visual Feedback" Update (Low Priority)
Explain the win condition visually.
- **Collision Visual:** When an intersection occurs, pulse the intersection point with a large red/blue ripple before showing the modal.
- **Path Fading:** Make older parts of the path fade out over time, emphasizing the "current" chase.

---

### Suggested First Step:
Modify the System's logic so it always chooses the candidate stop that is **closest** to a randomly selected "Goal Stop" on the edge of the map. This immediately gives the player a predictable path to try and cut off.
