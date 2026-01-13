const bwipjs = require('bwip-js');

class PuzzleGenerator {

    // Generate simple grid maze (Recursive Backtracker or similar simple Logic)
    generateMaze(width, height) {
        // Simplified procedural maze for demo
        // Returns flat array of colors 'black' (wall) or 'white' (path)
        // and dimensions

        const cells = Array(width * height).fill('black');

        // Simple path carving (Random walk for demo purposes)
        let x = 1, y = 1;
        cells[y * width + x] = 'white';

        for (let i = 0; i < (width * height) / 2; i++) {
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0 && x < width - 2) x++;
            if (dir === 1 && x > 1) x--;
            if (dir === 2 && y < height - 2) y++;
            if (dir === 3 && y > 1) y--;
            cells[y * width + x] = 'white';
        }

        return {
            width,
            height,
            cells
        };
    }

    async generateBarcode(text) {
        return new Promise((resolve, reject) => {
            bwipjs.toBuffer({
                bcid: 'code128',       // Barcode type
                text: text,            // Text to encode
                scale: 3,               // 3x scaling factor
                height: 10,              // Bar height, in millimeters
                includetext: true,            // Show human-readable text
                textxalign: 'center',        // Always good to align this
            }, function (err, png) {
                if (err) reject(err);
                else resolve('data:image/png;base64,' + png.toString('base64'));
            });
        });
    }
}

module.exports = new PuzzleGenerator();
