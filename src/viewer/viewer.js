const { GLProgram } = require("../gl/shader.js")
const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer, GfxNodeRendererTransform } = require("../gl/scene.js")
const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")


class Viewer
{
	constructor(canvas)
	{
		this.canvas = canvas
		this.canvas.onresize = () => this.resize()
		this.canvas.onmousedown = (ev) => this.onMouseDown(ev)
		this.canvas.onmousemove = (ev) => this.onMouseMove(ev)
		this.canvas.onmouseup = (ev) => this.onMouseUp(ev)
		this.canvas.onwheel = (ev) => this.onMouseWheel(ev)
		
		this.subviewer = null
		
		this.mouseDown = false
		this.mouseLastClickDate = new Date()
		this.mouseAction = null
		this.mouseLast = null
		
		this.cameraFocus = new Vec3(0, 0, 0)
		this.cameraHorzAngle = Math.PI / 2
		this.cameraVertAngle = 1
		this.cameraDist = 10000
		
		this.gl = canvas.getContext("webgl")
		
		this.resize()
		
		this.gl.clearColor(0, 0, 0, 1)
		this.gl.clearDepth(1.0)
		
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.depthFunc(this.gl.LEQUAL)

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
		
		this.scene = new GfxScene()
		
		this.material = new GfxMaterial()
			.setProgram(
				GLProgram.makeFromSrc(this.gl, vertexSrc, fragmentSrc)
				.registerLocations(this.gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uDiffuseColor"]))
				
		let builder = new ModelBuilder()
			.addCube(-1000, -1000, -1000, 1000, 1000, 1000)
			.calculateNormals()
			
		this.model = builder.makeModel(this.gl)
		this.collision = builder.makeCollision().buildCacheSubdiv()
			
		this.renderer = new GfxNodeRenderer()
			.attach(this.scene.root)
			.setModel(this.model)
			.setMaterial(this.material)
			.setDiffuseColor([1, 1, 1, 1])
			
			
		let debugRaycastBuilder = new ModelBuilder()
			.addSphere(-100, -100, -100, 100, 100, 100)
			.calculateNormals()
			
		this.debugRaycastRenderer = new GfxNodeRendererTransform()
			.attach(this.scene.root)
			.setModel(debugRaycastBuilder.makeModel(this.gl))
			.setMaterial(this.material)
			.setDiffuseColor([1, 0, 0, 1])
		
		this.render()
	}
	
	
	resize()
	{
		let rect = this.canvas.getBoundingClientRect()
		
		this.width = this.canvas.width = rect.width
		this.height = this.canvas.height = rect.height
		
		this.gl.viewport(0, 0, rect.width, rect.height)
	}
	
	
	setModel(modelBuilder)
	{
		let bbox = modelBuilder.getBoundingBox()
		
		this.model = modelBuilder.makeModel(this.gl)
		this.renderer.setModel(this.model)
		
		this.collision = modelBuilder.makeCollision().buildCacheSubdiv()
		
		this.cameraFocus = new Vec3(bbox.xCenter, bbox.yCenter, bbox.zCenter)
		this.cameraHorzAngle = Math.PI / 2
		this.cameraVertAngle = 1
		this.cameraDist = Math.max(bbox.xSize, bbox.ySize, bbox.zSize) / 2
	}
	
	
	setSubViewer(subviewer)
	{
		this.subviewer = subviewer
	}
	
	
	render()
	{
		if (this.subviewer != null)
			this.subviewer.refresh()
		
		this.scene.render(this.gl, this.getCurrentCamera())
	}
	
	
	getCurrentCameraPosition()
	{
		let eyeZDist = Math.cos(this.cameraVertAngle)
		
		let cameraEyeOffset = new Vec3(
			Math.cos(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraVertAngle) * this.cameraDist)
		
		return this.cameraFocus.add(cameraEyeOffset)
	}
	
	
	getCurrentCamera()
	{
		return new GfxCamera()
			.setProjection(Mat4.perspective(30 * Math.PI / 180, this.width / this.height, 100, 500000))
			.setView(Mat4.lookat(this.getCurrentCameraPosition(), this.cameraFocus, new Vec3(0, 0, -1)))
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
		
		return { origin: near, direction: far.sub(near) }
	}
	
	
	getMousePosFromEvent(ev)
	{
		let rect = this.canvas.getBoundingClientRect()
		
		return {
			x: ev.clientX - rect.left,
			y: ev.clientY - rect.top
		}
	}
	
	
	onMouseDown(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		
		let doubleClick = (new Date().getTime() - this.mouseLastClickDate.getTime()) < 300
		
		this.mouseDown = true
		this.mouseLast = mouse
		this.mouseAction = null
		
		if (ev.button == 2 || ev.button == 1)
		{
			if (doubleClick)
			{
				let ray = this.getScreenRay(mouse.x, mouse.y)
				let hit = this.collision.raycast(ray.origin, ray.direction)
				if (hit != null)
				{
					this.cameraFocus = hit.position
					this.cameraDist = 4000
				}
			}
			else if (ev.shiftKey)
				this.mouseAction = "pan"
			else
				this.mouseAction = "orbit"
		}
		
		this.mouseLastClickDate = new Date()
		this.render()
	}
	
	
	onMouseMove(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		
		if (this.mouseDown)
		{
			let dx = mouse.x - this.mouseLast.x
			let dy = mouse.y - this.mouseLast.y
			
			if (this.mouseAction == "pan")
			{
				let matrix = this.getCurrentCamera().view
				let offset = matrix.mulDirection(new Vec3(-dx * this.cameraDist / 500, -dy * this.cameraDist / 500, 0))
				
				this.cameraFocus = this.cameraFocus.add(offset)
			}
			else if (this.mouseAction == "orbit")
			{
				this.cameraHorzAngle += dx * 0.0075
				this.cameraVertAngle += dy * 0.0075
				
				this.cameraVertAngle = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.cameraVertAngle))
			}
			
			this.mouseLast = mouse
		}
		
		else
		{
			let ray = this.getScreenRay(mouse.x, mouse.y)
			let hit = this.collision.raycast(ray.origin, ray.direction)
			if (hit != null)
			{
				this.debugRaycastRenderer.setTranslation(hit.position)
			}
		}
		
		this.render()
	}
	
	
	onMouseUp(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		
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

	void main()
	{
		vec4 lightDir = vec4(0, 0, -1, 0);// vec4(2.2, 0.2, 1, 0);
		
		vec4 ambientColor = vec4(0.2, 0.2, 0.2, 1);
		vec4 diffuseColor = uDiffuseColor;
		vec4 lightColor = vec4(1, 1, 1, 1);
		
		float lightIncidence = max(0.0, dot(normalize(lightDir), normalize(vScreenNormal)));
		
		gl_FragColor = diffuseColor * mix(ambientColor, lightColor, lightIncidence);
	}`
	

module.exports = { Viewer }