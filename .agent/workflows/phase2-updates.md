---
description: Updated workflow to kick off Phase 2 implementation
---

📝 4. Puzzle Type 
Implementation Details

This section provides specific instructions for the coding agent to build the suggested puzzle types.

Puzzle Type

Technical Approach

Vertical Labyrinth
Use a DFS (Depth First Search) algorithm on a narrow grid. Randomly place "Path Letters" on the correct solution path and "Decoy Letters" in dead ends.

Folding Puzzle
Render two halves of a number (e.g., the top and bottom of "582"). Place a dashed line marker at the exact midpoint for the player to fold.

Sound Wave
Use a library like canvas to draw a waveform. Use Web Audio API on the laptop to play a looping tone that matches the visual frequency or rhythm.

Substitution Cipher
Create a mapping object {A: "𓀀", B: "𓀁"}. For Egyptian themes, use a Hieroglyphic font; for Hacker themes, use ASCII symbols.

Folding Puzzle: Generates SVG shapes that only align when the paper is folded.

Micro-Text: Renders a word search where the secret key is set to font-size: 4px.

Verification: A test script can call PuzzleFactory.create('MAZE', {difficulty: 5}) and return a printable buffer.