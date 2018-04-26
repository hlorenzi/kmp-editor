class GLShader
{
	static makeVertex(gl, src)
	{
		return GLShader.make(gl, src, gl.VERTEX_SHADER)
	}
	
	
	static makeFragment(gl, src)
	{
		return GLShader.make(gl, src, gl.FRAGMENT_SHADER)
	}
	
	
	static make(gl, src, kind)
	{
		let shader = gl.createShader(kind)
		gl.shaderSource(shader, src)
		gl.compileShader(shader)
		
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
		{
			console.error("Error compiling shader: \n\n" + gl.getShaderInfoLog(shader))
			gl.deleteShader(shader)
			return null
		}

		return new GLShader(shader)
	}
	
	
	constructor(id)
	{
		this.id = id
	}
}


class GLProgram
{
	static makeFromSrc(gl, vertexSrc, fragmentSrc)
	{
		let vertexShader = GLShader.makeVertex(gl, vertexSrc)
		if (vertexShader == null)
			return
		
		let fragmentShader = GLShader.makeFragment(gl, fragmentSrc)
		if (fragmentShader == null)
			return
		
		return GLProgram.make(gl, vertexShader, fragmentShader)
	}
	
	
	static make(gl, vertexShader, fragmentShader)
	{
		let program = gl.createProgram()
		gl.attachShader(program, vertexShader.id)
		gl.attachShader(program, fragmentShader.id)
		gl.linkProgram(program)
		
		if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		{
			console.error("Error creating program: \n\n" + gl.getProgramInfoLog(program))
			gl.deleteProgram(program)
			return null
		}

		return new GLProgram(program)
	}
	
	
	constructor(id)
	{
		this.id = id
		this.attributes = { }
		this.uniforms = { }
	}
	
	
	registerLocations(gl, attrbs, unifs)
	{
		for (let attrb of attrbs)
			this.attributes[attrb] = gl.getAttribLocation(this.id, attrb)
		
		for (let unif of unifs)
			this.uniforms[unif] = gl.getUniformLocation(this.id, unif)
		
		return this
	}
	
	
	use(gl)
	{
		gl.useProgram(this.id)
		return this
	}
	
	
	bindPosition(gl, attrb, buffer)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.id)
		gl.vertexAttribPointer(this.attributes[attrb], 3, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(this.attributes[attrb])
		return this
	}
	
	
	bindNormals(gl, attrb, buffer)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.id)
		gl.vertexAttribPointer(this.attributes[attrb], 3, gl.FLOAT, false, 0, 0)
		gl.enableVertexAttribArray(this.attributes[attrb])
		return this
	}
	
	
	setMat4(gl, unif, matrix)
	{
		gl.uniformMatrix4fv(this.uniforms[unif], false, matrix.asFloat32Array())
		return this
	}
	
	
	setVec4(gl, unif, vec)
	{
		gl.uniform4fv(this.uniforms[unif], new Float32Array(vec))
		return this
	}
	
	
	drawTriangles(gl, count, offset = 0)
	{
		gl.drawArrays(gl.TRIANGLES, offset, count)
		return this
	}
	
	
	drawTriangleStrip(gl, count, offset = 0)
	{
		gl.drawArrays(gl.TRIANGLE_STRIP, offset, count)
		return this
	}
}


if (module)
	module.exports = { GLShader, GLProgram }