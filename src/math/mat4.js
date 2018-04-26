const { Vec3 } = require("./vec3.js")


class Mat4
{
	constructor(cells)
	{
		this.m = cells
	}


	static identity()
	{
		return new Mat4(
		[
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[0, 0, 0, 1]
		])
	}


	static translation(x, y, z)
	{
		return new Mat4(
		[
			[1, 0, 0, 0],
			[0, 1, 0, 0],
			[0, 0, 1, 0],
			[x, y, z, 1]
		])
	}


	static scale(x, y, z)
	{
		return new Mat4(
		[
			[x, 0, 0, 0],
			[0, y, 0, 0],
			[0, 0, z, 0],
			[0, 0, 0, 1]
		])
	}


	static rotation(vec, radians)
	{
		const x = vec.x
		const y = vec.y
		const z = vec.z
		const c = Math.cos(radians)
		const s = Math.sin(radians)
		const t = 1 - c

		return new Mat4(
		[
			[t*x*x + c,    t*x*y - z*s,  t*x*z + y*s, 0],
			[t*x*y + z*s,  t*y*y + c,    t*y*z - x*s, 0],
			[t*x*z - y*s,  t*y*z + x*s,  t*z*z + c,   0],
			[          0,            0,          0,   1]
		])
	}
	
	
	static rotationFromTo(fromVec, toVec)
	{
		fromVec = fromVec.normalize()
		toVec = toVec.normalize()
		
		const axis = fromVec.cross(toVec)
		const angle = Math.acos(fromVec.dot(toVec))
		
		return Mat4.rotation(axis, -angle)
	}
	
	
	static basisRotation(i1, j1, k1, i2, j2, k2)
	{
		const basis1 = new Mat4(
		[
			[i1.x, j1.x, k1.x, 0],
			[i1.y, j1.y, k1.y, 0],
			[i1.z, j1.z, k1.z, 0],
			[   0,    0,    0, 1],
		])
		
		const basis2 = new Mat4(
		[
			[i2.x, j2.x, k2.x, 0],
			[i2.y, j2.y, k2.y, 0],
			[i2.z, j2.z, k2.z, 0],
			[   0,    0,    0, 1],
		])
		
		return basis1.mul(basis2.transpose())
	}


	static ortho(left, right, top, bottom, near, far)
	{
		return new Mat4(
		[
			[               2 / (right - left),                                0,                            0, 0 ],
			[                                0,               2 / (top - bottom),                            0, 0 ],
			[                                0,                                0,            -2 / (far - near), 0 ],
			[ -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1 ]
		])
	}


	static frustum(left, right, top, bottom, near, far)
	{
		return new Mat4(
		[
			[       2 * near / (right - left),                               0,                                0,  0 ],
			[                               0,       2 * near / (top - bottom),                                0,  0 ],
			[ (right + left) / (right - left), (top + bottom) / (top - bottom),     -(far + near) / (far - near), -1 ],
			[                               0,                               0, -(2 * far * near) / (far - near),  0 ]
		])
	}


	static perspective(fovyRadians, aspectWidthByHeight, near, far)
	{
		const h = Math.tan(fovyRadians) * near
		const w = h * aspectWidthByHeight
		
		return Mat4.frustum(-w, w, -h, h, near, far)
	}


	static lookat(eye, target, up)
	{
		const zaxis = eye.sub(target).normalize()
		const xaxis = zaxis.cross(up).normalize()
		const yaxis = zaxis.cross(xaxis)

		return new Mat4(
		[
			[         xaxis.x,         yaxis.x,         zaxis.x, 0 ],
			[         xaxis.y,         yaxis.y,         zaxis.y, 0 ],
			[         xaxis.z,         yaxis.z,         zaxis.z, 0 ],
			[ -xaxis.dot(eye), -yaxis.dot(eye), -zaxis.dot(eye), 1 ]
		])
	}


	transpose()
	{
		return new Mat4(
		[
			[ this.m[0][0], this.m[1][0], this.m[2][0], this.m[3][0] ],
			[ this.m[0][1], this.m[1][1], this.m[2][1], this.m[3][1] ],
			[ this.m[0][2], this.m[1][2], this.m[2][2], this.m[3][2] ],
			[ this.m[0][3], this.m[1][3], this.m[2][3], this.m[3][3] ]
		])
	}


	mul(other)
	{
		let result =
		[
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0]
		]

		for (let j = 0; j < 4; j++)
		{
			for (let i = 0; i < 4; i++)
			{
				let acc = 0
				for (let k = 0; k < 4; k++)
					acc += this.m[j][k] * other.m[k][i]
				
				result[j][i] = acc
			}
		}
		
		return new Mat4(result)
	}


	mulPoint(vec)
	{
		const v = [vec.x, vec.y, vec.z, 1]
		let result = [0, 0, 0, 0]

		for (let i = 0; i < 4; i++)
		{
			let acc = 0
			for (let k = 0; k < 4; k++)
				acc += this.m[i][k] * v[k]
			
			result[i] = acc
		}

		return new Vec3(result[0], result[1], result[2])
	}


	mulDirection(vec)
	{
		const v = [vec.x, vec.y, vec.z, 0]
		let result = [0, 0, 0, 0]

		for (let i = 0; i < 4; i++)
		{
			let acc = 0
			for (let k = 0; k < 4; k++)
				acc += this.m[i][k] * v[k]
			
			result[i] = acc
		}

		return new Vec3(result[0], result[1], result[2])
	}
	
	
	asFloat32Array()
	{
		return new Float32Array([
			this.m[0][0], this.m[0][1], this.m[0][2], this.m[0][3],
			this.m[1][0], this.m[1][1], this.m[1][2], this.m[1][3],
			this.m[2][0], this.m[2][1], this.m[2][2], this.m[2][3],
			this.m[3][0], this.m[3][1], this.m[3][2], this.m[3][3]])
	}
}


if (module)
	module.exports = { Mat4 }