const { GLProgram } = require("../gl/shader.js")
const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ViewerStartPoints } = require("./viewerStartPoints.js")
const { ViewerEnemyPaths } = require("./viewerEnemyPaths.js")
const { ViewerItemPaths } = require("./viewerItemPaths.js")
const { ViewerCheckpoints } = require("./viewerCheckpoints.js")
const { ViewerObjects } = require("./viewerObjects.js")
const { ViewerRespawnPoints } = require("./viewerRespawnPoints.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")


class Viewer
{
	constructor(window, canvas, cfg, data)
	{
		this.window = window
		this.cfg = cfg
		this.data = data
		
		this.canvas = canvas
		this.canvas.onresize = () => this.resize()
		this.canvas.onmousedown = (ev) => this.onMouseDown(ev)
		document.addEventListener("mousemove", (ev) => this.onMouseMove(ev))
		document.addEventListener("mouseup", (ev) => this.onMouseUp(ev))
		document.addEventListener("mouseleave", (ev) => this.onMouseUp(ev))
		this.canvas.onwheel = (ev) => this.onMouseWheel(ev)
		document.onkeydown = (ev) => this.onKeyDown(ev)
		
		this.subviewer = null
		
		this.mouseDown = false
		this.mouseDownOrigin = null
		this.mouseDownRaycast = null
		this.mouseLastClickDate = new Date()
		this.mouseAction = null
		this.mouseLast = null
		
		this.mouseMoveOffsetPixels = { x: 0, y: 0 }
		this.mouseMoveOffsetPan = new Vec3(0, 0, 0)
		this.mouseMoveOffsetPanDelta = new Vec3(0, 0, 0)
		this.mouseMoveOffsetRaycast = new Vec3(0, 0, 0)
		
		this.cameraFocus = new Vec3(0, 0, 0)
		this.cameraHorzAngle = Math.PI / 2
		this.cameraVertAngle = 1
		this.cameraDist = 10000
		
		this.gl = canvas.getContext("webgl", { stencil: true })
		
		this.resize()
		
		this.gl.clearColor(0, 0, 0, 1)
		this.gl.clearDepth(1.0)
		
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.depthFunc(this.gl.LEQUAL)
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
		
		this.scene = new GfxScene()
		
		this.material = new GfxMaterial()
			.setProgram(
				GLProgram.makeFromSrc(this.gl, vertexSrc, fragmentSrc)
				.registerLocations(this.gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uAmbientColor", "uDiffuseColor"]))
				
		this.materialColor = new GfxMaterial()
			.setProgram(
				GLProgram.makeFromSrc(this.gl, vertexSrcColor, fragmentSrcColor)
				.registerLocations(this.gl, ["aPosition", "aNormal", "aColor"], ["uMatProj", "uMatView", "uMatModel", "uAmbientColor", "uDiffuseColor"]))
				
		this.materialUnshaded = new GfxMaterial()
			.setProgram(
				GLProgram.makeFromSrc(this.gl, vertexSrc, fragmentSrcUnshaded)
				.registerLocations(this.gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uDiffuseColor"]))
				
		this.model = null
		this.collision = null
			
		this.renderer = new GfxNodeRenderer()
			.attach(this.scene.root)
			.setMaterial(this.materialColor)
			.setDiffuseColor([1, 1, 1, 1])
			
		this.cachedCamera = new GfxCamera()
		this.cachedCameraPos = new Vec3(0, 0, 0)
			
			
		let debugRaycastBuilder = new ModelBuilder()
			.addSphere(-100, -100, -100, 100, 100, 100)
			.calculateNormals()
			
		this.debugRaycastRenderer = new GfxNodeRendererTransform()
			.attach(this.scene.root)
			.setModel(debugRaycastBuilder.makeModel(this.gl))
			.setMaterial(this.material)
			.setDiffuseColor([1, 0, 0, 1])
			.setEnabled(false)
			
			
		this.subviewers =
		[
			new ViewerStartPoints(this.window, this, this.data),
			new ViewerEnemyPaths(this.window, this, this.data),
			new ViewerItemPaths(this.window, this, this.data),
			new ViewerCheckpoints(this.window, this, this.data),
			new ViewerRespawnPoints(this.window, this, this.data),
			new ViewerObjects(this.window, this, this.data),
		]
		
		this.currentSubviewer = this.subviewers[0]
		
		this.render()
	}
	
	
	resize()
	{
		let rect = this.canvas.getBoundingClientRect()
		
		this.width = this.canvas.width = rect.width
		this.height = this.canvas.height = rect.height
		
		this.gl.viewport(0, 0, rect.width, rect.height)
	}
	
	
	refreshPanels()
	{
		for (let subviewer of this.subviewers)
			subviewer.refreshPanels()
	}
	
	
	setData(data)
	{
		this.data = data
		for (let subviewer of this.subviewers)
			subviewer.setData(data)
	}
	
	
	setModel(modelBuilder)
	{
		this.modelBuilder = modelBuilder
		this.model = modelBuilder.makeModel(this.gl)
		this.renderer.setModel(this.model)
		
		this.collision = modelBuilder.makeCollision().buildCacheSubdiv()
		
		for (let subviewer of this.subviewers)
		{
			if (subviewer.setModel)
				subviewer.setModel(modelBuilder)
		}
	}
	
	
	setSubviewer(subviewer)
	{
		if (this.currentSubviewer != null && this.currentSubviewer != subviewer)
		{
			this.currentSubviewer.destroy()
			this.currentSubviewer.panel.setOpen(false)
		}
		
		this.currentSubviewer = subviewer
		
		if (this.currentSubviewer != null)
		{
			this.currentSubviewer.refresh()
			this.currentSubviewer.panel.setOpen(true)
		}
		
		this.render()
	}
	
	
	centerView()
	{
		if (this.modelBuilder == null)
			return
		
		let bbox = this.modelBuilder.getBoundingBox()
		
		this.cameraFocus = new Vec3(bbox.xCenter, bbox.yCenter, bbox.zCenter)
		this.cameraHorzAngle = Math.PI / 2
		this.cameraVertAngle = 1
		this.cameraDist = Math.max(bbox.xSize, bbox.ySize, bbox.zSize) / 2
	}
	
	
	render()
	{
		// Cache camera position
		let eyeZDist = Math.cos(this.cameraVertAngle)
		
		let cameraEyeOffset = new Vec3(
			Math.cos(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraVertAngle) * this.cameraDist)
		
		this.cachedCameraPos = this.cameraFocus.add(cameraEyeOffset)
		
		// Cache camera
		if (this.cfg.useOrthoProjection)
		{
			let scale = this.cameraDist / 1000
			this.cachedCamera = new GfxCamera()
				.setProjection(Mat4.ortho(-this.width * scale, this.width * scale, -this.height * scale, this.height * scale, -500000, 500000))
				.setView(Mat4.lookat(this.getCurrentCameraPosition(), this.cameraFocus, new Vec3(0, 0, -1)))
		}
		else
		{
			this.cachedCamera = new GfxCamera()
				.setProjection(Mat4.perspective(30 * Math.PI / 180, this.width / this.height, 100, 500000))
				.setView(Mat4.lookat(this.getCurrentCameraPosition(), this.cameraFocus, new Vec3(0, 0, -1)))
		}
		
		// Render scene
		this.scene.clear(this.gl)
		
		let ambient = 1 - this.cfg.shadingFactor
		this.material.program.use(this.gl).setVec4(this.gl, "uAmbientColor", [ambient, ambient, ambient, 1])
		this.materialColor.program.use(this.gl).setVec4(this.gl, "uAmbientColor", [ambient, ambient, ambient, 1])
		
		if (this.currentSubviewer != null && this.currentSubviewer.drawBeforeModel)
			this.currentSubviewer.drawBeforeModel()
		
		this.scene.render(this.gl, this.getCurrentCamera())
		
		if (this.currentSubviewer != null && this.currentSubviewer.drawAfterModel)
			this.currentSubviewer.drawAfterModel()
	}
	
	
	getElementScale(pos)
	{
		if (this.cfg.useOrthoProjection)
			return this.cameraDist / 15000
		else
			return pos.sub(this.getCurrentCameraPosition()).magn() / 20000
	}
	
	
	getCurrentCameraPosition()
	{
		return this.cachedCameraPos
	}
	
	
	getCurrentCamera()
	{
		return this.cachedCamera
	}
	
	
	getScreenRay(x, y)
	{
		let camera = this.getCurrentCamera()
		
		let xViewport = (x / this.width) * 2 - 1
		let yViewport = (y / this.height) * 2 - 1
		
		let matrix = camera.view.mul(camera.projection).invert()
		
		let near = matrix.mulVec4([xViewport, -yViewport, -1, 1])
		let far = matrix.mulVec4([xViewport, -yViewport, 1, 1])
			
		near = new Vec3(near[0], near[1], near[2]).scale(1 / near[3])
		far = new Vec3(far[0], far[1], far[2]).scale(1 / far[3])
		
		return { origin: near, direction: far.sub(near).normalize() }
	}
	
	
	pointToScreen(pos)
	{
		let camera = this.getCurrentCamera()
		
		let p = camera.projection.transpose().mul(camera.view.transpose()).mulVec4([pos.x, pos.y, pos.z, 1])
		
		p[0] /= p[3]
		p[1] /= p[3]
		p[2] /= p[3]
		
		return {
			x: (p[0] + 1) / 2 * this.width,
			y: (1 - (p[1] + 1) / 2) * this.height,
			z: p[2],
			w: p[3]
		}
	}
	
	
	getMousePosFromEvent(ev)
	{
		let rect = this.canvas.getBoundingClientRect()
		
		return {
			x: ev.clientX - rect.left,
			y: ev.clientY - rect.top
		}
	}
	
	
	setCursor(cursor)
	{
		this.canvas.style.cursor = cursor
	}
	
	
	onKeyDown(ev)
	{
		if (ev.repeat == undefined)
			this.window.setUndoPoint()
		
		if (ev.key == "5")
		{
			this.cfg.useOrthoProjection = !this.cfg.useOrthoProjection
			ev.preventDefault()
			this.render()
			return
		}
		
		if (this.currentSubviewer != null)
		{
			if (this.currentSubviewer.onKeyDown(ev))
			{
				ev.preventDefault()
				this.render()
				return
			}
		}
	}
	
	
	onMouseDown(ev)
	{
		ev.preventDefault()
		this.window.setUndoPoint()
		
		let mouse = this.getMousePosFromEvent(ev)
		let ray = this.getScreenRay(mouse.x, mouse.y)
		let cameraPos = this.getCurrentCameraPosition()
		
		let doubleClick = (new Date().getTime() - this.mouseLastClickDate.getTime()) < 300
		
		let hit = this.collision.raycast(ray.origin, ray.direction)
		let distToHit = (hit == null ? 1000000 : hit.distScaled)
		
		this.mouseDown = true
		this.mouseDownOrigin = mouse
		this.mouseDownRaycast = hit
		this.mouseLast = mouse
		this.mouseAction = null
		
		this.mouseMoveOffsetPixels = { x: 0, y: 0 }
		this.mouseMoveOffsetPan = new Vec3(0, 0, 0)
		this.mouseMoveOffsetPanDelta = new Vec3(0, 0, 0)
		this.mouseMoveOffsetRaycast = new Vec3(0, 0, 0)
		
		if (ev.button == 2 || ev.button == 1)
		{
			if (doubleClick)
			{
				let ray = this.getScreenRay(mouse.x, mouse.y)
				let hit = this.collision.raycast(ray.origin, ray.direction)
				if (hit != null)
				{
					this.cameraFocus = hit.position
					this.cameraDist = 8000
				}
			}
			else if (ev.shiftKey)
				this.mouseAction = "pan"
			else
				this.mouseAction = "orbit"
		}
		else
		{
			this.mouseAction = "move"
			
			let mouse3DPos = hit ? hit.position : ray.origin.add(ray.direction.scale(1000))
			
			if (this.currentSubviewer != null)
				this.currentSubviewer.onMouseDown(ev, mouse.x, mouse.y, cameraPos, ray, hit, distToHit, mouse3DPos)
		}
		
		this.mouseLastClickDate = new Date()
		this.render()
	}
	
	
	onMouseMove(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		let ray = this.getScreenRay(mouse.x, mouse.y)
		let cameraPos = this.getCurrentCameraPosition()
		
		this.setCursor("default")
		
		let hit = this.collision.raycast(ray.origin, ray.direction)
		let distToHit = (hit == null ? 1000000 : hit.distScaled)
		
		
		if (this.mouseDown)
		{
			ev.preventDefault()
			
			let dx = mouse.x - this.mouseLast.x
			let dy = mouse.y - this.mouseLast.y
			
			let ox = mouse.x - this.mouseDownOrigin.x
			let oy = mouse.y - this.mouseDownOrigin.y
			
			if (this.mouseAction == "pan")
			{
				let matrix = this.getCurrentCamera().view
				let delta = matrix.mulDirection(new Vec3(-dx * this.cameraDist / 500, -dy * this.cameraDist / 500, 0))
				
				this.cameraFocus = this.cameraFocus.add(delta)
			}
			else if (this.mouseAction == "orbit")
			{
				this.cameraHorzAngle += dx * 0.0075
				this.cameraVertAngle += dy * 0.0075
				
				this.cameraVertAngle = Math.max(-Math.PI / 2 + 0.0001, Math.min(Math.PI / 2 - 0.0001, this.cameraVertAngle))
			}
			else if (this.mouseAction == "move")
			{
				let matrix = this.getCurrentCamera().view
				let offset = matrix.mulDirection(new Vec3(ox * this.cameraDist / 500, oy * this.cameraDist / 500, 0))
				let delta = matrix.mulDirection(new Vec3(dx * this.cameraDist / 500, dy * this.cameraDist / 500, 0))
				
				this.mouseMoveOffsetPixels = { x: ox, y: oy }
				this.mouseMoveOffsetPan = offset
				this.mouseMoveOffsetPanDelta = delta
				this.mouseMoveOffsetRaycast = hit
			}
			
			if (this.currentSubviewer != null)
				this.currentSubviewer.onMouseMove(ev, mouse.x, mouse.y, cameraPos, ray, hit, distToHit)
			
			this.mouseLast = mouse
			this.render()
		}
		
		else
		{
			//if (hit != null)
			//	  this.debugRaycastRenderer.setTranslation(hit.position)
			
			if (this.currentSubviewer != null)
				this.currentSubviewer.onMouseMove(ev, mouse.x, mouse.y, cameraPos, ray, hit, distToHit)
			
			//console.log(this.pointToScreen(ray.origin.add(ray.direction.scale(10000))))
		}
	}
	
	
	onMouseUp(ev)
	{
		if (!this.mouseDown)
			return
		
		ev.preventDefault()
		
		let mouse = this.getMousePosFromEvent(ev)
		
		if (this.currentSubviewer != null && this.currentSubviewer.onMouseUp)
			this.currentSubviewer.onMouseUp(ev, mouse.x, mouse.y)
		
		this.window.setUndoPoint()
		this.mouseDown = false
		this.mouseLast = mouse
	}
	
	
	onMouseWheel(ev)
	{
		if (ev.deltaY > 0)
			this.cameraDist = Math.min(500000, this.cameraDist * 1.25)
		else if (ev.deltaY < 0)
			this.cameraDist = Math.max(1000, this.cameraDist / 1.25)
		
		this.render()
	}
}


const vertexSrc = `
	precision highp float;
	
	attribute vec4 aPosition;
	attribute vec4 aNormal;

	uniform mat4 uMatModel;
	uniform mat4 uMatView;
	uniform mat4 uMatProj;
	
	varying vec4 vNormal;
	varying vec4 vScreenNormal;

	void main()
	{
		vNormal = uMatModel * vec4(aNormal.xyz, 0);
		vScreenNormal = uMatView * uMatModel * vec4(aNormal.xyz, 0);
		
		gl_Position = uMatProj * uMatView * uMatModel * aPosition;
	}`


const fragmentSrc = `
	precision highp float;
	
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	
	uniform vec4 uDiffuseColor;
	uniform vec4 uAmbientColor;

	void main()
	{
		vec4 lightDir = vec4(0, 0, -1, 0);
		
		vec4 ambientColor = uAmbientColor;
		vec4 diffuseColor = uDiffuseColor;
		vec4 lightColor = vec4(1, 1, 1, 1);
		
		float lightIncidence = max(0.0, dot(normalize(lightDir), normalize(vScreenNormal)));
		
		gl_FragColor = diffuseColor * mix(ambientColor, lightColor, lightIncidence);
	}`


const vertexSrcColor = `
	precision highp float;
	
	attribute vec4 aPosition;
	attribute vec4 aNormal;
	attribute vec4 aColor;

	uniform mat4 uMatModel;
	uniform mat4 uMatView;
	uniform mat4 uMatProj;
	
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	varying vec4 vColor;

	void main()
	{
		vNormal = uMatModel * vec4(aNormal.xyz, 0);
		vScreenNormal = uMatView * uMatModel * vec4(aNormal.xyz, 0);
		
		vColor = aColor;
		
		gl_Position = uMatProj * uMatView * uMatModel * aPosition;
	}`


const fragmentSrcColor = `
	precision highp float;
	
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	varying vec4 vColor;
	
	uniform vec4 uDiffuseColor;
	uniform vec4 uAmbientColor;

	void main()
	{
		vec4 lightDir = vec4(0, 0, -1, 0);
		
		vec4 ambientColor = uAmbientColor;
		vec4 diffuseColor = uDiffuseColor * vColor;
		vec4 lightColor = vec4(1, 1, 1, 1);
		
		float lightIncidence = max(0.0, dot(normalize(lightDir), normalize(vScreenNormal)));
		
		gl_FragColor = diffuseColor * mix(ambientColor, lightColor, lightIncidence);
	}`


const fragmentSrcUnshaded = `
	precision highp float;
	
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	
	uniform vec4 uDiffuseColor;

	void main()
	{
		gl_FragColor = uDiffuseColor;
	}`
	

module.exports = { Viewer }