const { Vec3 } = require("../math/vec3.js")
const { Mat4 } = require("../math/mat4.js")


class GfxScene
{
	constructor()
	{
		this.root = new GfxNodeTransform()
	}
	
	
	render(gl, camera)
	{
		gl.clearColor(0, 0, 0, 1)
		gl.clearDepth(1.0)
		
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
		
		let transform = Mat4.identity()
		
		this.renderNode(gl, camera, transform, this.root)
	}
	
	
	renderNode(gl, camera, transform, node)
	{
		if ((node instanceof GfxNodeTransform) || (node instanceof GfxNodeRendererTransform))
		{
			transform = transform.mul(node.computeMatrix())
		}
		
		if ((node instanceof GfxNodeRenderer) || (node instanceof GfxNodeRendererTransform))
		{
			node.material.program.use(gl)
			node.material.program.bindPosition(gl, "aPosition", node.model.positions)
			node.material.program.bindNormals(gl, "aNormal", node.model.normals)
			node.material.program.setMat4(gl, "uMatProj", camera.projection)
			node.material.program.setMat4(gl, "uMatView", camera.view)
			node.material.program.setMat4(gl, "uMatModel", transform)
			node.material.program.setVec4(gl, "uDiffuseColor", node.diffuseColor)
			node.material.program.drawTriangles(gl, node.model.positions.count / 3)
		}
		
		for (let child of node.children)
			this.renderNode(gl, camera, transform, child)	
	}
}


class GfxCamera
{
	constructor()
	{
		this.projection = Mat4.identity()
		this.view = Mat4.identity()
	}
	
	
	setProjection(matrix)
	{
		this.projection = matrix
		return this
	}
	
	
	setView(matrix)
	{
		this.view = matrix
		return this
	}
	
	
	computeMatrix()
	{
		return this.projection.mul(this.view)
	}	
}


class GfxMaterial
{
	constructor()
	{
		this.program = null
	}
	
	
	setProgram(program)
	{
		this.program = program
		return this
	}
}


class GfxModel
{
	constructor()
	{
		this.positions = null
		this.normals = null
	}
	
	
	setPositions(positions)
	{
		this.positions = positions
		return this
	}
	
	
	setNormals(normals)
	{
		this.normals = normals
		return this
	}
}


class GfxNode
{
	constructor()
	{
		this.parent = null
		this.children = []
	}
	
	
	attach(parent)
	{
		this.detach()
		parent.children.push(this)
		this.parent = parent
		
		return this
	}
	
	
	detach()
	{
		if (this.parent != null)
		{
			this.parent.children.splice(this.parent.children.indexOf(this), 1)
			this.parent = null
		}
		
		return this
	}
}


class GfxNodeTransform extends GfxNode
{
	constructor()
	{
		super()
		this.translation = null
		this.scaling = null
		this.rotationAxis = null
		this.rotationAngle = null
		this.customMatrix = null
	}
	
	
	setTranslation(vec)
	{
		this.translation = vec
		return this
	}
	
	
	setRotation(axis, angle)
	{
		this.rotationAxis = axis
		this.rotationAngle = angle
		return this
	}
	
	
	setScaling(vec)
	{
		this.scaling = vec
		return this
	}
	
	
	setCustom(matrix)
	{
		this.customMatrix = matrix
		return this
	}
	
	
	computeMatrix()
	{
		let matrix = Mat4.identity()
		
		if (this.customMatrix != null)
			matrix = matrix.mul(this.customMatrix)
			
		if (this.scaling != null)
			matrix = matrix.mul(Mat4.scale(this.scaling.x, this.scaling.y, this.scaling.z))
		
		if (this.translation != null)
			matrix = matrix.mul(Mat4.translation(this.translation.x, this.translation.y, this.translation.z))
		
		if (this.rotationAxis != null)
			matrix = matrix.mul(Mat4.rotation(this.rotationAxis, this.rotationAngle))
			
		return matrix
	}
}


class GfxNodeRenderer extends GfxNode
{
	constructor()
	{
		super()
		this.model = null
		this.material = null
		this.diffuseColor = [1, 1, 1, 1]
	}
	
	
	setModel(model)
	{
		this.model = model
		return this
	}
	
	
	setMaterial(material)
	{
		this.material = material
		return this
	}
	
	
	setDiffuseColor(color)
	{
		this.diffuseColor = color
		return this
	}
}


class GfxNodeRendererTransform extends GfxNode
{
	constructor()
	{
		super()
		this.model = null
		this.material = null
		this.diffuseColor = [1, 1, 1, 1]
		
		this.translation = null
		this.scaling = null
		this.rotationAxis = null
		this.rotationAngle = null
		this.customMatrix = null
	}
	
	
	setModel(model)
	{
		this.model = model
		return this
	}
	
	
	setMaterial(material)
	{
		this.material = material
		return this
	}
	
	
	setDiffuseColor(color)
	{
		this.diffuseColor = color
		return this
	}
	
	
	setTranslation(vec)
	{
		this.translation = vec
		return this
	}
	
	
	setRotation(axis, angle)
	{
		this.rotationAxis = axis
		this.rotationAngle = angle
		return this
	}
	
	
	setScaling(vec)
	{
		this.scaling = vec
		return this
	}
	
	
	setCustomMatrix(matrix)
	{
		this.customMatrix = matrix
		return this
	}
	
	
	computeMatrix()
	{
		let matrix = Mat4.identity()
		
		if (this.customMatrix != null)
			matrix = matrix.mul(this.customMatrix)
			
		if (this.scaling != null)
			matrix = matrix.mul(Mat4.scale(this.scaling.x, this.scaling.y, this.scaling.z))
		
		if (this.translation != null)
			matrix = matrix.mul(Mat4.translation(this.translation.x, this.translation.y, this.translation.z))
		
		if (this.rotationAxis != null)
			matrix = matrix.mul(Mat4.rotation(this.rotationAxis, this.rotationAngle))
			
		return matrix
	}
}


if (module)
	module.exports =
	{
		GfxScene,
		GfxCamera,
		GfxMaterial,
		GfxModel,
		GfxNode,
		GfxNodeTransform,
		GfxNodeRenderer,
		GfxNodeRendererTransform
	}