const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")


class ViewerEnemyPaths
{
	constructor(viewer, data)
	{
		this.viewer = viewer
		this.data = data
		
		this.modelPoint = new ModelBuilder()
			.addSphere(-150, -150, -150, 150, 150, 150)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelPath = new ModelBuilder()
			.addCylinder(-100, -100, 0, 100, 100, 1)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		for (let point of data.enemyPoints)
		{
			point.renderer = new GfxNodeRendererTransform()
				.attach(viewer.scene.root)
				.setModel(this.modelPoint)
				.setMaterial(viewer.material)
				
			point.rendererOutgoingPaths = []
			for (let next of point.next)
			{
				point.rendererOutgoingPaths.push(new GfxNodeRendererTransform()
					.attach(viewer.scene.root)
					.setModel(this.modelPath)
					.setMaterial(viewer.material))
			}
		}
		
		this.refresh()
	}
	
	
	destroy()
	{
		for (let point of this.data.enemyPoints)
		{
			point.renderer.detach()
			for (let n = 0; n < point.next.length; n++)
				point.rendererOutgoingPaths[n].detach()
		}
	}
	
	
	refresh()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let point of this.data.enemyPoints)
		{
			let distToCamera = point.pos.sub(cameraPos).magn()
			let scale = distToCamera / 20000
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0, 0, 1])
				
			for (let n = 0; n < point.next.length; n++)
			{
				let distToCamera2 = point.pos.sub(cameraPos).magn()
				let scale2 = Math.min(distToCamera, distToCamera2) / 20000
				
				let matrixScale = Mat4.scale(scale2, scale2, point.next[n].pos.sub(point.pos).magn())
				let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), point.next[n].pos.sub(point.pos).normalize())
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				point.rendererOutgoingPaths[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor([1, 0.5, 0, 1])
			}
		}
	}
}


if (module)
	module.exports = { ViewerEnemyPaths }