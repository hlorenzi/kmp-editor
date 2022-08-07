const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PathViewer } = require("./pathViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerRoutes extends PathViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)
		this.currentRouteIndex = 0
	}
	
	
	points()
	{
		if (this.currentRouteIndex < 0 || this.currentRouteIndex >= this.data.routes.length)
			return { nodes: [] }

		return this.data.routes[this.currentRouteIndex].points
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
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
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
		
		//if (route.points.nodes.length < 2 || route.setting1 && route.points.nodes.length < 3)
			//panel.addText(null, "⚠️ <strong>WARNING! Less than " + (2 + route.setting1) + " points may cause a crash!</strong>")

		let selectedPoints = route.points.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = route.points.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>Point Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}

		panel.addSelectionNumericInput(selectionGroup,    "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,    "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,    "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		
		panel.addSelectionNumericInput(selectionGroup, "Setting 1", 0, 0xffff, selectedPoints.map(p => p.setting1), null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
		panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 0xffff, selectedPoints.map(p => p.setting2), null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
	}
	
	
	refresh()
	{
		super.refresh()
		this.refreshPanels()
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

			case "Y":
			case "y":
				this.snapSelectedToY()
				return true
				
			case "U":
			case "u":
				this.unlinkSelectedPoints()
				return true
		}
		
		return false
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