const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron')

const path = require('path')
const url = require('url')

const ProgressBar = require("electron-progressbar")

let mainWindow = null


function createWindow()
{
	mainWindow = new BrowserWindow({width: 1800, height: 600})

	mainWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}))
	
	mainWindow.webContents.openDevTools()

	mainWindow.on('closed', () => mainWindow = null)
}

app.on('ready', createWindow)

app.on('window-all-closed', function()
{
	if (process.platform !== "darwin")
		app.quit()
})

app.on('activate', function()
{
	if (mainWindow === null)
		createWindow()
})

let progressBar = null

ipcMain.on("showProgress", (event, arg) =>
{
	progressBar = new ProgressBar({})
})

ipcMain.on("hideProgress", (event, arg) =>
{
	progressBar.close()
})