const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")
const { Geometry } = require("../math/geometry.js")


class ViewerItemPaths
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
			
		this.modelPath1 = new ModelBuilder()
			.addCylinder(-100, -100, 0, 100, 100, 0.5)
			.calculateNormals()
			.makeModel(viewer.gl)
		
		this.modelPath2 = new ModelBuilder()
			.addCylinder(-100, -100, 0.5, 100, 100, 1)
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
	
	
	refreshPanels()
	{
		let panel = this.window.addPanel("Item Paths", false, (open) => { if (open) this.viewer.setSubviewer(this) })
		this.panel = panel
		
		panel.addCheckbox(null, "Show point sizes", this.viewer.cfg.enemyPathsEnableSizeRender, (x) => this.viewer.cfg.enemyPathsEnableSizeRender = x)
		
		if (this.data.itemPoints.nodes.length == 0 && this.data.enemyPoints.nodes.length > 0)
			panel.addButton(null, "Copy From Enemy Paths", () => this.copyFromEnemyPaths())
		
		panel.addText(null, "<strong>Hold Alt + Click:</strong> Create Point")
		panel.addText(null, "<strong>Hold Alt + Drag Point:</strong> Extend Path")
		panel.addText(null, "<strong>Hold Ctrl:</strong> Multiselect")
		panel.addButton(null, "(A) Select/Unselect All", () => this.toggleAllSelection())
		panel.addButton(null, "(X) Delete Selected", () => this.deleteSelectedPoints())
		panel.addButton(null, "(Y) Snap To Collision Y", () => this.snapSelectedToY())
		panel.addButton(null, "(U) Unlink Selected", () => this.unlinkSelectedPoints())
		panel.addButton(null, "(F) Set Selected as First Point", () => this.setSelectedAsFirstPoint())
		
		let selectedPoints = this.data.itemPoints.nodes.filter(p => p.selected)
		
		let selectionGroup = panel.addGroup(null, "Selection:")
		let enabled = (selectedPoints.length > 0)
		let multiedit = (selectedPoints.length > 1)
		
		if (selectedPoints.length == 1)
		{
			const formatNum = (x) =>
			{
				if (x === null || x === undefined)
					return ""
				
				return x.toString()
			}
			
			const formatNumHex = (x) =>
			{
				if (x === null || x === undefined)
					return ""
				
				return x.toString() + " (0x" + x.toString(16) + ")"
			}
			
			panel.addText(selectionGroup, "<strong>ITPH Index:</strong> " + formatNumHex(selectedPoints[0].pathIndex) + ", point #" + formatNum(selectedPoints[0].pathPointIndex))
			panel.addText(selectionGroup, "<strong>ITPT Index:</strong> " + formatNumHex(selectedPoints[0].pointIndex))
		}
		
		panel.addSelectionNumericInput(selectionGroup,    "X", -1000000, 1000000, selectedPoints.map(p =>  p.pos.x), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.x = x })
		panel.addSelectionNumericInput(selectionGroup,    "Y", -1000000, 1000000, selectedPoints.map(p => -p.pos.z), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.z = -x })
		panel.addSelectionNumericInput(selectionGroup,    "Z", -1000000, 1000000, selectedPoints.map(p => -p.pos.y), null, 100.0, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].pos.y = -x })
		panel.addSelectionNumericInput(selectionGroup, "Size",        1,    1000, selectedPoints.map(p =>  p.size),  null, 0.1, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].size = x })
		
		let setting1Options =
		[
			{ str: "None", value: 0 },
			{ str: "B.Bill uses gravity", value: 1 },
			{ str: "B.Bill disregards gravity", value: 2 }
		]
		panel.addSelectionDropdown(selectionGroup, "Setting 1", selectedPoints.map(p => p.setting1), setting1Options, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting1 = x })
		
		let setting2Options =
		[
			{ str: "None", value: 0 },
			{ str: "B.Bill can't stop", value: 1 },
			{ str: "Low-priority route", value: 0xa },
			{ str: "B.Bill can't stop & Low-priority route", value: 0xb },
		]
		panel.addSelectionDropdown(selectionGroup, "Setting 2", selectedPoints.map(p => p.setting2), setting2Options, enabled, multiedit, (x, i) => { this.window.setNotSaved(); selectedPoints[i].setting2 = x })

		panel.addButton(selectionGroup, "Set as Default Bill Route", () => this.setDefaultBillRoute())
	}
	
	
	refresh()
	{
		for (let r of this.renderers)
			r.detach()
		
		this.renderers = []
		
		for (let point of this.data.itemPoints.nodes)
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
				
			point.rendererOutgoingPaths1 = []
			point.rendererOutgoingPaths2 = []
			point.rendererOutgoingPathArrows = []
			
			for (let next of point.next)
			{
				let rPath1 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath1)
					.setMaterial(this.viewer.material)
				
				let rPath2 = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelPath2)
					.setMaterial(this.viewer.material)
					
				let rArrow = new GfxNodeRendererTransform()
					.attach(this.scene.root)
					.setModel(this.modelArrow)
					.setMaterial(this.viewer.material)
					
				point.rendererOutgoingPaths1.push(rPath1)
				point.rendererOutgoingPaths2.push(rPath2)
				point.rendererOutgoingPathArrows.push(rArrow)
					
				this.renderers.push(rPath1)
				this.renderers.push(rPath2)
				this.renderers.push(rArrow)
			}
		}
		
		this.refreshPanels()
	}
	
	
	getHoveringOverElement(cameraPos, ray, distToHit, includeSelected = true)
	{
		let elem = null
		
		let minDistToCamera = distToHit + 1000
		let minDistToPoint = 1000000
		for (let point of this.data.itemPoints.nodes)
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
		for (let point of this.data.itemPoints.nodes)
			point.selected = true
		
		this.refreshPanels()
	}
	
	
	unselectAll()
	{
		for (let point of this.data.itemPoints.nodes)
			point.selected = false
		
		this.refreshPanels()
	}
	
	
	toggleAllSelection()
	{
		let hasSelection = (this.data.itemPoints.nodes.find(p => p.selected) != null)
		
		if (hasSelection)
			this.unselectAll()
		else
			this.selectAll()
	}
	
	
	deleteSelectedPoints()
	{
		let pointsToDelete = []
		
		for (let point of this.data.itemPoints.nodes)
		{
			if (!point.selected)
				continue
			
			pointsToDelete.push(point)
		}
		
		for (let point of pointsToDelete)
			this.data.itemPoints.removeNode(point)
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}


	snapSelectedToY()
	{
		for (let point of this.data.itemPoints.nodes)
		{
			if (point.selected)
			{
				let hit = this.viewer.collision.raycast(point.pos, new Vec3(0, 0, 1))
				if (hit != null)
					point.pos = hit.position
			}
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	unlinkSelectedPoints()
	{
		for (let point of this.data.itemPoints.nodes)
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
				this.data.itemPoints.unlinkNodes(point, next)
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}
	
	
	setSelectedAsFirstPoint()
	{
		for (let p = 0; p < this.data.itemPoints.nodes.length; p++)
		{
			let point = this.data.itemPoints.nodes[p]
			
			if (!point.selected)
				continue
			
			this.data.itemPoints.nodes.splice(p, 1)
			this.data.itemPoints.nodes.unshift(point)
		}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}


	setDefaultBillRoute()
	{
		for (let point of this.data.itemPoints.nodes)
			if (point.selected)
				for (let prev of point.prev)
				{
					let i = prev.node.next.findIndex(p => p.node == point)
					let prevLink = prev.node.next.splice(i, 1)[0]
					prev.node.next.unshift(prevLink)
				}
		
		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
	}


	copyFromEnemyPaths()
	{
		let newGraph = this.data.enemyPoints.clone()
		newGraph.onAddNode = (node) => 
		{
			node.pos = new Vec3(0, 0, 0)
			node.size = 10
			node.setting1 = 0
			node.setting2 = 0
		}
		newGraph.onCloneNode = (newNode, oldNode) => 
		{
			newNode.pos = oldNode.pos.clone()
			newNode.size = oldNode.size
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
		}

		for (let point of newGraph.nodes)
		{
			point.setting1 = 0
			point.setting2 = 0
			delete point.setting3
		}

		this.data.itemPoints = newGraph

		this.refresh()
		this.window.setNotSaved()
		this.window.setUndoPoint()
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
		
		for (let point of this.data.itemPoints.nodes)
			point.moveOrigin = point.pos
		
		let hoveringOverElem = this.getHoveringOverElement(cameraPos, ray, distToHit)
		
		if (ev.altKey || (!ev.ctrlKey && (hoveringOverElem == null || !hoveringOverElem.selected)))
			this.unselectAll()
		
		if (hoveringOverElem != null)
		{
			if (ev.altKey)
			{
				if (hoveringOverElem.next.length >= this.data.itemPoints.maxNextNodes)
				{
					alert("Node link error!\n\nMax outgoing connections to a point surpassed (maximum " + this.data.itemPoints.maxNextNodes + ")")
					return
				}

				let newPoint = this.data.itemPoints.addNode()
				newPoint.pos = hoveringOverElem.pos
				newPoint.size = hoveringOverElem.size

				this.data.itemPoints.linkNodes(hoveringOverElem, newPoint)
				
				this.refresh()
				
				newPoint.selected = true
				this.linkingPoints = true
				this.viewer.setCursor("-webkit-grabbing")
				this.refreshPanels()
				this.window.setNotSaved()
			}
			else
			{
				hoveringOverElem.selected = true
				this.refreshPanels()
				this.viewer.setCursor("-webkit-grabbing")
			}
		}
		else if (ev.altKey)
		{
			let newPoint = this.data.itemPoints.addNode()
			newPoint.pos = mouse3DPos
			
			this.refresh()
			newPoint.selected = true
			this.viewer.setCursor("-webkit-grabbing")
			this.refreshPanels()
			this.window.setNotSaved()
		}
	}
	
	
	onMouseMove(ev, x, y, cameraPos, ray, hit, distToHit)
	{
		if (!this.viewer.mouseDown)
		{
			let lastHover = this.hoveringOverPoint
			this.hoveringOverPoint = this.getHoveringOverElement(cameraPos, ray, distToHit)
			
			if (this.hoveringOverPoint != null)
				this.viewer.setCursor("-webkit-grab")
			
			if (this.hoveringOverPoint != lastHover)
				this.viewer.render()
		}
		else
		{
			if (this.viewer.mouseAction == "move")
			{
				let linkToPoint = this.getHoveringOverElement(cameraPos, ray, distToHit, false)
				
				for (let point of this.data.itemPoints.nodes)
				{
					if (!point.selected)
						continue
					
					this.window.setNotSaved()
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
				
				this.refreshPanels()
			}
		}
	}
	
	
	onMouseUp(ev, x, y)
	{
		if (this.viewer.mouseAction == "move")
		{
			if (this.linkingPoints)
			{
				let pointBeingLinked = this.data.itemPoints.nodes.find(p => p.selected)
				if (pointBeingLinked == null)
					return
				
				let pointBeingLinkedTo = this.data.itemPoints.nodes.find(p => p != pointBeingLinked && p.pos == pointBeingLinked.pos)
				
				if (pointBeingLinkedTo != null)
				{
					this.data.itemPoints.removeNode(pointBeingLinked)

					if (pointBeingLinkedTo.prev.length >= this.data.itemPoints.maxPrevNodes)
					{
						alert("Node link error!\n\nMax incoming connections to a point surpassed (maximum " + this.data.itemPoints.maxPrevNodes + ")")
						this.refresh()
						return
					}

					this.data.itemPoints.linkNodes(pointBeingLinked.prev[0].node, pointBeingLinkedTo)

					this.refresh()
					this.window.setNotSaved()
				}
			}
		}
	}
	
	
	drawAfterModel()
	{
		let cameraPos = this.viewer.getCurrentCameraPosition()
		
		for (let p = 0; p < this.data.itemPoints.nodes.length; p++)
		{
			let point = this.data.itemPoints.nodes[p]
			
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			let bbillCantStop = (point.setting2 & 0x1) != 0
			
			point.renderer
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor(p == 0 ? [0, 0.4, 0, 1] : bbillCantStop ? [0.75, 0.75, 0.75, 1] : [0, 0.8, 0, 1])
				
			let sizeCircleScale = point.size * 50
			point.rendererSizeCircle
				.setTranslation(point.pos)
				.setScaling(new Vec3(sizeCircleScale, sizeCircleScale, sizeCircleScale))
				.setDiffuseColor([0.25, 0.8, 0, 0.5])
				
			for (let n = 0; n < point.next.length; n++)
			{
				let nextPos = point.next[n].node.pos
				
				let scale2 = Math.min(scale, this.viewer.getElementScale(nextPos))
				
				let nextBbillCantStop = (point.next[n].node.setting2 & 0x1) != 0
				let lowPriority = (point.next[n].node.setting2 & 0xa) != 0
				
				let matrixScale = Mat4.scale(scale2, scale2, nextPos.sub(point.pos).magn())
				let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), nextPos.sub(point.pos).normalize())
				let matrixTranslate = Mat4.translation(point.pos.x, point.pos.y, point.pos.z)
				
				let matrixScaleArrow = Mat4.scale(scale2, scale2, scale2)
				let matrixTranslateArrow = Mat4.translation(nextPos.x, nextPos.y, nextPos.z)
				
				point.rendererOutgoingPaths1[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor(bbillCantStop ? [0.5, 0.5, 0.5, 1] : lowPriority ? [0.5, 1, 0.8, 1] : n != 0 ? [0.8, 1, 0.5, 1] : [0.5, 1, 0, 1])

				point.rendererOutgoingPaths2[n]
					.setCustomMatrix(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
					.setDiffuseColor(nextBbillCantStop ? [0.5, 0.5, 0.5, 1] : lowPriority ? [0.5, 1, 0.8, 1] : n != 0 ? [0.8, 1, 0.5, 1] : [0.5, 1, 0, 1])
					
				point.rendererOutgoingPathArrows[n]
					.setCustomMatrix(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
					.setDiffuseColor(nextBbillCantStop ? [0.85, 0.85, 0.85, 1] : [0.1, 0.8, 0, 1])
			}
		}
		
		if (this.viewer.cfg.enemyPathsEnableSizeRender)
			this.drawSizeCircles()
		
		this.scene.render(this.viewer.gl, this.viewer.getCurrentCamera())
		
		for (let p = 0; p < this.data.itemPoints.nodes.length; p++)
		{
			let point = this.data.itemPoints.nodes[p]
			
			let scale = (this.hoveringOverPoint == point ? 1.5 : 1) * this.viewer.getElementScale(point.pos)
			
			point.rendererSelected
				.setTranslation(point.pos)
				.setScaling(new Vec3(scale, scale, scale))
				.setDiffuseColor([0.4, 1, 0.1, 1])
				.setEnabled(point.selected)
				
			point.rendererSelectedCore
				.setDiffuseColor(p == 0 ? [0, 0.4, 0, 1] :[0, 0.8, 0, 1])
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
	module.exports = { ViewerItemPaths }