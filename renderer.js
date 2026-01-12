console.log("Renderer loaded");

const logContainer = document.getElementById('log-container');

function addLog(text) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = text;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

let inputBuffer = '';
let lastKeyTime = Date.now();
let inputTimer = null;
let isScannerInput = false;

// Thresholds
const SCANNER_CHAR_INTERVAL = 60; // ms: Scanners are super fast, manual typing is usually > 100ms
const SUBMIT_WAIT_TIME = 500; // ms: Wait time before auto-submitting scan

// Global Key Selection Listener
window.addEventListener('keydown', async (e) => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;

    // 1. Special Command Handling (Ctrl+P)
    // CTRL+P for print test
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        addLog('> INITIALIZING PRINT SEQUENCE...');
        try {
            const success = await window.api.testPrint();
            addLog(success ? '> PRINT SUCCESSFUL.' : '> PRINT FAILED. CHECK CONNECTION.');
        } catch (err) {
            console.error(err);
        }
        return; // Don't add to buffer
    }

    // 2. Quit handling (let the main process handle Ctrl+Q via globalShortcut, but we ignore it here)
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // 3. Scanner / Input Handling

    // Clear any pending submission timer
    if (inputTimer) clearTimeout(inputTimer);

    if (e.key === 'Enter') {
        if (inputBuffer.length > 0) {
            addLog(`> ACCESS CODE RECEIVED (MANUAL): ${inputBuffer}`);
            processInput(inputBuffer);
            inputBuffer = '';
            isScannerInput = false;
        }
    } else if (e.key.length === 1) {
        // Detect scanner speed (very fast bursts)
        if (inputBuffer.length > 0 && timeDiff < SCANNER_CHAR_INTERVAL) {
            isScannerInput = true;
        } else if (inputBuffer.length === 0) {
            // Reset flag on new input start
            isScannerInput = false;
        }

        // Only append printable characters
        inputBuffer += e.key;

        // If it looks like a scan, set a timer to auto-submit
        if (isScannerInput) {
            inputTimer = setTimeout(() => {
                if (inputBuffer.length > 0) {
                    addLog(`> ACCESS CODE RECEIVED (AUTO): ${inputBuffer}`);
                    processInput(inputBuffer);
                    inputBuffer = '';
                    isScannerInput = false;
                }
            }, SUBMIT_WAIT_TIME);
        }
    }

    lastKeyTime = currentTime;
});

function processInput(code) {
    // Placeholder for Phase 4: Game Logic
    console.log("Processing code:", code);
}
