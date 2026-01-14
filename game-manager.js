const escapePrinter = require('./printer');
const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');
const configManager = require('./config-manager');

class GameManager {
    constructor() {
        this.currentStage = 0;
        this.startTime = null;
        this.puzzles = [
            {
                id: "stage_0_onboarding",
                taskId: "START_MSN", // The barcode content
                type: "TEXT",
                answerCode: "START", // Manual override or scan start? Let's assume START can be scanned or typed.
                clueText: "SYSTEM INITIALIZATION REQUIRED.\nSCAN 'START' BARCODE TO BEGIN.",
                printLabel: "INIT_SEQ_01"
            },
            {
                id: "stage_1_maze",
                taskId: "TSK-01-MZ",
                type: "MAZE_VERTICAL",
                answerCode: "X7B9K2M4L1",
                clueText: "FOLLOW THE PATH TO UNLOCK.",
                printLabel: "LAYER 1 ACCESS"
            },
            {
                id: "stage_2_fold",
                taskId: "TSK-02-FLD",
                type: "FOLDING",
                answerCode: "5829",
                clueText: "ALIGN THE SIGNALS.\nFOLD REALITY TO SEE THE TRUTH.",
                printLabel: "SIGNAL FRAGMENTATION"
            },
            {
                id: "stage_3_sound",
                taskId: "TSK-03-SND",
                type: "SOUND_WAVE",
                answerCode: "440", // Frequency or code triggered by it
                clueText: "SIGNAL INTERCEPTED.\nSCAN TASK TO ANALYZE FREQUENCY.\nENTER HERTZ VALUE.",
                printLabel: "AUDIO ANALYSIS"
            },
            {
                id: "stage_4_cipher",
                taskId: "TSK-04-CPH",
                type: "CIPHER",
                answerCode: "ENIGMA",
                clueText: "ENCRYPTED MESSAGE RECEIVED.\nDECODE TO PROCEED.",
                printLabel: "CRYPTOGRAPHY DEPT"
            }
        ];
    }

    init() {
        console.log("GameManager Initialized");
        this.currentStage = 0;
        // Optional: Auto-print first clue? Or wait for manual trigger.
        // For now, we wait for a 'START' code to officially begin timer.
    }

    getCurrentPuzzle() {
        if (this.currentStage < this.puzzles.length) {
            return this.puzzles[this.currentStage];
        }
        return null;
    }

    async deliverPuzzle(puzzle) {
        try {
            // 1. Generate Assets (Barcodes, Mazes)
            // Use taskId for the barcode so scanning it identifies the task, but doesn't solve it.
            const barcode = await puzzleFactory.generateBarcode(puzzle.taskId);
            let mazeData = null;
            let foldingData = null;
            let soundData = null;
            let cipherData = null;

            if (puzzle.type === 'MAZE_VERTICAL') {
                const res = await puzzleFactory.generate('MAZE_VERTICAL', { answer: puzzle.answerCode });
                mazeData = res.mazeData;
            } else if (puzzle.type === 'FOLDING') {
                const res = await puzzleFactory.generate('FOLDING', { code: puzzle.answerCode });
                foldingData = res.foldingData;
            } else if (puzzle.type === 'SOUND_WAVE') {
                // If answer is "440", let's use that as frequency
                const freq = parseInt(puzzle.answerCode) || 440;
                const res = await puzzleFactory.generate('SOUND_WAVE', { frequency: freq });
                soundData = res.soundData;
                // Store frequency in puzzle object for scan retrieval?
                puzzle.metadata = { frequency: freq, type: 'SOUND_WAVE' };
            } else if (puzzle.type === 'CIPHER') {
                const res = await puzzleFactory.generate('CIPHER', { text: puzzle.answerCode });
                cipherData = res.cipherData;
            }

            // 2. Render Receipt Image
            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: this.getElapsedTime(),
                teamName: configManager.get('teamName'), // Use config
                barcodeImage: barcode,
                mazeData: mazeData,
                foldingData: foldingData,
                soundData: soundData,
                cipherData: cipherData
            });

            // 3. Attach Buffer to Puzzle Object for Printer
            puzzle.imageBuffer = imageBuffer;
            puzzle.type = 'image'; // Force printer to treat as image

            await escapePrinter.printPuzzle(puzzle);

        } catch (err) {
            console.error("Dynamic Generation Failed:", err);
            // Fallback to text
            await escapePrinter.printCustom("ERROR GENERATING ASSETS.\nSEE CONSOLE.");
        }
    }

    async submitAnswer(code) {
        // Normalize input
        const normalizedCode = code.trim().toUpperCase();

        const puzzle = this.getCurrentPuzzle();
        if (!puzzle) {
            // Even if no active puzzle, check for debug prints
            const debugPuzzle = this.puzzles.find(p => p.taskId === normalizedCode || p.id === normalizedCode);
            if (debugPuzzle) {
                await this.deliverPuzzle(debugPuzzle);
                return {
                    success: false,
                    isTaskScan: true,
                    message: "TEST MODE: PRINTING ASSET..."
                };
            }
            return {
                success: false,
                message: "NO ACTIVE PUZZLE. SYSTEM STANDBY."
            };
        }

        // DEBUG/TEST: Check if input matches ANY puzzle ID/TaskID to force print
        const testPuzzle = this.puzzles.find(p => p.taskId === normalizedCode || p.id === normalizedCode);
        if (testPuzzle && (testPuzzle.id !== puzzle.id || normalizedCode === testPuzzle.id)) {
            // Only trigger if it's explicitly a DIFFERENT puzzle 
            // OR if we used the internal ID (which isn't usually the barcode)
            // But wait, the user wants to print the specific receipt.
            // If I scan TSK-01, and I am on TSK-01, normal logic handles it (Task Identified).
            // If I scan TSK-03, and I am on TSK-01, I want to print TSK-03.

            if (testPuzzle.id !== puzzle.id) {
                console.log(`Debug Print Request: ${testPuzzle.id}`);
                await this.deliverPuzzle(testPuzzle);
                return {
                    success: false,
                    isTaskScan: true, // Reuse this to show blue message
                    message: `TEST MODE: GENERATING ${testPuzzle.taskId}...`
                };
            }
        }

        // Check if game hasn't started yet
        if (this.currentStage === 0) {
            // Allow START scan or type
            if (normalizedCode === 'START' || normalizedCode === puzzle.taskId) {
                this.startTime = Date.now();
                this.currentStage++;
                console.log("Game Started!");

                // Print the first actual puzzle (Stage 1)
                const nextPuzzle = this.getCurrentPuzzle();
                if (nextPuzzle) {
                    await this.deliverPuzzle(nextPuzzle);
                    return {
                        success: true,
                        message: "SYSTEM INITIALIZED. MISSION START.",
                        stage: this.currentStage,
                        nextPuzzleType: nextPuzzle.type,
                        startTime: this.startTime
                    };
                }
            }
        }

        // Check for Task ID Scan (Confirms user is on right receipt)
        if (normalizedCode === puzzle.taskId) {
            return {
                success: false, // Not a solve, but a confirmation
                isTaskScan: true,
                message: "TASK IDENTIFIED. AWAITING SOLUTION.",
                metadata: puzzle.metadata // Pass metadata (freq) if any
            };
        }

        // Standard answer check
        if (normalizedCode === puzzle.answerCode) {
            this.currentStage++;
            const nextPuzzle = this.getCurrentPuzzle();

            if (nextPuzzle) {
                await this.deliverPuzzle(nextPuzzle);
                return {
                    success: true,
                    message: "ACCESS GRANTED. UPLOADING NEXT DATA PACKET...",
                    stage: this.currentStage,
                    nextPuzzleType: nextPuzzle.type,
                    startTime: this.startTime
                };
            } else {
                // Game Over / Win
                await escapePrinter.printCustom("MISSION ACCOMPLISHED.\n\nTIME: " + this.getElapsedTime());
                return {
                    success: true,
                    message: "ALL SYSTEMS SECURE. YOU WIN.",
                    gameComplete: true
                };
            }
        } else {
            return {
                success: false,
                message: "ACCESS DENIED. INVALID SECURITY CODE."
            };
        }
    }

    getElapsedTime() {
        if (!this.startTime) return "00:00";
        const diff = Date.now() - this.startTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = new GameManager();
