const bwipjs = require('bwip-js');

class PuzzleFactory {
    constructor() {
        this.generators = {
            'MAZE_VERTICAL': this.generateVerticalMaze.bind(this),
            'FOLDING': this.generateFoldingPuzzle.bind(this),
            'SOUND_WAVE': this.generateSoundWavePuzzle.bind(this),
            'CIPHER': this.generateCipherPuzzle.bind(this),
            'ASCII': this.generateAsciiPuzzle.bind(this),
            'TEXT': this.generateTextPuzzle.bind(this),
            // New puzzle types
            'WORD_SEARCH': this.generateWordSearchPuzzle.bind(this),
            'SYMBOL_MATH': this.generateSymbolMathPuzzle.bind(this),
            'NUMBER_SEQUENCE': this.generateNumberSequencePuzzle.bind(this),
            'RIDDLE': this.generateRiddlePuzzle.bind(this),
            'ANAGRAM': this.generateAnagramPuzzle.bind(this),
            'MINI_SUDOKU': this.generateMiniSudokuPuzzle.bind(this),
            'MICRO_TEXT': this.generateMicroTextPuzzle.bind(this),
            'SPOT_DIFF': this.generateSpotDiffPuzzle.bind(this),
            'WORD_LADDER': this.generateWordLadderPuzzle.bind(this),
            'REBUS': this.generateRebusPuzzle.bind(this)
        };
    }

    async generate(type, config = {}) {
        const generator = this.generators[type] || this.generators['TEXT'];
        return await generator(config);
    }

    // --- GENERATORS ---

    async generateVerticalMaze(config) {
        // Vertical Maze with solution path text
        const width = 21; // Odd number for better walls
        const height = 45; // Taller

        // 1. Initialize Grid
        // cell = { x, y, type: 'wall'|'path', char: '' }
        let grid = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                grid.push({ x, y, type: 'wall', char: '' });
            }
        }

        const index = (x, y) => y * width + x;
        const inBounds = (x, y) => x > 0 && x < width - 1 && y > 0 && y < height - 1;

        // 2. Generate Maze (Recursive Backtracker)
        const stack = [];
        const startX = 1;
        const startY = 1;

        grid[index(startX, startY)].type = 'path';
        stack.push({ x: startX, y: startY });

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const dirs = [
                { dx: 0, dy: -2 }, { dx: 0, dy: 2 },
                { dx: -2, dy: 0 }, { dx: 2, dy: 0 }
            ].sort(() => Math.random() - 0.5);

            let found = false;
            for (let dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                const wx = current.x + dir.dx / 2;
                const wy = current.y + dir.dy / 2;

                if (inBounds(nx, ny) && grid[index(nx, ny)].type === 'wall') {
                    grid[index(nx, ny)].type = 'path';
                    grid[index(wx, wy)].type = 'path';
                    stack.push({ x: nx, y: ny });
                    found = true;
                    break;
                }
            }
            if (!found) stack.pop();
        }

        // 3. Ensure Exit exists (force path to bottom row)
        // Find a path cell near bottom and tunnel down
        let exitX = 1;
        for (let x = 1; x < width - 1; x += 2) {
            // Try to find a low point
            if (grid[index(x, height - 2)].type === 'path') {
                exitX = x;
                break; // Found one
            }
        }

        // --- VISUAL START/END INDICATORS ---
        // Open the top wall for "Start"
        grid[index(startX, 0)].type = 'path';
        grid[index(startX, 0)].char = '↓';

        // Open the bottom wall for "End"
        grid[index(exitX, height - 1)].type = 'path';
        grid[index(exitX, height - 1)].char = '↓';
        // -----------------------------------

        // 4. Solve Maze (BFS to find shortest path to embed Answer)
        // We need a path from Top(1,1) to the specific Exit(exitX, height-2)
        const endY = height - 2;
        // Find reachable bottom cells
        // Simple BFS from Start
        const queue = [{ x: startX, y: startY, path: [] }];
        const visited = new Set();
        visited.add(`${startX},${startY}`);

        let solutionPath = [];

        while (queue.length > 0) {
            const { x, y, path } = queue.shift();
            const currentPath = [...path, { x, y }];

            // FIXED: Must target the specific exitX we chose, otherwise we might pick a different dead-end path 
            // that happens to reach the bottom row, and protect THAT path instead of the visual one.
            if (y === endY && x === exitX) {
                solutionPath = currentPath;
                break; // Found correct path to bottom exit
            }

            const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
            for (let d of dirs) {
                const nx = x + d.dx;
                const ny = y + d.dy;
                if (nx >= 0 && nx < width && ny >= 0 && ny < height &&
                    grid[index(nx, ny)].type === 'path' &&
                    !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({ x: nx, y: ny, path: currentPath });
                }
            }
        }

        // 5. Overlay Letters
        const answer = (config.answer || "SECRET").toUpperCase();
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        // Create a set of solution path indices for fast lookup
        const solutionIndices = new Set();
        solutionPath.forEach(p => solutionIndices.add(index(p.x, p.y)));

        // Place answer along the solution path
        if (solutionPath.length > 0) {
            // We want to distribute the answer characters evenly along the path.
            // We have solutionPath.length steps. We need to place answer.length chars.
            // We'll place the first char at step 0 (or slight offset) and the last near the end.

            // To ensure even spacing:
            // segmentLength = pathLength / (answerLength)
            // But we prefer to center it or just spread it out. 
            // Let's use simple interpolation indices.

            for (let i = 0; i < answer.length; i++) {
                // Calculate the target index in the path array
                // e.g. length=10, answer=3 (indices 0,1,2).
                // i=0 -> 0*9/2 = 0
                // i=1 -> 1*9/2 = 4.5 -> 4 or 5
                // i=2 -> 2*9/2 = 9
                // Use a slight margin to avoid right at start/end if possible, or just exact math.

                // Let's try to pad start/end slightly if there's room
                const usableLength = solutionPath.length;
                const pathIndex = Math.floor(i * (usableLength - 1) / (answer.length - 1 || 1));

                // If answer has 1 char, it goes at index 0 (or middle if we wanted). 
                // The formula above puts it at 0. Let's handle 1 char case gracefully? 
                // Using (answer.length - 1 || 1) handles length=1 -> divides by 1 -> index=0.

                const p = solutionPath[pathIndex];
                if (p) {
                    grid[index(p.x, p.y)].char = answer[i];
                    grid[index(p.x, p.y)].isSolution = true;
                }
            }
        }

        // Fill other random path slots with decoys
        for (let i = 0; i < grid.length; i++) {
            // Only place decoy if it's a path, AND it helps to verify it has no char yet
            if (grid[i].type === 'path' && !grid[i].char) {
                // CRITICAL: Ensure we do NOT place noise on the solution path
                // The solutionPath cells that didn't get an answer char should remain EMPTY.
                if (solutionIndices.has(i)) {
                    continue; // Skip solution path cells
                }

                if (Math.random() < 0.12) { // Increased noise back to 12% as requested (more noise elsewhere)
                    grid[i].char = chars[Math.floor(Math.random() * chars.length)];
                }
            }
        }

        return {
            type: 'MAZE_VERTICAL',
            mazeData: {
                width,
                height,
                cells: grid // Array of objects
            }
        };
    }

    async generateFoldingPuzzle(config) {
        // Folding Puzzle: Splits a code (e.g. 582) horizontally.
        // Returns: { type: 'FOLDING', foldingData: { topText, bottomText } }

        const code = config.code || "1234";

        // In a real implementations involving canvases, we'd slice pixels.
        // For HTML-to-Image, we can use CSS 'clip-path' or 'overflow:hidden' tricks on a font.
        // We will just return the code and handle the visual splitting in the HTML template.

        return {
            type: 'FOLDING',
            foldingData: {
                code // The template will render this twice with different crop/masks
            }
        };
    }

    async generateSoundWavePuzzle(config) {
        // Generates a visual waveform representation.
        // In a real app, this might match the audio frequency data.
        // Here we generate random bars to look scientific.

        const bars = [];
        const count = 40;
        for (let i = 0; i < count; i++) {
            // Generate a noisy sine wave look
            const val = Math.sin(i * 0.5) * 0.5 + 0.5; // 0-1 base
            const noise = (Math.random() - 0.5) * 0.4;
            let height = Math.max(0.1, Math.min(1.0, val + noise));
            bars.push(Math.floor(height * 100)); // 0-100%
        }

        return {
            type: 'SOUND_WAVE',
            soundData: {
                bars,
                frequency: config.frequency || 440, // Logic for renderer to play
                pattern: config.pattern || "loop"
            }
        };
    }

    async generateAsciiPuzzle(config) {
        // ASCII Art Silhouette
        // Returns { type: 'ASCII', asciiData: { art: string, answer: string } }

        const library = [
            {
                name: 'KEY',
                art:
                    `
   .---.
  /     \\
  |  O  |
  \\     /
   '---'
     |
     |
     |
   .-'-.
   '---'
`
            },
            {
                name: 'LOCK',
                art:
                    `
   .---.
  /  _  \\
 |  _  |
 | | | |
 |_| |_|
 |     |
 |  O  |
 |_____|
`
            },
            {
                name: 'BOMB',
                art:
                    `
      .--.
     /    \\
    |  ()  |
     \\    /
      '--'
       ||
      _||_
     /____\\
`
            },
            {
                name: 'GHOST',
                art:
                    `
   .-. 
  ( " )
   / \\
  (   )
  /   \\
 (_/ \\_)
`
            }
        ];

        // Randomly select if answer not provided
        let item = null;
        if (config.answer) {
            item = library.find(i => i.name === config.answer);
        }
        if (!item) {
            item = library[Math.floor(Math.random() * library.length)];
        }

        return {
            type: 'ASCII',
            asciiData: {
                art: item.art,
                answer: item.name
            }
        };
    }

    async generateCipherPuzzle(config) {
        // Substitution Cipher
        // config.variant: 'CAESAR' (default), 'PIGPEN', 'ICON'
        const variant = config.variant || 'CAESAR';
        const text = (config.text || "SECRET").toUpperCase();

        let cipherData = {
            variant: variant,
            text: text, // Original text for reference or fallback
            partialKey: ""
        };

        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        if (variant === 'PIGPEN') {
            // https://en.wikipedia.org/wiki/Pigpen_cipher
            // Grid 1: A-I (Grid)
            // Grid 2: J-R (Grid + Dot)
            // Grid 3: S-V (X)
            // Grid 4: W-Z (X + Dot)

            // Mapping Logic:
            // A: rb, B: lrb, C: lb ...
            // Let's define classes manually for A-Z
            const pigpenMap = {
                'A': 'pp-border-rb',
                'B': 'pp-border-lr pp-border-b', // U shape? No, U is l-b-r. Standard # is |__|, |_|, |__|
                // Standard Pigpen:
                // A B C
                // D E F
                // G H I
                'A': 'pp-border-rb', 'B': 'pp-border-lr pp-border-b', 'C': 'pp-border-lb',
                'D': 'pp-border-tb pp-border-r', 'E': 'pp-border-all', 'F': 'pp-border-tb pp-border-l',
                'G': 'pp-border-rt', 'H': 'pp-border-lr pp-border-t', 'I': 'pp-border-lt',
                // J-R (Same as above but with Dot)
                'J': 'pp-border-rb pigpen-dot', 'K': 'pp-border-lr pp-border-b pigpen-dot', 'L': 'pp-border-lb pigpen-dot',
                'M': 'pp-border-tb pp-border-r pigpen-dot', 'N': 'pp-border-all pigpen-dot', 'O': 'pp-border-tb pp-border-l pigpen-dot',
                'P': 'pp-border-rt pigpen-dot', 'Q': 'pp-border-lr pp-border-t pigpen-dot', 'R': 'pp-border-lt pigpen-dot',
                // X Shape: S T U V
                //   S   
                // T   U
                //   V
                // Wait, standard X is:
                // S \ / T
                //    X
                // U / \ V  <- This isn't quite right ascii.
                // Upper V: S, Right <: T, Left >: U, Lower ^: V

                // Let's simplified rotation:
                // S (Top V): border-r + border-b on rotated? No.
                // Let's just use specific class names we will handle in CSS or simply borders.
                // Actually easier:
                // S: V shape (bottom-right + bottom-left border on 45deg?) 
                // Let's assume we use 'pp-rotate' and set borders.
                // A box rotated 45deg:
                // Right+Bottom borders = "V" pointing down? No, that's ">" pointing right-down?
                // Let's just hardcode classes and fix CSS if needed.
                // S (Top): V shape opening UP.
                'S': 'pp-rotate pp-border-rb', // Rotated 45deg, Right+Bottom -> V pointing DOWN? 
                // If box is [] rotated 45 -> <>
                // Right border is / (bottom right), Bottom border is \ (bottom left). 
                // Together they form V pointing DOWN. So that's S? 
                // Standard: S is Top triangle. V shape opening UP? 
                // Actually, usually:
                //  S
                // T U
                //  V
                // S is the top quadrant. V shape.

                // Let's use generic names and Map correctly:
                'S': 'pp-rotate pp-border-rb', // V shape
                'T': 'pp-rotate pp-border-lb', // < shape
                'U': 'pp-rotate pp-border-rt', // > shape
                'V': 'pp-rotate pp-border-lt', // ^ shape

                // W-Z (Same + Dot)
                'W': 'pp-rotate pp-border-rb pigpen-dot',
                'X': 'pp-rotate pp-border-lb pigpen-dot',
                'Y': 'pp-rotate pp-border-rt pigpen-dot',
                'Z': 'pp-rotate pp-border-lt pigpen-dot'
            };

            // Re-map B,D,F,H correctly.
            // B is |_| shape? No, B is Bottom-Center. U shape.
            // A B C
            // D E F  --> B is surrounded by A(left) C(right) E(bottom). 
            // So B has Left, Right, Bottom borders? 
            // My previous map: 'B': 'pp-border-lr pp-border-b' -> Left+Right+Bottom. Correct (U shape).
            // D: Left Center. Top+Bottom+Right. 'D': 'pp-border-tb pp-border-r'. Correct.
            // F: Right Center. Top+Bottom+Left. 'F': 'pp-border-tb pp-border-l'. Correct.
            // H: Top Center. Left+Right+Top. 'H': 'pp-border-lr pp-border-t'. Correct.
            // E: Center. All borders. Correct.

            const symbols = [];
            for (let char of text) {
                if (pigpenMap[char]) {
                    symbols.push({ type: 'pigpen', class: pigpenMap[char], char: char });
                } else {
                    symbols.push({ type: 'text', char: char }); // Spaces, numbers
                }
            }
            cipherData.symbols = symbols;
            cipherData.partialKey = "LOOK FOR THE PATTERNS";
            cipherData.visualKey = true; // Signals template to render the cheat sheet

        } else if (variant === 'ICON') {
            // Font Awesome Mapping (Example set)
            const iconMap = {
                'A': 'fa-solid fa-anchor', 'B': 'fa-solid fa-bicycle', 'C': 'fa-solid fa-cloud',
                'D': 'fa-solid fa-diamond', 'E': 'fa-solid fa-eye', 'F': 'fa-solid fa-feather',
                'G': 'fa-solid fa-ghost', 'H': 'fa-solid fa-heart', 'I': 'fa-solid fa-ice-cream',
                'J': 'fa-solid fa-jet-fighter', 'K': 'fa-solid fa-key', 'L': 'fa-solid fa-leaf',
                'M': 'fa-solid fa-moon', 'N': 'fa-solid fa-music', 'O': 'fa-solid fa-otter', // Otter? Maybe Circle?
                'P': 'fa-solid fa-paw', 'Q': 'fa-solid fa-question', 'R': 'fa-solid fa-rocket',
                'S': 'fa-solid fa-star', 'T': 'fa-solid fa-tree', 'U': 'fa-solid fa-umbrella',
                'V': 'fa-solid fa-volcano', 'W': 'fa-solid fa-water', 'X': 'fa-solid fa-xmarks-lines',
                'Y': 'fa-solid fa-yin-yang', 'Z': 'fa-solid fa-bolt' // Z uses Bolt (Zap)
            };

            const symbols = [];
            for (let char of text) {
                if (iconMap[char]) {
                    symbols.push({ type: 'icon', class: iconMap[char], char: char });
                } else {
                    symbols.push({ type: 'text', char: char });
                }
            }
            cipherData.symbols = symbols;
            cipherData.partialKey = "A=ANCHOR, B=BIKE...";

        } else {
            // CAESAR (Default)
            // Shift +3
            const shift = 3;
            let ciphertext = "";
            for (let char of text) {
                const idx = alphabet.indexOf(char);
                if (idx !== -1) {
                    const newIdx = (idx + shift) % 26;
                    ciphertext += alphabet[newIdx];
                } else {
                    ciphertext += char;
                }
            }
            cipherData.ciphertext = ciphertext;
            cipherData.partialKey = `SHIFT +${shift}`;
        }

        return {
            type: 'CIPHER',
            cipherData: cipherData
        };
    }

    async generateTextPuzzle(config) {
        return {
            type: 'TEXT',
            textData: {
                content: config.text || "NO DATA"
            }
        };
    }

    // ========== NEW PUZZLE GENERATORS ==========

    async generateWordSearchPuzzle(config) {
        // Word Search: Find words, unused letters spell the answer
        const answer = (config.answer || "SECRET").toUpperCase();
        const gridSize = 10;

        // Words to find (themed)
        const wordBank = ['CODE', 'HACK', 'DATA', 'SCAN', 'BYTE', 'FILE', 'LOCK', 'PASS'];
        const wordsToFind = wordBank.sort(() => Math.random() - 0.5).slice(0, 4);

        // Initialize grid with answer letters first, then fill rest
        let grid = [];
        for (let i = 0; i < gridSize * gridSize; i++) {
            grid.push('');
        }

        // Place answer letters in a readable path (scattered but in order)
        const answerPositions = [];
        for (let i = 0; i < answer.length; i++) {
            let pos;
            do {
                pos = Math.floor(Math.random() * (gridSize * gridSize));
            } while (answerPositions.includes(pos) || grid[pos] !== '');
            grid[pos] = answer[i];
            answerPositions.push(pos);
        }

        // Place words in horizontal/vertical positions
        const placedWords = [];
        for (const word of wordsToFind) {
            let placed = false;
            for (let attempt = 0; attempt < 50 && !placed; attempt++) {
                const horizontal = Math.random() > 0.5;
                const startX = Math.floor(Math.random() * (horizontal ? gridSize - word.length : gridSize));
                const startY = Math.floor(Math.random() * (horizontal ? gridSize : gridSize - word.length));

                let canPlace = true;
                const positions = [];
                for (let i = 0; i < word.length; i++) {
                    const x = horizontal ? startX + i : startX;
                    const y = horizontal ? startY : startY + i;
                    const pos = y * gridSize + x;
                    if (grid[pos] !== '' && grid[pos] !== word[i]) {
                        canPlace = false;
                        break;
                    }
                    positions.push({ pos, char: word[i] });
                }

                if (canPlace) {
                    positions.forEach(p => grid[p.pos] = p.char);
                    placedWords.push(word);
                    placed = true;
                }
            }
        }

        // Fill remaining empty cells with random letters (not answer letters ideally)
        const filler = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] === '') {
                grid[i] = filler[Math.floor(Math.random() * filler.length)];
            }
        }

        return {
            type: 'WORD_SEARCH',
            wordSearchData: {
                grid: grid,
                gridSize: gridSize,
                words: placedWords,
                answerPositions: answerPositions // For hint generation
            }
        };
    }

    async generateSymbolMathPuzzle(config) {
        // Symbol Math: Solve for symbol values
        // e.g., 🍎 + 🍎 = 10, 🍎 + 🍌 = 12, solve for 🍌

        const symbols = ['🍎', '🍌', '🍇', '⭐', '🔷', '🌙'];
        const picked = symbols.sort(() => Math.random() - 0.5).slice(0, 3);

        // Generate solvable values
        const values = {
            [picked[0]]: Math.floor(Math.random() * 5) + 2, // 2-6
            [picked[1]]: Math.floor(Math.random() * 5) + 2,
            [picked[2]]: Math.floor(Math.random() * 5) + 2
        };

        // Create equations
        const equations = [
            { left: `${picked[0]} + ${picked[0]}`, right: values[picked[0]] * 2 },
            { left: `${picked[0]} + ${picked[1]}`, right: values[picked[0]] + values[picked[1]] },
            { left: `${picked[1]} + ${picked[2]}`, right: values[picked[1]] + values[picked[2]] }
        ];

        // The answer is the value of the third symbol
        const answer = values[picked[2]];
        const askSymbol = picked[2];

        return {
            type: 'SYMBOL_MATH',
            symbolMathData: {
                equations: equations,
                askSymbol: askSymbol,
                answer: answer
            }
        };
    }

    async generateNumberSequencePuzzle(config) {
        // Number Sequence: Find the pattern and next number

        const patterns = [
            { name: 'double', gen: (n, i) => n * Math.pow(2, i), start: 2, desc: 'Doubling' },
            { name: 'add3', gen: (n, i) => n + 3 * i, start: 1, desc: 'Add 3' },
            { name: 'square', gen: (n, i) => (i + 1) * (i + 1), start: 1, desc: 'Squares' },
            { name: 'fib', gen: (n, i, arr) => i < 2 ? (i + 1) : arr[i - 1] + arr[i - 2], start: 1, desc: 'Fibonacci' },
            { name: 'add5', gen: (n, i) => n + 5 * i, start: 2, desc: 'Add 5' },
            { name: 'triple', gen: (n, i) => n * Math.pow(3, i), start: 1, desc: 'Tripling' }
        ];

        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const sequence = [];

        for (let i = 0; i < 6; i++) {
            if (pattern.name === 'fib') {
                sequence.push(pattern.gen(pattern.start, i, sequence));
            } else {
                sequence.push(pattern.gen(pattern.start, i));
            }
        }

        // Show first 5, answer is 6th
        const answer = sequence[5];

        return {
            type: 'NUMBER_SEQUENCE',
            sequenceData: {
                visible: sequence.slice(0, 5),
                answer: answer,
                hint: pattern.desc
            }
        };
    }

    async generateRiddlePuzzle(config) {
        // Riddle: Classic "What am I?" riddles

        const riddles = [
            {
                text: "The more of me there is, the less you see. What am I?",
                answer: "DARKNESS"
            },
            {
                text: "I have keys but no locks. I have space but no room. You can enter but can't go inside. What am I?",
                answer: "KEYBOARD"
            },
            {
                text: "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?",
                answer: "ECHO"
            },
            {
                text: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
                answer: "MAP"
            },
            {
                text: "The more you take, the more you leave behind. What am I?",
                answer: "FOOTSTEPS"
            },
            {
                text: "I can be cracked, made, told, and played. What am I?",
                answer: "JOKE"
            },
            {
                text: "I have hands but cannot clap. What am I?",
                answer: "CLOCK"
            },
            {
                text: "I go up but never come down. What am I?",
                answer: "AGE"
            }
        ];

        const riddle = config.riddle || riddles[Math.floor(Math.random() * riddles.length)];

        return {
            type: 'RIDDLE',
            riddleData: {
                text: riddle.text,
                answer: riddle.answer
            }
        };
    }

    async generateAnagramPuzzle(config) {
        // Anagram: Unscramble words, circled letters form the code

        const answer = (config.answer || "SECRET").toUpperCase();

        // Word bank with specific letters to extract
        const wordPool = [
            { word: "PLANET", extract: 0 }, // P
            { word: "ROCKET", extract: 0 }, // R
            { word: "ESCAPE", extract: 0 }, // E
            { word: "SECOND", extract: 0 }, // S
            { word: "CASTLE", extract: 0 }, // C
            { word: "DANGER", extract: 3 }, // G
            { word: "HIDDEN", extract: 0 }, // H
            { word: "WINTER", extract: 0 }, // W
            { word: "BRONZE", extract: 0 }, // B
            { word: "MASTER", extract: 0 }, // M
            { word: "FLIGHT", extract: 0 }, // F
            { word: "ANCHOR", extract: 0 }, // A
        ];

        // Select words that can spell our answer (or use random approach)
        const selectedWords = [];
        for (let i = 0; i < Math.min(5, answer.length); i++) {
            const targetChar = answer[i];
            // Find a word containing this character
            let found = wordPool.find(w =>
                w.word.includes(targetChar) &&
                !selectedWords.find(s => s.original === w.word)
            );
            if (found) {
                const idx = found.word.indexOf(targetChar);
                selectedWords.push({
                    original: found.word,
                    scrambled: found.word.split('').sort(() => Math.random() - 0.5).join(''),
                    extractIndex: idx,
                    displayPosition: idx + 1, // 1-indexed for display
                    extractChar: targetChar
                });
            }
        }

        // Ensure we have enough words
        while (selectedWords.length < 4) {
            const w = wordPool[Math.floor(Math.random() * wordPool.length)];
            if (!selectedWords.find(s => s.original === w.word)) {
                selectedWords.push({
                    original: w.word,
                    scrambled: w.word.split('').sort(() => Math.random() - 0.5).join(''),
                    extractIndex: 0,
                    displayPosition: 1, // 1-indexed for display
                    extractChar: w.word[0]
                });
            }
        }

        // Build answer from extracted chars
        const builtAnswer = selectedWords.map(w => w.extractChar).join('');

        return {
            type: 'ANAGRAM',
            anagramData: {
                words: selectedWords,
                answer: builtAnswer
            }
        };
    }

    async generateMiniSudokuPuzzle(config) {
        // Mini 4x4 Sudoku: Answer is sum of corner values

        // Generate a solved 4x4 Sudoku
        const solved = [
            [1, 2, 3, 4],
            [3, 4, 1, 2],
            [2, 1, 4, 3],
            [4, 3, 2, 1]
        ];

        // Shuffle rows within blocks and columns within blocks for variety
        // Simple approach: swap some rows/cols
        if (Math.random() > 0.5) {
            [solved[0], solved[1]] = [solved[1], solved[0]];
            [solved[2], solved[3]] = [solved[3], solved[2]];
        }

        // Create puzzle by removing some numbers
        const puzzle = solved.map(row => [...row]);

        // CRITICAL: Always remove corners because they are the answer key
        const corners = [[0, 0], [0, 3], [3, 0], [3, 3]];
        corners.forEach(([y, x]) => puzzle[y][x] = 0);

        // Remove additional random cells to reach total 7-9 hidden cells
        const additionalRemovals = 3 + Math.floor(Math.random() * 3);

        for (let i = 0; i < additionalRemovals; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * 4);
                y = Math.floor(Math.random() * 4);
            } while (puzzle[y][x] === 0); // Find a cell not already removed
            puzzle[y][x] = 0;
        }

        // Answer is sum of corners in solved puzzle
        const answer = solved[0][0] + solved[0][3] + solved[3][0] + solved[3][3];

        return {
            type: 'MINI_SUDOKU',
            sudokuData: {
                puzzle: puzzle,
                solved: solved,
                answer: answer,
                instruction: "SUM OF CORNER VALUES"
            }
        };
    }

    async generateMicroTextPuzzle(config) {
        // Micro Text: Large block of text with tiny hidden code

        const answer = (config.answer || "SECRET").toUpperCase();

        // Generate a block of "lorem ipsum" style text
        const textLines = [
            "PROCESSING DATA STREAM... ANALYZING SECURITY PROTOCOLS...",
            "SCANNING NETWORK TRAFFIC FOR ANOMALIES...",
            "FIREWALL STATUS: ACTIVE. ENCRYPTION: ENABLED.",
            "MONITORING SYSTEM LOGS FOR UNAUTHORIZED ACCESS...",
            "DATABASE INTEGRITY CHECK: PASSED.",
            "RUNNING DIAGNOSTIC SUBROUTINES...",
            "MEMORY ALLOCATION: OPTIMAL. CPU USAGE: NORMAL."
        ];

        // Position where the tiny text will appear (line number)
        const hiddenLine = Math.floor(Math.random() * textLines.length);

        // Build blocks with hidden code info
        const blocks = textLines.map((text, idx) => ({
            text: text,
            hasHidden: idx === hiddenLine,
            hiddenCode: idx === hiddenLine ? answer : null
        }));

        return {
            type: 'MICRO_TEXT',
            microTextData: {
                blocks: blocks,
                hiddenCode: answer,
                hiddenLineIndex: hiddenLine,
                instruction: "LOOK VERY CLOSELY AT LINE " + (hiddenLine + 1)
            }
        };
    }

    async generateSpotDiffPuzzle(config) {
        // Spot the Difference: Two text blocks with N different characters

        const diffCount = 4; // Number of differences
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

        // Generate base text block
        const lineLength = 20;
        const lineCount = 6;
        let baseLines = [];

        for (let i = 0; i < lineCount; i++) {
            let line = "";
            for (let j = 0; j < lineLength; j++) {
                line += chars[Math.floor(Math.random() * chars.length)];
            }
            baseLines.push(line);
        }

        // Create modified version with differences
        const diffChars = [];
        const modifiedLines = baseLines.map(line => line.split(''));

        for (let i = 0; i < diffCount; i++) {
            let lineIdx, charIdx, newChar;
            do {
                lineIdx = Math.floor(Math.random() * lineCount);
                charIdx = Math.floor(Math.random() * lineLength);
                newChar = chars[Math.floor(Math.random() * chars.length)];
            } while (
                modifiedLines[lineIdx][charIdx] === newChar ||
                diffChars.find(d => d.line === lineIdx && d.col === charIdx)
            );

            modifiedLines[lineIdx][charIdx] = newChar;
            diffChars.push({
                line: lineIdx,
                col: charIdx,
                original: baseLines[lineIdx][charIdx],
                modified: newChar
            });
        }

        // Answer is the different characters in order of appearance
        const answer = diffChars
            .sort((a, b) => a.line * 100 + a.col - (b.line * 100 + b.col))
            .map(d => d.modified)
            .join('');

        return {
            type: 'SPOT_DIFF',
            spotDiffData: {
                blockA: baseLines,
                blockB: modifiedLines.map(l => l.join('')),
                diffCount: diffCount,
                answer: answer,
                instruction: "FIND " + diffCount + " DIFFERENCES. TYPE THE NEW CHARACTERS."
            }
        };
    }

    // ==========================================
    // WORD LADDER PUZZLE
    // Change one letter at a time to go from START to END word
    // ==========================================
    async generateWordLadderPuzzle(config) {
        // Pre-defined word ladders (start → end with steps)
        const ladders = [
            { start: 'COLD', end: 'WARM', steps: ['CORD', 'WORD', 'WORM'], answer: '4' },
            { start: 'HEAD', end: 'TAIL', steps: ['HEAL', 'TEAL', 'TELL', 'TALL'], answer: '5' },
            { start: 'HATE', end: 'LOVE', steps: ['HAVE', 'HOVE', 'HOVE'], answer: '3' },
            { start: 'LEAD', end: 'GOLD', steps: ['LOAD', 'GOAD'], answer: '3' },
            { start: 'HIDE', end: 'SEEK', steps: ['SIDE', 'SILK', 'SILL', 'SELL', 'SEAL', 'SEAM'], answer: '7' },
            { start: 'SLOW', end: 'FAST', steps: ['SLOT', 'SOOT', 'FOOT', 'FORT', 'FORE', 'FARE', 'FARE', 'FART'], answer: '3' },
            { start: 'FISH', end: 'BIRD', steps: ['FIST', 'GIST', 'GIRD'], answer: '4' },
            { start: 'LOST', end: 'FIND', steps: ['LOFT', 'LIFT', 'GIFT', 'GIST', 'FIST', 'FINK'], answer: '7' },
            { start: 'FIRE', end: 'COLD', steps: ['FIRM', 'FORM', 'FORD', 'CORD'], answer: '5' },
            { start: 'DARK', end: 'MOON', steps: ['DARN', 'DAWN', 'DOWN', 'DOON', 'BOON'], answer: '6' }
        ];

        const ladder = ladders[Math.floor(Math.random() * ladders.length)];

        return {
            answer: ladder.answer,
            wordLadderData: {
                startWord: ladder.start,
                endWord: ladder.end,
                stepCount: ladder.steps.length + 1,
                instruction: "CHANGE ONE LETTER AT A TIME",
                hint: "HOW MANY STEPS TO CLIMB?"
            }
        };
    }

    // ==========================================
    // REBUS PUZZLE
    // Visual word arrangements that represent common phrases
    // ==========================================
    async generateRebusPuzzle(config) {
        // Rebus puzzles with visual layouts
        const rebuses = [
            {
                layout: 'stacked',
                topText: 'HEAD',
                bottomText: 'HEELS',
                answer: 'HEADOVERHEELS',
                hint: 'HEAD is literally over HEELS'
            },
            {
                layout: 'split',
                leftText: 'MAN',
                rightText: 'BOARD',
                answer: 'MANOVERBOARD',
                hint: 'MAN is falling off the BOARD'
            },
            {
                layout: 'repeated',
                text: 'ROAD ROAD ROAD ROAD',
                answer: 'CROSSROADS',
                hint: 'Four roads meeting'
            },
            {
                layout: 'big_small',
                bigText: 'DEAL',
                smallText: 'big',
                answer: 'BIGDEAL',
                hint: 'One word is bigger'
            },
            {
                layout: 'stacked',
                topText: 'WEATHER',
                bottomText: 'FEELING',
                answer: 'UNDERWEATHER',
                hint: 'FEELING is under WEATHER'
            },
            {
                layout: 'crossed',
                text: 'MIND',
                subtext: 'MATTER',
                answer: 'MINDOVERMATTER',
                hint: 'MIND is over MATTER'
            },
            {
                layout: 'repeated',
                text: 'LOOK LOOK',
                answer: 'LOOKTWICE',
                hint: 'Count the LOOKs'
            },
            {
                layout: 'split',
                leftText: 'ONCE',
                rightText: 'TIME',
                subtext: 'a',
                answer: 'ONCEUPONATIME',
                hint: 'A is between words'
            },
            {
                layout: 'stacked',
                topText: 'GROUND',
                bottomText: 'FEET FEET FEET FEET FEET FEET',
                answer: 'SIXFEETUNDER',
                hint: 'Count the feet'
            },
            {
                layout: 'backwards',
                text: 'SDROW',
                answer: 'BACKWARDS',
                hint: 'Read it in reverse'
            }
        ];

        const rebus = rebuses[Math.floor(Math.random() * rebuses.length)];

        return {
            answer: rebus.answer,
            rebusData: {
                layout: rebus.layout,
                topText: rebus.topText || null,
                bottomText: rebus.bottomText || null,
                leftText: rebus.leftText || null,
                rightText: rebus.rightText || null,
                text: rebus.text || null,
                subtext: rebus.subtext || null,
                bigText: rebus.bigText || null,
                smallText: rebus.smallText || null,
                hint: rebus.hint,
                instruction: "READ THE IMAGE - TYPE THE PHRASE"
            }
        };
    }


    // --- BATCH A GENERATORS ---

    async generatePolybiusPuzzle(config) {
        const answer = (config.answer || "COORDINATES").toUpperCase().replace(/J/g, "I"); // J is usually merged with I
        const alpha = "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // No J
        const grid = [];

        // Create shuffled grid
        const shuffled = alpha.split('').sort(() => 0.5 - Math.random());
        for (let i = 0; i < 5; i++) {
            grid.push(shuffled.slice(i * 5, (i + 1) * 5));
        }

        // Generate coordinates for answer
        const coordinates = [];
        for (const char of answer) {
            const letter = char === 'J' ? 'I' : char;
            const index = shuffled.indexOf(letter);
            const row = Math.floor(index / 5) + 1;
            const col = (index % 5) + 1;
            coordinates.push(`${row}-${col}`);
        }

        return {
            type: 'POLYBIUS',
            answer: answer,
            polybiusData: {
                grid: grid,
                coordinates: coordinates.join('  '),
                instruction: "ROW THEN COLUMN"
            }
        };
    }

    async generateMirrorPuzzle(config) {
        const tasks = [
            "READ BETWEEN THE LINES",
            "REFLECTION IS KEY",
            "LOOK IN THE MIRROR",
            "ACCESS GRANTED NOW",
            "TURN IT AROUND"
        ];
        const text = config.text || tasks[Math.floor(Math.random() * tasks.length)];
        const answer = config.answer || text.replace(/\s/g, '');

        return {
            type: 'MIRROR',
            answer: answer,
            mirrorData: {
                text: text,
                instruction: "OBJECTS IN MIRROR ARE CLOSER THAN THEY APPEAR"
            }
        };
    }

    async generateBrailleMorsePuzzle(config) {
        const type = Math.random() > 0.5 ? 'BRAILLE' : 'MORSE';
        const words = ["SIGNAL", "TOUCH", "BLIND", "DOTS", "DASH", "CODE", "BEEP"];
        const answer = (config.answer || words[Math.floor(Math.random() * words.length)]).toUpperCase();

        const morseMap = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..'
        };

        const brailleMap = {
            'A': '⠁', 'B': '⠃', 'C': '⠉', 'D': '⠙', 'E': '⠑', 'F': '⠋',
            'G': '⠛', 'H': '⠓', 'I': '⠊', 'J': '⠚', 'K': '⠅', 'L': '⠇',
            'M': '⠍', 'N': '⠝', 'O': '⠕', 'P': '⠏', 'Q': '⠟', 'R': '⠗',
            'S': '⠎', 'T': '⠞', 'U': '⠥', 'V': '⠧', 'W': '⠺', 'X': '⠭',
            'Y': '⠽', 'Z': '⠵'
        };

        let encoded = "";
        if (type === 'MORSE') {
            encoded = answer.split('').map(c => morseMap[c] || c).join('   '); // Triple space for char sep
        } else {
            encoded = answer.split('').map(c => brailleMap[c] || c).join(' ');
        }

        return {
            type: 'TACTILE',
            answer: answer,
            tactileData: {
                subType: type,
                encoded: encoded,
                key: type === 'MORSE' ? 'A=.- B=-... (Morse)' : 'A=⠁ B=⠃ (Braille)', // Simplified key hint
                instruction: `DECODE THE ${type}`
            }
        };
    }


    // --- BATCH B GENERATORS ---

    async generateNonogramPuzzle(config) {
        // Predefined 10x10 shapes (0=empty, 1=filled)
        const shapes = {
            'KEY': [
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
            ],
            'BOX': [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
                [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
                [1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
                [1, 0, 0, 1, 1, 1, 1, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ]
        };

        const keys = Object.keys(shapes);
        const answer = config.answer || keys[Math.floor(Math.random() * keys.length)];
        const grid = shapes[config.answer || answer] || shapes['KEY']; // Fallback

        // Calculate Row Clues
        const rowClues = grid.map(row => {
            const clues = [];
            let currentRun = 0;
            for (const cell of row) {
                if (cell === 1) currentRun++;
                else if (currentRun > 0) {
                    clues.push(currentRun);
                    currentRun = 0;
                }
            }
            if (currentRun > 0) clues.push(currentRun);
            return clues.length > 0 ? clues : [0];
        });

        // Calculate Col Clues
        const colClues = [];
        for (let x = 0; x < 10; x++) {
            const clues = [];
            let currentRun = 0;
            for (let y = 0; y < 10; y++) {
                if (grid[y][x] === 1) currentRun++;
                else if (currentRun > 0) {
                    clues.push(currentRun);
                    currentRun = 0;
                }
            }
            if (currentRun > 0) clues.push(currentRun);
            colClues.push(clues.length > 0 ? clues : [0]);
        }

        return {
            type: 'NONOGRAM',
            answer: answer,
            nonogramData: {
                rowClues: rowClues,
                colClues: colClues,
                rows: 10,
                cols: 10,
                instruction: "SHADE THE CELLS TO REVEAL THE OBJECT"
            }
        };
    }

    async generateClockPuzzle(config) {
        const words = ["TIME", "LATE", "HOUR", "HAND", "TICK", "TOCK", "WATCH"];
        const answer = (config.answer || words[Math.floor(Math.random() * words.length)]).toUpperCase();

        // Mapping: A=1:00, B=1:15, C=1:30...
        const clocks = [];
        for (const char of answer) {
            const code = char.charCodeAt(0) - 65; // 0-25
            if (code >= 0 && code < 26) {
                // Determine hour (1-12) and minute (00, 15, 30, 45)
                // 26 letters... fits in 12 hours x 4 quarters = 48 slots easily. Use 1:00 basic mapping.
                // Or simplified: A=1:00, B=2:00... Z=2:00 (wrap)
                // Let's use 15 min increments to utilize minutes
                // A=1:00, B=1:15, C=1:30, D=1:45, E=2:00...

                const totalQuarters = code;
                let hour = Math.floor(totalQuarters / 4) + 1;
                let minute = (totalQuarters % 4) * 15;

                clocks.push({ hour, minute, char });
            }
        }

        return {
            type: 'CLOCK',
            answer: answer,
            clockData: {
                clocks: clocks,
                instruction: "1:00 = A, 1:15 = B, 1:30 = C...",
                key: "15 MINUTE INCREMENTS"
            }
        };
    }

    async generateDropQuotePuzzle(config) {
        const quotes = [
            { text: "THE TRUTH IS OUT THERE", answer: "TRUTH" },
            { text: "FOLLOW THE WHITE RABBIT", answer: "RABBIT" },
            { text: "I AM NOT A ROBOT", answer: "ROBOT" },
            { text: "HELLO WORLD", answer: "HELLO" }
        ];

        const selection = quotes[Math.floor(Math.random() * quotes.length)];
        const plainText = config.text || selection.text;
        const answer = config.answer || selection.answer;

        // Pad to width, e.g. 5 columns or wrap text
        // Let's do simple wrapping logic. 
        const cols = 6;
        const rows = Math.ceil(plainText.length / cols);
        const grid = []; // 2D array [row][col] character for solution

        for (let r = 0; r < rows; r++) {
            grid[r] = [];
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                grid[r][c] = idx < plainText.length ? plainText[idx].toUpperCase() : ' ';
            }
        }

        // Generate column piles
        const columnPiles = [];
        for (let c = 0; c < cols; c++) {
            const pile = [];
            for (let r = 0; r < rows; r++) {
                if (grid[r][c] !== ' ') {
                    pile.push(grid[r][c]);
                }
            }
            pile.sort(); // Alphabetical sort for the drop
            columnPiles.push(pile);
        }

        return {
            type: 'DROP_QUOTE',
            answer: answer,
            dropQuoteData: {
                columns: columnPiles,
                gridWidth: cols,
                gridHeight: rows,
                // Mask the grid for the player to fill in? 
                // We actually output the EMPTY grid structure with black boxes for spaces?
                // Simplification for receipt: just show empty boxes.
                instruction: "FIT THE LETTERS INTO THE GRID BELOW"
            }
        };
    }


    // --- BATCH C GENERATORS ---

    async generateKakuroPuzzle(config) {
        // Simple 5x5 Grid.
        // We'll use a fixed template of black/white cells for stability, 
        // then populate with numbers and calc sums.
        // B = Black (Clue), W = White (Input)
        // 0 = Blocked/Black
        // 1 = Input
        const layout = [
            [0, 1, 1, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 1, 0, 1, 1],
            [0, 1, 1, 1, 1],
            [0, 0, 1, 1, 0]
        ];

        // Fill with random digits 1-9
        // Naive fill: ensure rows/cols don't have dupes in runs.
        const grid = layout.map(row => row.map(cell => cell === 1 ? Math.floor(Math.random() * 9) + 1 : 0));

        // Validation & Adjustment loop (simple version)
        // Ensure no duplicates in contiguous runs
        // For this receipt game, we can be a bit loose or pre-define valid solutions.
        // Let's use a valid solved grid and mask it.
        const solved = [
            [0, 9, 4, 0, 0],
            [8, 5, 2, 1, 0],
            [3, 1, 0, 2, 6],
            [0, 7, 5, 4, 3],
            [0, 0, 1, 8, 0]
        ];

        // Randomize slightly? Swap digits safely? 
        // Maybe just rotate numbers: x = (x + shift) % 9 + 1
        const shift = Math.floor(Math.random() * 9);
        const finalGrid = solved.map(row => row.map(val => val > 0 ? ((val + shift - 1) % 9) + 1 : 0));

        // Calculate Sums
        // We need "Across" sums for rows and "Down" sums for cols.
        // Clues live in the Black cells.
        // Structure: clues[y][x] = { down: N, right: N }
        const clues = [];
        for (let y = 0; y < 5; y++) {
            clues[y] = [];
            for (let x = 0; x < 5; x++) {
                if (layout[y][x] === 0) {
                    // Check Right Run
                    let rightSum = 0;
                    if (x < 4 && layout[y][x + 1] === 1) {
                        for (let k = x + 1; k < 5; k++) {
                            if (layout[y][k] === 0) break;
                            rightSum += finalGrid[y][k];
                        }
                    }

                    // Check Down Run (Look at row below me)
                    let downSum = 0;
                    if (y < 4 && layout[y + 1][x] === 1) {
                        for (let k = y + 1; k < 5; k++) {
                            if (layout[k][x] === 0) break;
                            downSum += finalGrid[k][x];
                        }
                    }

                    if (rightSum > 0 || downSum > 0) {
                        clues[y][x] = { right: rightSum || null, down: downSum || null };
                    } else {
                        clues[y][x] = null; // Just a black block
                    }
                } else {
                    clues[y][x] = null; // Input cell
                }
            }
        }

        // Answer Mechanism: Sum of specific marked cells?
        // Let's mark 3 cells A, B, C. Answer = valueA + valueB + valueC
        // Fixed positions for reliability in this layout
        const targets = [{ y: 1, x: 1 }, { y: 2, x: 1 }, { y: 3, x: 2 }];
        const answerVal = targets.reduce((sum, t) => sum + finalGrid[t.y][t.x], 0);

        return {
            type: 'KAKURO',
            answer: String(answerVal),
            kakuroData: {
                clues: clues,
                layout: layout,
                rows: 5,
                cols: 5,
                targets: targets,
                instruction: "FILL GRID 1-9. SUMS MATCH CLUES."
            }
        };
    }

    async generateHashiPuzzle(config) {
        // Simple Hashi (Bridges)
        // 5x5 Grid. Islands = {x, y, count}.
        // Pre-defined valid layout because generating connected planar graphs is complex.

        // Layout 1
        const layout = [
            { id: 1, y: 0, x: 0, count: 2 }, { id: 2, y: 0, x: 2, count: 4 }, { id: 3, y: 0, x: 4, count: 2 },
            { id: 4, y: 2, x: 0, count: 4 }, { id: 5, y: 2, x: 2, count: 6 }, { id: 6, y: 2, x: 4, count: 3 },
            { id: 7, y: 4, x: 0, count: 2 }, { id: 8, y: 4, x: 2, count: 3 }, { id: 9, y: 4, x: 3, count: 1 }
        ];
        // Connections (implicit in counts, but used for answer validation if we wanted full logic)
        // For answer code: "Count the total number of DOUBLE lines used"
        // Or simplified: Answer is the value of the island with the most bridges? No that's given.
        // How about: Answer is the sum of Bridge Counts for islands that have only single bridges?

        // Let's define the answer as a pre-calced value or randomized variant.
        // Randomized: Flip the board horizontally or vertically?

        return {
            type: 'HASHI',
            answer: "8", // Placeholder for logic-derived answer. 
            // In a real generator, we'd solve it. Here, let's say "Count of double bridges = 4" -> 4.
            // Let's make the answer the count of the center island (variable).
            // For now: ANSWER = Sum of counts of 3 specific islands?
            // Simple: ANSWER = 12 (SUM of top row counts: 2+4+2=8. wait.)

            hashiData: {
                islands: layout,
                instruction: "CONNECT ISLANDS. NUM = BRIDGE COUNT.",
                gridSize: 5
            }
        };
    }


    // --- BATCH D GENERATORS (PHYSICAL) ---

    async generateScytalePuzzle(config) {
        // SCYTALE: Wrap text around a cylinder.
        // We simulate a strip of paper.
        // If diameter = D, circumference = C.
        // Letters are printed at interval C.
        // Or simpler: Vertical strip. Read every Nth letter.

        const phrase = config.phrase || "THE ANSWER IS";
        const answer = config.answer || "CYLINDER";

        // Strip width (simulated circumference)
        const diameter = 4; // letters width

        // Construct the strip text
        // Row 1: T . . . H . . . E . . .
        // Actually, Scytale simply writes across the wrapped strip.
        // So when unwrapped, the letters are offset by the circumference.

        const plainText = (phrase + " " + answer).toUpperCase().replace(/[^A-Z]/g, '');
        // Pad to ensure full rows
        const rows = Math.ceil(plainText.length / diameter);
        const totalLen = rows * diameter;
        const paddedText = plainText.padEnd(totalLen, 'X');

        // Transpose: to simulate the "unwrapped" strip that looks scrambled until wrapped.
        // Standard Scytale: Write in cols, read in rows (or vice versa).

        // We want the user to cut a strip and wrap it.
        // If they wrap it around a pencil (small diameter? we can provide a guide?)
        // Let's provide a visible "guide" on the receipt.
        // Actually, let's just do the "Read every Nth letter" logic visually.

        let strip = "";
        // Transpose logic
        // Original: "THISISATEST" (Dia 3)
        // Wrapped:
        // T H I
        // S I S
        // A T E
        // S T X
        //
        // Unwrapped Strip (read column by column): TSAS HITT ISEX

        let unwrapped = "";
        for (let c = 0; c < diameter; c++) {
            for (let r = 0; r < rows; r++) {
                const idx = r * diameter + c;
                unwrapped += paddedText[idx];
            }
        }

        return {
            type: 'SCYTALE',
            answer: answer,
            scytaleData: {
                strip: unwrapped,
                diameter: diameter,
                instruction: `CUT STRIP. WRAP AROUND ROD (DIA ${diameter}).`
            }
        };
    }

    async generateTransparencyPuzzle(config) {
        // TRANSPARENCY: Two layers overlay to form text.
        // Layer 1: Bottom half of letters? Or Checkboard?
        // Simple pixel font overlay.

        // Let's rely on the Renderer to do the heavy lifting of generated images?
        // The generator just needs to provide the text and the split logic?
        // Or simply: 
        // Layer A: Pixels at (x,y) if (x+y)%2==0
        // Layer B: Pixels at (x,y) if (x+y)%2==1
        // Wait, that just makes a solid block if overlaid.

        // Better: 
        // Message is "CODE".
        // Layer A has 50% of the pixels of "CODE".
        // Layer B has the other 50%.
        // Plus some noise in both?

        const answer = (config.answer || "OVERLAY").toUpperCase();

        // We will pass the text to the renderer, which will use a canvas to draw 
        // the text and split the pixels.

        return {
            type: 'TRANSPARENCY',
            answer: answer,
            transparencyData: {
                text: answer,
                instruction: "CUT BOTH. STACK TO READ."
            }
        };
    }

    async generateEdgeMatchPuzzle(config) {
        // EDGE MATCH: 3x3 Grid of Tiles.
        // Center of each edge has a symbol (half symbol).
        // Must match adjacent headers.

        // Simplified: 
        // 9 Tiles. Central 3x3 arrangement.
        // We generate the solved 3x3 grid first.

        const symbols = ['O', 'X', '+', '-', '*', '#'];

        // Generate a 3x3 grid of TILES.
        // Each Tile has [Top, Right, Bottom, Left] symbols.
        // Interior edges must match. Exterior edges are random/blank.

        const grid = [];
        for (let r = 0; r < 3; r++) {
            grid[r] = [];
            for (let c = 0; c < 3; c++) {
                grid[r][c] = { t: null, r: null, b: null, l: null, id: r * 3 + c };
            }
        }

        // Define matches
        // Vertical edges (Row 0-1, 1-2)
        for (let r = 0; r < 2; r++) {
            for (let c = 0; c < 3; c++) {
                const sym = symbols[Math.floor(Math.random() * symbols.length)];
                grid[r][c].b = sym;
                grid[r + 1][c].t = sym;
            }
        }
        // Horizontal edges (Col 0-1, 1-2)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 2; c++) {
                const sym = symbols[Math.floor(Math.random() * symbols.length)];
                grid[r][c].r = sym;
                grid[r][c + 1].l = sym;
            }
        }

        // Fill exterior with random
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (!grid[r][c].t) grid[r][c].t = symbols[Math.floor(Math.random() * symbols.length)];
                if (!grid[r][c].b) grid[r][c].b = symbols[Math.floor(Math.random() * symbols.length)];
                if (!grid[r][c].l) grid[r][c].l = symbols[Math.floor(Math.random() * symbols.length)];
                if (!grid[r][c].r) grid[r][c].r = symbols[Math.floor(Math.random() * symbols.length)];
            }
        }

        // ANSWER mechanism:
        // The center tile (1,1) is the "Core".
        // Or maybe the specific symbols at the center intersection (corners of tiles)?
        // Let's say Answer is the ID of the center tile? Too easy.
        // Let's say Answer is the sequence of symbols in the middle row?

        // Let's assign a LETTER to the CENTER of each tile.
        // Solved grid reads: 
        // A B C
        // D E F
        // G H I
        // Answer = "DEF" (Middle Row)? or "AEI" (Diagonal)?

        const possibleAnswers = ["PATH", "CORE", "FIND", "GRID", "TILE", "LOCK"];
        const finalAnswer = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];
        // Padding if answer < 9 chars?
        // Let's just put the answer in the middle row.

        // Flatten list and shuffle
        const tiles = [];
        grid.forEach(row => row.forEach(tile => tiles.push(tile)));

        // Shuffle logic would be here for the player, but we render them in a shuffled layout?
        // Or render them cut-out ready?
        // We'll render them in a 3x3 grid on paper but "scrambled" positions?
        // Or just render them in a list 1..9 and ask user to cut and assemble.

        // Let's shuffle the tiles array for rendering.
        const shuffledTiles = [...tiles].sort(() => Math.random() - 0.5);

        return {
            type: 'EDGE_MATCH',
            answer: "MATCH", // Placeholder
            edgeMatchData: {
                tiles: shuffledTiles,
                instruction: "CUT & ASSEMBLE 3x3. MATCH SYMBOLS."
            }
        };
    }

    generateFlavorContent() {
        const visualTypes = ['WAITING_GUY', 'SKELETON', 'HOURGLASS', 'COFFEE', 'ZZZ', 'TUMBLEWEED', 'ERROR_ROBOT'];

        // 30% chance of visual, 70% text
        const isVisual = Math.random() < 0.3;

        if (isVisual) {
            const visual = visualTypes[Math.floor(Math.random() * visualTypes.length)];
            let caption = "";
            let data = {};

            switch (visual) {
                case 'WAITING_GUY':
                    caption = "STILL WAITING...";
                    break;
                case 'SKELETON':
                    caption = "I'VE BEEN WAITING FOR 84 YEARS...";
                    break;
                case 'HOURGLASS':
                    caption = "TIME IS TICKING.";
                    break;
                case 'COFFEE':
                    caption = "I'M TAKING A BREAK.";
                    break;
                case 'ZZZ':
                    caption = "SYSTEM SLEEP MODE INITIATED.";
                    break;
                case 'TUMBLEWEED':
                    caption = "*WIND BLOWING*";
                    break;
                case 'ERROR_ROBOT':
                    caption = "ERROR: USER TOO SLOW.";
                    break;
            }

            return {
                type: 'FLAVOR',
                flavorData: {
                    isVisual: true,
                    visualType: visual,
                    text: caption
                }
            };
        } else {
            // Text only messages
            const messages = [
                "Seriously, what's taking so long?",
                "I've seen glaciers move faster.",
                "Did you fall asleep?",
                "I bet the other team is winning.",
                "Error: User connection too slow.",
                "Buffering genius... please wait.",
                "Are you sure you're in the right room?",
                "Have you tried turning it off and on again?",
                "I'm getting paid by the hour, so take your time.",
                "Is this the part where you solve the puzzle?",
                "System Idle... System Bored... System Juding You.",
                "I could calculate Pi to the last digit while I wait.",
                "Loading patience... [=============] 99% used.",
                "Hint: The answer is usually not 'PASSWORD'.",
                "Checking watch... oh wait, I'm a printer.",
                "Do you need a manual? Or a miracle?",
                "Status: Still waiting.",
                "Imagine if this was timed. Oh wait, it is.",
                "You scan, I print. That's the deal. I'm doing my part.",
                "Maybe try typing harder?",
                "I'm writing a novel while I wait. Ch 3: The Long Pause."
            ];

            return {
                type: 'FLAVOR',
                flavorData: {
                    isVisual: false,
                    text: messages[Math.floor(Math.random() * messages.length)]
                }
            };
        }
    }

    // Helper for Barcodes (Shared)
    async generateBarcode(text) {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer({
                bcid: 'code128',
                text: text,
                scale: 3,
                height: 10,
                includetext: true,
                textxalign: 'center',
            }, function (err, png) {
                if (err) resolve(null); // Fail graceful
                else resolve('data:image/png;base64,' + png.toString('base64'));
            });
        });
    }
}

module.exports = new PuzzleFactory();
