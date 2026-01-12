const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const escapePrinter = require('./printer');

function createWindow() {
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    kiosk: true, // Prevents closing and other OS interactions
    frame: false, // No window frame
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  // Prevent new windows from being created
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  // Listen for test print request
  ipcMain.handle('test-print', async (event) => {
    console.log("Received test-print request");
    const result = await escapePrinter.testPrint();
    return result;
  });

  // Register a global shortcut to quit the application (Ctrl+Q or Command+Q)
  globalShortcut.register('CommandOrControl+Q', () => {
    app.quit();
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll();
});
