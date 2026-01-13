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
            // Skipped strict connection check to accommodate Windows Shared Printers
            // if (!await this.isConnected()) { ... }

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
            switch (puzzle.type) {
                case 'maze':
                case 'image':
                    // Check if we have a pre-rendered buffer (Phase 5)
                    if (puzzle.imageBuffer) {
                        try {
                            await this.printer.printImageBuffer(puzzle.imageBuffer);
                        } catch (bufErr) {
                            console.error("Failed to print image buffer:", bufErr);
                            this.printer.println("[DATA STREAM CORRUPTED]");
                        }
                    }
                    // Fallback to file path (Legacy Phase 4)
                    else if (puzzle.imagePath) {
                        try {
                            await this.printer.printImage(puzzle.imagePath);
                        } catch (imgErr) {
                            console.error("Failed to load image:", imgErr);
                            this.printer.println("[IMAGE DATA CORRUPTED]");
                        }
                    }

                    if (puzzle.clueText) {
                        this.printer.newLine();
                        this.printer.println(puzzle.clueText);
                    }
                    break;

                case 'text':
                default:
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
        // if (!await this.isConnected()) return false;
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
