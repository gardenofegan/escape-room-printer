const bwipjs = require('bwip-js');

class PuzzleFactory {
    constructor() {
        this.generators = {
            'MAZE_VERTICAL': this.generateVerticalMaze.bind(this),
            'FOLDING': this.generateFoldingPuzzle.bind(this),
            'SOUND_WAVE': this.generateSoundWavePuzzle.bind(this),
            'CIPHER': this.generateCipherPuzzle.bind(this),
            'TEXT': this.generateTextPuzzle.bind(this)
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

    async generateCipherPuzzle(config) {
        // Substitution Cipher
        // Maps A-Z to arbitrary symbols or other logic
        const text = (config.text || "SECRET").toUpperCase();

        // Simple shift or symbol map
        // Let's use a "Symbol Map" approach assuming we have a font or unicode support.
        // For standard printer receipt, standard chars are safer. 
        // Let's do a shift cipher (Caesar) or mixed alphabet for now, 
        // OR return a "Symbol Grid" if we want to get fancy with drawing.

        // Let's stick to "Mixed Alphabet" using standard chars for safety on thermal printers,
        // unless we render as image (which we do!). Since we render to image, we can use unicode!

        // Mapping: A->Δ, B->O, C->□, etc.
        const symbols = "ΔO□◊∇⬠⬡✚✖✦★✶✸✹✺✻✼✽✾✿❀❁❂❃❄❅"; // 26ish symbols
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        let ciphertext = "";
        for (let char of text) {
            const idx = alphabet.indexOf(char);
            if (idx !== -1 && idx < symbols.length) {
                ciphertext += symbols[idx];
            } else {
                ciphertext += char; // Numbers/Spaces unchanged
            }
        }

        return {
            type: 'CIPHER',
            cipherData: {
                ciphertext,
                // Maybe provide a key at the bottom?
                // Or maybe the user has to "Hack" it (Brute force? Or previous clues?)
                // Let's provide a partial key.
                partialKey: "A=Δ, E=∇, T=✦"
            }
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
