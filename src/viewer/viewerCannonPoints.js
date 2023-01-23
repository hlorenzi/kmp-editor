const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerCannonPoints extends PointViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)
			
		let panelColor = [1, 0.5, 0.5, 1]
		this.modelPanel = new ModelBuilder()
			.addQuad(new Vec3(0, 0, 1), new Vec3(1, 0, 1), new Vec3(1, 0, -1), new Vec3(0, 0, -1), panelColor, panelColor, panelColor, panelColor)
			.addQuad(new Vec3(0, 0, -1), new Vec3(1, 0, -1), new Vec3(1, 0, 1), new Vec3(0, 0, 1), panelColor, panelColor, panelColor, panelColor)
			.calculateNormals()
			.makeModel(viewer.gl)
	}


	points()
	{
		return this.data.cannonPoints
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Cannon Points", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel

		let selectedPoints = this.data.cannonPoints.nodes.filter(p => p.selected)
	
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Duplicate Point")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")

		panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addCheckbox(null, "Draw backwards Y rotation guides", this.viewer.cfg.cannonsEnableDirectionRender, (x) => this.viewer.cfg.cannonsEnableDirectionRender = x)
		panel.addCheckbox(null, "Highlight selected trigger KCL", this.viewer.cfg.cannonsEnableKclHighlight, (x) => { 
			this.viewer.cfg.cannonsEnableKclHighlight = x
			if (selectedPoints.length == 1)
			{
				let selectedIndex = this.data.cannonPoints.nodes.findIndex(p => p === selectedPoints[0])
				this.window.hl.reset()
				this.window.hl.baseType = x ? 0x11 : -1
				this.window.hl.basicEffect = x ? selectedIndex : -1
				this.window.openKcl(this.window.currentKclFilename)
				this.highlighting = true
			}
		})
		panel.addSpacer(null)
		
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		panel.addSpacer(null)

		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)
		
		if (selectedPoints.length == 1)
		{
			let selectedIndex = this.data.cannonPoints.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>CNPT Index:</strong> " + selectedIndex + " (0x" + selectedIndex.toString(16) + ")")

			if (this.viewer.cfg.cannonsEnableKclHighlight)
			{
				this.window.hl.reset()
				this.window.hl.baseType = 0x11
				this.window.hl.basicEffect = selectedIndex
				this.window.openKcl(this.window.currentKclFilename)
				this.highlighting = true
			}
		}
		else if (this.highlighting)
		{
			this.window.hl.reset()
			this.window.openKcl(this.window.currentKclFilename)
			this.highlighting = false
		}
		
		panel.addSelectionNumericInput(selectionGroup, "Dest. X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup, "Dest. Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup, "Dest. Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup,      "ID",        0,  0xffff, selectedPoints.map(p =>  p.id),           1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].id = x })
		
		let effectOptions =
		[
			{ str: "Fast, Straight Line", value: 0 },
			{ str: "Curved", value: 1 },
			{ str: "Curved (and Slow?)", value: 2 },
		]
		panel.addSelectionDropdown(selectionGroup, "Effect", selectedPoints.map(p => p.effect), effectOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].effect = x })
	}
	
	
	refresh()
	{
		super.refresh()

		for (let point of this.data.cannonPoints.nodes)
		{
			point.rendererPanel = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPanel)
				.setMaterial(this.viewer.material)
				
			this.renderers.push(point.rendererPanel)
		}
		
		this.refreshPanels()
	}
	
	
	drawAfterModel()
	{
		for (let point of this.data.cannonPoints.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0, 0, 1])
				
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0.5, 0.5, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([1, 0, 0, 1])
				
			let matrixDirection =
				Mat4.scale(scale, scale / 1.5, scale / 1.5)
				.mul(Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
				.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
				
			point.rendererDirection
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([1, 0.75, 0.75, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([1, 0, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([1, 0.25, 0.25, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			if (point.selected && this.viewer.cfg.cannonsEnableDirectionRender)
			{
				let matrixScale = Mat4.scale(1000000, 1, 100000)
				let matrixAlign = Mat4.rotation(new Vec3(0, 0, 1), (-90 - point.rotation.y) * Math.PI / 180)
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				point.rendererPanel
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					//.setTranslation(point.pos)
					//.setScaling(new Vec3(100000, 1, 100000))
					//.setRotation(new Vec3(0, 0, 1), point.rotation.y * Math.PI / 180)
					.setDiffuseColor([1, 0.5, 0.5, 0.5])
					.setEnabled(true)
			}
			else
				point.rendererPanel.setEnabled(false)
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerCannonPoints }