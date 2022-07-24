const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerRespawnPoints extends PointViewer
{
	constructor(window, viewer, data)
	{
		super(window, viewer, data)
		
		this.modelPlayerPos = new ModelBuilder()
			.addCone(-250, -250, -250, 250, 250, 250, 8, new Vec3(1, 0, 0))
			.calculateNormals()
			.makeModel(viewer.gl)
	}
	
	
	points()
	{
		return this.data.respawnPoints
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Respawn Points", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
	
		panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addCheckbox(null, "Draw player respawn positions", this.viewer.cfg.respawnsEnablePlayerSlots, (x) => this.viewer.cfg.respawnsEnablePlayerSlots = x)
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Duplicate Point")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		
		let selectedPoints = this.data.respawnPoints.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = this.data.respawnPoints.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>JGPT Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}

		panel.addSelectionNumericInput(selectionGroup,      "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,      "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,      "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup, "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x % 360 }, x => { return x % 360 })
		//panel.addSelectionNumericInput(selectionGroup, "Range(?)",      1,    1000, selectedPoints.map(p =>  p.size),         1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].size = x })
	}
	
	
	refresh()
	{
		super.refresh()
		
		for (let point of this.data.respawnPoints.nodes)
		{
			point.rendererPlayerPositions = []

			for (let i = 0; i < 12; i++)
			{
				let rPlayerPos = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPlayerPos)
					.setMaterial(this.viewer.material)
				
				point.rendererPlayerPositions.push(rPlayerPos)
				this.renderers.push(rPlayerPos)
			}
		}
		
		this.refreshPanels()
	}
	
	
	drawAfterModel()
	{
		for (let point of this.data.respawnPoints.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.55, 0.55, 0, 1])
				
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.95, 0.95, 0, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([0.55, 0.55, 0, 1])
				
			const customMatrix = (x, y, z, s=scale) =>
			{
				return Mat4.scale(s, s / 1.5, s / 1.5)
					.mul(Mat4.translation(x, y, -z))
					.mul(Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180))
					.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
					.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
					.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
					.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
			}
				
			point.rendererDirection
				.setCustomMatrix(customMatrix(0, 0, 0))
				.setDiffuseColor([0.85, 0.85, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(customMatrix(0, 0, 0))
				.setDiffuseColor([0.75, 0.75, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(customMatrix(0, 0, 0))
				.setDiffuseColor([0.5, 0.5, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
			
			let k = 0
			for (let i = -600; i <= 0; i += 300)
				for (let j = -450; j <= 450; j += 300)
				{
					point.rendererPlayerPositions[k]
						.setCustomMatrix(customMatrix(i, j, 550, 0.5))
						.setDiffuseColor([0.75, 0.75, 0, 1])
						.setEnabled(this.viewer.cfg.respawnsEnablePlayerSlots)
					k++
				}
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerRespawnPoints }