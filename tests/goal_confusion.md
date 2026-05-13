# The Goal Confusion: Why "Interception" is Muddy
**Date:** 2026-05-12
**Subject:** Conceptual Friction in Win Conditions

The feedback "I don't understand the goal of the game" is likely rooted in the mismatch between the game's **visuals** and its **logic**.

## 1. Static vs. Dynamic Interception
- **The Implementation:** You win if your current move creates a line segment that intersects *any* segment of the System's entire history (`aiChain`).
- **The Confusion:** In the real world, "intercepting" a bus implies being at the same stop at the same time. In this game, you can "intercept" a bus by crossing a street it drove down ten minutes ago.
- **The Result:** The win feels accidental. You might just be moving toward the AI, and suddenly the "CHECKMATE" screen appears because you happened to cross a dashed line from five turns ago.

## 2. The Chess Analogy Failure
- **In Chess:** You win by attacking a specific point (the King). 
- **In Board Control:** You win by attacking a *history*. Because the red dashed line stays on the map forever, the "target" keeps growing. This makes the goal feel like "scribbling over the map until you hit a red line" rather than a targeted strike.

## 3. Lack of "Capture"
- There is no sense of "taking" a piece. When you "win," the System doesn't disappear or get replaced. The screen just changes. This lacks the catharsis of a standard board game victory.

## 4. Why it doesn't feel like "Board Control"
The game is titled **Board Control**, but you aren't actually controlling the board (e.g., locking down routes, claiming territory). You are just playing "Line-Crossing."

---

### Suggestions to Fix the Goal:
1. **Time-Sensitive Interception:** You only win if you cross a segment the System created in the last **2 moves**. This forces you to actually "chase" them.
2. **Stop Capture:** Instead of lines, the goal is to occupy a stop that the System is currently at or headed toward.
3. **Territory Mode:** Change the goal to "Claiming." If you complete a "loop" (returning to a stop you've visited), you claim that territory. The goal is to claim 50% of the map.
4. **Rename the Goal:** If the goal remains "crossing lines," don't call it "Checkmate." Call it **"Network Breach"** or **"Short Circuit."**
