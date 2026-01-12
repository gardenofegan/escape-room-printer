---
description: Project Overview Development Steps
---

Here is a comprehensive Development Plan tailored for your Windows Surface Pro using Electron. You can save this as ESCAPE_ROOM_DEV_PLAN.md and hand it off to your coding agent (or use it yourself) to build the project step-by-step.

🕵️‍♂️ Project Code Name: "Operation Receipt"
Development Plan: Two-Team Escape Room Game
Target Device: Windows Surface Pro (Windows 10/11) Stack: Electron, Node.js, HTML/CSS/JS Hardware: Epson TM-T88III (Receipt Printer), USB Barcode Scanner

📅 Phase 1: Environment & Foundation
Goal: Initialize the project and ensure the app runs on the Surface Pro.

Step 1.1: Project Initialization
Action:

Initialize a new Node.js project.

Install Electron.

Configure package.json with a start script.

Verification: Run npm start and see a default "Hello World" Electron window appear on the Surface Pro.

Step 1.2: Window Configuration
Action:

Configure main.js to launch in Kiosk Mode (fullscreen, no menu bars) to prevent players from closing the game.

Enable nodeIntegration or setup a secure preload.js bridge (Context Isolation) to allow the UI to talk to the printer logic.

Verification: The app opens full screen and cannot be easily minimized/closed without a secret keyboard shortcut (e.g., Ctrl+Q to quit).

🖨️ Phase 2: Hardware Handshake (The Printer)
Goal: Establish communication with the Epson TM-T88III on Windows. This is the most critical technical step.

Step 2.1: Windows Driver Setup (Non-Coding)
Action:

Install the Epson Advanced Printer Driver (APD) for the TM-T88III on the Surface Pro.

Ensure the printer appears in Windows "Printers & Scanners" and can print a Windows Test Page.

Crucial Trick: In Windows Printer Properties, "Share" the printer on the network. Give it a simple share name like escape_printer.

Verification: You can successfully print a test page from Windows Settings.

Step 2.2: Node.js Printer Library
Action:

Install node-thermal-printer (recommended for raw ESC/POS commands) or electron-pos-printer (if you prefer printing HTML images).

Recommendation: Use node-thermal-printer for fast, retro-style text and raw bitmap printing.

Verification: Dependencies install without errors (note: may require windows-build-tools if compiling native modules).

Step 2.3: "Hello World" Receipt
Action:

Write a dedicated printer.js module in the Main Process.

Configure the interface type to printer (using the Windows driver name) or network (using \\localhost\escape_printer).

Create a function testPrint() that prints: "SYSTEM ONLINE" followed by a paper cut command.

Verification: Running the function makes the physical printer dispense a slip with text and cut it.

🔫 Phase 3: The Input System (Scanner)
Goal: reliably capture barcode data without needing a text box to be "focused."

Step 3.1: Global Keyboard Listener
Action:

In the Renderer process (UI), add a window.addEventListener('keydown', ...) function.

Logic:

Detect key presses.

Append chars to a buffer string.

Detect Enter key (most scanners send "Enter" after the code).

On Enter: Send the buffer string to the game logic function and clear the buffer.

Verification: Open the app, scan any barcode (e.g., a soda can). The code appears in the console log even if you click away from the app.

🧠 Phase 4: Game Logic & State Machine
Goal: Create the "Brain" that decides which puzzle comes next.

Step 4.1: Game State Structure
Action:

Create a GameManager class or object.

State variables:

currentTeamName

currentStage (0 to X)

startTime

puzzles (Array of objects containing: answer_code, clue_text, maze_image_path).

Verification: Console logs show the state updating correctly when dummy answers are passed in.

Step 4.2: The Core Loop
Action:

Implement function submitAnswer(code):

Check if code == puzzles[currentStage].answer_code.

If Correct: Increment currentStage, trigger "Success" sound, send print command for next puzzle.

If Wrong: Trigger "Error" sound/visual.

Verification: Hardcode a puzzle with answer "1234". Scan a "1234" barcode. Verify the state advances.

🧩 Phase 5: Content & Puzzle Generation
Goal: Create the actual content the printer will produce.

Step 5.1: Image Handling
Action:

Create a folder assets/puzzles.

Add placeholder images for Mazes (black and white .png files, indexed color, 1-bit depth ideally).

Write a helper in printer.js to accept an image path and print it.

Verification: The printer successfully prints a graphical maze, not just text.

Step 5.2: Dynamic Text (Optional but Cool)
Action:

Update printer logic to include dynamic footers (e.g., "Time Elapsed: 10:45") on the receipt.

Verification: Receipt shows the actual game time when printed.

🎨 Phase 6: User Interface (The "Command Center")
Goal: Make it look like a spy movie.

Step 6.1: HTML/CSS Layout
Action:

Create a dark-themed UI.

Elements:

Big Countdown Timer.

Status Log (e.g., "> Uplink established...", "> Waiting for code...").

Flash Red on wrong answer.

Flash Green on correct answer.

Verification: UI looks good on the Surface Pro screen.

Step 6.2: Audio Integration
Action:

Add generic SFX files (beep.mp3, alarm.wav, print_start.wav).

Play sounds on state changes.

Verification: Audio plays on scan and print events.

🚀 Phase 7: Deployment & "Two-Team" Setup
Goal: Finalize the build for running on two separate machines.

Step 7.1: Configuration File
Action:

Create a config.json file that sits outside the app code.

Fields: teamName, printerName.

Load this on startup. This allows you to install the exact same app on both the Mac and Surface, but edit the config file to say "Team Alpha" on one and "Team Bravo" on the other.

Verification: Changing config.json changes the team name displayed on the header.

Step 7.2: Packaging
Action:

Run electron-builder to create a standalone .exe for Windows.

Verification: You can run the game without needing the command line or VS Code open.