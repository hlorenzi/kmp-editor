const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerTrackInformation
{
	constructor(window, viewer, data)
	{
		this.window = window
		this.viewer = viewer
		this.data = data
	}
	
	
	setData(data)
	{
		this.data = data
		this.refresh()
	}
	
	
	destroy()
	{
		
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Track Info", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
	
		panel.addSelectionNumericInput(null, "Lap Count", 1, 9, this.data.trackInfo.lapCount, 1.0, 1.0, true, false, (x, i) => { this.data.trackInfo.lapCount = x })
		panel.addSelectionNumericInput(null, "Pole Position", 0, 1, this.data.trackInfo.polePosition, 1.0, 1.0, true, false, (x, i) => { this.data.trackInfo.polePosition = x })
		panel.addSelectionNumericInput(null, "Driver Dist.", 0, 1, this.data.trackInfo.driverDistance, 1.0, 1.0, true, false, (x, i) => { this.data.trackInfo.driverDistance = x })
		panel.addSelectionNumericInput(null, "Speed Mod.", 0, 100, this.data.trackInfo.speedMod, null, 0.1, true, false, (x, i) => { this.data.trackInfo.speedMod = x })
	}
	
	
	refresh()
	{
		this.refreshPanels()
	}
	
	
	onKeyDown(ev)
	{
		
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit, mouse3DPos)
	{
		
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		
	}
	
	
	onMouseUp(ev, x, y)
	{
		
	}
	
	
	drawAfterModel()
	{
		
	}
}


if (module)
	module.exports = { ViewerTrackInformation }