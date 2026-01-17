const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');
const fs = require('fs');

async function verifyAscii() {
    console.log("Starting ASCII Verification...");

    try {
        // 1. Generate specific Key
        console.log("Generating KEY...");
        const keyPuzzle = await puzzleFactory.generate('ASCII', { answer: 'KEY' });
        const keyBuffer = await receiptRenderer.renderReceipt({
            missionName: "VERIFY ASCII KEY",
            clueText: "WHAT IS THIS?",
            asciiData: keyPuzzle.asciiData,
            timeElapsed: "00:00",
            teamName: "TEST"
        });
        fs.writeFileSync('test_receipt_ascii_key.png', keyBuffer);
        console.log("Saved test_receipt_ascii_key.png");

        // 2. Generate Random
        console.log("Generating Random...");
        const randomPuzzle = await puzzleFactory.generate('ASCII', {});
        const randomBuffer = await receiptRenderer.renderReceipt({
            missionName: `VERIFY ASCII ${randomPuzzle.asciiData.answer}`,
            clueText: "IDENTIFY TARGET",
            asciiData: randomPuzzle.asciiData,
            timeElapsed: "00:00",
            teamName: "TEST"
        });
        fs.writeFileSync(`test_receipt_ascii_random.png`, randomBuffer);
        console.log(`Saved test_receipt_ascii_random.png (${randomPuzzle.asciiData.answer})`);

    } catch (err) {
        console.error("Verification Failed:", err);
    }
}

verifyAscii();
