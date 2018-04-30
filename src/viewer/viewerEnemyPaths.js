const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerEnemyPaths
{
	constructor(viewer, data)
	{
		this.viewer = viewer
		this.data = data
		
		this.scene = new GfxScene()
		this.sceneAfter = new GfxScene()
		
		this.hoveringOverPoint = null
		this.hoveringOverPath = null
		
		this.modelPoint = new ModelBuilder()
			.addSphere(-150, -150, -150, 150, 150, 150)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelPointSelection = new ModelBuilder()
			.addSphere(-250, -250, 250, 250, 250, -250)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.modelPath = new ModelBuilder()
			.addCylinder(-100, -100, 0, 100, 100, 1)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelArrow = new ModelBuilder()
			.addCone(-250, -250, -500, 250, 250, 0)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		for (let point of data.enemyPoints)
		{
			point.selected = false
			point.moveOrigin = point.pos
			
			point.renderer = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPoint)
				.setMaterial(viewer.material)
			
			point.rendererSelected = new GfxNodeRendererTransform()
				.attach(this.sceneAfter.root)
				.setModel(this.modelPointSelection)
				.setMaterial(viewer.materialUnshaded)
				.setEnabled(false)
				
			point.rendererSelectedCore = new GfxNodeRenderer()
				.attach(point.rendererSelected)
				.setModel(this.modelPoint)
				.setMaterial(viewer.material)
				
			point.rendererOutgoingPaths = []
			point.rendererOutgoingPathArrows = []
			for (let next of point.next)
			{
				point.rendererOutgoingPaths.push(new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath)
					.setMaterial(viewer.material))
					
				point.rendererOutgoingPathArrows.push(new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelArrow)
					.setMaterial(viewer.material))
			}
		}
	}
	
	
	destroy()
	{
		for (let point of this.data.enemyPoints)
		{
			point.renderer.detach()
			point.rendererSelectedCore.detach()
			point.rendererSelected.detach()
			for (let n = 0; n < point.next.length; n++)
			{
				point.rendererOutgoingPaths[n].detach()
				point.rendererOutgoingPathArrows[n].detach()
			}
		}
	}
	
	
	getHoveringOverElement(cameraPos, ray, distToHit)
	{
		let elem = null
		
		let minDistToCamera = distToHit + 1000
		let minDistToPoint = 1000000
		for (let point of this.data.enemyPoints)
		{
			let distToCamera = point.pos.sub(cameraPos).magn()
			if (distToCamera >= minDistToCamera)
				continue
			
			let scale = distToCamera / 20000
			
			let pointDistToRay = Geometry.linePointDistance(ray.origin, ray.direction, point.pos)
			
			if (pointDistToRay < 150 * scale * 4 && pointDistToRay < minDistToPoint)
			{
				elem = point
				minDistToCamera = distToCamera
				minDistToPoint = pointDistToRay
			}
		}
		
		return elem
	}
	
	
	unselectAll()
	{
		for (let point of this.data.enemyPoints)
			point.selected = false
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		for (let point of this.data.enemyPoints)
			point.moveOrigin = point.pos
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.selected))
			this.unselectAll()
		
		if (hoveringOverElem != null)
		{
			hoveringOverElem.selected = true
			this.viewer.setCursor("-webkit-grabbing")
		}
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		if (!this.viewer.mouseDown)
		{
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
				this.viewer.setCursor("-webkit-grab")
		}
		else
		{
			if (this.viewer.mouseAction == "move")
			{
				for (let point of this.data.enemyPoints)
				{
					if (!point.selected)
						continue
					
					this.viewer.setCursor("-webkit-grabbing")
					
					let screenPosMoved = this.viewer.pointToScreen(point.moveOrigin)
					screenPosMoved.x += this.viewer.mouseMoveOffsetPixels.x
					screenPosMoved.y += this.viewer.mouseMoveOffsetPixels.y
					let pointRayMoved = this.viewer.getScreenRay(screenPosMoved.x, screenPosMoved.y)
					
					let hit = this.viewer.collision.raycast(pointRayMoved.origin, pointRayMoved.direction)
					if (hit != null)
						point.pos = hit.position
					else
					{
						let screenPos = this.viewer.pointToScreen(point.moveOrigin)
						let pointRay = this.viewer.getScreenRay(screenPos.x, screenPos.y)
						let origDistToScreen = point.moveOrigin.sub(pointRay.origin).magn()
						
						point.pos = pointRayMoved.origin.add(pointRayMoved.direction.scale(origDistToScreen))
					}
				}
			}
		}
	}
	
	
	draw()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let point of this.data.enemyPoints)
		{
			let distToCamera = point.pos.sub(cameraPos).magn()
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * distToCamera / 20000
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0, 0, 1])
				
			for (let n = 0; n < point.next.length; n++)
			{
				let distToCamera2 = point.next[n].pos.sub(cameraPos).magn()
				let scale2 = Math.min(distToCamera, distToCamera2) / 20000
				
				let arrowPos = point.next[n].pos
				
				let matrixScale = Mat4.scale(scale2, scale2, point.next[n].pos.sub(point.pos).magn())
				let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), point.next[n].pos.sub(point.pos).normalize())
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				let matrixScaleArrow = Mat4.scale(scale2, scale2, scale2)
				let matrixTranslateArrow = Mat4.translation(arrowPos.x, arrowPos.y, arrowPos.z)
				
				point.rendererOutgoingPaths[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor([1, 0.5, 0, 1])
					
				point.rendererOutgoingPathArrows[n]
					.setCustomMatrix(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
					.setDiffuseColor([1, 0.75, 0, 1])
			}
		}
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
	
	
	drawAfter()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let point of this.data.enemyPoints)
		{
			let distToCamera = point.pos.sub(cameraPos).magn()
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * distToCamera / 20000
			
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0.5, 0.5, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor([1, 0, 0, 1])
		}
		
		this.sceneAfter.clearDepth(this.viewer.gl)
		this.sceneAfter.render(this.viewer.gl, this.viewer.getCurrentCamera())
	}
}


if (module)
	module.exports = { ViewerEnemyPaths }