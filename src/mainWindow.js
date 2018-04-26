const { remote } = require("electron")
const fs = require("fs")
const { Viewer } = require("./viewer/viewer.js")


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
			label: "Edit"
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
		let data = fs.readFileSync(result[0], "utf8")
		console.log(data)
	}
}


module.exports = { main, gViewer }