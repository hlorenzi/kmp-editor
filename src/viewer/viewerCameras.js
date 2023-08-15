const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { PointViewer } = require("./pointViewer.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerCameras extends PointViewer
{
    constructor(window, viewer, data)
	{
		super(window, viewer, data)
	}


	points()
	{
		return this.data.cameras
	}


    refreshPanels()
	{
		let panel = this.window.addPanel("Cameras", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
        
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Camera")
		panel.addText(null, "<strong>Hold Alt + Drag Object:</strong> Duplicate Camera")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")

        panel.addCheckbox(null, "Draw rotation guides", this.viewer.cfg.enableRotationRender, (x) => this.viewer.cfg.enableRotationRender = x)
		panel.addSpacer(null)

		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(T) Select All With Same Type", () => this.toggleAllSelectionByType())
        panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		panel.addSpacer(null)

        let firstOptions = []
		for (let i = 0; i < this.data.cameras.nodes.length; i++)
            firstOptions.push({ str: "Camera " + i + " (0x" + i.toString(16) + ")", value: i })
		panel.addSelectionDropdown(null, "Intro Start", this.data.firstIntroCam, firstOptions, true, false, (x, i) => { this.window.setNotSaved(); this.data.firstIntroCam = x })

        let selectedPoints = this.data.cameras.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)

		if (selectedPoints.length == 1)
		{
			let i = this.data.cameras.nodes.findIndex(p => p === selectedPoints[0])
			panel.addText(selectionGroup, "<strong>CAME Index:</strong> " + i.toString() + " (0x" + i.toString(16) + ")")
		}

        let typeOptions =
		[
			{ str: "Goal", value: 0 },
			{ str: "FixSearch", value: 1 },
            { str: "PathSearch", value: 2 },
            { str: "KartFollow", value: 3 },
            { str: "KartPathFollow", value: 4 },
            { str: "OP_FixMoveAt", value: 5 },
            { str: "OP_PathMoveAt", value: 6 },
            { str: "MiniGame", value: 7 },
            { str: "MissionSuccess", value: 8 },
            { str: "Unknown", value: 9 },
		]
		panel.addSelectionDropdown(selectionGroup, "Type", selectedPoints.map(p => p.type), typeOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].type = x; this.refresh() })
		
        let nextOptions = [{ str: "None", value: 0xff }]
		for (let i = 0; i < this.data.cameras.nodes.length; i++)
            nextOptions.push({ str: "Camera " + i + " (0x" + i.toString(16) + ")", value: i })
		panel.addSelectionDropdown(selectionGroup, "Next Camera", selectedPoints.map(p => p.nextCam), nextOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].nextCam = x })

        let routeOptions = [{ str: "None", value: 0xff }]
		for (let i = 0; i < this.data.routes.length; i++)
			routeOptions.push({ str: "Route " + i + " (0x" + i.toString(16) + ")", value: i })
		panel.addSelectionDropdown(selectionGroup, "Route", selectedPoints.map(p => p.routeIndex), routeOptions, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].routeIndex = x })
		
		panel.addSelectionNumericInput(selectionGroup,       "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,       "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,       "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y),       null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. X", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.x),  null, 1.0,   enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.x = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Y", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.y),  null, 1.0,   enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.y = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup,  "Rot. Z", -1000000, 1000000, selectedPoints.map(p =>  p.rotation.z),  null, 1.0,   enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].rotation.z = x % 360 }, x => { return x % 360 })
		
        panel.addSelectionNumericInput(selectionGroup, "Time", 0, 1000000, selectedPoints.map(p => p.time), null, 10.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].time = x })
		
        panel.addSelectionNumericInput(selectionGroup, "Point Speed", 0, 0xffff, selectedPoints.map(p => p.vCam),  1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].vCam = x })
		panel.addSelectionNumericInput(selectionGroup, "Zoom Speed",  0, 0xffff, selectedPoints.map(p => p.vZoom), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].vZoom = x })
        panel.addSelectionNumericInput(selectionGroup, "View Speed",  0, 0xffff, selectedPoints.map(p => p.vView), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].vView = x })
        
        panel.addSelectionNumericInput(selectionGroup, "Zoom Start", -1000000, 1000000, selectedPoints.map(p => p.zoomStart), null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].zoomStart = x % 360 }, x => { return x % 360 })
		panel.addSelectionNumericInput(selectionGroup, "Zoom End",   -1000000, 1000000, selectedPoints.map(p => p.zoomEnd),   null, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].zoomEnd   = x % 360 }, x => { return x % 360 })
		
        panel.addSelectionNumericInput(selectionGroup, "View Start X", -1000000, 1000000, selectedPoints.map(p =>  p.viewPosStart.x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosStart.x = x })
		panel.addSelectionNumericInput(selectionGroup, "View Start Y", -1000000, 1000000, selectedPoints.map(p => -p.viewPosStart.z), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosStart.z = -x })
		panel.addSelectionNumericInput(selectionGroup, "View Start Z", -1000000, 1000000, selectedPoints.map(p => -p.viewPosStart.y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosStart.y = -x })
		panel.addSelectionNumericInput(selectionGroup,   "View End X", -1000000, 1000000, selectedPoints.map(p =>  p.viewPosEnd.x),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosEnd.x = x })
		panel.addSelectionNumericInput(selectionGroup,   "View End Y", -1000000, 1000000, selectedPoints.map(p => -p.viewPosEnd.z),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosEnd.z = -x })
		panel.addSelectionNumericInput(selectionGroup,   "View End Z", -1000000, 1000000, selectedPoints.map(p => -p.viewPosEnd.y),   null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].viewPosEnd.y = -x })
		
        panel.addSelectionNumericInput(selectionGroup, "Shake(?)",  0, 0xff, selectedPoints.map(p => p.shake), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].shake = x })
        panel.addSelectionNumericInput(selectionGroup, "Start(?)",  0, 0xff, selectedPoints.map(p => p.start), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].start = x })
        panel.addSelectionNumericInput(selectionGroup, "Movie(?)",  0, 0xff, selectedPoints.map(p => p.movie), 1.0, 1.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].movie = x })
    }


    refresh()
	{
		super.refresh()
		this.refreshPanels()
	}


    toggleAllSelectionByType()
	{
		let selectedPoints = this.data.cameras.nodes.filter(p => p.selected)
		
		for (let point of this.data.cameras.nodes)
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
		for (let point of this.data.cameras.nodes)
		{
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.5, 0.1, 0.7, 1])
				
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.7, 0.1, 1, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([0.5, 0.1, 0.7, 1])
				
            let pointScale = Mat4.scale(scale, scale / 1.5, scale / 1.5)
            let matrixDirection =
				Mat4.rotation(new Vec3(0, 0, 1), 90 * Math.PI / 180)
				.mul(Mat4.rotation(new Vec3(1, 0, 0), point.rotation.x * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 0, 1), -point.rotation.y * Math.PI / 180))
				.mul(Mat4.rotation(new Vec3(0, 1, 0), -point.rotation.z * Math.PI / 180))
				.mul(Mat4.translation(point.pos.x, point.pos.y, point.pos.z))
				
			point.rendererDirection
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([0.7, 0.1, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionArrow
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([0.5, 0.1, 0.8, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
				
			point.rendererDirectionUp
				.setCustomMatrix(pointScale.mul(matrixDirection))
				.setDiffuseColor([0.75, 0.1, 1, 1])
				.setEnabled(this.viewer.cfg.enableRotationRender)
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerCameras }