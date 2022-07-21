const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerAreas extends PointViewer
{
    constructor(window, viewer, data)
	{
		super(window, viewer, data)
        
        this.modelAreaBox = new ModelBuilder()
            .addCube(5000, 5000, -10000, -5000, -5000, 0)
            .calculateNormals()
            .makeModel(viewer.gl)

        this.modelAreaCylinder = new ModelBuilder()
            .addCylinder(5000, 5000, -10000, -5000, -5000, 0, 24)
            .calculateNormals()
            .makeModel(viewer.gl)
	}


	points()
	{
		return this.data.areaPoints
	}


    refreshPanels()
	{
		let panel = this.window.addPanel("Area", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
        
        panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Area")
		panel.addText(null, "<strong>Hold Alt + Drag Object:</strong> Duplicate Area")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(T) Select All With Same Type", () => this.toggleAllSelectionByType())
        panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())

        let selectedPoints = this.data.areaPoints.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = this.data.areaPoints.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>AREA Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}
		
		panel.addCheckbox(selectionGroup, "Render Area", (!enabled || multiedit ? selectedPoints.every(p => p.render) : selectedPoints[0].render), (x) => {
            for (let point of selectedPoints)
                point.render = x
         })

        let typeOptions =
		[
			{ str: "Camera", value: 0 },
			{ str: "Env Effect", value: 1 },
            { str: "Fog Effect", value: 2 },
            { str: "Moving Water", value: 3 },
            { str: "Force Recalc", value: 4 },
            { str: "Minimap Control", value: 5 },
            { str: "Bloom Effect", value: 6 },
            { str: "Enable Boos", value: 7 },
            { str: "Object Group", value: 8 },
            { str: "Object Unload", value: 9 },
            { str: "Fall Boundary", value: 10 },
		]
		panel.addSelectionDropdown(selectionGroup, "Type", selectedPoints.map(p => p.type), typeOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].type = x; this.refresh() })
		
        let shapeOptions =
		[
			{ str: "Box", value: 0 },
			{ str: "Cylinder", value: 1 },
		]
		panel.addSelectionDropdown(selectionGroup, "Shape", selectedPoints.map(p => p.shape), shapeOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].shape = x; this.refresh() })
		
		panel.addSelectionNumericInput(selectionGroup,       "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,       "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,       "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x })
		panel.addSelectionNumericInput(selectionGroup, "Scale X", -1000000, 1000000, selectedPoints.map(p =>  p.scale.x),     null, 0.1, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].scale.x = x })
		panel.addSelectionNumericInput(selectionGroup, "Scale Y", -1000000, 1000000, selectedPoints.map(p =>  p.scale.z),     null, 0.1, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].scale.z = x })
		panel.addSelectionNumericInput(selectionGroup, "Scale Z", -1000000, 1000000, selectedPoints.map(p =>  p.scale.y),     null, 0.1, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].scale.y = x })
        panel.addSelectionNumericInput(selectionGroup, "Priority", 0, 255, selectedPoints.map(p => p.priority), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].priority = x })
		
        let selectionType = (enabled && selectedPoints.every(p => p.type == selectedPoints[0].type) ? selectedPoints[0].type : -1)

		switch (selectionType)
		{
			case 0:
				panel.addSelectionNumericInput(selectionGroup, "Camera ID", 0, 255, selectedPoints.map(p => p.cameraIndex), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].cameraIndex = x })
				break

			case 1:
				let envOptions =
				[
					{ str: "EnvKareha", value: 0 },
					{ str: "EnvKarehaUp", value: 1 },
				]
				panel.addSelectionDropdown(selectionGroup, "Object", selectedPoints.map(p => p.setting1), envOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				break

			case 2:
				panel.addSelectionNumericInput(selectionGroup, "BFG entry", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				break

			case 3:
				let routeOptions = []
				for (let i = 0; i < this.data.routes.length; i++)
					routeOptions.push({ str: "Route " + i + " (0x" + i.toString(16) + ")", value: i })
				panel.addSelectionDropdown(selectionGroup, "Route", selectedPoints.map(p => p.routeIndex), routeOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].routeIndex = x })
			
				panel.addSelectionNumericInput(selectionGroup, "Acceleration", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Route Speed", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				break

			case 4:
				panel.addSelectionNumericInput(selectionGroup, "Enemy Point", 0, 255, selectedPoints.map(p => p.enemyIndex), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].enemyIndex = x })
				break

			case 5:
				panel.addSelectionNumericInput(selectionGroup, "Setting 1", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				break

			case 6:
				panel.addSelectionNumericInput(selectionGroup, "BBLM File", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Fade Time", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				break

			case 7:
				break

			case 8:
			case 9:
				panel.addSelectionNumericInput(selectionGroup, "Group ID", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				break

			case 10:
				panel.addSelectionNumericInput(selectionGroup, "Setting 1", 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
				panel.addSelectionNumericInput(selectionGroup, "Setting 2", 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				
				panel.addCheckbox(selectionGroup, "Enable Conditional OOB (requires LE-CODE)", this.data.areaPoints.enableCOOB, (x) => { this.data.areaPoints.enableCOOB = x; this.refreshPanels() })
				if (this.data.areaPoints.enableCOOB)
				{
					let coobPoints = this.data.areaPoints.nodes.filter(p => p.type === 10)
					let modeOptions =
					[
						{ str: "Checkpoint Range", value: 0xff },
						{ str: "KCP Region", value: 1 },
					]
					panel.addSelectionDropdown(selectionGroup, "Mode", coobPoints.map(p => p.routeIndex), modeOptions, enabled, multiedit, (x, i) => { coobPoints[i].routeIndex = x; this.refreshPanels() })
					
					panel.addSelectionNumericInput(selectionGroup, (coobPoints[0].routeIndex == 1 ? "Setting" : "Start Index"), 0, 65535, selectedPoints.map(p => p.setting1), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
					panel.addSelectionNumericInput(selectionGroup, (coobPoints[0].routeIndex == 1 ? "KCP Number" : "End Index"), 0, 65535, selectedPoints.map(p => p.setting2), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })
				}
				break
		}
    }


    refresh()
	{
		super.refresh()
		
		for (let point of this.data.areaPoints.nodes)
		{
            point.rendererArea = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(point.shape ? this.modelAreaCylinder : this.modelAreaBox)
				.setMaterial(this.viewer.material)
				
            this.renderers.push(point.rendererArea)
		}
		
		this.refreshPanels()
	}


    toggleAllSelectionByType()
	{
		let selectedPoints = this.data.areaPoints.nodes.filter(p => p.selected)
		
		for (let point of this.data.areaPoints.nodes)
			point.selected = (selectedPoints.find(p => p.type == point.type) != null)
		
		this.refreshPanels()
	}


    onKeyDown(ev)
	{
		if (super.onKeyDown(ev))
			return true
		
		switch (ev.key)
		{
			case "T":
			case "t":
				this.toggleAllSelectionByType()
				return true
		}
		
		return false
	}


    drawAfterModel()
	{
		for (let point of this.data.areaPoints.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0.5, 0, 1])
				
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0.7, 0, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([1, 0.5, 0, 1])
				
            let pointScale = Mat4.scale(scale, scale / 1.5, scale / 1.5)
            let areaScale = Mat4.scale(point.scale.y, point.scale.x, point.scale.z)
			let matrixDirection =
				Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180)
				.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
				.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
				
			point.rendererDirection
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([1, 0.7, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([1, 0.35, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([0.75, 0.5, 0, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)

            point.rendererArea
                .setCustomMatrix(areaScale.mul(matrixDirection))
                .setDiffuseColor([1, 0.7, 0, 0.5])
                .setEnabled(point.render)
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerAreas }