const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PathViewer } = require("./pathViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerEnemyPaths extends PathViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)
	}
	
	
	points()
	{
		return this.data.enemyPoints
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Enemy Paths", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
		
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Extend Path")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")

		panel.addCheckbox(null, "Show point sizes", this.viewer.cfg.enemyPathsEnableSizeRender, (x) => this.viewer.cfg.enemyPathsEnableSizeRender = x)
		panel.addSpacer(null)

		if (this.data.enemyPoints.nodes.length == 0 && this.data.itemPoints.nodes.length > 0)
			panel.addButton(null, "Copy From Item Paths", () => this.copyFromItemPaths())

		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		panel.addButton(null, "(U) Unlink Selected", () => this.unlinkSelectedPoints())
		panel.addButton(null, "(F) Set Selected as First Point", () => this.setSelectedAsFirstPoint())
		panel.addSpacer(null)

		let selectedPoints = this.data.enemyPoints.nodes.filter(p => p.selected)
		
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
			
			panel.addText(selectionGroup, "<strong>ENPH Index:</strong> " + formatNumHex(selectedPoints[0].pathIndex) + ", point #" + formatNum(selectedPoints[0].pathPointIndex))
			panel.addText(selectionGroup, "<strong>ENPT Index:</strong> " + formatNumHex(selectedPoints[0].pointIndex))
		}
		
		panel.addSelectionNumericInput(selectionGroup,    "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,    "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,    "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup, "Deviation",   1,    1000, selectedPoints.map(p =>  p.deviation), null, 0.1, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].deviation = x })
		
		let setting1Options =
		[
			{ str: "None", value: 0 },
			{ str: "Requires Mushroom", value: 1 },
			{ str: "Use Mushroom", value: 2 },
			{ str: "Allow Wheelie", value: 3 },
			{ str: "End Wheelie", value: 4 },
		]
		panel.addSelectionDropdown(selectionGroup, "Setting 1", selectedPoints.map(p => p.setting1), setting1Options, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
		
		let setting2Options =
		[
			{ str: "None", value: 0 },
			{ str: "End Drift", value: 1 },
			{ str: "Forbid Drift(?)", value: 2 },
			{ str: "Force Drift", value: 3 },
		]
		panel.addSelectionDropdown(selectionGroup, "Setting 2", selectedPoints.map(p => p.setting2), setting2Options, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
	
		panel.addSelectionNumericInput(selectionGroup, "Setting 3", 0, 0xff, selectedPoints.map(p => p.setting3), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting3 = x })
	}
	
	
	refresh()
	{
		super.refresh()
		this.refreshPanels()
	}


	copyFromItemPaths()
	{
		let newGraph = this.data.itemPoints.clone()
		newGraph.onAddNode = (node) => 
		{
			node.pos = new Vec3(0, 0, 0)
			node.deviation = 10
			node.setting1 = 0
			node.setting2 = 0
			node.setting3 = 0
		}
		newGraph.onCloneNode = (newNode, oldNode) => 
		{
			newNode.pos = oldNode.pos.clone()
			newNode.deviation = oldNode.deviation
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
			newNode.setting3 = oldNode.setting3
		}

		for (let point of newGraph.nodes)
		{
			point.setting1 = 0
			point.setting2 = 0
			point.setting3 = 0
		}

		this.data.enemyPoints = newGraph

		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	drawAfterModel()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let p = 0; p < this.data.enemyPoints.nodes.length; p++)
		{
			let point = this.data.enemyPoints.nodes[p]
			
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			let useMushroom = (point.setting1 == 2)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor(p == 0 ? [0.6, 0, 0, 1] : useMushroom ? [1, 0.5, 0.95, 1] : [1, 0, 0, 1])
				
			let sizeCircleScale = point.deviation * 50
			point.rendererSizeCircle
				.setTranslation(point.pos)
				.setScaling(new Vec3(sizeCircleScale, sizeCircleScale, sizeCircleScale))
				.setDiffuseColor([1, 0.5, 0, 0.5])
				
			for (let n = 0; n < point.next.length; n++)
			{
				let nextPos = point.next[n].node.pos
				
				let scale2 = Math.min(scale, this.viewer.getElementScale(nextPos))
				
				let requiresMushroom = (point.next[n].node.setting1 == 1)
				
				let matrixScale = Mat4.scale(scale2, scale2, nextPos.sub(point.pos).magn())
				let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), nextPos.sub(point.pos).normalize())
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				let matrixScaleArrow = Mat4.scale(scale2, scale2, scale2)
				let matrixTranslateArrow = Mat4.translation(nextPos.x, nextPos.y, nextPos.z)
				
				point.rendererOutgoingPaths[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor(requiresMushroom ? [1, 0.5, 0.75, 1] : [1, 0.5, 0, 1])
					
				point.rendererOutgoingPathArrows[n]
					.setCustomMatrix(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
					.setDiffuseColor([1, 0.75, 0, 1])
			}
		}
		
		if (this.viewer.cfg.enemyPathsEnableSizeRender)
			this.drawSizeCircles()
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		
		for (let p = 0; p < this.data.enemyPoints.nodes.length; p++)
		{
			let point = this.data.enemyPoints.nodes[p]
			
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0.5, 0.5, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor(p == 0 ? [0.6, 0, 0, 1] : [1, 0, 0, 1])
		}
		
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerEnemyPaths }