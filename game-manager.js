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

            if (puzzle.type === 'MAZE_VERTICAL') {
                const mazeResult = await puzzleFactory.generate('MAZE_VERTICAL', {
                    answer: puzzle.answerCode
                });
                mazeData = mazeResult.mazeData;
            }

            // 2. Render Receipt Image
            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: this.getElapsedTime(),
                teamName: configManager.get('teamName'), // Use config
                barcodeImage: barcode,
                mazeData: mazeData,
                // Redundant explicit props removed or fixed if template needed them? 
                // Template uses mazeData.width/cells directly now.
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
            return {
                success: false,
                message: "NO ACTIVE PUZZLE. SYSTEM STANDBY."
            };
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
                message: "TASK IDENTIFIED. ENTER SECURITY KEY.",
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
