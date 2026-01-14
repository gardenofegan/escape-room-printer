const bwipjs = require('bwip-js');

class PuzzleFactory {
    constructor() {
        this.generators = {
            'MAZE_VERTICAL': this.generateVerticalMaze.bind(this),
            'FOLDING': this.generateFoldingPuzzle.bind(this),
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
        // Force connection if needed? (Usually backtracker fills well, but let's ensure)
        // Actually, just pick a valid random end point on the last valid row

        // 4. Solve Maze (BFS to find shortest path to embed Answer)
        // We need a path from Top(1,1) to some Bottom point
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

            if (y === endY) {
                solutionPath = currentPath;
                break; // Found one path to bottom
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

        // Place answer along the solution path
        if (solutionPath.length > 0) {
            // Distribute answer chars evenly along path
            // e.g. path=50 steps, answer=4 chars. Step size ~ 12.
            const step = Math.floor(solutionPath.length / (answer.length + 1));

            let charIndex = 0;
            for (let i = step; i < solutionPath.length && charIndex < answer.length; i += step) {
                const p = solutionPath[i];
                grid[index(p.x, p.y)].char = answer[charIndex];
                grid[index(p.x, p.y)].isSolution = true; // Marker for debugging if needed
                charIndex++;
            }
        }

        // Fill other random path slots with decoys
        for (let i = 0; i < grid.length; i++) {
            if (grid[i].type === 'path' && !grid[i].char) {
                if (Math.random() < 0.15) { // 15% chance of random char
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
