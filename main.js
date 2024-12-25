const { app, BrowserWindow, ipcMain } = require('electron')
const remoteMain = require('@electron/remote/main')

const path = require('path')
const url = require('url')

let latestWindow = null

// macOS: open file from Finder
app.on('open-file', (ev, path) => {
	process.argv[1] = path
	if (latestWindow !== null)
		createWindow()
})

remoteMain.initialize()

function createWindow()
{
	latestWindow = new BrowserWindow({
		width: 1800,
		height: 900,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	})

	remoteMain.enable(latestWindow.webContents)

	latestWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))
}

app.on('ready', createWindow)
ipcMain.on('new', () => {
	process.argv.length = 1
	createWindow()
})

app.on('window-all-closed', function()
{
	app.quit()
})