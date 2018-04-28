const { remote, ipcRenderer } = require("electron")
const fs = require("fs")
const { Viewer } = require("./viewer/viewer.js")
const { Vec3 } = require("./math/vec3.js")


let gViewer = null


function main()
{
	let menuTemplate =
	[
		{
			label: "File",
			submenu:
			[
				{ label: "Open KMP..." },
				{ type: "separator" },
				{ label: "Save KMP" },
				{ label: "Save KMP as..." },
				{ type: "separator" },
				{ label: "Import course model...", click: () => showImportCourseModelDialog() },
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


function showImportCourseModelDialog()
{
	let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "OBJ Models (*.obj)", extensions: ["obj"] }] })
	if (result)
	{
		ipcRenderer.send("showProgress")
		let data = fs.readFileSync(result[0])
		let modelBuilder = require("./util/objLoader.js").ObjLoader.makeModelBuilder(data)
		ipcRenderer.send("hideProgress")
		
		let bbox = modelBuilder.getBoundingBox()
		gViewer.cameraFocus = new Vec3(bbox.xCenter, bbox.yCenter, bbox.zCenter)
		gViewer.cameraHorzAngle = Math.PI / 2
		gViewer.cameraVertAngle = 1
		gViewer.cameraDist = Math.max(bbox.xSize, bbox.ySize, bbox.zSize) / 2
		gViewer.setModel(modelBuilder.makeModel(gViewer.gl), modelBuilder.makeCollision().buildCacheSubdiv())
	}
}


module.exports = { main, gViewer }