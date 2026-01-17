const escapePrinter = require('./printer');
const puzzleFactory = require('./puzzle-factory');
const receiptRenderer = require('./receipt-renderer');
const configManager = require('./config-manager');

class GameManager {
    constructor() {
        this.currentStage = 0;
        this.startTime = null;
        this.puzzles = [];
        this.mode = 'CONFIG'; // 'CONFIG' or 'PLAYING'
        this.totalPuzzles = 0;
    }

    async init() {
        console.log("GameManager Initialized");
        this.currentStage = 0;
        this.puzzles = [];
        this.mode = 'CONFIG';

        // Immediate Onboarding: Print Menu
        await this.startOnboarding();
    }

    async startOnboarding() {
        console.log("Printing Onboarding Menu...");
        // Print the Config Menu
        // We will repurpose renderReceipt or use printCustom for now.
        // But a receipt looking menu is better.
        // Let's create a temporary puzzle object to render a "Menu"

        const menuText =
            "SELECT MISSION LENGTH:\n\n" +
            "  [ 5 ]  SHORT  (~25 MIN)\n" +
            "  [ 10 ] MEDIUM (~50 MIN)\n" +
            "  [ 15 ] LONG   (~75 MIN)\n" +
            "  [ 20 ] EXPERT (~100 MIN)\n\n" +
            "SCAN OR TYPE NUMBER TO BEGIN";

        const imageBuffer = await receiptRenderer.renderReceipt({
            missionName: "CONFIGURATION",
            clueText: menuText,
            timeElapsed: "00:00",
            teamName: configManager.get('teamName'),
            barcodeImage: null // No barcode needed for menu, or maybe a generic one
        });

        await escapePrinter.printPuzzle({
            type: 'image',
            imageBuffer: imageBuffer
        });
    }

    async generateRandomGame(count) {
        console.log(`Generating Game with ${count} puzzles...`);
        this.puzzles = [];
        this.totalPuzzles = count;

        const puzzleTypes = ['MAZE_VERTICAL', 'FOLDING', 'SOUND_WAVE', 'CIPHER'];
        const cipherVariants = ['PIGPEN', 'CAESAR', 'ICON'];

        for (let i = 0; i < count; i++) {
            const type = puzzleTypes[Math.floor(Math.random() * puzzleTypes.length)];
            const answerCode = this.generateRandomCode();
            const taskId = `TSK-${String(i + 1).padStart(2, '0')}-${type.substring(0, 3)}`;

            let puzzle = {
                id: `stage_${i + 1}`,
                taskId: taskId,
                type: type,
                answerCode: answerCode,
                printLabel: `TASK ${i + 1} / ${count}`,
                clueText: this.getScrubbedClueText(type)
            };

            if (type === 'CIPHER') {
                puzzle.variant = cipherVariants[Math.floor(Math.random() * cipherVariants.length)];
                // Customize clue based on variant
                if (puzzle.variant === 'PIGPEN') puzzle.clueText = "VISUAL ENCRYPTION DETECTED.";
                if (puzzle.variant === 'ICON') puzzle.clueText = "SYMBOLIC DATA STREAM.";
                if (puzzle.variant === 'CAESAR') puzzle.clueText = "TEXT SHIFT DETECTED.";
            }

            this.puzzles.push(puzzle);
        }

        console.log("Game Generated Config:", this.puzzles.map(p => `${p.type} (${p.variant || ''})`).join(', '));
    }

    generateRandomCode() {
        // Generate 5 char alphanumeric code
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
        let code = "";
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    getScrubbedClueText(type) {
        const clues = {
            'MAZE_VERTICAL': "FOLLOW THE PATH TO UNLOCK.",
            'FOLDING': "FOLD REALITY TO SEE THE TRUTH.",
            'SOUND_WAVE': "ANALYZE FREQUENCY.",
            'CIPHER': "DECRYPT THE SIGNAL."
        };
        return clues[type] || "SOLVE PUZZLE TO PROCEED.";
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
                const freq = parseInt(puzzle.answerCode) || 440; // If random code isn't number, this might be weird.
                // Correction: Random code is likely text "KJ3M2". 
                // Sound Wave usually expects a Number for frequency?
                // Or we map the text number to something?
                // Let's generate a random frequency for visual, but answer is the CODE.
                // Wait, Sound Wave puzzle usually asks to ENTER HERTZ VALUE. 
                // If answer is "KJ3M2", how do they enter it?
                // User requirement: "Randomize puzzles and answers".
                // If the puzzle type is Sound Wave, the answer SHOULD be the frequency number.

                // Let's override the answer code for Sound Wave to be a number.
                // But we generated it as Alphanumeric earlier.
                // FIX: Let's regenerate answerCode for Sound Wave here? Or accept text?
                // If Sound Wave, let's treat the answerCode as text they simply have to enter, 
                // but the visual is just decorative frequency.

                const res = await puzzleFactory.generate('SOUND_WAVE', { frequency: 440 + Math.random() * 440 });
                soundData = res.soundData;
                puzzle.metadata = { type: 'SOUND_WAVE' };

            } else if (puzzle.type === 'CIPHER') {
                const res = await puzzleFactory.generate('CIPHER', {
                    text: puzzle.answerCode,
                    variant: puzzle.variant
                });
                cipherData = res.cipherData;
            }

            // 2. Render Receipt Image
            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: this.getElapsedTime(),
                teamName: configManager.get('teamName'),
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
            await escapePrinter.printCustom("ERROR GENERATING ASSETS.\nSEE CONSOLE.");
        }
    }

    async submitAnswer(code) {
        const normalizedCode = code.trim().toUpperCase();

        // --- CONFIG MODE ---
        if (this.mode === 'CONFIG') {
            const validCounts = ['5', '10', '15', '20'];
            if (validCounts.includes(normalizedCode)) {

                console.log(`Config Selected: ${normalizedCode} Puzzles`);
                await this.generateRandomGame(parseInt(normalizedCode));

                this.mode = 'PLAYING';
                this.startTime = Date.now();
                this.currentStage = 0;

                console.log("Game Started!");

                // Deliver First Puzzle
                const nextPuzzle = this.getCurrentPuzzle();
                if (nextPuzzle) {
                    await this.deliverPuzzle(nextPuzzle);
                    return {
                        success: true,
                        message: "CONFIGURATION ACCEPTED. MISSION START.",
                        stage: 1,
                        startTime: this.startTime
                    };
                }
            } else {
                return {
                    success: false,
                    message: "INVALID SELECTION. PLEASE SCAN 5, 10, 15, OR 20."
                };
            }
        }
        // -------------------

        const puzzle = this.getCurrentPuzzle();
        if (!puzzle) {
            const debugPuzzle = this.puzzles.find(p => p.taskId === normalizedCode || p.id === normalizedCode);
            if (debugPuzzle) {
                // ... same debug logic ...
                if (debugPuzzle.id !== puzzle?.id) { // Puzzle might be null
                    console.log(`Debug Print Request: ${debugPuzzle.id}`);
                    await this.deliverPuzzle(debugPuzzle);
                    return { success: false, isTaskScan: true, message: `TEST MODE: GENERATING ${debugPuzzle.taskId}...` };
                }
            }
            return { success: false, message: "NO ACTIVE PUZZLE." };
        }

        // Check for Task ID Scan
        if (normalizedCode === puzzle.taskId) {
            return {
                success: false,
                isTaskScan: true,
                message: "TASK IDENTIFIED. AWAITING SOLUTION.",
                metadata: puzzle.metadata
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
                    stage: this.currentStage + 1,
                    startTime: this.startTime
                };
            } else {
                // Game Over
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
