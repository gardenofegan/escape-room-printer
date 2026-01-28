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
            'SPOT_DIFF': this.generateSpotDiffPuzzle.bind(this)
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
        const removeCount = 6 + Math.floor(Math.random() * 3); // Remove 6-8 cells

        for (let i = 0; i < removeCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * 4);
                y = Math.floor(Math.random() * 4);
            } while (puzzle[y][x] === 0);
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
