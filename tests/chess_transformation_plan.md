# Transformation Plan: From "Tron" to "Transit Chess"
**Date:** 2026-05-12
**Goal:** Align the "Board Control" mechanics with the strategic depth of Chess.

To make the game feel like Chess, we need to shift from "lines" to "pieces" and from "intersections" to "positional traps."

## 1. Multiple Pieces (The "Team")
In Chess, you have a fleet. One piece isn't enough to trap a King.
- **The Change:** Give the player **3 vehicles** at the start:
    - **2 Local Buses:** Short range (1.5km), but great for "pinning" the enemy in tight corners.
    - **1 Rapid/Express:** Long range (10km), for sweeping across the map to cut off escape routes.
- **Turn Logic:** Every turn, the player clicks one of their 3 vehicles to select it, then clicks a stop to move it.

## 2. Capture Logic (The "Checkmate")
Remove the "path crossing" win condition.
- **The Change:** You win by landing on the **Exact Stop** the System currently occupies.
- **The "Check" Mechanic:** If the System is at a stop that one of your pieces can reach in **one move**, the System is in "Check." 
- **The "Checkmate" Mechanic:** If the System is in "Check" and every stop it could move to is also "under fire" (reachable by one of your other pieces), the game is over.

## 3. The "Zone of Control" (Visualizing Danger)
Chess players see the board in terms of "controlled squares."
- **The Change:** When you select a piece, don't just show where it can move. Show the **"Danger Zone"**—highlight all stops that the System *could* move to that would result in its capture.
- **Visual:** Use a subtle red tint on stops "covered" by your fleet.

## 4. The System as a "King"
The AI needs to behave like a piece trying to survive.
- **The Change:** The AI should no longer move randomly. Its logic should be:
    1. **Avoid Capture:** If I am in "Check," find a move that is NOT in "Check."
    2. **Maximize Space:** Move toward the area of the map with the most open connections and the fewest player pieces.
- **Benefit:** This makes the player feel like they are "herding" the System into a corner.

## 5. Hub Control (The "Center" of the Board)
In Chess, controlling the center is key.
- **The Change:** Certain stops (Transit Centers) allow you to **"deploy"** a captured piece or get a bonus move.
- **Benefit:** This gives the player an objective *before* they go for the kill.

---

### Implementation Priority:
1. **Multiple Pieces:** This is the biggest change. Managing a "fleet" immediately makes it feel like a strategy game.
2. **Stop Capture:** Change the `isIntersection` check to a `targetStop === systemStop` check.
3. **AI Evasion:** Update the AI to prioritize stops that aren't "reachableStops" for the player.
