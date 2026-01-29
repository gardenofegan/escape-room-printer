const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');
const fs = require('fs');
const path = require('path');

// Mock Config Manager
const configManager = {
    get: (key) => "TEST TEAM"
};

async function testBatchD() {
    console.log("Testing Batch D Puzzles...");
    const outDir = path.join(__dirname, 'test_output_d');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    const puzzles = [
        { type: 'SCYTALE', generator: puzzleFactory.generateScytalePuzzle.bind(puzzleFactory) },
        { type: 'TRANSPARENCY', generator: puzzleFactory.generateTransparencyPuzzle.bind(puzzleFactory) },
        { type: 'EDGE_MATCH', generator: puzzleFactory.generateEdgeMatchPuzzle.bind(puzzleFactory) }
    ];

    for (const p of puzzles) {
        try {
            console.log(`Generating ${p.type}...`);
            const res = await p.generator({});
            console.log(`Answer: ${res.answer}`);

            const puzzle = {
                taskId: `TEST-${p.type}`,
                printLabel: `TEST ${p.type}`,
                clueText: "TEST CLUE",
                answerCode: res.answer,
                ...res
            };

            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: "00:00",
                teamName: "TEST TEAM",
                barcodeImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                ...res // spread specific data
            });

            fs.writeFileSync(path.join(outDir, `test_${p.type.toLowerCase()}.png`), imageBuffer);
            console.log(`Saved image to test_${p.type.toLowerCase()}.png`);

        } catch (err) {
            console.error(`Failed ${p.type}:`, err);
        }
    }
}

testBatchD();
