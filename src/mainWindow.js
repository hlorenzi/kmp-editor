const { remote, ipcRenderer, screen, shell } = require("electron")
const fs = require("fs")
const { Viewer } = require("./viewer/viewer.js")
const { ModelBuilder } = require("./util/modelBuilder.js")
const { KmpData } = require("./util/kmpData.js")
const { KclLoader, collisionTypeData } = require("./util/kclLoader.js")
const { Vec3 } = require("./math/vec3.js")


let gMainWindow = null
let askBeforeClosing = true
let isReloading = false


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
					{ label: "New", accelerator: "CmdOrCtrl+N", click: () => this.newKmp() },
					{ label: "Open...", accelerator: "CmdOrCtrl+O", click: () => this.askOpenKmp() },
					{ type: "separator" },
					{ label: "Save", accelerator: "CmdOrCtrl+S", click: () => this.saveKmp(this.currentKmpFilename) },
					{ label: "Save as...", click: () => this.saveKmpAs() },
				]
			},
			{
				label: "Edit",
				submenu:
				[
					{ label: "Undo", accelerator: "CmdOrCtrl+Z", click: () => this.undo() },
					{ label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", click: () => this.redo() }
				]
			},
			{
				label: "Help",
				submenu:
				[
					{ label: "GitHub Repository", click: () => shell.openExternal("https://github.com/hlorenzi/kmp-editor") },
					{ type: "separator" },
					{ label: "Open Dev Tools", accelerator: "F12", click: () => remote.getCurrentWindow().webContents.openDevTools() },
					{ label: "Reload app", accelerator: "CmdOrCtrl+R", click: () => this.onReload() }
				]
			}
		]
		
		remote.getCurrentWindow().setMenu(remote.Menu.buildFromTemplate(menuTemplate))
		
		document.body.onresize = () => this.onResize()
		window.addEventListener("beforeunload", (ev) => this.onClose(ev))
		
		// To prevent strange bug with the browser undoing/redoing changes in destroyed input elements
		document.body.onkeydown = (ev) =>
		{
			if (ev.ctrlKey && (ev.key == "Z" || ev.key == "z"))
			{
				ev.preventDefault()
				ev.stopPropagation()
				if (ev.shiftKey)
					this.redo()
				else
					this.undo()
			}
		}
		
		this.noModelLoaded = true
		
		this.cfg =
		{
			isBattleTrack: false,
			useOrthoProjection: false,
			pointScale: 1,
			shadingFactor: 0.3,
			fogFactor: 0.0000025,

			kclEnableModel: true,
			kclEnableColors: true,
			kclEnableWalls: true,
			kclEnableDeathBarriers: true,
			kclEnableInvisible: true,
			kclEnableItemRoad: false,
			kclEnableEffects: false,
			kclHighlighter: 0,

			enableRotationRender: true,

			startPointsEnableZoneRender: true,

			enemyPathsEnableSizeRender: true,

			checkpointsEnableVerticalPanels: true,
			checkpointsEnableRespawnPointLinks: true,
			checkpointsEnableDirectionArrows: true,

			respawnsEnablePlayerSlots: true,

			cannonsEnableDirectionRender: false,
			cannonsEnableKclHighlight: true,
		}

		this.hl = 
		{
			baseType: -1,
			basicEffect: -1,
			blightEffect: -1,
			intensity: -1,
			collisionEffect: -1
		}
		this.hl.reset = () =>
		{
			this.hl.baseType = -1,
			this.hl.basicEffect = -1,
			this.hl.blightEffect = -1,
			this.hl.intensity = -1,
			this.hl.collisionEffect = -1
		}

		
		this.currentKmpFilename = null
		this.currentKclFilename = null
		this.currentKmpData = new KmpData()
		this.currentNotSaved = false
		
		this.undoNeedsNewSlot = false
		this.undoStack = []
		this.undoPointer = -1
		this.savedUndoSlot = -1
		
		this.panels = []

		this.refreshTitle()

		this.sidePanelDiv = document.getElementById("divSidePanel")
		this.viewer = new Viewer(this, document.getElementById("canvasMain"), this.cfg, this.currentKmpData)
		this.refreshPanels()
		
		this.newKmp()
		
		if (remote.process.argv.length >= 2)
			this.openKmp(remote.process.argv[1])
	}

	
	onResize()
	{
		this.viewer.resize()
		this.viewer.render()
	}
	
	
	onReload()
	{
		askBeforeClosing = true
		isReloading = true
		remote.getCurrentWindow().webContents.reload()
	}
	
	
	onClose(ev)
	{
		if (!askBeforeClosing)
			return
		
		ev.returnValue = false
		
		// Working around an Electron bug
		window.setTimeout(() =>
		{
			if (this.askSaveChanges())
			{
				askBeforeClosing = false
				
				if (!isReloading)
					window.close()
				else
					remote.getCurrentWindow().webContents.reload()
			}
			
			isReloading = false
		}, 1)
	}


	openExternalLink(link)
	{
		shell.openExternal(link)
	}
	
	
	refreshPanels()
	{
		let panel = this.addPanel("Model")
		panel.addText(null, "<strong>Right Mouse:</strong> Rotate Camera")
		panel.addText(null, "<strong>Hold Shift + Right Mouse:</strong> Pan Camera")
		panel.addText(null, "<strong>Mouse Wheel:</strong> Zoom")
		panel.addText(null, "<strong>Double Right Click:</strong> Focus Camera")
		panel.addSpacer(null)
		//panel.addButton(null, "Load course_model.brres", () => this.openCourseBrres())
		//panel.addButton(null, "Load course.kcl", () => this.openCourseKcl())
		panel.addButton(null, "Load Model", () => this.openCustomModel())
		panel.addButton(null, "(5) Toggle Projection", () => this.cfg.useOrthoProjection = !this.cfg.useOrthoProjection)
		panel.addButton(null, "Center view", () => this.viewer.centerView())
		panel.addSlider(null, "Shading", 0, 1, this.cfg.shadingFactor, 0.05, (x) => this.cfg.shadingFactor = x)
		panel.addSlider(null, "Fog", 0.0000001, 0.0002, this.cfg.fogFactor, 0.0000001, (x) => this.cfg.fogFactor = x)
		panel.addSlider(null, "Point Scale", 0.1, 5, this.cfg.pointScale, 0.1, (x) => this.cfg.pointScale = x)
		panel.addSpacer(null)
		let kclGroup = panel.addGroup(null, "Collision data:")
		//panel.addCheckbox(kclGroup, "Enable model", this.cfg.kclEnableModel, (x) => { this.cfg.kclEnableModel = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Use colors", this.cfg.kclEnableColors, (x) => { this.cfg.kclEnableColors = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show walls", this.cfg.kclEnableWalls, (x) => { this.cfg.kclEnableWalls = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show death barriers", this.cfg.kclEnableDeathBarriers, (x) => { this.cfg.kclEnableDeathBarriers = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show invisible walls", this.cfg.kclEnableInvisible, (x) => { this.cfg.kclEnableInvisible = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show item road/wall", this.cfg.kclEnableItemRoad, (x) => { this.cfg.kclEnableItemRoad = x; this.openKcl(this.currentKclFilename) })
		panel.addCheckbox(kclGroup, "Show effects/triggers", this.cfg.kclEnableEffects, (x) => { this.cfg.kclEnableEffects = x; this.openKcl(this.currentKclFilename) })
		panel.addSpacer(kclGroup)

		let hlOptions =
		[
			{ str: "None", value: 0 },
			{ str: "Trickable Road", value: 1 },
			{ str: "Horizontal Walls", value: 2 },
			{ str: "Barrel Roll Walls", value: 3 },
			{ str: "Custom", value: 4 },
		]
		panel.addSelectionDropdown(kclGroup, "Highlight", this.cfg.kclHighlighter, hlOptions, true, false, (x) => { this.cfg.kclHighlighter = x; this.refreshPanels() })
	
		if (this.cfg.kclHighlighter == 4)
		{
			const onBlur = (x) =>
			{
				this.openKcl(this.currentKclFilename)
				this.viewer.render()
				return x
			}
			
			let flagOptions = [{ str: "None", value: -1 }]
			for (let i = 0; i <= 0x1f; i++)
				flagOptions.push({ str: "(0x" + i.toString(16) + ") " + collisionTypeData[i].name, value: i })

			panel.addSelectionDropdown(kclGroup, "Base Type", this.hl.baseType, flagOptions, true, false, (x, i) => { this.hl.baseType = x; onBlur(null) })
			
			//panel.addSelectionNumericInput(kclGroup, "Base Type", 		 -1, 0x1f, this.hl.baseType, 		1.0, 0.0, true, false, (x) => { this.hl.baseType = x 		}, onBlur)
			panel.addSelectionNumericInput(kclGroup, "Variant", 	 	 -1, 0x7,  this.hl.basicEffect, 	1.0, 0.0, true, false, (x) => { this.hl.basicEffect = x 	}, onBlur)
			panel.addSelectionNumericInput(kclGroup, "BLIGHT Index", 	 -1, 0x7,  this.hl.blightEffect, 	1.0, 0.0, true, false, (x) => { this.hl.blightEffect = x 	}, onBlur)
			panel.addSelectionNumericInput(kclGroup, "Wheel Depth", 	 -1, 0x3,  this.hl.intensity, 		1.0, 0.0, true, false, (x) => { this.hl.intensity = x	 	}, onBlur)
			panel.addSelectionNumericInput(kclGroup, "Collision Effect", -1, 0x7,  this.hl.collisionEffect, 1.0, 0.0, true, false, (x) => { this.hl.collisionEffect = x }, onBlur)
		}
		else
		{
			this.hl.reset()
			this.openKcl(this.currentKclFilename)
		}
		
		this.refreshTitle()
		this.viewer.refreshPanels()
	}
	
	
	refreshTitle()
	{
		document.title =
			(this.currentKmpFilename == null ? "[New File]" : "[" + this.currentKmpFilename + "]") +
			(this.currentNotSaved ? "*" : "") +
			" -- Lorenzi's KMP Editor v" + remote.app.getVersion()
	}
	
	
	addPanel(name, open = true, onToggle = null, closable = false)
	{
		let panel = this.panels.find(p => p.name == name)
		if (panel != null)
		{
			panel.clearContent()
			return panel
		}
		
		panel = new Panel(this, this.sidePanelDiv, name, open, onToggle, closable, () => { this.viewer.render() })
		this.panels.push(panel)
		return panel
	}
	
	
	setNotSaved()
	{
		this.undoNeedsNewSlot = true
		
		if (!this.currentNotSaved)
		{
			this.currentNotSaved = true
			this.refreshTitle()
		}
	}
	
	
	setUndoPoint()
	{
		if (!this.undoNeedsNewSlot)
		{
			this.undoStack[this.undoPointer].subviewer = this.viewer.currentSubviewer
			return
		}

		this.undoStack.splice(this.undoPointer + 1, this.undoStack.length - this.undoPointer - 1)		
		
		this.undoStack.push({
			data: this.currentKmpData.clone(),
			subviewer: this.viewer.currentSubviewer,
			currentRouteIndex: this.viewer.subviewerRoutes.currentRouteIndex
		})
		
		this.undoPointer += 1
		this.undoNeedsNewSlot = false
		
		this.currentKmpData.refreshIndices(this.cfg.isBattleTrack)
	}
	
	
	resetUndoStack()
	{
		this.undoNeedsNewSlot = true
		this.undoStack = []
		this.undoPointer = -1
		
		this.currentKmpData.refreshIndices(this.cfg.isBattleTrack)
	}
	
	
	undo()
	{
		if (this.undoPointer <= 0)
			return
		
		this.setUndoPoint()
		
		this.undoPointer -= 1
		this.currentKmpData = this.undoStack[this.undoPointer].data.clone()
		this.currentKmpData.refreshIndices(this.cfg.isBattleTrack)
		this.viewer.setSubviewer(this.undoStack[this.undoPointer].subviewer)
		this.viewer.subviewerRoutes.currentRouteIndex = this.undoStack[this.undoPointer].currentRouteIndex
		
		this.setNotSaved()
		this.undoNeedsNewSlot = false
		this.viewer.setData(this.currentKmpData)
		this.viewer.render()
		this.refreshPanels()
	}
	
	
	redo()
	{
		if (this.undoPointer >= this.undoStack.length - 1)
			return
		
		this.undoPointer += 1
		this.currentKmpData = this.undoStack[this.undoPointer].data.clone()
		this.viewer.setSubviewer(this.undoStack[this.undoPointer].subviewer)
		this.viewer.subviewerRoutes.currentRouteIndex = this.undoStack[this.undoPointer].currentRouteIndex
		
		this.setNotSaved()
		this.undoNeedsNewSlot = false
		this.viewer.setData(this.currentKmpData)
		this.viewer.render()
		this.refreshPanels()
	}
	
	
	askSaveChanges()
	{
		if (!this.currentNotSaved)
			return true
		
		let result = remote.dialog.showMessageBox(remote.getCurrentWindow(),
		{
			type: "warning",
			title: "Unsaved Changes",
			message: "Save current changes?",
			buttons: ["Save", "Don't Save", "Cancel"],
			defaultId: 2,
			cancelId: 2
		})
		
		if (result == 0)
			return this.saveKmp(this.currentKmpFilename)
		else if (result == 1)
			return true
		else
			return false
	}
	
	
	newKmp()
	{
		if (!this.askSaveChanges())
			return
		
		this.currentKmpFilename = null
		this.currentKmpData = new KmpData()
		this.currentNotSaved = false
		this.cfg.isBattleTrack = false
		
		this.resetUndoStack()
		
		this.viewer.setData(this.currentKmpData)
		this.setDefaultModel()
		this.refreshPanels()
		this.viewer.render()
		this.noModelLoaded = true
	}


	askOpenKmp()
	{
		if (!this.askSaveChanges())
			return
		
		let result = remote.dialog.showOpenDialog(remote.getCurrentWindow(), { properties: ["openFile"], filters: [{ name: "KMP Files (*.kmp)", extensions: ["kmp"] }] })
		if (result)
			this.openKmp(result[0])
	}
	
	
	openKmp(filename)
	{
		// Detect when run from `npm start`
		if (filename == ".")
			return
		
		try
		{
			filename = filename.replace(new RegExp("\\\\", "g"), "/")
			this.currentKmpFilename = filename
			this.currentKmpData = KmpData.convertToWorkingFormat(KmpData.load(fs.readFileSync(filename)))
			this.currentNotSaved = false
			
			this.cfg.isBattleTrack = this.currentKmpData.isBattleTrack
			
			this.resetUndoStack()
			
			let kclFilename = this.currentKmpFilename.substr(0, this.currentKmpFilename.lastIndexOf("/")) + "/course.kcl"
			if (fs.existsSync(kclFilename))
				this.openKcl(kclFilename)
			else
				this.setDefaultModel()
			
			this.viewer.setData(this.currentKmpData)
			this.viewer.centerView()
			this.refreshPanels()
			this.viewer.render()
			this.noModelLoaded = false
		}
		catch (e)
		{
			console.error(e)
			alert("KMP open error!\n\n" + e)
			this.newKmp()
		}
	}
	
	
	saveKmp(filename)
	{
		if (filename == null)
			return this.saveKmpAs()
		
		try
		{
			let bytes = this.currentKmpData.convertToStorageFormat(this.cfg.isBattleTrack)
			fs.writeFileSync(filename, new Uint8Array(bytes))
			
			this.currentKmpFilename = filename
			this.currentNotSaved = false
			this.savedUndoSlot = this.undoPointer
			this.refreshPanels()
			return true
		}
		catch (e)
		{
			console.error(e)
			alert("KMP save error!\n\n" + e)
			return false
		}
	}
	
	
	saveKmpAs()
	{
		let result = remote.dialog.showSaveDialog(remote.getCurrentWindow(), { filters: [{ name: "KMP Files (*.kmp)", extensions: ["kmp"] }] })
		if (result)
			return this.saveKmp(result)
		
		return false
	}
	
	
	setDefaultModel()
	{
		let model = new ModelBuilder()
			.addCube(-5000, -5000, -3, 5000, 5000, 3)
			.calculateNormals()
		
		this.noModelLoaded = true
		this.viewer.setModel(model)
		this.viewer.centerView()
		this.currentKclFilename = null
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
				
				if (this.noModelLoaded)
					this.viewer.centerView()
				
				this.noModelLoaded = false
			}
		}
	}
	
	
	openBrres(filename)
	{
		if (filename == null)
			return
		
		let brresData = fs.readFileSync(filename)
		let modelBuilder = null
		try
		{
			modelBuilder = require("./util/brresLoader.js").BrresLoader.load(brresData)
		}
		catch (e)
		{
			window.alert("Error opening BRRES file!\n\n" + e.toString())
			return
		}
		
		this.viewer.setModel(modelBuilder)
		this.currentKclFilename = null
		
		if (this.noModelLoaded)
			this.viewer.centerView()
		
		this.noModelLoaded = false
	}
	
	
	openKcl(filename)
	{
		if (filename == null)
			return
		
		let kclData = fs.readFileSync(filename)
		let modelBuilder = KclLoader.load(kclData, this.cfg, this.hl)
		this.viewer.setModel(modelBuilder)
		this.currentKclFilename = filename
		
		if (this.noModelLoaded)
			this.viewer.centerView()
		
		this.noModelLoaded = false
	}
}


class Panel
{
	constructor(window, parentDiv, name, open = true, onToggle = null, closable = true, onRefreshView = null)
	{
		this.window = window
		this.parentDiv = parentDiv
		this.name = name
		this.closable = closable
		this.open = open
		this.onToggle = onToggle
		
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
		this.onRefreshView = (onRefreshView != null ? onRefreshView : () => { })
		
		this.onDestroy = []
		
		this.refreshOpen()
	}
	
	
	destroy()
	{
		for (let f of this.onDestroy)
			f()
		
		this.onDestroy = []
		
		if (this.panelDiv)
			this.parentDiv.removeChild(this.panelDiv)
	}
	
	
	clearContent()
	{
		for (let f of this.onDestroy)
			f()
		
		this.onDestroy = []
		
		while (this.contentDiv.lastChild)
			this.contentDiv.removeChild(this.contentDiv.lastChild)
	}
	
	
	setOpen(open)
	{
		let changed = (this.open != open)
		
		this.open = open
		this.refreshOpen()
		
		if (changed && this.onToggle != null)
			this.onToggle(this.open)
	}
	
	
	toggleOpen()
	{
		this.open = !this.open
		this.refreshOpen()
		
		if (this.onToggle != null)
			this.onToggle(this.open)
	}
	
	
	refreshOpen()
	{
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
	
	
	addSpacer(group, n=1)
	{
		for (let i=0; i < n; i++)
		{
			let div = document.createElement("div")
			div.className = "panelRowElement"
			
			if (group == null)
				this.contentDiv.appendChild(div)
			else
				group.appendChild(div)
		}
		return null
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
	
	
	addSelectionNumericInput(group, str, min = 0, max = 1, values = 0, step = 0.1, dragStep = 0.1, enabled = true, multiedit = false, onchange = null, modify = null)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let label = document.createElement("label")
		div.appendChild(label)
		
		if (!(values instanceof Array))
			values = [values]
		
		if (onchange == null)
			onchange = (x, i) => { }
		
		if (modify == null)
			modify = (x) => { return x }
		
		let input = document.createElement("input")
		input.className = "panelNumericInput"
		input.type = "input"
		input.value = (enabled && values.every(v => v === values[0]) ? values[0] : "")
		input.disabled = !enabled

		input.lastInput = input.value
		
		let inFocus = false
		input.onfocus = () => { inFocus = true; this.window.setUndoPoint() }
		input.onblur = () => { inFocus = false; this.window.setUndoPoint(); this.window.viewer.canvas.focus(); input.value = modify(input.lastInput) }
		input.onkeydown = (ev) => {
			if (inFocus)
			{
				if (ev.key === "Enter")
					input.value = modify(input.lastInput)
				else
					ev.stopPropagation()
			}
		}
		
		let safeParseFloat = (s) =>
		{
			let x = 0
			if (s.substring(0, 2) == '0x')
				x = parseInt(s, 16)
			else
				x = parseFloat(s)

			if (isNaN(x) || !isFinite(x))
				return 0
			
			return x
		}
		
		let clampValue = (x) =>
		{
			if (step != null)
				x = Math.round(x / step) * step
			
			x = Math.max(x, min)
			x = Math.min(x, max)
			return x
		}
		
		let valueDelta = 0
		
		input.oninput = () =>
		{
			if (!enabled)
				return
			
			valueDelta = 0
			
			for (let i = 0; i < values.length; i++)
				onchange(input.value != "" ? clampValue(safeParseFloat(input.value)) : values[i], i)
			
			input.lastInput = (input.value != "" ? clampValue(safeParseFloat(input.value)) : lastInput)

			this.onRefreshView()
		}
		
		let text = document.createElement("div")
		text.className = "panelNumericInputLabel"
		text.innerHTML = str
		
		let mouseDown = false
		let lastEv = null
		text.onmousedown = (ev) =>
		{
			if (!enabled)
				return
			
			lastEv = ev
			mouseDown = true
			this.window.setUndoPoint()
		}
		
		let onMouseUp = (ev) =>
		{
			if (!mouseDown)
				return
			
			mouseDown = false
		}
		
		let onMouseMove = (ev) =>
		{
			if (mouseDown && dragStep > 0)
			{
				let dy = lastEv.screenY - ev.screenY
				let value = safeParseFloat(input.value)
				
				valueDelta += (dy * dragStep)
				value += (dy * dragStep)
				value = clampValue(value)
				
				if (!multiedit)
				{
					input.value = modify(value.toFixed(5))
					for (let i = 0; i < values.length; i++)
						onchange(value, i)
				}
				else
				{
					input.value = values.every(v => v === values[0]) ? modify(clampValue(values[0] + valueDelta)) : ""
					for (let i = 0; i < values.length; i++)
						onchange(clampValue(values[i] + valueDelta), i)
				}
				
				lastEv = ev
				input.lastInput = input.value
				
				this.onRefreshView()
				
				ev.preventDefault()
			}
		}
		
		document.addEventListener("mousemove", onMouseMove)
		document.addEventListener("mouseup", onMouseUp)
		document.addEventListener("mouseleave", onMouseUp)
		
		this.onDestroy.push(() =>
		{
			document.removeEventListener("mousemove", onMouseMove)
			document.removeEventListener("mouseup", onMouseUp)
			document.removeEventListener("mouseleave", onMouseUp)
		})
		
		label.appendChild(text)
		label.appendChild(input)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return input
	}
	
	
	addSelectionDropdown(group, str, values = 0, options = [], enabled = true, multiedit = false, onchange = null)
	{
		let div = document.createElement("div")
		div.className = "panelRowElement"
		
		let label = document.createElement("label")
		div.appendChild(label)
		
		if (!(values instanceof Array))
			values = [values]
		
		if (onchange == null)
			onchange = (x, i) => { }
		
		let select = document.createElement("select")
		select.className = "panelSelect"
		select.disabled = !enabled
		
		for (let option of options)
		{
			let selectOption = document.createElement("option")
			selectOption.innerHTML = option.str
			selectOption.value = option.value
			select.appendChild(selectOption)
		}

		if (enabled && values.every(v => v === values[0]))
			select.selectedIndex = options.findIndex(op => op.value == values[0])
		else
			select.selectedIndex = -1
		
		select.onchange = () =>
		{
			if (select.selectedIndex < 0)
				return
			
			this.window.setUndoPoint()
			
			for (let i = 0; i < values.length; i++)
				onchange(options[select.selectedIndex].value, i)
			
			this.onRefreshView()
		}
		
		let text = document.createElement("div")
		text.className = "panelInputLabel"
		text.innerHTML = str
		
		label.appendChild(text)
		label.appendChild(select)
		
		if (group == null)
			this.contentDiv.appendChild(div)
		else
			group.appendChild(div)
		
		return select
	}
}


module.exports = { main, MainWindow, gMainWindow }