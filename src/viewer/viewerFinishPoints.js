const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerFinishPoints extends PointViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)
	}
	
	
	points()
	{
		return this.data.finishPoints
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Battle Finish Points", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
	
		panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Duplicate Point")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		
		let selectedPoints = this.data.finishPoints.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = this.data.finishPoints.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>MSPT Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}

		panel.addSelectionNumericInput(selectionGroup,      "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,      "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,      "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup, "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Unknown ID",    0,  0xffff, selectedPoints.map(p =>  p.id),           1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].id = x })
		panel.addSelectionNumericInput(selectionGroup, "Unknown",       0,  0xffff, selectedPoints.map(p =>  p.unknown),      1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].unknown = x })
	}
	
	
	refresh()
	{
		super.refresh()
		this.refreshPanels()
	}
	
	
	drawAfterModel()
	{
		for (let point of this.data.finishPoints.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.5, 0, 1, 1])
				
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.75, 0.5, 1, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([0.5, 0, 1, 1])
				
			let matrixDirection =
				Mat4.scale(scale, scale / 1.5, scale / 1.5)
				.mul(Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
				.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
				
			point.rendererDirection
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([0.87, 0.75, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([0.5, 0, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([0.5, 0.25, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerFinishPoints }