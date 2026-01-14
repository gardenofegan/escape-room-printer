const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
    constructor() {
        this.config = {};
        this.loadConfig();
    }

    loadConfig() {
        try {
            // Priority:
            // 1. config.json in the same directory as the executable (Production)
            // 2. config.json in the project root (Development)

            const userDataPath = path.join(process.cwd(), 'config.json');
            // In packaged app, process.cwd() might vary, but for this simple setup it often works.
            // Better alternative for robust "next to exe" logic:
            const exeDir = path.dirname(app.getPath('exe'));
            const prodConfigPath = path.join(exeDir, 'config.json');

            let configPath = userDataPath;
            if (fs.existsSync(prodConfigPath)) {
                configPath = prodConfigPath;
            }

            if (fs.existsSync(configPath)) {
                const data = fs.readFileSync(configPath, 'utf8');
                this.config = JSON.parse(data);
                console.log("Config loaded from:", configPath);
            } else {
                console.warn("Config file not found. Using defaults.");
                this.config = this.getDefaults();
            }
        } catch (err) {
            console.error("Error loading config:", err);
            this.config = this.getDefaults();
        }
    }

    getDefaults() {
        return {
            printerName: "//localhost/escape_printer",
            teamName: "TEAM ALPHA",
            timerEnabled: true,
            audioVolume: 0.5,
            debugMode: false
        };
    }

    get(key) {
        return this.config[key] !== undefined ? this.config[key] : this.getDefaults()[key];
    }

    getThemePath() {
        const theme = this.config.currentTheme || 'matrix';
        return path.join('themes', theme);
    }
}

module.exports = new ConfigManager();
