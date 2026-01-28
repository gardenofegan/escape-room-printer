---
description: Even more puzzles to implement
---

🧩 The "Grid & Logic" Collection
1. Nonograms (Picture Cross)
The Puzzle: A grid with numbers on the top and side. The numbers tell you how many contiguous black squares are in that row/column.

Receipt Application: These are the "king" of black-and-white puzzles. You can generate a 15x15 grid. When solved correctly, the black squares form a number or a symbol (like a key or a skull).

Theme: "Restoring a corrupted image file" (Hacker) or "Revealing a hidden hieroglyph" (Egyptian).

2. Kakuro (Cross Sums)
The Puzzle: Like a crossword puzzle but with numbers. Each "word" must add up to the number provided in the clue without repeating a digit.

Receipt Application: It fits perfectly in the 80mm width.

The Code: The answer is the digit that appears in a specific "starred" box.

3. Hashiwokakero (Bridges)
The Puzzle: You have circles with numbers in them (islands). You must connect the islands with lines (bridges). The number indicates how many bridges attach to that island.

Receipt Application: It looks beautiful when printed. It forces the players to use a pen on the receipt.

The Code: Once all bridges are drawn, the number of "double bridges" used is the code.

🔡 The "Linguistic & Cryptic" Collection
4. The Polybius Square (Coordinates)
The Puzzle: A 5x5 grid of letters. Below it, a series of number pairs (e.g., 1-2, 4-5, 2-2).

The Goal: 1-2 corresponds to Row 1, Column 2.

The Twist: You can randomize the grid for every game so players can’t memorize it.

Theme: "Coordinate targeting" or "Grid decryption."

5. The "Drop Quote"
The Puzzle: A grid for a famous quote, with columns of letters above it. You must "drop" the letters into the correct boxes in their specific column.

Receipt Application: Because it’s vertical, it fits the "long scroll" feel of a receipt perfectly.

The Code: A specific word within the completed quote.

6. Mirror Text / Upside-Down Cryptics
The Puzzle: A block of text that looks like gibberish.

The Goal: Players must realize the text is printed in Mirror Image or Upside Down.

The Twist: On a receipt printer, you can actually print the text backward (.upsideDown(true) in ESC/POS). Players might need to hold the receipt up to a mirror or a window to read the instructions.

✂️ The "Physical & Tactile" Collection (Unique to Paper)
7. The "Scytale" (Wrap-around Cipher)
The Puzzle: A long, narrow receipt with a single line of seemingly random letters running down the side.

The Goal: The players must wrap the receipt strip around a specific object in the room (like a marker or a PVC pipe). When wrapped perfectly, the letters align to spell a word.

Implementation: Your code generates the letters with specific spacing based on the diameter of a standard prop (like the barcode scanner handle!).

8. The "Transparency Stack" (The Stencil)
The Puzzle: This requires printing two receipts.

Receipt A: A block of random "X" and "O" characters.

Receipt B: A "mask" with holes (white space) and solid black blocks.

The Goal: Players must physically lay Receipt B over Receipt A. The "holes" in the top receipt will reveal only the specific letters on the bottom receipt that form the code.

Theme: "Overlaying the star map" or "Aligning the security filters."

9. The "Edge-Match" Puzzle
The Puzzle: The printer spits out 3 small, square receipts. Each edge has half of a symbol or half of a number.

The Goal: Players must arrange the squares so all the edges match up.

The Code: Once arranged in a 3x1 or 2x2 shape, the symbols in the center form the code.

📈 The "Visual Pattern" Collection
10. Clock Face Decryption
The Puzzle: Several images of clock faces showing different times.

The Goal: Each time corresponds to a letter (e.g., 1:00 = A, 2:00 = B) or the angles of the hands point to something.

Theme: "Setting the timer" or "Aligning the tomb gears."

11. Braille / Morse Code (Tactile-to-Visual)
The Puzzle: A series of large dots (Braille) or dashes (Morse).

The Goal: A "Reference Key" is printed at the very top of the receipt, and the "Message" is at the bottom.

The Code: The translated word.

🛠 Updated Implementation Suggestion: "The Puzzle Metadata"
To make this work in your Electron app, I suggest each puzzle in your library has a requirements tag.

Type: SCYTALE | Requires: Pen, Cylinder Prop

Type: MIRROR | Requires: Reflective Surface

Type: STACK | Requires: Two-Receipt Print Trigger