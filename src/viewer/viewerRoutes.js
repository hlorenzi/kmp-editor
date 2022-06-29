const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerRoutes
{
	constructor(window, viewer, data)
	{
		this.window = window
		this.viewer = viewer
		this.data = data
		
		this.scene = new GfxScene()
		this.sceneAfter = new GfxScene()
		this.sceneSizeCircles = new GfxScene()
		
		this.hoveringOverPoint = null
		this.linkingPoints = false
		
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
			
		this.modelSizeCircle = new ModelBuilder()
			.addSphere(-1, -1, -1, 1, 1, 1, 8)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.renderers = []
		
		this.currentRouteIndex = 0
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
		let panel = this.window.addPanel("Routes", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
	
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Extend Path")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(U) Unlink Selected", () => this.unlinkSelectedPoints())
		
		let routeOptions = []
		for (let i = 0; i < this.data.routes.length; i++)
			routeOptions.push({ str: "Route " + i + " (0x" + i.toString(16) + ")", value: i })
		
		panel.addText(null, "⚠️ <strong>Does not currently auto-manage route references from objects, cameras, and areas!</strong>")
		panel.addSelectionDropdown(null, "Current", this.currentRouteIndex, routeOptions, true, false, (x, i) => { this.currentRouteIndex = x; this.refresh() })
		panel.addButton(null, "Create New Route", () => this.createRoute())
		panel.addButton(null, "Delete Current Route", () => this.deleteRoute())
		
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		let setting1Options =
		[
			{ str: "Straight Edges", value: 0 },
			{ str: "Curved Edges", value: 1 },
		]
		panel.addSelectionDropdown(null, "Setting 1", route.setting1, setting1Options, true, false, (x, i) => { this.window.setNotSaved(); route.setting1 = x; this.refresh() })
		
		let setting2Options =
		[
			{ str: "Cyclic Motion", value: 0 },
			{ str: "Back-and-Forth Motion", value: 1 },
		]
		panel.addSelectionDropdown(null, "Setting 2", route.setting2, setting2Options, true, false, (x, i) => { this.window.setNotSaved(); route.setting2 = x })
		
		if (route.points.nodes.length < 2 || route.setting1 && route.points.nodes.length < 3)
			panel.addText(null, "⚠️ <strong>WARNING! Less than " + (2 + route.setting1) + " points may cause a crash!</strong>")

		let selectedPoints = route.points.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)
		panel.addSelectionNumericInput(selectionGroup,    "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,    "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,    "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		
		panel.addSelectionNumericInput(selectionGroup, "Setting 1", 0, 0xffff, selectedPoints.map(p => p.setting1), null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
		panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 0xffff, selectedPoints.map(p => p.setting2), null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
	}
	
	
	refresh()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
		
		if (this.currentRouteIndex >= 0 && this.currentRouteIndex < this.data.routes.length)
		{
			let route = this.data.routes[this.currentRouteIndex]
			
			for (let point of route.points.nodes)
			{
				if (point.selected === undefined)
				{
					point.selected = false
					point.moveOrigin = point.pos
				}
				
				point.renderer = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPoint)
					.setMaterial(this.viewer.material)
				
				point.rendererSelected = new GfxNodeRendererTransform()
					.attach(this.sceneAfter.root)
					.setModel(this.modelPointSelection)
					.setMaterial(this.viewer.materialUnshaded)
					.setEnabled(false)
					
				point.rendererSelectedCore = new GfxNodeRenderer()
					.attach(point.rendererSelected)
					.setModel(this.modelPoint)
					.setMaterial(this.viewer.material)
					
				this.renderers.push(point.renderer)
				this.renderers.push(point.rendererSelected)
					
				point.rendererOutgoingPaths = []
				point.rendererOutgoingPathArrows = []
				
				for (let next of point.next)
				{
					let rPath = new GfxNodeRendererTransform()
						.attach(this.scene.root)
						.setModel(this.modelPath)
						.setMaterial(this.viewer.material)
						
					let rArrow = new GfxNodeRendererTransform()
						.attach(this.scene.root)
						.setModel(this.modelArrow)
						.setMaterial(this.viewer.material)
						
					point.rendererOutgoingPaths.push(rPath)
					point.rendererOutgoingPathArrows.push(rArrow)
						
					this.renderers.push(rPath)
					this.renderers.push(rArrow)
				}
			}
		}
		
		this.refreshPanels()
	}
	
	
	getHoveringOverElement(cameraPos, ray, distToHit, includeSelected = true)
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		let elem = null
		
		let minDistToCamera = distToHit + 1000
		let minDistToPoint = 1000000
		for (let point of route.points.nodes)
		{
			if (!includeSelected && point.selected)
				continue
			
			let distToCamera = point.pos.sub(cameraPos).magn()
			if (distToCamera >= minDistToCamera)
				continue
			
			let scale = this.viewer.getElementScale(point.pos)
			
			let pointDistToRay = Geometry.linePointDistance(ray.origin, ray.direction, point.pos)
			
			if (pointDistToRay < 150 * scale * 4 && pointDistToRay < minDistToPoint)
			{
				elem = point
				minDistToCamera = distToCamera
				minDistToPoint = pointDistToRay
			}
		}
		
		return elem
	}
	
	
	createRoute()
	{
		this.data.addNewRoute()
		this.currentRouteIndex = this.data.routes.length - 1
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	deleteRoute()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		this.data.routes.splice(this.currentRouteIndex, 1)
		this.currentRouteIndex = Math.min(this.currentRouteIndex, this.data.routes.length - 1)
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	selectAll()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		for (let point of route.points.nodes)
			point.selected = true
		
		this.refreshPanels()
	}
	
	
	unselectAll()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		for (let point of route.points.nodes)
			point.selected = false
		
		this.refreshPanels()
	}
	
	
	toggleAllSelection()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		let hasSelection = (route.points.nodes.find(p => p.selected) != null)
		
		if (hasSelection)
			this.unselectAll()
		else
			this.selectAll()
	}
	
	
	deleteSelectedPoints()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		let pointsToDelete = []
		
		for (let point of route.points.nodes)
		{
			if (!point.selected)
				continue
			
			pointsToDelete.push(point)
		}
		
		for (let point of pointsToDelete)
			route.points.removeNode(point)
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	unlinkSelectedPoints()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		for (let point of route.points.nodes)
		{
			if (!point.selected)
				continue
			
			let nextPointsToUnlink = []
			
			for (let next of point.next)
			{
				if (!next.node.selected)
					continue
				
				nextPointsToUnlink.push(next.node)
			}
			
			for (let next of nextPointsToUnlink)
				route.points.unlinkNodes(point, next)
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	onKeyDown(ev)
	{
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
		}
		
		return false
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit, mouse3DPos)
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		this.linkingPoints = false
		
		for (let point of route.points.nodes)
			point.moveOrigin = point.pos
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (ev.altKey || (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.selected)))
			this.unselectAll()
		
		if (hoveringOverElem != null)
		{
			if (ev.altKey && hoveringOverElem.next.length == 0)
			{
				let newPoint = route.points.addNode()
				newPoint.pos = hoveringOverElem.pos
				newPoint.setting1 = hoveringOverElem.setting1
				newPoint.setting2 = hoveringOverElem.setting2
				
				route.points.linkNodes(hoveringOverElem, newPoint)
				
				this.refresh()
				
				newPoint.selected = true
				this.linkingPoints = true
				this.viewer.setCursor("-webkit-grabbing")
				this.refreshPanels()
				this.window.setNotSaved()
			}
			else
			{
				hoveringOverElem.selected = true
				this.refreshPanels()
				this.viewer.setCursor("-webkit-grabbing")
			}
		}
		else if (ev.altKey)
		{
			let newPoint = route.points.addNode()
			newPoint.pos = mouse3DPos
			
			this.refresh()
			newPoint.selected = true
			this.viewer.setCursor("-webkit-grabbing")
			this.refreshPanels()
			this.window.setNotSaved()
		}
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		if (!this.viewer.mouseDown)
		{
			let lastHover = this.hoveringOverPoint
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
				this.viewer.setCursor("-webkit-grab")
			
			if (this.hoveringOverPoint != lastHover)
				this.viewer.render()
		}
		else
		{
			if (this.viewer.mouseAction == "move")
			{
				let linkToPoint = this.getHoveringOverElement(cameraPos, ray, distToHit, false)
				
				for (let point of route.points.nodes)
				{
					if (!point.selected)
						continue
					
					this.window.setNotSaved()
					this.viewer.setCursor("-webkit-grabbing")
					
					if (this.linkingPoints && linkToPoint != null)
					{
						point.pos = linkToPoint.pos
					}
					else
					{					
						let screenPosMoved = this.viewer.pointToScreen(point.moveOrigin)
						screenPosMoved.x += this.viewer.mouseMoveOffsetPixels.x
						screenPosMoved.y += this.viewer.mouseMoveOffsetPixels.y
						let pointRayMoved = this.viewer.getScreenRay(screenPosMoved.x, screenPosMoved.y)
						
						let hit = this.viewer.collision.raycast(pointRayMoved.origin, pointRayMoved.direction)
						if (hit != null)
							point.pos = hit.position
						else
						{
							let screenPos = this.viewer.pointToScreen(point.moveOrigin)
							let pointRay = this.viewer.getScreenRay(screenPos.x, screenPos.y)
							let origDistToScreen = point.moveOrigin.sub(pointRay.origin).magn()
							
							point.pos = pointRayMoved.origin.add(pointRayMoved.direction.scale(origDistToScreen))
						}
					}
				}
				
				this.refreshPanels()
			}
		}
	}
	
	
	onMouseUp(ev, x, y)
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		
		if (this.viewer.mouseAction == "move")
		{
			if (this.linkingPoints)
			{
				let pointBeingLinked = route.points.nodes.find(p => p.selected)
				if (pointBeingLinked == null)
					return
				
				let pointBeingLinkedTo = route.points.nodes.find(p => p != pointBeingLinked && p.pos == pointBeingLinked.pos)
				
				if (pointBeingLinkedTo != null)
				{
					route.points.removeNode(pointBeingLinked)

					if (pointBeingLinkedTo.prev.length >= 1)
					{
						alert("Node link error!\n\nMax incoming connections to a point surpassed (maximum 1)")
						this.refresh()
						return
					}

					route.points.linkNodes(pointBeingLinked.prev[0].node, pointBeingLinkedTo)
					this.refresh()
					this.window.setNotSaved()
				}
			}
		}
	}
	
	
	drawAfterModel()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return
		
		let route = this.data.routes[this.currentRouteIndex]
		
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let point of route.points.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0, 0.75, 0.75, 1])
				
			for (let n = 0; n < point.next.length; n++)
			{
				let nextPos = point.next[n].node.pos
				
				let scale2 = Math.min(scale, this.viewer.getElementScale(nextPos))
				
				let matrixScale = Mat4.scale(scale2, scale2, nextPos.sub(point.pos).magn())
				let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), nextPos.sub(point.pos).normalize())
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				let matrixScaleArrow = Mat4.scale(scale2, scale2, scale2)
				let matrixTranslateArrow = Mat4.translation(nextPos.x, nextPos.y, nextPos.z)
				
				point.rendererOutgoingPaths[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor([0.5, 1, 1, 1])
					
				point.rendererOutgoingPathArrows[n]
					.setCustomMatrix(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
					.setDiffuseColor([0, 0.55, 0.75, 1])
			}
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		
		for (let point of route.points.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.5, 1, 1, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([0, 0.75, 0.75, 1])
		}
		
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerRoutes }