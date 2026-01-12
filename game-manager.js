const escapePrinter = require('./printer');

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
                imagePath: "assets/puzzles/maze_01.png", // Placeholder
                clueText: "FOLLOW THE PATH. ESCAPE THE GRID.",
                printLabel: "PUZZLE_01"
            },
            {
                id: "stage_2_text",
                type: "text",
                answerCode: "7777",
                clueText: "WHAT HAS KEYS BUT CANNOT OPEN LOCKS?\n\n[ P _ _ N _ ]",
                printLabel: "RIDDLE_02"
            }
            // Add more puzzles here (crossword, logic, etc.)
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
                await escapePrinter.printPuzzle(nextPuzzle);
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
                // Determine how to handle the next puzzle
                // The printer module will handle the specifics of 'type'
                await escapePrinter.printPuzzle(nextPuzzle);

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
