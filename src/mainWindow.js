const { remote, ipcRenderer } = require("electron")
const fs = require("fs")
const { Viewer } = require("./viewer/viewer.js")
const { ViewerEnemyPaths } = require("./viewer/viewerEnemyPaths.js")
const { KmpData } = require("./util/kmpData.js")
const { Vec3 } = require("./math/vec3.js")


let gViewer = null
let gSubViewer = null
let gData = null


function main()
{
	let menuTemplate =
	[
		{
			label: "File",
			submenu:
			[
				{ label: "Open KMP...", click: () => openKMP() },
				{ type: "separator" },
				{ label: "Save KMP" },
				{ label: "Save KMP as..." },
				{ type: "separator" },
				{ label: "Import OBJ course model...", click: () => showImportObjCourseModelDialog() },
				{ label: "Import BRRES course model...", click: () => showImportBrresCourseModelDialog() },
			]
		},
		{
			label: "Edit",
			submenu:
			[
				{ role: "reload" }
			]
		}
	]
	
	remote.getCurrentWindow().setMenu(remote.Menu.buildFromTemplate(menuTemplate))
	
	document.body.onresize = onResize
	
	gViewer = new Viewer(document.getElementById("canvasMain"))
}


function onResize()
{
	gViewer.resize()
	gViewer.render()
}


function openKMP()
{
	let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "KMP Files (*.kmp)", extensions: ["kmp"] }] })
	if (result)
	{
		let kmpFilename = result[0].replace(new RegExp("\\\\", "g"), "/")
		let brresFilename = kmpFilename.substr(0, kmpFilename.lastIndexOf("/")) + "/course_model.brres"
		
		let kmpData = fs.readFileSync(kmpFilename)
		gData = KmpData.convertToWorkingFormat(KmpData.load(kmpData, gViewer))
		
		let brresData = fs.readFileSync(brresFilename)
		let modelBuilder = require("./util/brresLoader.js").BrresLoader.load(brresData)
		
		if (gSubViewer != null)
			gSubViewer.destroy()
		
		gSubViewer = new ViewerEnemyPaths(gViewer, gData)
		gViewer.setModel(modelBuilder)
		gViewer.setSubViewer(gSubViewer)
	}
}


function showImportObjCourseModelDialog()
{
	let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "OBJ Models (*.obj)", extensions: ["obj"] }] })
	if (result)
	{
		//ipcRenderer.send("showProgress")
		let data = fs.readFileSync(result[0])
		let modelBuilder = require("./util/objLoader.js").ObjLoader.makeModelBuilder(data)
		//ipcRenderer.send("hideProgress")
		
		gViewer.setModel(modelBuilder)
	}
}


function showImportBrresCourseModelDialog()
{
	let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "BRRES Models (*.brres)", extensions: ["brres"] }] })
	if (result)
	{
		let data = fs.readFileSync(result[0])
		let modelBuilder = require("./util/brresLoader.js").BrresLoader.load(data)
		
		gViewer.setModel(modelBuilder)
	}
}


module.exports = { main, gViewer }