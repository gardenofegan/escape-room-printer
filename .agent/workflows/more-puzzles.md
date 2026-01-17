---
description: Steps to make more puzzles
---

2. The "Substitution Cipher" (Cryptographic)
Concept: Print a short, garbled paragraph and a "Key."

The Twist: Use a "Pigpen Cipher" (visual symbols) or a "Caesar Cipher." The thermal printer is great at printing clear, custom symbols/icons.

3. The "Folding Puzzle" (Physical/Tactile)
Concept: Print a series of weird shapes and lines scattered across the receipt.

The Twist: The receipt includes instructions: "Fold at the dotted line, then align the circles." When folded correctly, the black shapes align to form numbers (e.g., "5-8-2").

4. "Micro-Text" (Observation)
Concept: A large block of text or a "Word Search."

The Twist: One single line or a few characters are printed at the printer’s smallest possible font size (font B). The players might need a magnifying glass or very sharp eyes to find the hidden code in the footer.

5. "ASCII Art Silhouette" (Pattern Recognition)
Concept: Use high-contrast ASCII art to create an image of an object in the room.

The Twist: The code is hidden "inside" the art, or the answer is simply the name of the object depicted.

6. "The Sound Wave" (Audio-Visual)
Concept: Print a visual representation of a waveform (a series of bars of different heights).

The Twist: The players have to match the "visual" barcode on the paper to a "rhythm" they hear playing from the laptop's speakers.

7. "Periodic Table Decryption" (Knowledge)
Concept: Print a string of numbers like 8 - 53 - 20.

The Twist: The receipt includes a small "Quick Reference" table (like a mini periodic table). 8=O, 53=I, 20=Ca. The code is "OICa."

Since thermal printers excel at high-contrast black-and-white text and simple line art, these classic newspaper and "brain-teaser" puzzles are perfect for your engine. They are lightweight to generate and feel very "official" when printed on a receipt.

Here is a list of additional puzzle types categorized by their logic, along with how they would look on a receipt:

---

## 🔡 Word & Letter Puzzles (The "Anagram" Class)

### 1. The Anagram / Scramble

* **The Puzzle:** A series of jumbled words.
* **The Goal:** Unscramble them to find a final keyword.
* **The Twist:** Circled letters from each unscrambled word form a final "Master Code."
* **Theme Potential:** "Decrypting intercepted communications."

### 2. The Word Ladder

* **The Puzzle:** A starting word and an ending word (e.g., COLD to WARM).
* **The Goal:** Change one letter at a time to reach the goal (COLD -> CORD -> WORD -> WORM -> WARM).
* **The Code:** The number of steps taken or a specific word in the middle.

### 3. Word Search (with a twist)

* **The Puzzle:** A standard grid of letters.
* **The Goal:** Find all the listed words.
* **The Code:** Once all words are found, the **unused letters** remaining in the grid (read left-to-right) spell out the secret code.

### 4. Rebus Puzzles (Pictograms)

* **The Puzzle:** Using the arrangement of words to represent a common phrase.
* Example: `HEAD` over `HEELS` (Head over heels).
* Example: `MAN` `BOARD` (Man overboard).


* **The Goal:** Type the common phrase or the number of letters in that phrase.

---

## 🔢 Logic & Math Puzzles (The "A=B" Class)

### 5. Symbol Math (Algebraic Substitution)

* **The Puzzle:** * `🍎 + 🍎 = 10`
* `🍎 + 🍌 = 12`
* `🍌 + 🍇 = 15`
* `🍇 = ?`


* **The Theme:** In an Egyptian theme, these are hieroglyphs of cats, beetles, and eyes. In a Hacker theme, they are Greek symbols ().

### 6. Logic Grid (Who Owns the Zebra?)

* **The Puzzle:** Three people, three colors, three pets.
* *Clue 1: The person in the Red house has a Dog.*
* *Clue 2: The person in the Blue house does not have a Cat.*


* **The Goal:** Use the clues to determine a specific fact (e.g., "What color is the house with the Hamster?").

### 7. Number Sequences (Pattern Recognition)

* **The Puzzle:** `2, 4, 8, 16, 32, __?__` or more complex Fibonacci-style strings.
* **The Code:** The next number in the sequence.

### 8. Sudoku (Mini Version)

* **The Puzzle:** A  or  Sudoku grid (to fit the 80mm receipt width).
* **The Code:** The sum of the numbers in a specific row or the numbers in the four corners.

---

## 🧩 Visual & Spatial Puzzles

### 9. Spot the Difference (Text Version)

* **The Puzzle:** Two nearly identical blocks of text or ASCII art.
* **The Goal:** Find the 3 characters that are different.
* **The Code:** The different characters themselves (e.g., one has a `0` where the other has an `O`).

### 10. The "Hole-Punch" Logic

* **The Puzzle:** An image of a piece of paper being folded and then a hole being punched through it.
* **The Goal:** Identify which image (A, B, or C) shows what the paper looks like when unfolded.

### 11. 3D Cube Fold

* **The Puzzle:** A "flattened" 2D template of a cube with symbols on each face.
* **The Goal:** Identify which 3D cube is the correct assembly.
* **The Code:** The symbol that would be "opposite" to a specific icon.

---

## 🕵️‍♂️ Riddle & Knowledge Puzzles

### 12. The "Who Am I?" Riddle

* **The Puzzle:** A classic riddle (e.g., "The more of me there is, the less you see. What am I?").
* **The Code:** The answer (e.g., `DARKNESS`).

### 13. Dictionary/Encyclopedia Look-up

* **The Puzzle:** A definition or a set of coordinates/dates.
* **The Goal:** "What word is found on page 42, 3rd paragraph, 5th word of the provided field manual?" (Requires a physical book in the room as a prop).

---

## 🛠 Updated Implementation Strategy

I recommend adding a **`puzzle_library.json`** to your coding plan. This allows the coding agent to define the logic for these puzzles once, and then you can call them within your themes.

**Example Library Structure:**

```json
{
  "type": "SYMBOL_MATH",
  "difficulty": "medium",
  "themes": ["egyptian", "hacker", "baseball"],
  "icons": {
    "egyptian": ["Anubis", "Eye", "Beetle"],
    "hacker": ["Alpha", "Beta", "Gamma"],
    "baseball": ["Bat", "Ball", "Glove"]
  }
}

```

**Would you like me to create the specific HTML/CSS template for the "Symbol Math" or "Word Search" puzzle to show how it fits on an 80mm receipt?**