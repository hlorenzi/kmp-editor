const { app, BrowserWindow } = require('electron');
const path = require('path');
require('@electron/remote/main').initialize()

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1800,
    height: 900,
    webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.loadFile('index.html');
	mainWindow.maximize();
  mainWindow.webContents.openDevTools();
	require('@electron/remote/main').enable(mainWindow.webContents)
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});