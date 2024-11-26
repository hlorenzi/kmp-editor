const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class PathViewer
{
	constructor(window, viewer, data)
	{
		this.window = window
		this.viewer = viewer
		this.data = data
        this.renderers = []
		
		this.scene = new GfxScene()
		this.sceneAfter = new GfxScene()
		this.sceneSizeCircles = new GfxScene()
		
		this.hoveringOverPoint = null
		this.linkingPoints = false
		this.targetPos = null
		this.ctrlIsHeld = false
		this.altIsHeld = false
		
		this.lastAxisHotkey = ""
		this.snapCollision = this.viewer.cfg.snapToCollision
		this.lockX = this.viewer.cfg.lockAxisX
		this.lockY = this.viewer.cfg.lockAxisY
		this.lockZ = this.viewer.cfg.lockAxisZ
		
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
	}
	
	
	setData(data)
	{
		this.data = data
		this.refresh()
	}
	
	
	destroy()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
	}
	
	
	refresh()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
		
		for (let point of this.points().nodes)
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
		for (let point of this.points().nodes)
		{
			if (!includeSelected && point.selected)
				continue
			
			let distToCamera = point.pos.sub(cameraPos).magn()
			if (distToCamera >= minDistToCamera)
				continue
			
			let scale = this.viewer.getElementScale(point.pos)
			
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
		for (let point of this.points().nodes)
			point.selected = true
		
		this.refreshPanels()
	}
	
	
	unselectAll()
	{
		for (let point of this.points().nodes)
			point.selected = false
		
		this.refreshPanels()
	}
	
	
	toggleAllSelection()
	{
		let hasSelection = (this.points().nodes.find(p => p.selected) != null)
		
		if (hasSelection)
			this.unselectAll()
		else
			this.selectAll()
	}
	
	
	deleteSelectedPoints()
	{
		let pointsToDelete = []
		
		for (let point of this.points().nodes)
		{
			if (!point.selected)
				continue
			
			pointsToDelete.push(point)
		}
		
		for (let point of pointsToDelete)
			this.points().removeNode(point)
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}


	snapSelectedToY()
	{
		for (let point of this.points().nodes)
		{
			if (point.selected)
			{
				let hit = this.viewer.collision.raycast(point.pos, new Vec3(0, 0, 1))
				if (hit != null && point.pos.sub(hit.position).magn() > 1)
					point.pos = hit.position
			}
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	unlinkSelectedPoints()
	{
		for (let point of this.points().nodes)
		{
			if (!point.selected)
				continue
			
			let nextPointsToUnlink = []
			
			for (let next of point.next)
			{
				if (!next.node.selected)
					continue
				
				nextPointsToUnlink.push(next.node)
			}
			
			for (let next of nextPointsToUnlink)
				this.points().unlinkNodes(point, next)
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	setSelectedAsFirstPoint()
	{
		for (let p = 0; p < this.points().nodes.length; p++)
		{
			let point = this.points().nodes[p]
			
			if (!point.selected)
				continue
			
			this.points().nodes.splice(p, 1)
			this.points().nodes.unshift(point)
		}
		
		this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	onKeyDown(ev)
	{
		if (this.viewer.mouseDown && !ev.ctrlKey && this.viewer.mouseAction == "move")
		{
			const setAxisLocks = (s, x, y, z) =>
			{
				if (this.lastAxisHotkey === s)
					return false

				if (!this.lastAxisHotkey)
				{
					// save old state
					this.snapCollision = this.viewer.cfg.snapToCollision
					this.lockX = this.viewer.cfg.lockAxisX
					this.lockY = this.viewer.cfg.lockAxisY
					this.lockZ = this.viewer.cfg.lockAxisZ
				}

				this.lastAxisHotkey = s

				if (this.hoveringOverPoint != null)
					this.targetPos = this.hoveringOverPoint.pos

				if (x || y || z)
					this.viewer.cfg.snapToCollision = false
				this.viewer.cfg.lockAxisX = x
				this.viewer.cfg.lockAxisY = y
				this.viewer.cfg.lockAxisZ = z

				this.window.refreshPanels()
			}

			switch (ev.key)
			{
				case "X":
					setAxisLocks("X", true, false, false)
					return true

				case "x":
					setAxisLocks("x", false, true, true)
					return true

				case "Y":
					setAxisLocks("Y", false, true, false)
					return true

				case "y":
					setAxisLocks("y", true, false, true)
					return true
				
				case "Z":
					setAxisLocks("Z", false, false, true)
					return true

				case "z":
					setAxisLocks("z", true, true, false)
					return true
			}
		}

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

			case "Y":
			case "y":
				this.snapSelectedToY()
				return true
				
			case "U":
			case "u":
				this.unlinkSelectedPoints()
				return true
				
			case "F":
			case "f":
				this.setSelectedAsFirstPoint()
				return true
		}
		
		return false
	}
	
	
	onMouseDown(ev, x, y, cameraPos, ray, hit, distToHit, mouse3DPos)
	{
		this.linkingPoints = false
		
		for (let point of this.points().nodes)
			point.moveOrigin = point.pos
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (ev.shiftKey || (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.selected)))
			this.unselectAll()

		if (ev.ctrlKey)
			this.ctrlIsHeld = true

		if (ev.shiftKey)
			this.altIsHeld = true
		
		if (hoveringOverElem != null)
		{
			if (ev.shiftKey)
			{
				if (this.points().nodes.length >= this.points().maxNodes)
				{
					alert("KMP error!\n\nMaximum number of points surpassed (" + this.points().maxNodes + ")")
					return
				}
				else if (hoveringOverElem.next.length >= this.points().maxNextNodes)
				{
					alert("Node link error!\n\nMax outgoing connections to a point surpassed (maximum " + this.points().maxNextNodes + ")")
					return
				}

				let newPoint = this.points().addNode()
				this.points().onCloneNode(newPoint, hoveringOverElem)
				newPoint.pos = hoveringOverElem.pos
				newPoint.size = hoveringOverElem.size
				
				this.points().linkNodes(hoveringOverElem, newPoint)
				
				this.refresh()
				
				newPoint.selected = true
				this.targetPos = newPoint.moveOrigin.clone()
				this.linkingPoints = true
				this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
				this.viewer.setCursor("-webkit-grabbing")
				this.refreshPanels()
				this.window.setNotSaved()
			}
			else
			{
				hoveringOverElem.selected = true
				this.targetPos = hoveringOverElem.moveOrigin.clone()
				this.refreshPanels()
				this.viewer.setCursor("-webkit-grabbing")
			}
		}
		else if (ev.shiftKey)
		{
			if (this.points().nodes.length >= this.points().maxNodes)
			{
				alert("KMP error!\n\nMaximum number of points surpassed (" + this.points().maxNodes + ")")
				return
			}
			let newPoint = this.points().addNode()
			newPoint.pos = mouse3DPos
			
			this.refresh()
			newPoint.selected = true
			this.targetPos = newPoint.moveOrigin.clone()
			this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
			this.viewer.setCursor("-webkit-grabbing")
			this.refreshPanels()
			this.window.setNotSaved()
		}
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		// Mouse not held OR mouse held, ctrl held
		if (!this.viewer.mouseDown || this.ctrlIsHeld)
		{
			let lastHover = this.hoveringOverPoint
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
			{
				this.viewer.setCursor("-webkit-grab")
				if (this.ctrlIsHeld)
				{
					this.hoveringOverPoint.selected = true
					this.refreshPanels()
				}
			}
			
			if (this.hoveringOverPoint != lastHover)
				this.viewer.render()
		}
		// Mouse held, ctrl not held, holding point(s)
		else if (this.viewer.mouseAction == "move")
		{
			let linkToPoint = this.getHoveringOverElement(cameraPos, ray, distToHit, false)
			let selectedPoints = []
			
			for (let point of this.points().nodes)
			{
				if (!point.selected)
					continue
				selectedPoints.push(point)
			}
			// Creating new linked point
			if (selectedPoints.length == 1 && ev.shiftKey && !this.altIsHeld)
			{
				if (this.points().nodes.length >= this.points().maxNodes)
				{
					alert("KMP error!\n\nMaximum number of points surpassed (" + this.points().maxNodes + ")")
					return
				}
				let point = selectedPoints[0]

				let newPoint = this.points().addNode()
				newPoint.pos = point.moveOrigin
				newPoint.size = point.size
				
				this.points().linkNodes(point, newPoint)
				
				this.refresh()
				
				point.selected = false
				newPoint.selected = true
				this.targetPos = newPoint.moveOrigin.clone()
				this.linkingPoints = true
				this.altIsHeld = true
				this.data.refreshIndices(this.viewer.cfg.isBattleTrack)
				this.viewer.setCursor("-webkit-grabbing")
				this.refreshPanels()
				this.window.setNotSaved()
				return
			}
			else if (!ev.shiftKey)
			{
				this.altIsHeld = false
			}

			this.window.setNotSaved()
			this.viewer.setCursor("-webkit-grabbing")

			let moveVector = null
							
			let screenPosMoved = this.viewer.pointToScreen(this.targetPos)
			screenPosMoved.x += this.viewer.mouseMoveOffsetPixels.x
			screenPosMoved.y += this.viewer.mouseMoveOffsetPixels.y
			let pointRayMoved = this.viewer.getScreenRay(screenPosMoved.x, screenPosMoved.y)
			
			let hit = this.viewer.collision.raycast(pointRayMoved.origin, pointRayMoved.direction)
			if (this.viewer.cfg.snapToCollision && hit != null)
				moveVector = hit.position.sub(this.targetPos)
			else
			{
				let screenPos = this.viewer.pointToScreen(this.targetPos)
				let pointRay = this.viewer.getScreenRay(screenPos.x, screenPos.y)
				let origDistToScreen = this.targetPos.sub(pointRay.origin).magn()
				
				let direction = pointRayMoved.direction

				if (this.viewer.cfg.lockAxisX && this.viewer.cfg.lockAxisY && this.viewer.cfg.lockAxisZ)
				{
					return
				}
				else if (this.viewer.cfg.lockAxisX)
				{
					if (this.viewer.cfg.lockAxisY)
						direction = Geometry.lineLineProjection(pointRayMoved.origin, direction, this.targetPos, new Vec3(0, 1, 0))
					else if (this.viewer.cfg.lockAxisZ)
						direction = Geometry.lineLineProjection(pointRayMoved.origin, direction, this.targetPos, new Vec3(0, 0, 1))
					direction = direction.scale((this.targetPos.x - pointRayMoved.origin.x) / direction.x)
				}
				else if (this.viewer.cfg.lockAxisY)
				{
					if (this.viewer.cfg.lockAxisZ)
						direction = Geometry.lineLineProjection(pointRayMoved.origin, direction, this.targetPos, new Vec3(1, 0, 0))
					direction = direction.scale((this.targetPos.z - pointRayMoved.origin.z) / direction.z)
				}
				else if (this.viewer.cfg.lockAxisZ)
				{
					direction = direction.scale((this.targetPos.y - pointRayMoved.origin.y) / direction.y)
				}
				else
				{
					direction = direction.scale(origDistToScreen)
				}

				let newPos = pointRayMoved.origin.add(direction)

				if (this.viewer.cfg.lockAxisX)
					newPos.x = this.targetPos.x
				if (this.viewer.cfg.lockAxisY)
					newPos.z = this.targetPos.z
				if (this.viewer.cfg.lockAxisZ)
					newPos.y = this.targetPos.y
				
				moveVector = newPos.sub(this.targetPos)
			}

			for (let point of this.points().nodes)
			{
				if (!point.selected)
					continue
				
				if (this.linkingPoints && linkToPoint != null && linkToPoint.pos != point.moveOrigin)
					point.pos = linkToPoint.pos
				else
					point.pos = point.moveOrigin.add(moveVector)
			}
			
			this.refreshPanels()
		}
	}
	
	
	onMouseUp(ev, x, y)
	{
		this.ctrlIsHeld = false
		this.altIsHeld = false
		
		if (this.lastAxisHotkey) {
			this.lastAxisHotkey = ""
			this.viewer.cfg.snapToCollision = this.snapCollision
			this.viewer.cfg.lockAxisX = this.lockX
			this.viewer.cfg.lockAxisY = this.lockY
			this.viewer.cfg.lockAxisZ = this.lockZ
			this.window.refreshPanels()
		}

		if (this.viewer.mouseAction == "move")
		{
			if (this.linkingPoints)
			{
				let pointBeingLinked = this.points().nodes.find(p => p.selected)
				if (pointBeingLinked == null)
					return
				
				let pointBeingLinkedTo = this.points().nodes.find(p => p != pointBeingLinked && p.pos == pointBeingLinked.pos)
				
				if (pointBeingLinkedTo != null)
				{
					this.points().removeNode(pointBeingLinked)

					if (pointBeingLinkedTo.prev.length >= this.points().maxPrevNodes)
					{
						alert("Node link error!\n\nMax incoming connections to a point surpassed (maximum " + this.points().maxPrevNodes + ")")
						this.refresh()
						return
					}

					this.points().linkNodes(pointBeingLinked.prev[0].node, pointBeingLinkedTo)
					this.refresh()
					this.window.setNotSaved()
				}
			}
		}
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
	module.exports = { PathViewer }
