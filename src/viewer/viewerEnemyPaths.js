const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerEnemyPaths
{
	constructor(window, viewer, data)
	{
		this.window = window
		this.viewer = viewer
		this.data = data
		
		this.scene = new GfxScene()
		this.sceneAfter = new GfxScene()
		this.sceneSizeCircles = new GfxScene()
		
		this.hoveringOverPoint = null
		this.linkingPoints = false
		
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
			
		this.modelSizeCircle = new ModelBuilder()
			.addSphere(-1, -1, -1, 1, 1, 1, 8)
			.calculateNormals()
			.makeModel(viewer.gl)
			
		this.renderers = []
			
		this.refresh()
		this.refreshPanels()
	}
	
	
	destroy()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
	}
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Enemy Paths")
		panel.toggleOpen()
		panel.addCheckbox(null, "Show point sizes", this.viewer.cfg.enemyPathsEnableSizeRender, (x) => this.viewer.cfg.enemyPathsEnableSizeRender = x)
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Add/Link Points")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselection")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(U) Unlink Selected", () => this.unlinkSelectedPoints())
	}
	
	
	refresh()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
		
		for (let point of this.data.enemyPoints)
		{
			if (point.selected === undefined)
			{
				point.selected = false
				point.moveOrigin = point.pos
			}
			
			point.renderer = new GfxNodeRendererTransform()
				.attach(this.scene.root)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.material)
			
			point.rendererSelected = new GfxNodeRendererTransform()
				.attach(this.sceneAfter.root)
				.setModel(this.modelPointSelection)
				.setMaterial(this.viewer.materialUnshaded)
				.setEnabled(false)
				
			point.rendererSelectedCore = new GfxNodeRenderer()
				.attach(point.rendererSelected)
				.setModel(this.modelPoint)
				.setMaterial(this.viewer.material)
				
			point.rendererSizeCircle = new GfxNodeRendererTransform()
				.attach(this.sceneSizeCircles.root)
				.setModel(this.modelSizeCircle)
				.setMaterial(this.viewer.materialUnshaded)
				
			this.renderers.push(point.renderer)
			this.renderers.push(point.rendererSelected)
			this.renderers.push(point.rendererSizeCircle)
				
			point.rendererOutgoingPaths = []
			point.rendererOutgoingPathArrows = []
			
			for (let next of point.next)
			{
				let rPath = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath)
					.setMaterial(this.viewer.material)
					
				let rArrow = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelArrow)
					.setMaterial(this.viewer.material)
					
				point.rendererOutgoingPaths.push(rPath)
				point.rendererOutgoingPathArrows.push(rArrow)
					
				this.renderers.push(rPath)
				this.renderers.push(rArrow)
			}
		}
	}
	
	
	getHoveringOverElement(cameraPos, ray, distToHit, includeSelected = true)
	{
		let elem = null
		
		let minDistToCamera = distToHit + 1000
		let minDistToPoint = 1000000
		for (let point of this.data.enemyPoints)
		{
			if (!includeSelected && point.selected)
				continue
			
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
	
	
	selectAll()
	{
		for (let point of this.data.enemyPoints)
			point.selected = true
	}
	
	
	unselectAll()
	{
		for (let point of this.data.enemyPoints)
			point.selected = false
	}
	
	
	toggleAllSelection()
	{
		let hasSelection = (this.data.enemyPoints.find(p => p.selected) != null)
		
		if (hasSelection)
			this.unselectAll()
		else
			this.selectAll()
	}
	
	
	deleteSelectedPoints()
	{
		let pointsToDelete = []
		
		for (let point of this.data.enemyPoints)
		{
			if (!point.selected)
				continue
			
			pointsToDelete.push(point)
		}
		
		for (let point of pointsToDelete)
			this.data.removeEnemyPoint(point)
		
		this.refresh()
	}
	
	
	unlinkSelectedPoints()
	{
		for (let point of this.data.enemyPoints)
		{
			if (!point.selected)
				continue
			
			let nextPointsToUnlink = []
			
			for (let next of point.next)
			{
				if (!next.selected)
					continue
				
				nextPointsToUnlink.push(next)
			}
			
			for (let next of nextPointsToUnlink)
				this.data.unlinkEnemyPoints(point, next)
		}
		
		this.refresh()
	}
	
	
	onKeyDown(ev)
	{
		switch (ev.key)
		{
			case "A":
			case "a":
				this.toggleAllSelection()
				return true
			
			case "Backspace":
			case "Delete":
			case "X":
			case "x":
				this.deleteSelectedPoints()
				return true
				
			case "U":
			case "u":
				this.unlinkSelectedPoints()
				return true
		}
		
		return false
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		this.linkingPoints = false
		
		for (let point of this.data.enemyPoints)
			point.moveOrigin = point.pos
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.selected))
			this.unselectAll()
		
		if (hoveringOverElem != null)
		{
			if (ev.altKey)
			{
				this.unselectAll()
				
				let newPoint = this.data.makeEnemyPoint()
				newPoint.pos = hoveringOverElem.pos
				newPoint.size = hoveringOverElem.size
				
				this.data.linkEnemyPoints(hoveringOverElem, newPoint)
				
				this.refresh()
				
				newPoint.selected = true
				this.linkingPoints = true
			}
			else
			{
				hoveringOverElem.selected = true
				this.viewer.setCursor("-webkit-grabbing")
			}
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
				let linkToPoint = this.getHoveringOverElement(cameraPos, ray, distToHit, false)
				
				for (let point of this.data.enemyPoints)
				{
					if (!point.selected)
						continue
					
					this.viewer.setCursor("-webkit-grabbing")
					
					if (this.linkingPoints && linkToPoint != null)
					{
						point.pos = linkToPoint.pos
					}
					else
					{					
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
	}
	
	
	onMouseUp(ev, x, y)
	{
		if (this.viewer.mouseAction == "move")
		{
			if (this.linkingPoints)
			{
				let pointBeingLinked = this.data.enemyPoints.find(p => p.selected)
				let pointBeingLinkedTo = this.data.enemyPoints.find(p => p != pointBeingLinked && p.pos == pointBeingLinked.pos)
				
				if (pointBeingLinkedTo != null)
				{
					this.data.removeEnemyPoint(pointBeingLinked)
					this.data.linkEnemyPoints(pointBeingLinked.prev[0], pointBeingLinkedTo)
					this.refresh()
				}
			}
		}
	}
	
	
	draw()
	{
	}
	
	
	drawAfter()
	{
		if (this.viewer.cfg.enemyPathsEnableSizeRender)
			this.drawSizeCircles()
		
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let point of this.data.enemyPoints)
		{
			let distToCamera = point.pos.sub(cameraPos).magn()
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * distToCamera / 20000
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([1, 0, 0, 1])
				
			let sizeCircleScale = point.size * 50
			point.rendererSizeCircle
				.setTranslation(point.pos)
				.setScaling(new Vec3(sizeCircleScale, sizeCircleScale, sizeCircleScale))
				.setDiffuseColor([1, 0.5, 0, 0.5])
				
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
	
	
	drawSizeCircles()
	{
		let gl = this.viewer.gl
		let camera = this.viewer.getCurrentCamera()
		
		gl.enable(gl.STENCIL_TEST)
		gl.stencilFunc(gl.ALWAYS, 0, 0xff)
		gl.stencilMask(0xff)
		gl.clearStencil(0)
		gl.clear(gl.STENCIL_BUFFER_BIT)

		gl.colorMask(false, false, false, false)
		gl.depthMask(false)
		gl.cullFace(gl.FRONT)
		gl.stencilOp(gl.KEEP, gl.INCR, gl.KEEP)
		this.sceneSizeCircles.render(gl, camera)
		
		gl.cullFace(gl.BACK)
		gl.stencilOp(gl.KEEP, gl.DECR, gl.KEEP)
		this.sceneSizeCircles.render(gl, camera)
		
		gl.cullFace(gl.BACK)
		gl.colorMask(true, true, true, true)
		gl.stencilMask(0x00)
		gl.stencilFunc(gl.NOTEQUAL, 0, 0xff)

		this.sceneSizeCircles.render(gl, camera)
		
		gl.depthMask(true)
		gl.disable(gl.STENCIL_TEST)
	}
}


if (module)
	module.exports = { ViewerEnemyPaths }