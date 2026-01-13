const escapePrinter = require('./printer');
const puzzleGenerator = require('./puzzle-generator');
const receiptRenderer = require('./receipt-renderer');

class GameManager {
    constructor() {
        this.currentStage = 0;
        this.startTime = null;
        this.puzzles = [
            {
                id: "stage_0_onboarding",
                type: "text",
                answerCode: "START",
                clueText: "SYSTEM INITIALIZATION REQUIRED.\nSCAN 'START' BARCODE TO BEGIN.",
                printLabel: "INIT_SEQ_01"
            },
            {
                id: "stage_1_maze",
                type: "maze",
                answerCode: "1234",
                // imagePath removed, using dynamic generation
                clueText: "FOLLOW THE PATH. ESCAPE THE GRID.",
                printLabel: "PUZZLE_01"
            },
            {
                id: "stage_procedural_maze",
                type: "maze",
                answerCode: "MAZE_SOLVED", // In a real app, this would be dynamic
                clueText: "NAVIGATE THE NETWORK LAYERS.",
                printLabel: "FIREWALL BREACH"
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
            const barcode = await puzzleGenerator.generateBarcode(puzzle.answerCode);
            let mazeData = null;

            if (puzzle.type === 'maze') {
                const maze = puzzleGenerator.generateMaze(20, 20);
                mazeData = {
                    mazeWidth: maze.width,
                    mazeCells: maze.cells
                };
            }

            // 2. Render Receipt Image
            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: this.getElapsedTime(),
                teamName: "TEAM ALPHA", // TODO: Config
                barcodeImage: barcode,
                mazeData: mazeData,
                mazeWidth: mazeData ? mazeData.mazeWidth : 0,
                mazeCells: mazeData ? mazeData.mazeCells : []
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

        // Check if game hasn't started yet and they scanned START
        if (this.currentStage === 0 && normalizedCode === 'START') {
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
                    nextPuzzleType: nextPuzzle.type
                };
            }
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
                    nextPuzzleType: nextPuzzle.type
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
