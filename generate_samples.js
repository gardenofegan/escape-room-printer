/**
 * Generate sample receipt images for all puzzle types
 * Run with: node generate_samples.js
 * Output: ./samples/ directory with PNG images
 */

const fs = require('fs');
const path = require('path');
const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');

const SAMPLES_DIR = path.join(__dirname, 'samples');

// Ensure samples directory exists
if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR);
}

async function generateAllSamples() {
    console.log("Generating sample receipts for all puzzle types...\n");

    const puzzleTypes = [
        { type: 'MAZE_VERTICAL', config: { answer: 'EXIT' } },
        { type: 'FOLDING', config: { code: 'FOLD' } },
        { type: 'SOUND_WAVE', config: { frequency: 440 } },
        { type: 'CIPHER', config: { text: 'SECRET', variant: 'PIGPEN' } },
        { type: 'CIPHER', config: { text: 'CAESAR', variant: 'CAESAR' }, name: 'CIPHER_CAESAR' },
        { type: 'CIPHER', config: { text: 'ICONS', variant: 'ICON' }, name: 'CIPHER_ICON' },
        { type: 'ASCII', config: { answer: 'KEY' } },
        { type: 'WORD_SEARCH', config: { answer: 'CODE' } },
        { type: 'SYMBOL_MATH', config: {} },
        { type: 'NUMBER_SEQUENCE', config: {} },
        { type: 'RIDDLE', config: {} },
        { type: 'ANAGRAM', config: { answer: 'TEST' } },
        { type: 'MINI_SUDOKU', config: {} },
        { type: 'MICRO_TEXT', config: { answer: 'HIDDEN' } },
        { type: 'SPOT_DIFF', config: {} },
        { type: 'WORD_LADDER', config: {} },
        { type: 'REBUS', config: {} }
    ];

    for (const puzzle of puzzleTypes) {
        const typeName = puzzle.name || puzzle.type;
        console.log(`Generating: ${typeName}...`);

        try {
            // Generate puzzle data
            const result = await puzzleFactory.generate(puzzle.type, puzzle.config);

            // Build render data object
            let renderData = {
                missionName: `SAMPLE: ${typeName}`,
                clueText: `This is a sample ${typeName} puzzle.`,
                timeElapsed: "05:00",
                teamName: "TEST TEAM",
                barcodeImage: null
            };

            // Map puzzle result to render data
            if (result.mazeData) renderData.mazeData = result.mazeData;
            if (result.foldingData) renderData.foldingData = result.foldingData;
            if (result.soundData) renderData.soundData = result.soundData;
            if (result.cipherData) renderData.cipherData = result.cipherData;
            if (result.asciiData) renderData.asciiData = result.asciiData;
            if (result.wordSearchData) renderData.wordSearchData = result.wordSearchData;
            if (result.symbolMathData) renderData.symbolMathData = result.symbolMathData;
            if (result.sequenceData) renderData.sequenceData = result.sequenceData;
            if (result.riddleData) renderData.riddleData = result.riddleData;
            if (result.anagramData) renderData.anagramData = result.anagramData;
            if (result.sudokuData) renderData.sudokuData = result.sudokuData;
            if (result.microTextData) renderData.microTextData = result.microTextData;
            if (result.spotDiffData) renderData.spotDiffData = result.spotDiffData;
            if (result.wordLadderData) renderData.wordLadderData = result.wordLadderData;
            if (result.rebusData) renderData.rebusData = result.rebusData;

            // Render receipt
            const imageBuffer = await receiptRenderer.renderReceipt(renderData);

            // Save to file
            const filename = path.join(SAMPLES_DIR, `${typeName.toLowerCase()}.png`);
            fs.writeFileSync(filename, imageBuffer);
            console.log(`  ✓ Saved: ${filename}`);

        } catch (err) {
            console.error(`  ✗ Error generating ${typeName}:`, err.message);
        }
    }

    console.log("\n✅ Done! Check the ./samples/ directory for receipt images.");
}

generateAllSamples().catch(console.error);
