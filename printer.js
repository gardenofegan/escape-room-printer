const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

class EscapePrinter {
    constructor() {
        this.printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: '//localhost/escape_printer', // Windows shared printer syntax
            characterSet: CharacterSet.PC437_USA,
            removeSpecialCharacters: false,
            lineCharacter: "=",
            width: 42, // Standard receipt width usually around 42-48 chars
            options: {
                timeout: 5000
            }
        });
    }

    async isConnected() {
        try {
            return await this.printer.isPrinterConnected();
        } catch (error) {
            console.error('Printer connection check failed:', error);
            return false;
        }
    }

    async testPrint() {
        try {
            this.printer.clear();
            this.printer.alignCenter();
            this.printer.setTextQuadArea(); // Large text
            this.printer.println("SYSTEM ONLINE");
            this.printer.setTextNormal();
            this.printer.println("--------------------------------");
            this.printer.alignLeft();
            this.printer.println("Device: Epson TM-T88III");
            this.printer.println("Status: READY");
            this.printer.println("Link:   SECURE");
            this.printer.newLine();
            this.printer.alignCenter();
            this.printer.println("*** END OF TRANSMISSION ***");
            this.printer.cut();

            try {
                let execute = await this.printer.execute();
                console.log("Print success!");
                return true;
            } catch (error) {
                console.error("Print failed:", error);
                return false;
            }
        } catch (error) {
            console.error("Error generating print data:", error);
            return false;
        }
    }
    async printPuzzle(puzzle) {
        try {
            if (!await this.isConnected()) {
                console.warn("Printer not connected. Skipping print job.");
                return false;
            }

            this.printer.clear();
            this.printer.alignCenter();

            // Header
            this.printer.setTextDoubleHeight();
            this.printer.invert(true);
            this.printer.println(` ${puzzle.printLabel || 'MISSION UPDATE'} `);
            this.printer.invert(false);
            this.printer.setTextNormal();
            this.printer.drawLine();
            this.printer.newLine();

            // Dynamic Content Handling based on Type
            // EXPAND HERE for new puzzle types (crossword, logic, etc.)
            switch (puzzle.type) {
                case 'maze':
                case 'image':
                    if (puzzle.imagePath) {
                        try {
                            // Requires full absolute path usually, or relative to cwd
                            // Depending on how final build works, might need path.join(__dirname, ...)
                            await this.printer.printImage(puzzle.imagePath);
                        } catch (imgErr) {
                            console.error("Failed to load image:", imgErr);
                            this.printer.println("[IMAGE DATA CORRUPTED]");
                        }
                    }
                    // For mazes, we might also want instruction text below/above
                    if (puzzle.clueText) {
                        this.printer.newLine();
                        this.printer.println(puzzle.clueText);
                    }
                    break;

                case 'text':
                default:
                    // Default behavior for text or unknown types
                    this.printer.setTextQuadArea();
                    if (puzzle.clueText) {
                        this.printer.println(puzzle.clueText);
                    }
                    break;
            }

            this.printer.newLine();
            this.printer.drawLine();
            this.printer.cut();

            return await this.printer.execute();

        } catch (error) {
            console.error("Puzzle Print Error:", error);
            return false;
        }
    }

    async printCustom(text) {
        if (!await this.isConnected()) return false;
        try {
            this.printer.clear();
            this.printer.alignCenter();
            this.printer.println(text);
            this.printer.cut();
            return await this.printer.execute();
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}

module.exports = new EscapePrinter();
