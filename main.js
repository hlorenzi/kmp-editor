const { app, BrowserWindow } = require('electron')
const remoteMain = require('@electron/remote/main')

const path = require('path')
const url = require('url')

let mainWindow = null

remoteMain.initialize()

function createWindow()
{
	mainWindow = new BrowserWindow({
		width: 1800,
		height: 900,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	})

	remoteMain.enable(mainWindow.webContents)

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))

	mainWindow.on('closed', () => mainWindow = null)
}

app.on('ready', createWindow)

app.on('window-all-closed', function()
{
	//if (process.platform !== "darwin")
		app.quit()
})

app.on('activate', function()
{
	if (mainWindow === null)
		createWindow()
})