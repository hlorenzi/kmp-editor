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
					{ label: "New" },
					{ label: "Open...", click: () => this.openKmp() },
					{ type: "separator" },
					{ label: "Save" },
					{ label: "Save as..." },
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
		
		this.cfg =
		{
			shadingFactor: 0.3,
			kclEnableColors: true,
			kclEnableDeathBarriers: true,
			kclEnableInvisible: true,
			kclEnableEffects: true,
			enemyPathsEnableSizeRender: true
		}
		
		this.currentKmpFilename = null
		this.currentKclFilename = null
		this.currentKmpData = new KmpData()
		
		this.panels = []
		
		this.sidePanelDiv = document.getElementById("divSidePanel")
		this.viewer = new Viewer(document.getElementById("canvasMain"), this.cfg)
		
		this.refreshPanels()
	}

	
	onResize()
	{
		this.viewer.resize()
		this.viewer.render()
	}
	
	
	refreshPanels()
	{
		for (let panel of this.panels)
			panel.destroy()
		
		this.panels = []
		
		let panel = this.addPanel("Model")
		panel.toggleOpen()
		panel.addButton(null, "Load course_model.brres", () => this.openCourseBrres())
		panel.addButton(null, "Load course.kcl", () => this.openCourseKcl())
		panel.addButton(null, "Load custom model", () => this.openCustomModel())
		panel.addButton(null, "Center view", () => this.viewer.centerView())
		panel.addSlider(null, "Shading", 0, 1, this.cfg.shadingFactor, 0.05, (x) => this.cfg.shadingFactor = x)
		let kclGroup = panel.addGroup(null, "Collision data")
		panel.addCheckbox(kclGroup, "Use colors", this.cfg.kclEnableColors, (x) => { this.cfg.kclEnableColors = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show death barriers", this.cfg.kclEnableDeathBarriers, (x) => { this.cfg.kclEnableDeathBarriers = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show invisible walls", this.cfg.kclEnableInvisible, (x) => { this.cfg.kclEnableInvisible = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show effects/triggers", this.cfg.kclEnableEffects, (x) => { this.cfg.kclEnableEffects = x; this.openKcl(this.currentKclFilename) })
	
		this.viewer.setSubviewer(new ViewerEnemyPaths(this, this.viewer, this.currentKmpData))
	}
	
	
	addPanel(name, closable = false)
	{
		let panel = this.panels.find(p => p.name == name)
		if (panel != null)
		{
			panel.clearContent()
			return panel
		}
		
		panel = new Panel(this.sidePanelDiv, name, closable, () => this.viewer.render())
		this.panels.push(panel)
		return panel
	}


	openKmp()
	{
		let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "KMP Files (*.kmp)", extensions: ["kmp"] }] })
		if (result)
		{
			let kmpFilename = result[0].replace(new RegExp("\\\\", "g"), "/")
			this.currentKmpFilename = kmpFilename
			this.currentKmpData = KmpData.convertToWorkingFormat(KmpData.load(fs.readFileSync(kmpFilename)))
			
			let kclFilename = this.currentKmpFilename.substr(0, this.currentKmpFilename.lastIndexOf("/")) + "/course.kcl"
			this.openKcl(kclFilename)
			
			this.viewer.centerView()
			this.refreshPanels()
		}
	}
	
	
	openCourseBrres()
	{
		if (this.currentKmpFilename == null)
			return
		
		let filename = this.currentKmpFilename.substr(0, this.currentKmpFilename.lastIndexOf("/")) + "/course_model.brres"
		this.openBrres(filename)
	}
	
	
	openCourseKcl()
	{
		if (this.currentKmpFilename == null)
			return
		
		let filename = this.currentKmpFilename.substr(0, this.currentKmpFilename.lastIndexOf("/")) + "/course.kcl"
		this.openKcl(filename)
	}
	
	
	openCustomModel()
	{
		let filters =
			[ { name: "Supported model formats (*.obj, *.brres, *.kcl)", extensions: ["obj", "brres", "kcl"] } ]
			
		let result = remote.dialog.showOpenDialog({ properties: ["openFile"], filters })
		if (result)
		{
			let filename = result[0]
			let ext = filename.substr(filename.lastIndexOf("."))
			
			if (ext == ".brres")
				this.openBrres(filename)
			else if (ext == ".kcl")
				this.openKcl(filename)
			else
			{
				let data = fs.readFileSync(filename)
				let modelBuilder = require("./util/objLoader.js").ObjLoader.makeModelBuilder(data)
				this.viewer.setModel(modelBuilder)
				this.currentKclFilename = null
			}
		}
	}
	
	
	openBrres(filename)
	{
		if (filename == null)
			return
		
		let brresData = fs.readFileSync(filename)
		let modelBuilder = require("./util/brresLoader.js").BrresLoader.load(brresData)
		this.viewer.setModel(modelBuilder)
		this.currentKclFilename = null
	}
	
	
	openKcl(filename)
	{
		if (filename == null)
			return
		
		let kclData = fs.readFileSync(filename)
		let modelBuilder = require("./util/kclLoader.js").KclLoader.load(kclData, this.cfg)
		this.viewer.setModel(modelBuilder)
		this.currentKclFilename = filename
	}
}


class Panel
{
	constructor(parentDiv, name, closable = true, onRefreshView = null)
	{
		this.parentDiv = parentDiv
		this.name = name
		this.closable = closable
		this.open = false
		
		this.panelDiv = document.createElement("div")
		this.panelDiv.className = "panel"
		this.parentDiv.appendChild(this.panelDiv)
		
		this.titleButton = document.createElement("button")
		this.titleButton.className = "panelTitle"
		this.titleButton.innerHTML = "▶ " + name
		this.panelDiv.appendChild(this.titleButton)
		
		this.contentDiv = document.createElement("div")
		this.contentDiv.className = "panelContent"
		this.contentDiv.style.display = "none"
		this.panelDiv.appendChild(this.contentDiv)
		
		this.titleButton.onclick = () => this.toggleOpen()
		this.onRefreshView = (onRefreshView ? onRefreshView : () => { })
	}
	
	
	destroy()
	{
		this.parentDiv.removeChild(this.panelDiv)
	}
	
	
	clearContent()
	{
		while (this.contentDiv.firstChild)
			this.contentDiv.removeChild(this.contentDiv.firstChild)
	}
	
	
	toggleOpen()
	{
		this.open = !this.open
		
		if (this.open)
		{
			this.contentDiv.style.display = "block"
			this.titleButton.innerHTML = "▼ " + this.name
		}
		else
		{
			this.contentDiv.style.display = "none"
			this.titleButton.innerHTML = "▶ " + this.name
		}
	}
	
	
	addGroup(group, str)
	{
		let div = document.createElement("div")
		div.className = "panelGroup"
		
		let labelDiv = document.createElement("div")
		labelDiv.className = "panelRowElement"
		div.appendChild(labelDiv)
		
		let label = document.createElement("div")
		label.className = "panelGroupTitle"
		label.innerHTML = str
		labelDiv.appendChild(label)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return div
	}
	
	
	addText(group, str)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let text = document.createElement("span")
		text.className = "panelLabel"
		text.innerHTML = str
		div.appendChild(text)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return text
	}
	
	
	addButton(group, str, onclick = null)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let label = document.createElement("label")
		div.appendChild(label)
		
		let button = document.createElement("button")
		button.className = "panelButton"
		button.innerHTML = str
		button.onclick = () => { onclick(); this.onRefreshView() }
		
		label.appendChild(button)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return button
	}
	
	
	addCheckbox(group, str, checked = false, onchange = null)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let label = document.createElement("label")
		div.appendChild(label)
		
		let checkbox = document.createElement("input")
		checkbox.className = "panelCheckbox"
		checkbox.type = "checkbox"
		checkbox.checked = checked
		checkbox.onchange = () => { onchange(checkbox.checked); this.onRefreshView() }
		
		let text = document.createElement("span")
		text.className = "panelLabel"
		text.innerHTML = str
		
		label.appendChild(checkbox)
		label.appendChild(text)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return checkbox
	}
	
	
	addSlider(group, str, min = 0, max = 1, value = 0, step = 0.1, onchange = null)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let label = document.createElement("label")
		div.appendChild(label)
		
		let slider = document.createElement("input")
		slider.className = "panelCheckbox"
		slider.type = "range"
		slider.min = min
		slider.max = max
		slider.step = step
		slider.value = value
		slider.oninput = () => { onchange(slider.value); this.onRefreshView() }
		
		let text = document.createElement("span")
		text.className = "panelLabel"
		text.innerHTML = str
		
		label.appendChild(text)
		label.appendChild(slider)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return slider
	}
}


module.exports = { main, MainWindow, gMainWindow }