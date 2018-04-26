const { GLProgram } = require("../gl/shader.js")
const { GfxScene, GfxCamera, GfxMaterial, GfxModel, GfxNodeRenderer } = require("../gl/scene.js")
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
		
		this.mouseDown = false
		this.mouseLast = null
		
		this.cameraFocus = new Vec3(0, 0, 0)
		this.cameraHorzAngle = 1.0
		this.cameraVertAngle = 0.8
		this.cameraDist = 5
		
		this.gl = canvas.getContext("webgl")
		
		this.resize()
		
		this.gl.clearColor(0, 0, 0, 1)
		this.gl.clearDepth(1.0)
		
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.depthFunc(this.gl.LEQUAL)

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
		
		this.scene = new GfxScene()
		this.camera = new GfxCamera()
		
		this.material = new GfxMaterial()
			.setProgram(
				GLProgram.makeFromSrc(this.gl, vertexSrc, fragmentSrc)
				.registerLocations(this.gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uDiffuseColor"]))
				
		let model = new ModelBuilder()
			.addCube(-1, -1, -1, 1, 1, 1)
			.calculateNormals()
			.makeModel(this.gl)
			
		let renderer = new GfxNodeRenderer()
			.attach(this.scene.root)
			.setModel(model)
			.setMaterial(this.material)
			.setDiffuseColor([1, 1, 1, 1])
		
		this.render()
	}
	
	
	resize()
	{
		let rect = this.canvas.getBoundingClientRect()
		
		this.width = this.canvas.width = rect.width
		this.height = this.canvas.height = rect.height
		
		this.gl.viewport(0, 0, rect.width, rect.height)
	}
	
	
	render()
	{
		let eyeZDist = Math.cos(this.cameraVertAngle)
		
		let cameraEyeOffset = new Vec3(
			Math.cos(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			-Math.sin(this.cameraVertAngle) * this.cameraDist)
		
		this.camera
			.setProjection(Mat4.perspective(30 * Math.PI / 180, this.width / this.height, 1, 400))
			.setView(Mat4.lookat(this.cameraFocus.add(cameraEyeOffset), this.cameraFocus, new Vec3(0, 0, -1)))
		
		this.scene.render(this.gl, this.camera)
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
		
		this.mouseDown = true
		this.mouseLast = mouse
	}
	
	
	onMouseMove(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		
		if (this.mouseDown)
		{
			let dx = mouse.x - this.mouseLast.x
			let dy = mouse.y - this.mouseLast.y
			
			this.cameraHorzAngle += dx * 0.0075
			this.cameraVertAngle += dy * 0.0075
			
			this.cameraVertAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraVertAngle))
			
			this.mouseLast = mouse
		}
		
		this.render()
	}
	
	
	onMouseUp(ev)
	{
		let mouse = this.getMousePosFromEvent(ev)
		
		this.mouseDown = false
		this.mouseLast = mouse
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