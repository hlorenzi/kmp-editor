const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerCheckpoints
{
	constructor(window, viewer, data)
	{
		this.window = window
		this.viewer = viewer
		this.data = data
		
		this.scene = new GfxScene()
		this.sceneAfter = new GfxScene()
		this.scenePanels = new GfxScene()
		this.sceneSidePanels = new GfxScene()
		
		this.hoveringOverPoint = null
		this.linkingPoints = false
		this.multiSelect = false
		
		this.zTop = 0
		this.zBottom = 0
		
		this.modelPoint = new ModelBuilder()
			.addSphere(-150, -150, -150, 150, 150, 150)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelPointSelection = new ModelBuilder()
			.addSphere(-250, -250, 250, 250, 250, -250)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.modelPath = new ModelBuilder()
			.addCylinder(-100, -100, 0, 100, 100, 1)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelArrow = new ModelBuilder()
			.addCone(-250, -250, -500, 250, 250, 0)
			.calculateNormals()
			.makeModel(viewer.gl)

		this.modelDirArrow = new ModelBuilder()
			.addCone(-100, -200, 0, 100, 200, 400, 8, new Vec3(1, 0, 0))
			.calculateNormals()
			.makeModel(viewer.gl)
		
		let panelFrontColor = [1, 1, 1, 1]
		let panelBackColor = [1, 1, 1, 0.5]
		this.modelPanel = new ModelBuilder()
			.addQuad(new Vec3(0, 0, 1), new Vec3(1, 0, 1), new Vec3(1, 0, 0), new Vec3(0, 0, 0), panelFrontColor, panelFrontColor, panelFrontColor, panelFrontColor)
			.addQuad(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(1, 0, 1), new Vec3(0, 0, 1), panelBackColor, panelBackColor, panelBackColor, panelBackColor)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.modelPanelWithoutBacksize = new ModelBuilder()
			.addQuad(new Vec3(0, 0, 1), new Vec3(1, 0, 1), new Vec3(1, 0, 0), new Vec3(0, 0, 0), panelFrontColor, panelFrontColor, panelFrontColor, panelFrontColor)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.renderers = []
	}
	
	
	setModel(model)
	{
		if (this.window.noModelLoaded)
		{
			let bbox = model.getBoundingBox()
			this.zTop = bbox.zMin - 1000
			this.refreshPanels()
		}
	}
	
	
	setData(data)
	{
		this.data = data
		this.refresh()
	}
	
	
	destroy()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Checkpoints", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
		
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Checkpoint")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Extend Path")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")

		panel.addCheckbox(null, "Render vertical panels", this.viewer.cfg.checkpointsEnableVerticalPanels, (x) => this.viewer.cfg.checkpointsEnableVerticalPanels = x)
		panel.addCheckbox(null, "Render respawn point links", this.viewer.cfg.checkpointsEnableRespawnPointLinks, (x) => this.viewer.cfg.checkpointsEnableRespawnPointLinks = x)
		panel.addCheckbox(null, "Render direction indicators", this.viewer.cfg.checkpointsEnableDirectionArrows, (x) => this.viewer.cfg.checkpointsEnableDirectionArrows = x)
		panel.addSpacer(null)

		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(U) Unlink Selected", () => this.unlinkSelectedPoints())
		panel.addButton(null, "(S) Toggle Show Loaded Checkpoints", () => this.toggleShowLoaded())
		panel.addButton(null, "(E) Clear Respawn Point Assignment", () => this.clearRespawnPoints())
		panel.addButton(null, "(R) Assign Selected Respawn Point", () => this.assignRespawnPoints())
		panel.addSpacer(null)

		panel.addSelectionNumericInput(null, "Editing Y", -1000000, 1000000, -this.zTop, null, 100.0, true, false, (x, i) => { this.zTop = -x })

		let selectedPoints = this.data.checkpointPoints.nodes.filter(p => p.selected[0] || p.selected[1])
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)
		
		if (selectedPoints.length == 1)
		{
			const formatNum = (x) =>
			{
				if (x === null || x === undefined)
					return ""
				
				return x.toString()
			}
			
			const formatNumHex = (x) =>
			{
				if (x === null || x === undefined)
					return ""
				
				return x.toString() + " (0x" + x.toString(16) + ")"
			}

			const setPath = (x) => 
			{
				if (selectedPoints[0].pointIndex != 0 && selectedPoints[0].prev.length == 1 && selectedPoints[0].prev[0].node.next.length == 1)
				{
					this.window.setNotSaved()
					selectedPoints[0].firstInPath = x
					this.refresh()
				}
				else
				{
					selectedPoints[0].firstInPath = true
				}
			}

			const getCompletion = () =>
			{
				let maxLayer = this.data.checkpointPoints.maxLayer
				let groupCompletion = selectedPoints[0].pathPointIndex / selectedPoints[0].pathLen
				let overallCompletion = (groupCompletion + selectedPoints[0].pathLayer - 1) / maxLayer
				return overallCompletion !== NaN ? (100 * overallCompletion).toFixed(4).toString() + "%" : "N/A"
			}
			
			panel.addText(selectionGroup, "<strong>CKPH Index:</strong> " + formatNumHex(selectedPoints[0].pathIndex) + ", point #" + formatNum(selectedPoints[0].pathPointIndex))
			panel.addText(selectionGroup, "<strong>CKPT Index:</strong> " + formatNumHex(selectedPoints[0].pointIndex))
			panel.addText(selectionGroup, "<strong>Group Layer:</strong> " + formatNum(selectedPoints[0].pathLayer))
			panel.addText(selectionGroup, "<strong>Lap Completion:</strong> " + getCompletion())
			panel.addCheckbox(selectionGroup, "Start new checkpoint group", selectedPoints[0].firstInPath, setPath)
		}
		
		panel.addSelectionNumericInput(selectionGroup,    "X1", -1000000, 1000000, selectedPoints.map(p =>  p.pos[0].x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos[0].x =  x })
		panel.addSelectionNumericInput(selectionGroup,    "Z1", -1000000, 1000000, selectedPoints.map(p => -p.pos[0].y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos[0].y = -x })
		panel.addSelectionNumericInput(selectionGroup,    "X2", -1000000, 1000000, selectedPoints.map(p =>  p.pos[1].x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos[1].x =  x })
		panel.addSelectionNumericInput(selectionGroup,    "Z2", -1000000, 1000000, selectedPoints.map(p => -p.pos[1].y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos[1].y = -x })
		panel.addSelectionNumericInput(selectionGroup,  "Type",        0,     255, selectedPoints.map(p =>  p.type),     null, 1.0,   enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].type     =  x })
		
		let respawnCount = this.data.respawnPoints.nodes.length
		const respawnIndex = (node) => { return this.data.respawnPoints.nodes.indexOf(node.respawnNode) }
		panel.addSelectionNumericInput(selectionGroup, "Respawn", 0, respawnCount - 1, selectedPoints.map(p => respawnIndex(p)), null, 1.0, enabled, multiedit, (x, i) => 
			{ this.window.setNotSaved(); selectedPoints[i].respawnNode = this.data.respawnPoints.nodes[x] })
		
		panel.addText(selectionGroup, "<strong>Type 0:</strong> Lap Counter")
		panel.addText(selectionGroup, "<strong>Type 1-254:</strong> Key Checkpoints")
		panel.addText(selectionGroup, "<strong>Type 255:</strong> Regular Checkpoint")
	}
	
	
	refresh()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			if (point.selected === undefined)
			{
				point.selected = [false, false]
				point.moveOrigin = [point.pos[0], point.pos[1]]
			}
			
			let renderer1 = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.material)
			
			let renderer2 = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.materialColor)
				
			point.renderer = [renderer1, renderer2]
			
			point.rendererCheckbar = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPath)
				.setMaterial(this.viewer.material)

			point.rendererDirArrow = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelDirArrow)
				.setMaterial(this.viewer.material)
				
			point.rendererCheckpanel = new GfxNodeRendererTransform()
				.attach(this.scenePanels.root)
				.setModel(this.modelPanelWithoutBacksize)
				.setMaterial(this.viewer.material)
			
			point.rendererRespawnLink = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPath)
				.setMaterial(this.viewer.material)
				
			let rendererSelected1 = new GfxNodeRendererTransform()
				.attach(this.sceneAfter.root)
				.setModel(this.modelPointSelection)
				.setMaterial(this.viewer.materialUnshaded)
				.setEnabled(false)
				
			let rendererSelectedCore1 = new GfxNodeRenderer()
				.attach(rendererSelected1)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.material)
				
			let rendererSelected2 = new GfxNodeRendererTransform()
				.attach(this.sceneAfter.root)
				.setModel(this.modelPointSelection)
				.setMaterial(this.viewer.materialUnshaded)
				.setEnabled(false)
				
			let rendererSelectedCore2 = new GfxNodeRenderer()
				.attach(rendererSelected2)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.material)
				
			point.rendererSelected = [rendererSelected1, rendererSelected2]
			point.rendererSelectedCore = [rendererSelectedCore1, rendererSelectedCore2]
			
			this.renderers.push(renderer1)
			this.renderers.push(renderer2)
			this.renderers.push(rendererSelected1)
			this.renderers.push(rendererSelected2)
			this.renderers.push(point.rendererCheckbar)
			this.renderers.push(point.rendererDirArrow)
			this.renderers.push(point.rendererCheckpanel)
			this.renderers.push(point.rendererRespawnLink)
				
			point.rendererOutgoingPaths = []
			point.rendererOutgoingPathArrows = []
			point.rendererOutgoingPathPanels = []
			point.rendererOutgoingQuads = []
			
			for (let next of point.next)
			{
				let rPath1 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath)
					.setMaterial(this.viewer.material)
					
				let rArrow1 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelArrow)
					.setMaterial(this.viewer.material)
					
				let rPath2 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath)
					.setMaterial(this.viewer.material)
					
				let rArrow2 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelArrow)
					.setMaterial(this.viewer.material)
					
				let rPanel1 = new GfxNodeRendererTransform()
					.attach(this.sceneSidePanels.root)
					.setModel(this.modelPanel)
					.setMaterial(this.viewer.material)
					
				let rPanel2 = new GfxNodeRendererTransform()
					.attach(this.sceneSidePanels.root)
					.setModel(this.modelPanel)
					.setMaterial(this.viewer.material)
				/*
				let modelQuad = new ModelBuilder()
					.addQuad(point.pos[0], point.pos[1], next.node.pos[1], next.node.pos[0])
					.calculateNormals()
					.makeModel(this.viewer.gl)
				let rQuad = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(modelQuad)
					.setMaterial(this.viewer.material)
				*/
				point.rendererOutgoingPaths.push([rPath1, rPath2])
				point.rendererOutgoingPathArrows.push([rArrow1, rArrow2])
				point.rendererOutgoingPathPanels.push([rPanel1, rPanel2])
				//point.rendererOutgoingQuads.push(rQuad)
					
				this.renderers.push(rPath1)
				this.renderers.push(rPath2)
				this.renderers.push(rArrow1)
				this.renderers.push(rArrow2)
				this.renderers.push(rPanel1)
				this.renderers.push(rPanel2)
				//this.renderers.push(rQuad)
			}
		}
		
		this.refreshPanels()
	}
	
	
	getHoveringOverElement(cameraPos, ray, distToHit, includeSelected = true)
	{
		let elem = null
		
		let minDistToCamera = distToHit + 1000
		let minDistToPoint = 1000000
		for (let which = 0; which < 2; which++)
		{
			for (let point of this.data.checkpointPoints.nodes)
			{
				if (!includeSelected && point.selected[which])
					continue
				
				let distToCamera = point.pos[which].sub(cameraPos).magn()
				if (distToCamera >= minDistToCamera)
					continue
				
				let scale = this.viewer.getElementScale(point.pos[which])
				
				let pointDistToRay = Geometry.linePointDistance(ray.origin, ray.direction, point.pos[which])
				
				if (pointDistToRay < 150 * scale * 4 && pointDistToRay < minDistToPoint)
				{
					elem = { point, which }
					minDistToCamera = distToCamera
					minDistToPoint = pointDistToRay
				}
			}
		}
		
		return elem
	}
	
	
	selectAll()
	{
		for (let point of this.data.checkpointPoints.nodes)
			point.selected = [true, true]
		
		this.refreshPanels()
	}
	
	
	unselectAll()
	{
		for (let point of this.data.checkpointPoints.nodes)
			point.selected = [false, false]
		
		this.refreshPanels()
	}
	
	
	toggleAllSelection()
	{
		let hasSelection = (this.data.checkpointPoints.nodes.find(p => p.selected[0] || p.selected[1]) != null)
		
		if (hasSelection)
			this.unselectAll()
		else
			this.selectAll()
	}
	
	
	deleteSelectedPoints()
	{
		let pointsToDelete = []
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			if (!point.selected[0] && !point.selected[1])
				continue
			
			pointsToDelete.push(point)
		}
		
		for (let point of pointsToDelete)
		{
			let nextPoints = point.next.map((x) => x)
			let prevPoints = point.prev.map((x) => x)

			this.data.checkpointPoints.removeNode(point)
			
			for (let next of nextPoints)
			{
				if (next.node.pointIndex != 0 && next.node.prev.length == 1 && next.node.prev[0].node.next.length == 1)
					next.node.firstInPath = false
				else
					next.node.firstInPath = true
			}
			
			for (let prev of prevPoints)
				for (let adj of prev.node.next)
				{
					if (adj.node.pointIndex != 0 && adj.node.prev.length == 1 && adj.node.prev[0].node.next.length == 1)
						adj.node.firstInPath = false
					else
						adj.node.firstInPath = true
				}
		}

		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	unlinkSelectedPoints()
	{
		for (let point of this.data.checkpointPoints.nodes)
		{
			if (!point.selected[0] && !point.selected[1])
				continue
			
			let nextPointsToUnlink = []
			
			for (let next of point.next)
			{
				if (!next.node.selected[0] && !next.node.selected[1])
					continue
				
				nextPointsToUnlink.push(next.node)
			}
			
			for (let next of nextPointsToUnlink)
			{
				this.data.checkpointPoints.unlinkNodes(point, next)

				if (next.pointIndex != 0 && next.prev.length == 1 && next.prev[0].node.next.length == 1)
					next.firstInPath = false
				else
					next.firstInPath = true
			}
			
			for (let next of point.next)
			{
				if (next.node.pointIndex != 0 && next.node.prev.length == 1 && next.node.prev[0].node.next.length == 1)
					next.node.firstInPath = false
				else
					next.node.firstInPath = true
			}
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	clearRespawnPoints()
	{
		for (let point of this.data.checkpointPoints.nodes)
		{
			if (!point.selected[0] && !point.selected[1])
				continue
			
			point.respawnNode = null
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	assignRespawnPoints()
	{
		let selectedRespawnNodes = this.data.respawnPoints.nodes.filter(p => p.selected === true)
		if (selectedRespawnNodes.length != 1)
		{
			alert("Select a single point using the Respawn Points panel.")
			return
		}
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			if (!point.selected[0] && !point.selected[1])
				continue
			
			point.respawnNode = selectedRespawnNodes[0]
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}


	toggleShowLoaded()
	{
		let notAllRendered = this.data.checkpointPoints.nodes.some(p => !p.isRendered)

		for (let point of this.data.checkpointPoints.nodes)
			point.isRendered = notAllRendered

		if (notAllRendered)
			return


		let selectedPoints = []

		for (let point of this.data.checkpointPoints.nodes)
		{
			if (!point.selected[0] && !point.selected[1])
				continue

			point.isRendered = true
			selectedPoints.push(point)
		}

		while (selectedPoints.length > 0)
		{
			let point = selectedPoints.pop()

			for (let prev of point.prev)
			{
				if (prev.node.isRendered)
					continue

				prev.node.isRendered = true

				if (prev.node.type == 255)
					selectedPoints.push(prev.node)
			}

			for (let next of point.next)
			{
				if (next.node.isRendered)
					continue

				next.node.isRendered = true

				if (next.node.type == 255)
					selectedPoints.push(next.node)
			}
		}
	}
	
	
	onKeyDown(ev)
	{
		if (ev.ctrlKey)
			return false
		
		switch (ev.key)
		{
			case "A":
			case "a":
				this.toggleAllSelection()
				return true
			
			case "Backspace":
			case "Delete":
			case "X":
			case "x":
				this.deleteSelectedPoints()
				return true
				
			case "U":
			case "u":
				this.unlinkSelectedPoints()
				return true
				
			case "E":
			case "e":
				this.clearRespawnPoints()
				return true

			case "S":
			case "s":
				this.toggleShowLoaded()
				return true
				
			case "R":
			case "r":
				this.assignRespawnPoints()
				return true
		}
		
		return false
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit, mouse3DPos)
	{
		this.linkingPoints = false
		
		for (let point of this.data.checkpointPoints.nodes)
			point.moveOrigin = [point.pos[0], point.pos[1]]
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (ev.altKey || (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.point.selected[hoveringOverElem.which])))
			this.unselectAll()

		if (ev.ctrlKey)
			this.multiSelect = true
		
		if (hoveringOverElem != null)
		{
			if (ev.altKey)
			{
				if (hoveringOverElem.point.next.length >= this.data.checkpointPoints.maxNextNodes)
				{
					alert("Node link error!\n\nMax outgoing connections to a point surpassed (maximum " + this.data.checkpointPoints.maxNextNodes + ")")
					return
				}

				let newPoint = this.data.checkpointPoints.addNode()
				newPoint.pos = [hoveringOverElem.point.pos[0], hoveringOverElem.point.pos[1]]
				newPoint.respawnNode = hoveringOverElem.point.respawnNode
				
				this.data.checkpointPoints.linkNodes(hoveringOverElem.point, newPoint)

				if (hoveringOverElem.point.next.length > 1)
					for (let next of hoveringOverElem.point.next)
						next.node.firstInPath = true
				
				this.refresh()
				
				newPoint.selected = [true, true]
				this.linkingPoints = true
				this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
				this.viewer.setCursor("-webkit-grabbing")
				this.refreshPanels()
				this.window.setNotSaved()
			}
			else
			{
				hoveringOverElem.point.selected[hoveringOverElem.which] = true
				this.refreshPanels()
				this.viewer.setCursor("-webkit-grabbing")
			}
		}
		else if (ev.altKey)
		{
			let newPoint = this.data.checkpointPoints.addNode()
			
			let zTopHit = Geometry.lineZPlaneIntersection(ray.origin, ray.direction, this.zTop)
			
			newPoint.pos[0] = zTopHit
			newPoint.pos[1] = zTopHit.add(new Vec3(1000, 0, 0))
			
			newPoint.pos[0].z = 0
			newPoint.pos[1].z = 0

			newPoint.firstInPath = true
			
			this.refresh()
			newPoint.selected[0] = true
			newPoint.selected[1] = true
			this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
			this.viewer.setCursor("-webkit-grabbing")
			this.refreshPanels()
			this.window.setNotSaved()
		}
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		if (!this.viewer.mouseDown)
		{
			let lastHover = this.hoveringOverPoint
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
			{
				this.viewer.setCursor("-webkit-grab")
			
				if (lastHover == null ||
					this.hoveringOverPoint.point != lastHover.point ||
					this.hoveringOverPoint.which != lastHover.which)
					this.viewer.render()
			}
			else if (lastHover != null)
				this.viewer.render()
		}
		else if (ev.ctrlKey)
		{
			let lastHover = this.hoveringOverPoint
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
			{
				this.viewer.setCursor("-webkit-grab")
				this.hoveringOverPoint.point.selected[this.hoveringOverPoint.which] = true
				this.refreshPanels()

				if (lastHover == null ||
					this.hoveringOverPoint.point != lastHover.point ||
					this.hoveringOverPoint.which != lastHover.which)
					this.viewer.render()
			}
			else if (lastHover != null)
				this.viewer.render()
		}
		else if (!this.multiSelect && this.viewer.mouseAction == "move")
		{
			let linkToPoint = this.getHoveringOverElement(cameraPos, ray, distToHit, false)
			
			for (let point of this.data.checkpointPoints.nodes)
			{
				for (let which = 0; which < 2; which++)
				{
					if (!point.selected[which])
						continue
					
					this.window.setNotSaved()
					this.viewer.setCursor("-webkit-grabbing")
				
					if (this.linkingPoints && linkToPoint != null)
					{
						point.pos[which] = linkToPoint.point.pos[which]
					}
					else
					{
						let screenPosMoved = this.viewer.pointToScreen(point.moveOrigin[which])
						screenPosMoved.x += this.viewer.mouseMoveOffsetPixels.x
						screenPosMoved.y += this.viewer.mouseMoveOffsetPixels.y
						let pointRayMoved = this.viewer.getScreenRay(screenPosMoved.x, screenPosMoved.y)
						
						point.pos[which] = Geometry.lineZPlaneIntersection(pointRayMoved.origin, pointRayMoved.direction, this.zTop)
					}
				}
			}
			
			this.refreshPanels()
		}
	}
	
	
	onMouseUp(ev, x, y)
	{
		this.multiSelect = false

		if (this.viewer.mouseAction == "move")
		{
			if (this.linkingPoints)
			{
				let pointBeingLinked = this.data.checkpointPoints.nodes.find(p => p.selected[0] || p.selected[1])
				if (pointBeingLinked == null)
					return
				
				let pointBeingLinkedTo = this.data.checkpointPoints.nodes.find(p =>
					p != pointBeingLinked &&
					(p.pos[0] == pointBeingLinked.pos[0] ||
					p.pos[0] == pointBeingLinked.pos[1] ||
					p.pos[1] == pointBeingLinked.pos[0] ||
					p.pos[1] == pointBeingLinked.pos[1]))
				
				if (pointBeingLinkedTo != null)
				{
					this.data.checkpointPoints.removeNode(pointBeingLinked)

					if (pointBeingLinkedTo.prev.length >= this.data.checkpointPoints.maxPrevNodes)
					{
						alert("Node link error!\n\nMax incoming connections to a point surpassed (maximum " + this.data.checkpointPoints.maxPrevNodes + ")")
						this.refresh()
						return
					}

					this.data.checkpointPoints.linkNodes(pointBeingLinked.prev[0].node, pointBeingLinkedTo)

					if (pointBeingLinkedTo.pointIndex != 0 && pointBeingLinkedTo.prev.length == 1 && pointBeingLinkedTo.prev[0].node.next.length == 1)
						pointBeingLinkedTo.firstInPath = false
					else
						pointBeingLinkedTo.firstInPath = true

					this.refresh()
					this.window.setNotSaved()
				}
			}
		}
	}
	
	
	drawAfterModel()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		let camera = this.viewer.getCurrentCamera()
		
		let setupPanelMatrices = (renderer, v1, v2) =>
		{
			let v = v2.sub(v1)
			let matrixScale = Mat4.scale(v.magn(), 1, this.zBottom - this.zTop)
			let matrixAlign = Mat4.rotationFromTo(new Vec3(1, 0, 0), v.normalize())
			let matrixTranslate = Mat4.translation(v1.x, v1.y, v1.z)
			
			renderer.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
		}
		
		let setupPathMatrices = (renderer, scale, v1, v2) =>
		{
			let v = v2.sub(v1)
			let matrixScale = Mat4.scale(scale, scale, v.magn())
			let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), v.normalize())
			let matrixTranslate = Mat4.translation(v1.x, v1.y, v1.z)
			
			renderer.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
		}

		let setupArrowMatrices = (renderer, scale, v1, v2) =>
		{
			let midpoint = v1.add(v2).scale(0.5)
			let facing = v2.sub(v1).normalize().cross(new Vec3(0, 0, -1))

			let matrixScale = Mat4.scale(scale, scale, scale)
			let matrixAlign = Mat4.rotationFromTo(new Vec3(1, 0, 0), facing)
			let matrixTranslate = Mat4.translation(midpoint.x, midpoint.y, midpoint.z)

			renderer.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
		}
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			point.pos[0].z = this.zTop
			point.pos[1].z = this.zTop
		}	
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			let scales = [0, 0]
			let prevIsRendered = point.prev.some(p => p.node.isRendered)
			
			for (let which = 0; which < 2; which++)
			{
				let hovering = (this.hoveringOverPoint != null && this.hoveringOverPoint.point == point && this.hoveringOverPoint.which == which)
				let scale = (hovering ? 1.5 : 1) * this.viewer.getElementScale(point.pos[which])
				scales[which] = scale
				
				point.renderer[which]
					.setTranslation(point.pos[which])
					.setScaling(new Vec3(scale, scale, scale))
					.setDiffuseColor(point.type == 0 ? [1, 0.5, 1, 1] : point.type != 0xff ? [1, 0, 1, 1] : [0, 0, 1, 1])
					.setEnabled(point.isRendered || prevIsRendered)
				
				for (let n = 0; n < point.next.length; n++)
				{
					let nextPos = point.next[n].node.pos[which]
					
					let scale2 = Math.min(scale, this.viewer.getElementScale(nextPos))
					
					let matrixScale = Mat4.scale(scale2, scale2, nextPos.sub(point.pos[which]).magn())
					let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), nextPos.sub(point.pos[which]).normalize())
					let matrixTranslate = Mat4.translation(point.pos[which].x, point.pos[which].y, point.pos[which].z)
					
					let matrixScaleArrow = Mat4.scale(scale2, scale2, scale2)
					let matrixTranslateArrow = Mat4.translation(nextPos.x, nextPos.y, nextPos.z)
					
					point.rendererOutgoingPaths[n][which]
						.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
						.setDiffuseColor(point.next[n].node.firstInPath ? [0, 0.8, 0.7, 1] : [0, 0.5, 1, 1])
						.setEnabled(point.isRendered)
						
					point.rendererOutgoingPathArrows[n][which]
						.setCustomMatrix(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
						.setDiffuseColor(point.next[n].node.firstInPath ? [0, 0.9, 0.8, 1] : [0, 0.75, 1, 1])
						.setEnabled(point.isRendered)
						
					setupPanelMatrices(point.rendererOutgoingPathPanels[n][which], point.pos[which], nextPos)
					point.rendererOutgoingPathPanels[n][which].setDiffuseColor([0, 0.25, 1, 0.3])
						.setEnabled(point.isRendered)
					/*
					point.rendererOutgoingQuads[n]
						.setTranslation(new Vec3(0, 0, this.zTop))
						.setDiffuseColor(point.type == 0 ? [1, 0.5, 1, 0.6] : point.type != 0xff ? [1, 0.25, 1, 0.6] : [0, 0.25, 1, 0.6])
						.setEnabled(true)
					*/
				}
			}
			
			let barScale = (this.hoveringOverPoint != null && this.hoveringOverPoint.point == point ? 1.5 : 1) * Math.min(scales[0], scales[1]) / 1.5
			
			setupPathMatrices(point.rendererCheckbar, barScale, point.pos[0], point.pos[1])
			point.rendererCheckbar
				.setDiffuseColor(point.type == 0 ? [1, 0.5, 1, 1] : point.type != 0xff ? [1, 0, 1, 1] : [0, 0, 1, 1])
				.setEnabled(point.isRendered || prevIsRendered)
			
			setupPanelMatrices(point.rendererCheckpanel, point.pos[0], point.pos[1])
			point.rendererCheckpanel
				.setDiffuseColor(point.type == 0 ? [1, 0.5, 1, 0.6] : point.type != 0xff ? [1, 0.25, 1, 0.6] : [0, 0.25, 1, 0.6])
				.setEnabled(point.isRendered || prevIsRendered)
			
			setupArrowMatrices(point.rendererDirArrow, barScale, point.pos[0], point.pos[1])
			point.rendererDirArrow
				.setDiffuseColor(point.type == 0 ? [1, 0.5, 1, 1] : point.type != 0xff ? [1, 0, 1, 1] : [0, 0, 1, 1])
				.setEnabled(this.viewer.cfg.checkpointsEnableDirectionArrows && (point.isRendered || prevIsRendered))
			
			let respawnNode = point.respawnNode
			if (respawnNode == null && this.data.respawnPoints.nodes.length > 0)
				respawnNode = this.data.respawnPoints.nodes[0]
			
			if (respawnNode != null)
			{
				setupPathMatrices(point.rendererRespawnLink, barScale, point.pos[0], respawnNode.pos)
				
				point.rendererRespawnLink
					.setDiffuseColor([0.85, 0.85, 0, 1])
					.setEnabled(this.viewer.cfg.checkpointsEnableRespawnPointLinks && point.isRendered)
			}
			else
				point.rendererRespawnLink.setEnabled(false)
		}
		
		this.scene.render(this.viewer.gl, camera)
		
		if (this.viewer.cfg.checkpointsEnableVerticalPanels)
		{
			this.scenePanels.render(this.viewer.gl, camera)
			this.sceneSidePanels.render(this.viewer.gl, camera)
		}
		
		for (let point of this.data.checkpointPoints.nodes)
		{
			for (let which = 0; which < 2; which++)
			{
				let hovering = (this.hoveringOverPoint != null && this.hoveringOverPoint.point == point && this.hoveringOverPoint.which == which)
				let scale = (hovering ? 1.5 : 1) * this.viewer.getElementScale(point.pos[which])
				
				point.rendererSelected[which]
					.setTranslation(point.pos[which])
					.setScaling(new Vec3(scale, scale, scale))
					.setDiffuseColor([0.5, 0.5, 1, 1])
					.setEnabled(point.selected[which] && (point.isRendered || prevIsRendered))
					
				point.rendererSelectedCore[which]
					.setDiffuseColor([0, 0, 1, 1])
			}
		}
		
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, camera)
	}
}


if (module)
	module.exports = { ViewerCheckpoints }