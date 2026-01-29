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
        // Hint system
        this.hintsUsed = {}; // { puzzleId: count }
        this.maxHintsPerPuzzle = 2;
        this.hintPenaltyMs = 60000; // 1 minute per hint
        this.hintPenaltyMs = 60000; // 1 minute per hint
        this.totalHintPenalty = 0;

        // Random flavor events
        this.flavorEvents = [];
    }

    async init() {
        console.log("GameManager Initialized");
        this.currentStage = 0;
        this.puzzles = [];
        this.mode = 'CONFIG';
        // Menu will be displayed in console by renderer, not printed
        // Menu will be displayed in console by renderer, not printed
        this.pendingRevealConfirmation = false;

        // Clear any pending flavor events from previous run
        this.flavorEvents.forEach(id => clearTimeout(id));
        this.flavorEvents = [];
    }

    // Returns menu text for console display (called by renderer via IPC)
    getMenuText() {
        return [
            "╔═══════════════════════════════╗",
            "║     SELECT MISSION LENGTH     ║",
            "╠═══════════════════════════════╣",
            "║  [5]  SHORT    ~25 min        ║",
            "║  [10] MEDIUM   ~50 min        ║",
            "║  [15] LONG     ~75 min        ║",
            "║  [20] EXPERT   ~100 min       ║",
            "╚═══════════════════════════════╝",
            "",
            "Type a number to begin..."
        ];
    }

    // Returns help text for console display
    getHelpText() {
        return [
            "╔═══════════════════════════════╗",
            "║       AVAILABLE COMMANDS      ║",
            "╠═══════════════════════════════╣",
            "║  HINT     - Request a clue    ║",
            "║            (+1 min penalty)   ║",
            "║  STATUS   - View progress     ║",
            "║  HELP     - Show this menu    ║",
            "║  ANSWERS  - Print answer key  ║",
            "║            (supervisor only)  ║",
            "╚═══════════════════════════════╝"
        ];
    }

    async generateRandomGame(count) {
        console.log(`Generating Game with ${count} puzzles...`);
        this.puzzles = [];
        this.totalPuzzles = count;
        this.hintsUsed = {}; // Reset hints

        // Puzzle pools by difficulty
        const puzzlePool = {
            easy: ['RIDDLE', 'FOLDING', 'NUMBER_SEQUENCE', 'ANAGRAM', 'MIRROR', 'CLOCK', 'HASHI', 'SCYTALE'],
            medium: ['MAZE_VERTICAL', 'WORD_SEARCH', 'SYMBOL_MATH', 'SPOT_DIFF', 'POLYBIUS', 'DROP_QUOTE', 'EDGE_MATCH'],
            hard: ['CIPHER', 'MINI_SUDOKU', 'ASCII', 'SOUND_WAVE', 'TACTILE', 'NONOGRAM', 'KAKURO', 'TRANSPARENCY']
        };

        const cipherVariants = ['PIGPEN', 'CAESAR', 'ICON'];

        let lastType = null;

        for (let i = 0; i < count; i++) {
            // Determine difficulty based on position (start easy, ramp up)
            let difficulty;
            const progress = i / count;
            if (progress < 0.25) difficulty = 'easy';
            else if (progress < 0.6) difficulty = 'medium';
            else difficulty = 'hard';

            // Occasionally mix in other difficulties for variety
            if (Math.random() < 0.2) {
                const allDiffs = ['easy', 'medium', 'hard'];
                difficulty = allDiffs[Math.floor(Math.random() * allDiffs.length)];
            }

            // Select type from pool, avoiding repeats
            let pool = [...puzzlePool[difficulty]];
            if (lastType && pool.includes(lastType) && pool.length > 1) {
                pool = pool.filter(t => t !== lastType);
            }
            const type = pool[Math.floor(Math.random() * pool.length)];
            lastType = type;

            // Generate answer based on puzzle type
            let finalAnswer = this.generateRandomCode();
            let puzzleConfig = {};

            // Special answer handling by type
            if (type === 'ASCII') {
                const asciiPool = ['KEY', 'LOCK', 'BOMB', 'GHOST'];
                finalAnswer = asciiPool[Math.floor(Math.random() * asciiPool.length)];
                puzzleConfig = { answer: finalAnswer };
            } else if (type === 'RIDDLE') {
                // Riddle answer is determined by the puzzle generator
                // We'll set a placeholder and update after generation
                puzzleConfig = { useRiddleAnswer: true };
                finalAnswer = 'RIDDLE_PLACEHOLDER'; // Will be replaced at delivery
            } else if (type === 'SYMBOL_MATH' || type === 'NUMBER_SEQUENCE' || type === 'MINI_SUDOKU') {
                // Numeric answers - will be set at generation time
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'NUMERIC_PLACEHOLDER';
            } else if (type === 'ANAGRAM' || type === 'WORD_SEARCH' || type === 'MICRO_TEXT') {
                // These use the random code as their answer
                puzzleConfig = { answer: finalAnswer };
            } else if (type === 'SPOT_DIFF') {
                // Answer generated at runtime
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'DIFF_PLACEHOLDER';
            } else if (type === 'MIRROR' || type === 'POLYBIUS' || type === 'TACTILE') {
                // Answer generated at runtime
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'BATCH_A_PLACEHOLDER';
            } else if (type === 'NONOGRAM' || type === 'CLOCK' || type === 'DROP_QUOTE') {
                // Answer generated at runtime
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'BATCH_B_PLACEHOLDER';
            } else if (type === 'KAKURO' || type === 'HASHI') {
                // Answer generated at runtime
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'BATCH_C_PLACEHOLDER';
            } else if (type === 'SCYTALE' || type === 'TRANSPARENCY' || type === 'EDGE_MATCH') {
                // Answer generated at runtime
                puzzleConfig = { useGeneratorAnswer: true };
                finalAnswer = 'BATCH_D_PLACEHOLDER';
            }

            const taskId = `TSK-${String(i + 1).padStart(2, '0')}-${type.substring(0, 3)}`;

            let puzzle = {
                id: `stage_${i + 1}`,
                taskId: taskId,
                type: type,
                difficulty: difficulty,
                answerCode: finalAnswer,
                printLabel: `TASK ${i + 1} / ${count}`,
                clueText: this.getScrubbedClueText(type),
                config: puzzleConfig
            };

            if (type === 'CIPHER') {
                puzzle.variant = cipherVariants[Math.floor(Math.random() * cipherVariants.length)];
                if (puzzle.variant === 'PIGPEN') puzzle.clueText = "VISUAL ENCRYPTION DETECTED.";
                if (puzzle.variant === 'ICON') puzzle.clueText = "SYMBOLIC DATA STREAM.";
                if (puzzle.variant === 'CAESAR') puzzle.clueText = "TEXT SHIFT DETECTED.";
            }

            this.puzzles.push(puzzle);
        }

        console.log("Game Generated Config:", this.puzzles.map(p => `${p.type}[${p.difficulty}]`).join(', '));
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
            'CIPHER': "DECRYPT THE SIGNAL.",
            'ASCII': "IDENTIFY THE SILHOUETTE.",
            // New puzzle types
            'WORD_SEARCH': "SEARCH FOR HIDDEN WORDS.",
            'SYMBOL_MATH': "SOLVE THE EQUATION.",
            'NUMBER_SEQUENCE': "FIND THE PATTERN.",
            'RIDDLE': "ANSWER THE RIDDLE.",
            'ANAGRAM': "UNSCRAMBLE THE MESSAGE.",
            'MINI_SUDOKU': "COMPLETE THE GRID.",
            'MICRO_TEXT': "OBSERVE CLOSELY.",
            'SPOT_DIFF': "SPOT THE DIFFERENCES.",
            'MIRROR': "REFLECT ON THIS.",
            'POLYBIUS': "DECODE COORDINATES.",
            'TACTILE': "FEEL THE CODE.",
            'NONOGRAM': "REVEAL THE IMAGE.",
            'CLOCK': "TIME WILL TELL.",
            'CLOCK': "TIME WILL TELL.",
            'DROP_QUOTE': "RESTORE THE MESSAGE.",
            'KAKURO': "SUM THE CROSSES.",
            'HASHI': "CONNECT THE ISLANDS.",
            'SCYTALE': "WRAP THE STRIP.",
            'TRANSPARENCY': "SEE THROUGH THE LAYERS.",
            'EDGE_MATCH': "ALIGN THE BORDERS."
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
            // 1. Generate Assets (Barcodes and Puzzle Data)
            const barcode = await puzzleFactory.generateBarcode(puzzle.taskId);

            // Initialize all possible data containers
            let renderData = {
                mazeData: null,
                foldingData: null,
                soundData: null,
                cipherData: null,
                asciiData: null,
                wordSearchData: null,
                symbolMathData: null,
                sequenceData: null,
                riddleData: null,
                anagramData: null,
                sudokuData: null,
                microTextData: null,
                spotDiffData: null,
                wordLadderData: null,
                rebusData: null
            };

            // Store original type before we change it
            const originalType = puzzle.type;

            // Generate puzzle-specific data
            if (originalType === 'MAZE_VERTICAL') {
                const res = await puzzleFactory.generate('MAZE_VERTICAL', { answer: puzzle.answerCode });
                renderData.mazeData = res.mazeData;

            } else if (originalType === 'FOLDING') {
                const res = await puzzleFactory.generate('FOLDING', { code: puzzle.answerCode });
                renderData.foldingData = res.foldingData;

            } else if (originalType === 'SOUND_WAVE') {
                const res = await puzzleFactory.generate('SOUND_WAVE', { frequency: 440 + Math.random() * 440 });
                renderData.soundData = res.soundData;
                puzzle.metadata = { type: 'SOUND_WAVE' };

            } else if (originalType === 'CIPHER') {
                const res = await puzzleFactory.generate('CIPHER', {
                    text: puzzle.answerCode,
                    variant: puzzle.variant
                });
                renderData.cipherData = res.cipherData;

            } else if (originalType === 'ASCII') {
                const res = await puzzleFactory.generate('ASCII', puzzle.config);
                renderData.asciiData = res.asciiData;
                // Update answer if generator determined it
                if (res.asciiData && res.asciiData.answer) {
                    puzzle.answerCode = res.asciiData.answer;
                }

            } else if (originalType === 'WORD_SEARCH') {
                const res = await puzzleFactory.generate('WORD_SEARCH', { answer: puzzle.answerCode });
                renderData.wordSearchData = res.wordSearchData;

            } else if (originalType === 'SYMBOL_MATH') {
                const res = await puzzleFactory.generate('SYMBOL_MATH', {});
                renderData.symbolMathData = res.symbolMathData;
                // Update answer from generator
                puzzle.answerCode = String(res.symbolMathData.answer);

            } else if (originalType === 'NUMBER_SEQUENCE') {
                const res = await puzzleFactory.generate('NUMBER_SEQUENCE', {});
                renderData.sequenceData = res.sequenceData;
                // Update answer from generator
                puzzle.answerCode = String(res.sequenceData.answer);

            } else if (originalType === 'RIDDLE') {
                const res = await puzzleFactory.generate('RIDDLE', {});
                renderData.riddleData = res.riddleData;
                // Update answer from generator
                puzzle.answerCode = res.riddleData.answer;

            } else if (originalType === 'ANAGRAM') {
                const res = await puzzleFactory.generate('ANAGRAM', { answer: puzzle.answerCode });
                renderData.anagramData = res.anagramData;
                // Update answer based on what was actually built
                puzzle.answerCode = res.anagramData.answer;

            } else if (originalType === 'MINI_SUDOKU') {
                const res = await puzzleFactory.generate('MINI_SUDOKU', {});
                renderData.sudokuData = res.sudokuData;
                // Update answer from generator
                puzzle.answerCode = String(res.sudokuData.answer);

            } else if (originalType === 'MICRO_TEXT') {
                const res = await puzzleFactory.generate('MICRO_TEXT', { answer: puzzle.answerCode });
                renderData.microTextData = res.microTextData;

            } else if (originalType === 'SPOT_DIFF') {
                const res = await puzzleFactory.generate('SPOT_DIFF', {});
                renderData.spotDiffData = res.spotDiffData;
                // Update answer from generator
                puzzle.answerCode = res.spotDiffData.answer;

            } else if (originalType === 'WORD_LADDER') {
                const res = await puzzleFactory.generate('WORD_LADDER', {});
                renderData.wordLadderData = res.wordLadderData;
                // Update answer from generator
                puzzle.answerCode = res.answer;

            } else if (originalType === 'REBUS') {
                const res = await puzzleFactory.generate('REBUS', {});
                renderData.rebusData = res.rebusData;
                // Update answer from generator
                puzzle.answerCode = res.answer;
            } else if (originalType === 'REBUS') {
                const res = await puzzleFactory.generate('REBUS', {});
                renderData.rebusData = res.rebusData;
                // Update answer from generator
                puzzle.answerCode = res.answer;

            } else if (originalType === 'MIRROR') {
                const res = await puzzleFactory.generateMirrorPuzzle({});
                renderData.mirrorData = res.mirrorData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'POLYBIUS') {
                const res = await puzzleFactory.generatePolybiusPuzzle({});
                renderData.polybiusData = res.polybiusData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'TACTILE') {
                const res = await puzzleFactory.generateBrailleMorsePuzzle({});
                renderData.tactileData = res.tactileData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'NONOGRAM') {
                const res = await puzzleFactory.generateNonogramPuzzle({});
                renderData.nonogramData = res.nonogramData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'CLOCK') {
                const res = await puzzleFactory.generateClockPuzzle({});
                renderData.clockData = res.clockData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'DROP_QUOTE') {
                const res = await puzzleFactory.generateDropQuotePuzzle({});
                renderData.dropQuoteData = res.dropQuoteData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'KAKURO') {
                const res = await puzzleFactory.generateKakuroPuzzle({});
                renderData.kakuroData = res.kakuroData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'HASHI') {
                const res = await puzzleFactory.generateHashiPuzzle({});
                renderData.hashiData = res.hashiData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'SCYTALE') {
                const res = await puzzleFactory.generateScytalePuzzle({});
                renderData.scytaleData = res.scytaleData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'TRANSPARENCY') {
                const res = await puzzleFactory.generateTransparencyPuzzle({});
                renderData.transparencyData = res.transparencyData;
                puzzle.answerCode = res.answer;

            } else if (originalType === 'EDGE_MATCH') {
                const res = await puzzleFactory.generateEdgeMatchPuzzle({});
                renderData.edgeMatchData = res.edgeMatchData;
                puzzle.answerCode = res.answer;
            }

            console.log(`Puzzle ${puzzle.taskId} (${originalType}): Answer = ${puzzle.answerCode}`);

            // 2. Render Receipt Image
            const imageBuffer = await receiptRenderer.renderReceipt({
                missionName: puzzle.printLabel,
                clueText: puzzle.clueText,
                timeElapsed: this.getElapsedTime(),
                teamName: configManager.get('teamName'),
                barcodeImage: barcode,
                ...renderData
            });

            // 3. Attach Buffer to Puzzle Object for Printer
            puzzle.imageBuffer = imageBuffer;
            puzzle.originalType = originalType; // Keep track of original type
            puzzle.type = 'image'; // Force printer to treat as image

            await escapePrinter.printPuzzle(puzzle);

        } catch (err) {
            console.error("Dynamic Generation Failed:", err);
            await escapePrinter.printCustom("ERROR GENERATING ASSETS.\nSEE CONSOLE.");
        }
    }

    async submitAnswer(code) {
        const normalizedCode = code.trim().toUpperCase();

        // --- ANSWER REVEAL CONFIRMATION ---
        if (this.pendingRevealConfirmation) {
            if (['Y', 'YES', 'SURE', 'OK'].includes(normalizedCode)) {
                this.pendingRevealConfirmation = false;
                return await this.revealAnswer();
            } else if (['N', 'NO', 'CANCEL'].includes(normalizedCode)) {
                this.pendingRevealConfirmation = false;
                return { success: false, message: "REQUEST CANCELLED." };
            } else {
                return {
                    success: false,
                    isHint: true, // Re-use hint display style
                    message: "WARNING: REVEALING THE ANSWER WILL BYPASS THE PUZZLE.\nARE YOU SURE? (TYPE YES or NO)"
                };
            }
        }

        // --- CONFIG MODE ---
        if (this.mode === 'CONFIG') {
            const validCounts = ['5', '10', '15', '20'];
            if (validCounts.includes(normalizedCode)) {

                console.log(`Config Selected: ${normalizedCode} Puzzles`);
                await this.generateRandomGame(parseInt(normalizedCode));

                this.mode = 'PLAYING';
                this.startTime = Date.now();
                this.currentStage = 0;
                this.pendingRevealConfirmation = false;

                console.log("Game Started!");

                // Schedule Random Flavor Events
                this.scheduleRandomEvents(parseInt(normalizedCode));

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

        // --- SPECIAL COMMANDS ---
        if (normalizedCode === 'HINT') {
            return await this.requestHint();
        }

        if (normalizedCode === 'ANSWERS' || normalizedCode === 'ANSWERSHEET') {
            return await this.printParentAnswerSheet();
        }

        if (normalizedCode === 'HELP') {
            return {
                success: true,
                isHelp: true,
                lines: this.getHelpText(),
                message: "HELP MENU"
            };
        }

        if (normalizedCode === 'STATUS') {
            const puzzle = this.getCurrentPuzzle();
            const progress = puzzle ? `Puzzle ${this.currentStage + 1} of ${this.totalPuzzles}` : "No active puzzle";
            const elapsed = this.getElapsedTime(true);
            const penalties = Math.floor(this.totalHintPenalty / 60000);

            return {
                success: true,
                isStatus: true,
                lines: [
                    "╔═══════════════════════════════╗",
                    "║         MISSION STATUS        ║",
                    "╠═══════════════════════════════╣",
                    `║  Progress: ${progress.padEnd(18)} ║`,
                    `║  Time: ${elapsed.padEnd(22)} ║`,
                    `║  Penalties: +${penalties} min${' '.repeat(14 - String(penalties).length)}║`,
                    "╚═══════════════════════════════╝"
                ],
                message: "STATUS"
            };
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
            this.pendingRevealConfirmation = false;
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

    getElapsedTime(includePenalty = true) {
        if (!this.startTime) return "00:00";
        let diff = Date.now() - this.startTime;
        if (includePenalty) {
            diff += this.totalHintPenalty;
        }
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async requestHint() {
        const puzzle = this.getCurrentPuzzle();
        if (!puzzle) {
            return { success: false, message: "NO ACTIVE PUZZLE." };
        }

        const puzzleId = puzzle.id;
        const usedCount = this.hintsUsed[puzzleId] || 0;

        if (usedCount >= this.maxHintsPerPuzzle) {
            return {
                success: false,
                message: "NO MORE HINTS AVAILABLE FOR THIS PUZZLE."
            };
        }

        // HINT 2: START REVEAL FLOW
        if (usedCount === 1) {
            this.pendingRevealConfirmation = true;
            return {
                success: true, // Treated as valid command to avoid error sound
                isHint: true, // Use warning style
                message: "WARNING: HINT 2 REVEALS THE ANSWER.\nARE YOU SURE? (TYPE YES or NO)"
            };
        }

        // HINT 1: Normal Hint
        return this.processHint(puzzleId, usedCount + 1, puzzle);
    }

    async revealAnswer() {
        const puzzle = this.getCurrentPuzzle();
        const puzzleId = puzzle.id;
        const usedCount = this.hintsUsed[puzzleId] || 0;

        // Force to max hints used
        const hintNumber = 2;

        return this.processHint(puzzleId, hintNumber, puzzle, true);
    }

    processHint(puzzleId, hintNumber, puzzle, isReveal = false) {
        // Increment hint count and add penalty
        this.hintsUsed[puzzleId] = hintNumber;
        this.totalHintPenalty += this.hintPenaltyMs;

        const timeBeforePenalty = this.getElapsedTime(false);
        const timeAfterPenalty = this.getElapsedTime(true);
        const totalPenaltyMinutes = Math.floor(this.totalHintPenalty / 60000);
        const hintsRemaining = this.maxHintsPerPuzzle - hintNumber;

        let hintText = "";
        let headerText = "";

        if (isReveal) {
            headerText = "🔓  ANSWER REVEALED  🔓";
            hintText = `THE ANSWER CODE IS: ${puzzle.answerCode}`;
        } else {
            headerText = "🔓 CLASSIFIED INTEL 🔓";
            hintText = this.generateHintForPuzzle(puzzle, hintNumber);
        }

        // Screen-only display lines (No Printing)
        const screenLines = [
            "╔═══════════════════════════════╗",
            `║   ${headerText.padEnd(27).substring(0, 27)} ║`,
            "╠═══════════════════════════════╣",
            `║ HINT ${hintNumber} of ${this.maxHintsPerPuzzle}                    ║`,
            "╠═══════════════════════════════╣",
            "",
            ...hintText.split('\n').map(l => ` ${l}`), // Indent
            "",
            "╔═══════════════════════════════╗",
            "║ ⏱️  TIME PENALTY APPLIED       ║",
            "╠═══════════════════════════════╣",
            `║ Before: ${timeBeforePenalty.padEnd(20)}  ║`,
            `║ Penalty: +1:00                ║`,
            `║ NEW TIME: ${timeAfterPenalty.padEnd(20)}║`,
            "╚═══════════════════════════════╝"
        ];

        return {
            success: true,
            isHint: true,
            penaltyMs: this.hintPenaltyMs,
            message: `HINT ${hintNumber} DELIVERED.`,
            lines: screenLines,
            hintsRemaining: hintsRemaining,
            newTime: timeAfterPenalty
        };
    }

    generateHintForPuzzle(puzzle, hintNumber) {
        const type = puzzle.originalType || puzzle.type;
        const answer = puzzle.answerCode;

        // Hint 1: General category clue
        // Hint 2: Partial answer

        const hintsByType = {
            'MAZE_VERTICAL': [
                "Follow the path from START to END. Collect letters along the way.",
                `The answer starts with: ${answer.substring(0, 2)}...`
            ],
            'FOLDING': [
                "Fold the paper at the dotted line. Align the shapes.",
                `The code has ${answer.length} characters.`
            ],
            'SOUND_WAVE': [
                "Listen to the audio pattern. Match it to the visual.",
                `Try entering the answer shown on the receipt.`
            ],
            'CIPHER': [
                "Use the decryption key provided on the receipt.",
                `The answer starts with: ${answer.substring(0, 2)}...`
            ],
            'ASCII': [
                "Look at the silhouette. What object does it represent?",
                `It's a common household object starting with '${answer[0]}'.`
            ],
            'WORD_SEARCH': [
                "Find all the listed words. The UNUSED letters spell the code.",
                `The code has ${answer.length} letters.`
            ],
            'SYMBOL_MATH': [
                "Each symbol represents a number. Solve the equations step by step.",
                `The answer is a single digit between 1 and 10.`
            ],
            'NUMBER_SEQUENCE': [
                "Look for the pattern. Is it adding? Multiplying? Something else?",
                `The answer is ${answer > 50 ? 'greater than 50' : 'less than 50'}.`
            ],
            'RIDDLE': [
                "Think about the riddle literally. What has those properties?",
                `The answer starts with '${answer[0]}' and has ${answer.length} letters.`
            ],
            'ANAGRAM': [
                "Unscramble each word. The circled letters spell the answer.",
                `The code starts with: ${answer.substring(0, 2)}...`
            ],
            'MINI_SUDOKU': [
                "Complete the grid using numbers 1-4 (each row/column has each number once).",
                `Add the four corner numbers for your answer.`
            ],
            'MICRO_TEXT': [
                "Look VERY closely. Some text is in a tiny font.",
                `Check line ${puzzle.config?.hiddenLineIndex + 1 || 'carefully'}.`
            ],
            'SPOT_DIFF': [
                "Compare the two blocks character by character.",
                `There are exactly 4 different characters to find.`
            ],
            'MIRROR': [
                "The text is backwards or inverted. Try reading it in a mirror.",
                `The answer is simply the text you see.`
            ],
            'POLYBIUS': [
                "Use the grid. The numbers are Row-Column coordinates.",
                `The first letter is at Row ${puzzle.answerCode ? '?' : '?'} Col ${puzzle.answerCode ? '?' : '?'}.`
            ],
            'TACTILE': [
                "Use the key at the top to decode the dots/dashes.",
                `The answer relates to the ${puzzle.clueText || 'code'}.`
            ],
            'NONOGRAM': [
                "The numbers tell you how many filled squares are in that row/column.",
                `When solved, the image reveals a ${puzzle.answerCode}.`
            ],
            'CLOCK': [
                "Translate the times to letters using the key (e.g. 1:00 = A).",
                `The answer code is ${puzzle.answerCode}.`
            ],
            'DROP_QUOTE': [
                "Letters fall straight down into the column below.",
                `The quote says something about ${puzzle.answerCode}.`
            ],
            'KAKURO': [
                "Numbers in a run must sum to the clue. Use 1-9 without repeats.",
                `The answer sums specific values.`
            ],
            'HASHI': [
                "Islands must be connected by 1 or 2 bridges. The number = total bridges connected.",
                `Answer = Sum of counts of specific islands? (Or simple solved value)`
            ],
            'SCYTALE': [
                "Cut the strip and wrap it spirally around a pencil or pen.",
                `The letters will align to form the word: ${puzzle.answerCode.substring(0, 2)}...`
            ],
            'TRANSPARENCY': [
                "Cut out both rectangles. Overlay them and hold up to light.",
                `The combined image reveals the word: ${puzzle.answerCode}.`
            ],
            'EDGE_MATCH': [
                "Cut out the 9 squares. Arrange them in a 3x3 grid so edges match.",
                `Look at the center row for the answer.`
            ]
        };

        const hints = hintsByType[type] || [
            "Look carefully at the puzzle for clues.",
            `The answer has ${answer.length} characters.`
        ];

        return hints[hintNumber - 1] || hints[hints.length - 1];
    }

    async scheduleRandomEvents(puzzleCount) {
        // Clear old events
        this.flavorEvents.forEach(id => clearTimeout(id));
        this.flavorEvents = [];

        let numEvents = 0;
        if (puzzleCount <= 5) numEvents = 1 + Math.floor(Math.random() * 2); // 1-2 events
        else if (puzzleCount <= 10) numEvents = 2 + Math.floor(Math.random() * 2); // 2-3 events
        else numEvents = 3 + Math.floor(Math.random() * 2); // 3-4 events

        console.log(`Scheduling ${numEvents} flavor events.`);

        // Schedule events randomly between 2 minutes and 20 minutes (or end of game guess)
        // We act like the game takes roughly 5 mins per puzzle max
        const maxTimeMs = Math.min(puzzleCount * 5 * 60 * 1000, 45 * 60 * 1000);

        for (let i = 0; i < numEvents; i++) {
            // Random time, but at least 2 mins in
            const delay = 120000 + Math.random() * (maxTimeMs - 120000);

            const timerId = setTimeout(() => {
                this.triggerFlavorEvent();
            }, delay);

            this.flavorEvents.push(timerId);
            console.log(`Flavor event scheduled for +${Math.floor(delay / 60000)}m`);
        }
    }

    async triggerFlavorEvent() {
        // Don't interrupt if we aren't playing
        if (this.mode !== 'PLAYING') return;

        console.log("Triggering Random Flavor Event...");
        try {
            const flavor = puzzleFactory.generateFlavorContent();

            // Render receipt
            const imageBuffer = await receiptRenderer.renderReceipt({
                // Minimal header/footer for flavor
                missionName: "INCOMING MESSAGE",
                timeElapsed: this.getElapsedTime(),
                teamName: configManager.get('teamName'),
                flavorData: flavor.flavorData
            });

            const flavorObj = {
                type: 'image',
                imageBuffer: imageBuffer,
                printLabel: "FLAVOR EVENT"
            };

            await escapePrinter.printPuzzle(flavorObj);

        } catch (err) {
            console.error("Failed to trigger flavor event:", err);
        }
    }

    async printParentAnswerSheet() {
        if (this.puzzles.length === 0) {
            return { success: false, message: "NO GAME CONFIGURED YET." };
        }

        let sheetContent =
            `╔═══════════════════════════╗\n` +
            `║  🔒 SUPERVISOR ANSWER KEY 🔒  ║\n` +
            `║   DO NOT SHOW TO PLAYERS   ║\n` +
            `╠═══════════════════════════╣\n`;

        for (let i = 0; i < this.puzzles.length; i++) {
            const p = this.puzzles[i];
            const type = (p.originalType || p.type).substring(0, 8).padEnd(8);
            // Note: Answer might be placeholder until puzzle is generated
            const ans = p.answerCode.includes('PLACEHOLDER') ? '(TBD)' : p.answerCode;
            sheetContent += `║ ${String(i + 1).padStart(2)}. ${type} : ${ans.padEnd(10)} ║\n`;
        }

        sheetContent +=
            `╠═══════════════════════════╣\n` +
            `║ HINTS: 2 per puzzle       ║\n` +
            `║ PENALTY: +1 min per hint  ║\n` +
            `║ TYPE 'HINT' to get help   ║\n` +
            `╚═══════════════════════════╝`;

        await escapePrinter.printCustom(sheetContent);

        return {
            success: true,
            isAnswerSheet: true,
            message: "ANSWER SHEET PRINTED."
        };
    }

    getGameStatus() {
        return {
            mode: this.mode,
            currentStage: this.currentStage,
            totalPuzzles: this.totalPuzzles,
            hintsUsed: Object.values(this.hintsUsed).reduce((a, b) => a + b, 0),
            totalHintPenalty: this.totalHintPenalty,
            elapsedTime: this.getElapsedTime(),
            puzzles: this.puzzles.map(p => ({
                id: p.id,
                type: p.originalType || p.type,
                difficulty: p.difficulty,
                hintsUsed: this.hintsUsed[p.id] || 0
            }))
        };
    }
}

module.exports = new GameManager();
