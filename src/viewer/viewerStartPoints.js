const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerStartPoints extends PointViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)

		this.modelZoneWide = new ModelBuilder()
			.addQuad(new Vec3(0, -1000, -20), new Vec3(0, 1000, -20), new Vec3(-5300, 1000, -20), new Vec3(-5300, -1000, -20))
			.addQuad(new Vec3(-5300, -1000, -20), new Vec3(-5300, 1000, -20), new Vec3(0, 1000, -20), new Vec3(0, -1000, -20))
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelZoneNarrow = new ModelBuilder()
			.addQuad(new Vec3(0, -1000, -20), new Vec3(0, 1000, -20), new Vec3(-4800, 1000, -20), new Vec3(-4800, -1000, -20))
			.addQuad(new Vec3(-4800, -1000, -20), new Vec3(-4800, 1000, -20), new Vec3(0, 1000, -20), new Vec3(0, -1000, -20))
			.calculateNormals()
			.makeModel(viewer.gl)
	}


	points()
	{
		return this.data.startPoints
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Starting Points", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
	
		panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addCheckbox(null, "Draw start zone bounds", this.viewer.cfg.startPointsEnableZoneRender, (x) => this.viewer.cfg.startPointsEnableZoneRender = x)
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Duplicate Point")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())

		let polePosOptions =
		[
			{ str: "Left", value: 0 },
			{ str: "Right", value: 1 }
		]
		panel.addSelectionDropdown(null, "Pole Position", this.data.trackInfo.polePosition, polePosOptions, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.polePosition = x; this.refresh() })
		
		let driverDistOptions =
		[
			{ str: "Normal", value: 0 },
			{ str: "Narrow", value: 1 }
		]
		panel.addSelectionDropdown(null, "Start Zone", this.data.trackInfo.driverDistance, driverDistOptions, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.driverDistance = x; this.refresh() })

		let selectedPoints = this.data.startPoints.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = this.data.startPoints.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>KTPT Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}

		panel.addSelectionNumericInput(selectionGroup,      "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,      "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,      "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),     null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup, "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Player Index", -1,      12, selectedPoints.map(p =>  p.playerIndex),  1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].playerIndex = x })
	}
	
	
	refresh()
	{
		super.refresh()
		
		for (let point of this.data.startPoints.nodes)
		{
			point.rendererStartZone = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.data.trackInfo.driverDistance ? this.modelZoneNarrow : this.modelZoneWide)
				.setMaterial(this.viewer.material)
				
			this.renderers.push(point.rendererStartZone)
		}
		
		this.refreshPanels()
	}
	
	
	drawAfterModel()
	{
		for (let point of this.data.startPoints.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0, 0, 1, 1])
			
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.5, 0.5, 1, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([0, 0, 1, 1])
				
			let matrixScale = Mat4.scale(scale, scale / 1.5, scale / 1.5)
			let matrixDirection = 
				Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180)
				.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
				.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
				
			point.rendererDirection
				.setCustomMatrix(matrixScale.mul(matrixDirection))
				.setDiffuseColor([0.75, 0.75, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(matrixScale.mul(matrixDirection))
				.setDiffuseColor([0, 0, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(matrixScale.mul(matrixDirection))
				.setDiffuseColor([0.25, 0.25, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
			
			point.rendererStartZone
				.setCustomMatrix(matrixDirection)
				.setDiffuseColor([0.25, 0.25, 1, 0.5])
				.setEnabled(this.viewer.cfg.startPointsEnableZoneRender)
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerStartPoints }