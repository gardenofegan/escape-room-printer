---
description: Updated workflow to kick off Phase 2 implementation
---

Project: "Operation Receipt" – Refactor & Expansion Plan

Objective: Transform the application into a template-driven engine where puzzles, themes, and game logic are modular and easily swappable.

🏗️ 1. Architecture: The "Theme-First" Structure
To support multiple themes (Hacker, Egyptian, Halloween), we will move away from hardcoded CSS and HTML.

Step 1.1: The Theme DirectoryAction: Create a /themes directory. 
Each subfolder (e.g., /themes/matrix, /themes/pyramid) will contain:

style.css: The visual skin (fonts, colors, CRT effects vs. papyrus textures).

assets/: Theme-specific sounds and background images.

config.json: Defines theme-specific strings (e.g., "Scanning Uplink..." vs. "Translating Hieroglyphics...").

Verification: The Electron main.js reads a master settings.json and injects the chosen theme's CSS into the window on load.

🧩 2. The Dynamic Puzzle Engine
We will implement a "Component" system for puzzles, allowing you to generate receipts dynamically using HTML/Canvas.

Step 2.1: Puzzle Registry & Type Factory

Action: Create a PuzzleFactory.js that maps "Puzzle Types" to "Generator Functions."

Implementation Logic:

Vertical Maze: Uses a seed to generate a 576px wide canvas-based maze with letter overlays.

Folding Puzzle: Generates SVG shapes that only align when the paper is folded.

Micro-Text: Renders a word search where the secret key is set to font-size: 4px.

Verification: A test script can call PuzzleFactory.create('MAZE', {difficulty: 5}) and return a printable buffer.

Step 2.2: Receipt Content Layout

Action: Every receipt must now follow a standard 3-section layout:

Header: Task ID Barcode (for the UI to identify the active puzzle).

Body: The generated puzzle content (Maze, Cipher, Art).

Footer: Small hint or "Mission Status" text.

Verification: Scanning the Header Barcode updates the laptop screen to say: "Task #04 Active. Awaiting Input..."

🔁 3. Input & Validation LogicYou want the barcode to "prime" the UI and a manual entry to "solve" it.

Step 3.1: The Two-Step Validation

Action: Update the scan listener logic:Scan Event: The scanner reads the Task ID. The UI displays the input field for that specific task.

Manual Entry: The player types the word/number found on the receipt.

Validation: If input === puzzles[taskID].answer, trigger the next puzzle.

Sequential Scanning (The "Order" Puzzle):For puzzles spanning multiple receipts, the UI enters a "Multi-Scan Mode" where it waits for Barcode A, then B, then C in the specific sequence.Verification: Scan a receipt -> UI asks for a word -> Type "HIDDEN" -> Printer triggers the next task.

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

🚀 5. Execution Roadmap for Gemini Coding Assistant

Task 1: Setup the "Theme Switcher"Create the file structure for themes.Implement a CSS injector in Electron that loads the theme based on config.json.

Task 2: Build the Puzzle Generator BridgeUse html-to-image or a Canvas-to-Buffer utility.Build the "Vertical Maze" generator as the first dynamic puzzle prototype.

Task 3: Implement the Scan-to-Type LoopModify the keydown listener to distinguish between Barcode Scans (fast input) and Manual Typing (slow input).Create the "Waiting for Scan" vs. "Waiting for Input" UI states.

Task 4: Theme Content MappingCreate a content_map.json that defines which puzzles belong to which themes (e.g., the Periodic Table puzzle is disabled in the Egyptian theme, but the Cipher is enabled).