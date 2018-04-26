class GLBuffer
{
	static makePosition(gl, positions)
	{
		return GLBuffer.make(gl, positions)
	}
	
	
	static makeNormal(gl, normals)
	{
		return GLBuffer.make(gl, normals)
	}
	
	
	static make(gl, data)
	{
		let buffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
		
		return new GLBuffer(buffer, data.length)
	}
	
	
	constructor(id, count)
	{
		this.id = id
		this.count = count
	}
}


if (module)
	module.exports = { GLBuffer }