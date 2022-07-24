const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerIssueTracker
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
		let panel = this.window.addPanel("Issues", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel

        const findIssues = () =>
        {
            
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
	module.exports = { ViewerIssueTracker }