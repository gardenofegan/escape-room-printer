console.log("Renderer loaded");

const logContainer = document.getElementById('log-container');
let inputBuffer = '';
let isScannerInput = false;
let lastKeyTime = Date.now();
let inputTimer = null;
let isLocked = false; // Prevent input while system is typing

// Thresholds
const SCANNER_CHAR_INTERVAL = 60;
const SUBMIT_WAIT_TIME = 500;

// Initial Prompt
createInputLine();

function createInputLine() {
    const line = document.createElement('div');
    line.className = 'log-entry input-line';
    line.innerHTML = '> <span id="current-input" class="input-content"></span><span id="cursor" class="cursor blinking"></span>';
    logContainer.appendChild(line);
    scrollToBottom();
}

function updateInputDisplay() {
    const inputSpan = document.getElementById('current-input');
    if (inputSpan) {
        inputSpan.textContent = inputBuffer;
    }
    scrollToBottom();
}

function lockInput() {
    isLocked = true;
    const cursor = document.getElementById('cursor');
    if (cursor) cursor.remove(); // Remove cursor from completed line

    // Remove ID from the finished input line so the new one is unique
    const inputSpan = document.getElementById('current-input');
    if (inputSpan) inputSpan.removeAttribute('id');
}

function scrollToBottom() {
    logContainer.scrollTop = logContainer.scrollHeight;
}

async function typeWriter(text, className = 'system-msg', speed = 30) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    logContainer.appendChild(entry);

    // Split by characters but keep simple for now
    for (let i = 0; i < text.length; i++) {
        entry.textContent += text.charAt(i);
        scrollToBottom();
        // Random variance for realism
        await new Promise(r => setTimeout(r, speed + Math.random() * 20));
    }
}

async function addSeparator() {
    const sep = document.createElement('div');
    sep.className = 'log-entry separator';
    sep.textContent = '----------------------------------------';
    logContainer.appendChild(sep);
    scrollToBottom();
    await new Promise(r => setTimeout(r, 100));
}

// Global Listener
window.addEventListener('keydown', async (e) => {
    if (isLocked) return;

    // CTRL+P Handling
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        lockInput();
        await typeWriter("INITIALIZING DIAGNOSTIC PRINT...", "system-msg");
        try {
            const success = await window.api.testPrint();
            await typeWriter(success ? "PRINT SUCCESSFUL." : "PRINT FAILED.", success ? "system-msg" : "error-msg");
        } catch (err) {
            console.error(err);
        }
        await addSeparator();
        inputBuffer = "";
        createInputLine();
        isLocked = false;
        return;
    }

    if (e.ctrlKey || e.altKey || e.metaKey) return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;

    // Scanner Logic
    if (inputTimer) clearTimeout(inputTimer);

    if (e.key === 'Enter') {
        if (inputBuffer.length > 0) {
            lockInput();
            processInput(inputBuffer, isScannerInput);
            inputBuffer = '';
            isScannerInput = false;
        }
    } else if (e.key === 'Backspace') {
        inputBuffer = inputBuffer.slice(0, -1);
        updateInputDisplay();
    } else if (e.key.length === 1) {
        // Scanner Detection
        if (inputBuffer.length > 0 && timeDiff < SCANNER_CHAR_INTERVAL) {
            isScannerInput = true;
        } else if (inputBuffer.length === 0) {
            isScannerInput = false;
        }

        inputBuffer += e.key;
        updateInputDisplay();

        // Auto-submit scan
        if (isScannerInput) {
            inputTimer = setTimeout(() => {
                if (inputBuffer.length > 0 && !isLocked) { // Check locked again
                    lockInput();
                    processInput(inputBuffer, true);
                    inputBuffer = '';
                    isScannerInput = false;
                }
            }, SUBMIT_WAIT_TIME);
        }
    }

    lastKeyTime = currentTime;
});

async function processInput(code, isScan) {
    isLocked = true;

    // Visual pause before processing
    await new Promise(r => setTimeout(r, 300));

    if (isScan) {
        await typeWriter("SCAN DETECTED. PROCESSING...", "scanned-msg", 10);
    } else {
        await typeWriter("VALIDATING INPUT...", "system-msg", 20);
    }

    try {
        const result = await window.api.submitCode(code);

        if (result.success) {
            await typeWriter(`ACCESS GRANTED: ${result.message}`, "system-msg", 30);
        } else {
            await typeWriter(`ACCESS DENIED: ${result.message}`, "error-msg", 30);
        }

        if (result.gameComplete) {
            await addSeparator();
            await typeWriter("SESSION COMPLETE.", "system-msg");
        } else {
            // Prepare for next input
            await addSeparator();
            createInputLine();
            isLocked = false;
        }

    } catch (err) {
        console.error("Submission Error:", err);
        await typeWriter("COMMUNICATION ERROR.", "error-msg");
        await addSeparator();
        createInputLine();
        isLocked = false;
    }
}
