const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Expose protected methods that allow the renderer process to use
    // the ipcRenderer without exposing the entire object
    send: (channel, data) => {
        // whitelist channels
        let validChannels = ["toMain"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel, func) => {
        let validChannels = ["fromMain"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },
    testPrint: () => ipcRenderer.invoke('test-print'),
    submitCode: (code) => ipcRenderer.invoke('submit-code', code),
    getTheme: () => ipcRenderer.invoke('get-theme'),
    getMenu: () => ipcRenderer.invoke('get-menu'),
    // New methods for hints and parent sheet
    requestHint: () => ipcRenderer.invoke('request-hint'),
    printAnswerSheet: () => ipcRenderer.invoke('print-answer-sheet'),
    getGameStatus: () => ipcRenderer.invoke('get-game-status')
});
