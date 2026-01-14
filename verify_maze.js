const PuzzleFactory = require('./puzzle-factory');

async function run() {
    const answerText = "X7B9K2M4L1";
    const maze = await PuzzleFactory.generateVerticalMaze({ answer: answerText });
    const { width, height, cells } = maze.mazeData;
    const index = (x, y) => y * width + x;

    console.log(`Maze: ${width}x${height}`);

    // Reconstruct grid for easy access
    const gridRef = [];
    for (let i = 0; i < height; i++) gridRef[i] = [];
    cells.forEach(c => gridRef[c.y][c.x] = c);

    // 1. Find the solution path again to verify
    // We know start is (1,1) and we found endY = height-2. 
    // And determining the endX is part of the maze logic...
    // But wait, the `grid` passed to us has `isSolution` flag if I added it? 
    // I added `grid[index(p.x, p.y)].isSolution = true;` ONLY for answer chars.
    // The "isSolution" logic for the WHOLE path wasn't stored in the final output unless I modify the generator to store it,
    // OR if I added that marker for ALL solution cells. 

    // In my code:
    // `const solutionIndices = new Set(); solutionPath.forEach(...)`
    // Then I iterate `solutionPath`.
    // I did NOT set `isSolution` on every cell of the path, ONLY on the ones that got a character.
    // Wait, let's check code:
    // `if (p) { grid[...].char = answer[i]; grid[...].isSolution = true; }`
    // So I can't trivially find the full path just by `isSolution`.

    // I'll trust the generator's `grid` structure for walls/paths.
    // I need to check:
    // A) Do the characters "E", "S", "C", "A", "P", "E" appear in that order on a valid path from top to bottom?
    // B) Are there NO other characters on that specific path?

    // Let's run BFS to find *all* paths from start to bottom. 
    // Ideally there is only one "solution" path usually in a perfect maze, or at least one shortest one.
    // But `generateVerticalMaze` uses a recursive backtracker which makes a perfect maze (single path between any two points).
    // So any path from start to end is THE path.

    const startX = 1, startY = 1;
    // Find the exit (it's the one at bottom)
    let exitX = -1;
    for (let x = 0; x < width; x++) {
        if (gridRef[height - 1][x] && gridRef[height - 1][x].type === 'path') {
            exitX = x;
        }
    }

    // Actually the exit in the code is at height-1. 
    // Start DFS/BFS to trace path from (1,1) to (exitX, height-1).
    const q = [[{ x: startX, y: startY }]];
    const visited = new Set([`${startX},${startY}`]);
    let pathFound = null;

    while (q.length) {
        const path = q.shift();
        const curr = path[path.length - 1];

        if (curr.y === height - 1) {
            pathFound = path;
            break;
        }

        const dirs = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
        for (let d of dirs) {
            const nx = curr.x + d.x;
            const ny = curr.y + d.y;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const cell = gridRef[ny][nx];
                const key = `${nx},${ny}`;
                if (cell.type === 'path' && !visited.has(key)) {
                    visited.add(key);
                    q.push([...path, { x: nx, y: ny }]);
                }
            }
        }
    }

    if (!pathFound) {
        console.error("FAIL: No path found!");
        process.exit(1);
    }

    console.log("Path length: " + pathFound.length);

    // check chars on path
    let charsOnPath = [];
    let noiseOnPath = 0;

    pathFound.forEach(p => {
        const cell = gridRef[p.y][p.x];
        if (cell.char) {
            charsOnPath.push(cell.char);
            // Verify if this char is part of the answer in sequence?
            // The answer is ESCAPE. 
        }
    });

    console.log("Chars on Path: " + charsOnPath.join(''));

    if (charsOnPath.join('') !== answerText) {
        console.error(`FAIL: Expected ${answerText}, got ${charsOnPath.join('')}`);
        // It might be okay if it's missing some if path is too short? 
        // But with 45 height, path is long enough.
    } else {
        console.log("PASS: Answer text matches exactly on path.");
    }

    // Check for noise on path
    // For this, we just need to ensure that EVERY char on the path IS part of the answer sequence we just validated.
    // If charsOnPath matches answerText exactly, then there are no "extra" characters interlaced, 
    // UNLESS the answer itself has duplicates and we got lucky, but "ESCAPE" has distinct letters mostly. 
    // Actually "E" repeats. 
    // But if we got "ESCAPE", there is no "X" in between. So no noise.

    // Check noise elsewhere
    let totalCells = width * height;
    let pathSet = new Set(pathFound.map(p => `${p.x},${p.y}`));
    let noiseCount = 0;
    let nonPathCount = 0;

    cells.forEach(c => {
        const key = `${c.x},${c.y}`;
        if (!pathSet.has(key) && c.type === 'path') {
            nonPathCount++;
            if (c.char) noiseCount++;
        }
    });

    console.log(`Noise stats: ${noiseCount} noise chars in ${nonPathCount} non-solution path cells.`);
    const noiseRate = noiseCount / nonPathCount;
    console.log(`Noise Rate: ${(noiseRate * 100).toFixed(2)}%`);

    if (noiseRate > 0.10) {
        console.error("FAIL: Noise rate too high (expected < 10%)");
    } else {
        console.log("PASS: Noise rate acceptable.");
    }

}

run();
