import Mat4 from "../math/mat4.js"
import Vec3 from "../math/vec3.js"
import { GLProgram } from "./shader.js"
import ModelBuilder from "../util/modelBuilder.js"


export default class GfxScene
{
	constructor(gl)
	{
		this.gl = gl

		this.matProjection = null
		this.matView = null
		this.matTransformStack = [Mat4.identity()]

		this.modelPoint = new ModelBuilder()
			.addSphere(-0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 4)
			.calculateNormals()
			.makeModel(gl)
		
		this.modelPointSelected = new ModelBuilder()
			.addSphere(-0.75, -0.75, 0.75, 0.75, 0.75, -0.75, 4)
			.calculateNormals()
			.makeModel(gl)
			
		this.modelPath = new ModelBuilder()
			.addCylinder(-0.5, -0.5, 0, 0.5, 0.5, 1, 16)
			.calculateNormals()
			.makeModel(gl)
		
		this.modelArrow = new ModelBuilder()
			.addCone(-0.5, -0.5, -1, 0.5, 0.5, 0, 16)
			.calculateNormals()
			.makeModel(gl)
			
		this.modelSizeCircle = new ModelBuilder()
			.addSphere(-1, -1, -1, 1, 1, 1, 8)
			.calculateNormals()
			.makeModel(gl)

		this.material = GLProgram.makeFromSrc(gl, vertexSrc, fragmentSrc)
			.registerLocations(gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uAmbientColor", "uDiffuseColor"])
				
		this.materialColor = GLProgram.makeFromSrc(gl, vertexSrcColor, fragmentSrcColor)
			.registerLocations(gl, ["aPosition", "aNormal", "aColor"], ["uMatProj", "uMatView", "uMatModel", "uAmbientColor", "uDiffuseColor", "uFogDensity"])
				
		this.materialUnshaded = GLProgram.makeFromSrc(gl, vertexSrc, fragmentSrcUnshaded)
			.registerLocations(gl, ["aPosition", "aNormal"], ["uMatProj", "uMatView", "uMatModel", "uDiffuseColor"])
		
		this.gl.enable(this.gl.DEPTH_TEST)
		this.gl.enable(this.gl.CULL_FACE)
		this.gl.depthFunc(this.gl.LEQUAL)
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)

		this.matrixCache = []
		this.matrixCachePointer = 0
		this.matrixCacheUtilization = 0
		this.matrixCacheUtilizationTotal = 0
	}


	begin()
	{
		if (this.matrixCacheUtilization < this.matrixCacheUtilizationTotal)
			console.log("last frame cache utilization: " + this.matrixCacheUtilization + " / " + this.matrixCacheUtilizationTotal)

		this.matTransformStack.splice(1, this.matTransformStack.length)
		this.matrixCachePointer = 0
		this.matrixCacheUtilization = 0
		this.matrixCacheUtilizationTotal = 0
	}


	viewport(x, y, w, h)
	{
		this.gl.viewport(x, y, w, h)
	}
	
	
	clear(r = 0, g = 0, b = 0, a = 1, depth = 1)
	{
		this.gl.clearColor(r, g, b, a)
		this.gl.clearDepth(depth)
		
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT)
	}
	
	
	clearDepth(depth = 1)
	{
		this.gl.clearDepth(depth)
		
		this.gl.clear(this.gl.DEPTH_BUFFER_BIT)
	}


	setProjection(matrix)
	{
		this.matProjection = matrix

		let materials =
		[
			this.material,
			this.materialColor,
			this.materialUnshaded,
		]
		
		for (const mat of materials)
		{
			mat.use(this.gl)
			mat.setMat4(this.gl, "uMatProj", this.matProjection)
		}
	}


	setView(matrix)
	{
		this.matView = matrix

		let materials =
		[
			this.material,
			this.materialColor,
			this.materialUnshaded,
		]

		for (const mat of materials)
		{
			mat.use(this.gl)
			mat.setMat4(this.gl, "uMatView", this.matView)
			mat.setVec4(this.gl, "uAmbientColor", [0.5, 0.5, 0.5, 1])
		}
	}


	saveCache(newCache)
	{
		if (this.matrixCachePointer < this.matrixCache.length)
		{
			this.matrixCache[this.matrixCachePointer] = newCache
			this.matrixCachePointer++
		}
		else
		{
			this.matrixCache.push(newCache)
			this.matrixCachePointer = this.matrixCache.length
		}
	}


	pushMatrix(matrix)
	{
		this.matTransformStack.push(this.matTransformStack[this.matTransformStack.length - 1].mul(matrix))
	}


	popMatrix()
	{
		this.matTransformStack.pop()
	}


	pushTranslationScale(x, y, z, sx, sy, sz)
	{
		this.matrixCacheUtilizationTotal++

		if (this.matrixCachePointer < this.matrixCache.length)
		{
			let cache = this.matrixCache[this.matrixCachePointer]
			if (cache.x === x && cache.y === y && cache.z === z &&
				cache.sx === sx && cache.sy === sy && cache.sz === sz)
			{
				this.matTransformStack.push(cache.matrix)
				this.matrixCachePointer++
				this.matrixCacheUtilization++
				return
			}
		}

		const matrix = this.matTransformStack[this.matTransformStack.length - 1]
			.mul(Mat4.scale(sx, sy, sz).mul(Mat4.translation(x, y, z)))

		this.saveCache({ x, y, z, sx, sy, sz, matrix })

		this.matTransformStack.push(matrix)
	}


	popTranslationScale()
	{
		this.popMatrix()
	}


	drawModel(model, material, diffuseColor)
	{
		material.use(this.gl)
		material.bindPosition(this.gl, "aPosition", model.positions)
		material.bindNormals(this.gl, "aNormal", model.normals)
		
		if (material.hasColor)
			material.bindColors(this.gl, "aColor", model.colors)
		
		material.setMat4(this.gl, "uMatModel", this.matTransformStack[this.matTransformStack.length - 1])
		material.setVec4(this.gl, "uDiffuseColor", diffuseColor)
		material.drawTriangles(this.gl, model.positions.count / 3)
	}


	drawPoint(pos, scale, color)
	{
		this.pushTranslationScale(pos.x, pos.y, pos.z, scale, scale, scale)
		this.drawModel(this.modelPoint, this.material, color)
		this.popTranslationScale()
	}


	drawPointSelected(pos, scale, colorCore, colorOutline)
	{
		this.pushTranslationScale(pos.x, pos.y, pos.z, scale, scale, scale)
		this.drawModel(this.modelPointSelected, this.materialUnshaded, colorOutline)
		this.drawModel(this.modelPoint, this.material, colorCore)
		this.popTranslationScale()
	}


	drawArrow(pos1, pos2, scale, color)
	{
		this.matrixCacheUtilizationTotal++

		let hadCache = false
		let matrixLine = null
		let matrixArrow = null

		if (this.matrixCachePointer < this.matrixCache.length)
		{
			let cache = this.matrixCache[this.matrixCachePointer]
			if (cache.x1 === pos1.x && cache.y1 === pos1.y && cache.z1 === pos1.z &&
				cache.x2 === pos2.x && cache.y2 === pos2.y && cache.z2 === pos2.z &&
				cache.scale === scale)
			{
				matrixLine = cache.matrixLine
				matrixArrow = cache.matrixArrow
				this.matrixCachePointer++
				this.matrixCacheUtilization++
				hadCache = true
			}
		}

		if (matrixLine === null || matrixArrow === null)
		{
			let matrixScale = Mat4.scale(scale, scale, pos2.sub(pos1).magn() - scale * 2)
			let matrixAlign = Mat4.rotationFromTo(new Vec3(0, 0, 1), pos2.sub(pos1).normalize())
			let matrixTranslate = Mat4.translation(pos1.x, pos1.y, pos1.z)
			
			let matrixScaleArrow = Mat4.scale(scale * 2, scale * 2, scale * 2)
			let matrixTranslateArrow = Mat4.translation(pos2.x, pos2.y, pos2.z)

			matrixLine = this.matTransformStack[this.matTransformStack.length - 1]
				.mul(matrixScale.mul(matrixAlign.mul(matrixTranslate)))
			matrixArrow = this.matTransformStack[this.matTransformStack.length - 1]
				.mul(matrixScaleArrow.mul(matrixAlign.mul(matrixTranslateArrow)))
		}

		this.matTransformStack.push(matrixLine)
		this.drawModel(this.modelPath, this.material, color)
		this.matTransformStack.pop()
		
		this.matTransformStack.push(matrixArrow)
		this.drawModel(this.modelArrow, this.material, color)
		this.matTransformStack.pop()
		
		if (!hadCache)
		{
			const newCache = {
				x1: pos1.x, y1: pos1.y, z1: pos1.z,
				x2: pos2.x, y2: pos2.y, z2: pos2.z,
				scale,
				matrixLine, matrixArrow,
			}

			this.saveCache(newCache)
		}
	}


	doStencilStampPass(fn)
	{
		this.gl.enable(this.gl.STENCIL_TEST)
		this.gl.stencilFunc(this.gl.ALWAYS, 0, 0xff)
		this.gl.stencilMask(0xff)
		this.gl.clearStencil(0)
		this.gl.clear(this.gl.STENCIL_BUFFER_BIT)

		this.gl.colorMask(false, false, false, false)
		this.gl.depthMask(false)
		this.gl.cullFace(this.gl.FRONT)
		this.gl.stencilOp(this.gl.KEEP, this.gl.INCR, this.gl.KEEP)
		fn()
		
		this.gl.cullFace(this.gl.BACK)
		this.gl.stencilOp(this.gl.KEEP, this.gl.DECR, this.gl.KEEP)
		fn()
		
		this.gl.cullFace(this.gl.BACK)
		this.gl.colorMask(true, true, true, true)
		this.gl.stencilMask(0x00)
		this.gl.stencilFunc(this.gl.NOTEQUAL, 0, 0xff)
		fn()
		
		this.gl.depthMask(true)
		this.gl.disable(this.gl.STENCIL_TEST)
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
	
	varying float vDepth;
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	varying vec4 vColor;

	void main()
	{
		vNormal = uMatModel * vec4(aNormal.xyz, 0);
		vScreenNormal = uMatView * uMatModel * vec4(aNormal.xyz, 0);
		
		vColor = aColor;
		
		vec4 position = uMatProj * uMatView * uMatModel * aPosition;
		gl_Position = position;
		vDepth = position.z / position.w;
	}`


const fragmentSrcColor = `
	precision highp float;
	
	varying float vDepth;
	varying vec4 vNormal;
	varying vec4 vScreenNormal;
	varying vec4 vColor;
	
	uniform vec4 uDiffuseColor;
	uniform vec4 uAmbientColor;
	uniform float uFogDensity;

	void main()
	{
		vec4 lightDir = vec4(0, 0, -1, 0);
		
		vec4 ambientColor = uAmbientColor;
		vec4 diffuseColor = uDiffuseColor * vColor;
		vec4 lightColor = vec4(1, 1, 1, 1);
		
		const float log2 = 1.442695;
		//const float fogDensity = 0.00001;
		float z = gl_FragCoord.z / gl_FragCoord.w;
		float fogFactor = clamp(exp2(-uFogDensity * uFogDensity * z * z * log2) + 0.01, 0.2, 1.0);
		
		float lightIncidence = max(0.0, dot(normalize(lightDir), normalize(vScreenNormal)));
		
		gl_FragColor = diffuseColor * mix(ambientColor, lightColor, lightIncidence) * vec4(vec3(fogFactor), 1.0);
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