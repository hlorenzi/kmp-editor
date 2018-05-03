const { remote, ipcRenderer } = require("electron")
const fs = require("fs")
const { Viewer } = require("./viewer/viewer.js")
const { ViewerEnemyPaths } = require("./viewer/viewerEnemyPaths.js")
const { KmpData } = require("./util/kmpData.js")
const { Vec3 } = require("./math/vec3.js")


let gMainWindow = null


function main()
{
	gMainWindow = new MainWindow()	
}


class MainWindow
{
	constructor()
	{
		let menuTemplate =
		[
			{
				label: "File",
				submenu:
				[
					{ label: "Open KMP...", click: () => this.openKMP() },
					{ type: "separator" },
					{ label: "Save KMP" },
					{ label: "Save KMP as..." },
					{ type: "separator" },
					{ label: "Import OBJ course model...", click: () => this.showImportObjCourseModelDialog() },
					{ label: "Import BRRES course model...", click: () => this.showImportBrresCourseModelDialog() },
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
		
		document.body.onresize = () => this.onResize()
		
		this.panel = document.getElementById("tdSidePanel")
		this.viewer = new Viewer(document.getElementById("canvasMain"))
	}

	
	onResize()
	{
		this.viewer.resize()
		this.viewer.render()
	}


	openKMP()
	{
		let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "KMP Files (*.kmp)", extensions: ["kmp"] }] })
		if (result)
		{
			let kmpFilename = result[0].replace(new RegExp("\\\\", "g"), "/")
			let brresFilename = kmpFilename.substr(0, kmpFilename.lastIndexOf("/")) + "/course_model.brres"
			let kclFilename = kmpFilename.substr(0, kmpFilename.lastIndexOf("/")) + "/course.kcl"
			
			let kmpData = fs.readFileSync(kmpFilename)
			this.data = KmpData.convertToWorkingFormat(KmpData.load(kmpData, this.viewer))
			
			let brresData = fs.readFileSync(brresFilename)
			//let modelBuilder = require("./util/brresLoader.js").BrresLoader.load(brresData)
			
			let kclData = fs.readFileSync(kclFilename)
			let modelBuilder = require("./util/kclLoader.js").KclLoader.load(kclData)
			
			this.viewer.setModel(modelBuilder)
			this.viewer.setSubViewer(new ViewerEnemyPaths(this, this.viewer, this.data))
		}
	}


	showImportObjCourseModelDialog()
	{
		let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "OBJ Models (*.obj)", extensions: ["obj"] }] })
		if (result)
		{
			//ipcRenderer.send("showProgress")
			let data = fs.readFileSync(result[0])
			let modelBuilder = require("./util/objLoader.js").ObjLoader.makeModelBuilder(data)
			//ipcRenderer.send("hideProgress")
			
			this.viewer.setModel(modelBuilder)
		}
	}


	showImportBrresCourseModelDialog()
	{
		let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "BRRES Models (*.brres)", extensions: ["brres"] }] })
		if (result)
		{
			let data = fs.readFileSync(result[0])
			let modelBuilder = require("./util/brresLoader.js").BrresLoader.load(data)
			
			this.viewer.setModel(modelBuilder)
		}
	}
}


module.exports = { main, MainWindow, gMainWindow }