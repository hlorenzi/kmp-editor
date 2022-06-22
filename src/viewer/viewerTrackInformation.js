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
	
		panel.addSelectionNumericInput(null, "Lap Count", 1, 9, this.data.trackInfo.lapCount, 1.0, 1.0, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.lapCount = x })
		panel.addSelectionNumericInput(null, "Speed Mod.", 0, 100, this.data.trackInfo.speedMod, null, 0.1, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.speedMod = x })
		
		let lensFlareOptions =
		[
			{ str: "Disabled", value: 0 },
			{ str: "Enabled", value: 1 }
		]
		panel.addSelectionDropdown(null, "Lens Flare", this.data.trackInfo.lensFlareFlash, lensFlareOptions, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.lensFlareFlash = x; this.refreshPanels() })

		if (this.data.trackInfo.lensFlareFlash)
		{
			let colorGroup = panel.addGroup(null, "Flare Color:")
			panel.addSelectionNumericInput(colorGroup, "Red", 0, 255, this.data.trackInfo.flareColor[0], 1.0, 1.0, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.flareColor[0] = x })
			panel.addSelectionNumericInput(colorGroup, "Green", 0, 255, this.data.trackInfo.flareColor[1], 1.0, 1.0, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.flareColor[1] = x })
			panel.addSelectionNumericInput(colorGroup, "Blue", 0, 255, this.data.trackInfo.flareColor[2], 1.0, 1.0, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.flareColor[2] = x })
			panel.addSelectionNumericInput(colorGroup, "Alpha", 0, 255, this.data.trackInfo.flareColor[3], 1.0, 1.0, true, false, (x) => { this.window.setNotSaved(); this.data.trackInfo.flareColor[3] = x })
		}
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