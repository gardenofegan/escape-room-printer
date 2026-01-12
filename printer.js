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
}

module.exports = new EscapePrinter();
