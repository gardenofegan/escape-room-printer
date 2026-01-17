const gameManager = require('./game-manager');
const configManager = require('./config-manager');

// Mock external dependencies to verify logic without printing/rendering errors blocking the flow
// We just want to check gameManager logic state transitions.
// However, gameManager requires puzzleFactory and receiptRenderer to verify they actually run.
// We will let them run but catch errors if file IO fails, but mostly we want to see the console output logic.

async function verifyGameFlow() {
    console.log("=== STARTING DYNAMIC GAME VERIFICATION ===");

    // 1. Init (Simulates App Start)
    await gameManager.init();

    if (gameManager.mode !== 'CONFIG') {
        console.error("FAIL: Did not start in CONFIG mode");
        return;
    }
    console.log("PASS: In CONFIG mode");

    // 2. Select 5 Puzzles
    console.log("\n--- Simulating User Input: '5' ---");
    const initRes = await gameManager.submitAnswer('5');

    if (initRes.success && gameManager.mode === 'PLAYING' && gameManager.puzzles.length === 5) {
        console.log("PASS: Game Started with 5 puzzles.");
    } else {
        console.error("FAIL: Game Start Logic", initRes);
        return;
    }

    // 3. Play through puzzles
    // We cheat by looking at gameManager.puzzles
    for (let i = 0; i < gameManager.puzzles.length; i++) {
        const puzzle = gameManager.puzzles[i];
        console.log(`\n[Stage ${i + 1}] Type: ${puzzle.type} | Answer: ${puzzle.answerCode}`);

        // Confirm Task Scan
        const scanRes = await gameManager.submitAnswer(puzzle.taskId);
        if (scanRes.isTaskScan) {
            console.log("PASS: Task ID Scan verified.");
        } else {
            console.error("FAIL: Task ID Scan failed.");
        }

        // Solve
        const solveRes = await gameManager.submitAnswer(puzzle.answerCode);
        if (solveRes.success) {
            console.log("PASS: Answer accepted. Moving to next.");
        } else {
            console.error("FAIL: Answer rejected.");
        }
    }

    console.log("\n=== VERIFICATION COMPLETE ===");
    process.exit(0);
}

verifyGameFlow();
