const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');
const fs = require('fs');

async function verify() {
    console.log("Starting Cipher Verification...");

    const variants = [
        { name: 'PIGPEN', code: 'HELLO' },
        { name: 'ICON', code: 'WORLD' },
        { name: 'CAESAR', code: 'TEST' }
    ];

    for (let v of variants) {
        console.log(`Generating ${v.name}...`);
        try {
            const puzzle = await puzzleFactory.generate('CIPHER', {
                text: v.code,
                variant: v.name
            });

            const buffer = await receiptRenderer.renderReceipt({
                missionName: `VERIFY ${v.name}`,
                clueText: `VERIFICATION RECEIPT FOR ${v.name}`,
                cipherData: puzzle.cipherData,
                timeElapsed: "00:00",
                teamName: "TEST TEAM",
                barcodeImage: null // Optional
            });

            const filename = `test_receipt_${v.name.toLowerCase()}.png`;
            fs.writeFileSync(filename, buffer);
            console.log(`Saved ${filename}`);
        } catch (err) {
            console.error(`Failed to verify ${v.name}:`, err);
        }
    }

    console.log("Verification Complete.");
    process.exit(0);
}

verify();
