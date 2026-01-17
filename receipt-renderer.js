const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class ReceiptRenderer {
    constructor() {
        this.templatePath = path.join(__dirname, 'templates', 'receipt.html');
        this.templateSource = fs.readFileSync(this.templatePath, 'utf8');
        this.templateSource = fs.readFileSync(this.templatePath, 'utf8');

        // Register helpers
        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });

        this.template = handlebars.compile(this.templateSource);
    }

    async renderReceipt(data) {
        try {
            // Render HTML first
            const html = this.template(data);

            // Convert to Image Buffer
            const imageBuffer = await nodeHtmlToImage({
                html: html,
                type: 'png',
                transparent: false,
                content: data, // Allows direct variable injection too
                puppeteerArgs: {
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // In case of packaged app issues
                    args: ['--no-sandbox']
                }
            });

            return imageBuffer;
        } catch (error) {
            console.error("Receipt Rendering Failed:", error);
            throw error;
        }
    }
}

module.exports = new ReceiptRenderer();
