console.log("Renderer loaded");

const logContainer = document.getElementById('log-container');
const timerElement = document.getElementById('timer');
let inputBuffer = '';
let isScannerInput = false;
let lastKeyTime = Date.now();
let inputTimer = null;
let isLocked = false;

// Timer State
let gameStartTime = null;
let timerInterval = null;

// Thresholds
const SCANNER_CHAR_INTERVAL = 60;
const SUBMIT_WAIT_TIME = 500;

// Audio Controller
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {
    type: new Audio('assets/audio/type.wav'),
    success: new Audio('assets/audio/success.wav'),
    error: new Audio('assets/audio/error.wav'),
    print: new Audio('assets/audio/print.wav')
};

// Pre-load/Volume Adjust
Object.values(sounds).forEach(s => s.volume = 0.5);

function playSound(name) {
    if (sounds[name]) {
        // Clone for overlapping sounds (esp typing)
        if (name === 'type') {
            const clone = sounds[name].cloneNode();
            clone.volume = 0.2; // Quieter typing
            clone.play().catch(e => { }); // Ignore interaction errors
        } else {
            sounds[name].currentTime = 0;
            sounds[name].play().catch(e => { });
        }
    }
}

// Initial Prompt
createInputLine();
startTimer(); // Initialize timer display

function startTimer() {
    // Clear existing if any
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gameStartTime) {
            const diff = Date.now() - gameStartTime;
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            const ms = Math.floor((diff % 1000) / 10); // Tens of ms
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
        } else {
            timerElement.textContent = "00:00:00";
        }
    }, 50); // High refresh rate for cool effect
}

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
    if (cursor) cursor.remove();

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

    for (let i = 0; i < text.length; i++) {
        entry.textContent += text.charAt(i);
        scrollToBottom();
        playSound('type'); // Audio feedback
        await new Promise(r => setTimeout(r, speed));
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

    // Interaction to unlock audio context if needed
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

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
        playSound('type');
    } else if (e.key.length === 1) {
        // Scanner Detection
        if (inputBuffer.length > 0 && timeDiff < SCANNER_CHAR_INTERVAL) {
            isScannerInput = true;
        } else if (inputBuffer.length === 0) {
            isScannerInput = false;
        }

        inputBuffer += e.key;
        updateInputDisplay();
        if (!isScannerInput) playSound('type');

        // Auto-submit scan
        if (isScannerInput) {
            inputTimer = setTimeout(() => {
                if (inputBuffer.length > 0 && !isLocked) {
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

    await new Promise(r => setTimeout(r, 300));

    if (isScan) {
        await typeWriter("SCAN DETECTED. PROCESSING...", "scanned-msg", 10);
    } else {
        await typeWriter("VALIDATING INPUT...", "system-msg", 20);
    }

    try {
        const result = await window.api.submitCode(code);

        // Sync Timer
        if (result.startTime) {
            gameStartTime = result.startTime;
        }

        if (result.success) {
            playSound('success');
            await typeWriter(`ACCESS GRANTED: ${result.message}`, "system-msg", 30);
            if (result.nextPuzzleType) {
                await new Promise(r => setTimeout(r, 500));
                playSound('print');
                await typeWriter(">>> INTIATING HARDCOPY OUTPUT <<<", "system-msg");
            }
        } else {
            playSound('error');
            await typeWriter(`ACCESS DENIED: ${result.message}`, "error-msg", 30);
        }

        if (result.gameComplete) {
            await addSeparator();
            await typeWriter("SESSION COMPLETE.", "system-msg");
            clearInterval(timerInterval); // Stop timer
        } else {
            await addSeparator();
            createInputLine();
            isLocked = false;
        }

    } catch (err) {
        console.error("Submission Error:", err);
        playSound('error');
        await typeWriter("COMMUNICATION ERROR.", "error-msg");
        await addSeparator();
        createInputLine();
        isLocked = false;
    }
}
