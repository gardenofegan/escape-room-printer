const PuzzleFactory = require('./puzzle-factory');
const ReceiptRenderer = require('./receipt-renderer');
const fs = require('fs');

async function run() {
    try {
        console.log("Generating Sound Wave Puzzle...");
        const soundPuzzle = await PuzzleFactory.generate('SOUND_WAVE', { frequency: 440 });
        console.log("Sound Data:", JSON.stringify(soundPuzzle.soundData).slice(0, 100) + "...");

        console.log("Rendering Receipt...");
        const imageBuffer = await ReceiptRenderer.renderReceipt({
            missionName: "TEST MISSION",
            clueText: "TESTING SOUND WAVE",
            timeElapsed: "00:00",
            teamName: "TESER",
            soundData: soundPuzzle.soundData
        });

        fs.writeFileSync('test_receipt_sound.png', imageBuffer);
        console.log("Success! Saved test_receipt_sound.png");

        console.log("\nGenerating Cipher Puzzle...");
        const cipherPuzzle = await PuzzleFactory.generate('CIPHER', { text: "HELLO" });
        const imageBufferCipher = await ReceiptRenderer.renderReceipt({
            missionName: "TEST CIPHER",
            clueText: "TESTING CIPHER",
            cipherData: cipherPuzzle.cipherData
        });
        fs.writeFileSync('test_receipt_cipher.png', imageBufferCipher);
        console.log("Success! Saved test_receipt_cipher.png");

        console.log("\nGenerating Folding Puzzle...");
        const foldingPuzzle = await PuzzleFactory.generate('FOLDING', { code: "1234" });
        const imageBufferFold = await ReceiptRenderer.renderReceipt({
            missionName: "TEST FOLD",
            clueText: "TESTING FOLD",
            foldingData: foldingPuzzle.foldingData
        });
        fs.writeFileSync('test_receipt_fold.png', imageBufferFold);
        console.log("Success! Saved test_receipt_fold.png");


    } catch (err) {
        console.error("Verification Failed:", err);
        process.exit(1);
    }
}

run();
