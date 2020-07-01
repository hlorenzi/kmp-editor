import Vec3 from "./vec3.js"


const ArrayType = Float32Array


export default class Mat4
{
	constructor(cells)
	{
		this.m = new ArrayType(cells)
	}


	static identity()
	{
		return identity
	}


	static translation(x, y, z)
	{
		return new Mat4(
		[
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			x, y, z, 1
		])
	}


	static scale(x, y, z)
	{
		return new Mat4(
		[
			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, z, 0,
			0, 0, 0, 1
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
			t*x*x + c,    t*x*y - z*s,  t*x*z + y*s, 0,
			t*x*y + z*s,  t*y*y + c,    t*y*z - x*s, 0,
			t*x*z - y*s,  t*y*z + x*s,  t*z*z + c,   0,
			          0,            0,          0,   1
		])
	}
	
	
	static rotationFromTo(fromVec, toVec)
	{
		const axis = fromVec.cross(toVec).normalize()
		const angle = Math.acos(fromVec.dot(toVec))
		
		return Mat4.rotation(axis, -angle)
	}
	
	
	static basisRotation(i1, j1, k1, i2, j2, k2)
	{
		const basis1 = new Mat4(
		[
			i1.x, j1.x, k1.x, 0,
			i1.y, j1.y, k1.y, 0,
			i1.z, j1.z, k1.z, 0,
			   0,    0,    0, 1,
		])
		
		const basis2 = new Mat4(
		[
			i2.x, j2.x, k2.x, 0,
			i2.y, j2.y, k2.y, 0,
			i2.z, j2.z, k2.z, 0,
			   0,    0,    0, 1,
		])
		
		return basis1.mul(basis2.transpose())
	}


	static ortho(left, right, top, bottom, near, far)
	{
		return new Mat4(
		[
			               2 / (right - left),                                0,                            0, 0,
			                                0,               2 / (top - bottom),                            0, 0,
			                                0,                                0,            -2 / (far - near), 0,
			 -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
		])
	}


	static frustum(left, right, top, bottom, near, far)
	{
		return new Mat4(
		[
			      2 * near / (right - left),                               0,                                0,  0,
			                              0,       2 * near / (top - bottom),                                0,  0,
			(right + left) / (right - left), (top + bottom) / (top - bottom),     -(far + near) / (far - near), -1,
			                              0,                               0, -(2 * far * near) / (far - near),  0
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
			        xaxis.x,         yaxis.x,         zaxis.x, 0,
			        xaxis.y,         yaxis.y,         zaxis.y, 0,
			        xaxis.z,         yaxis.z,         zaxis.z, 0,
			-xaxis.dot(eye), -yaxis.dot(eye), -zaxis.dot(eye), 1
		])
	}


	transpose()
	{
		return new Mat4(
		[
			this.m[0 * 4 + 0], this.m[1 * 4 + 0], this.m[2 * 4 + 0], this.m[3 * 4 + 0],
			this.m[0 * 4 + 1], this.m[1 * 4 + 1], this.m[2 * 4 + 1], this.m[3 * 4 + 1],
			this.m[0 * 4 + 2], this.m[1 * 4 + 2], this.m[2 * 4 + 2], this.m[3 * 4 + 2],
			this.m[0 * 4 + 3], this.m[1 * 4 + 3], this.m[2 * 4 + 3], this.m[3 * 4 + 3]
		])
	}


	mul(other)
	{
		if (this === identity)
			return other

		if (other === identity)
			return this

		const a00 = +this.m[0 * 4 + 0]
		const a01 = +this.m[0 * 4 + 1]
		const a02 = +this.m[0 * 4 + 2]
		const a03 = +this.m[0 * 4 + 3]
		const a10 = +this.m[1 * 4 + 0]
		const a11 = +this.m[1 * 4 + 1]
		const a12 = +this.m[1 * 4 + 2]
		const a13 = +this.m[1 * 4 + 3]
		const a20 = +this.m[2 * 4 + 0]
		const a21 = +this.m[2 * 4 + 1]
		const a22 = +this.m[2 * 4 + 2]
		const a23 = +this.m[2 * 4 + 3]
		const a30 = +this.m[3 * 4 + 0]
		const a31 = +this.m[3 * 4 + 1]
		const a32 = +this.m[3 * 4 + 2]
		const a33 = +this.m[3 * 4 + 3]
		
		const b00 = +other.m[0 * 4 + 0]
		const b01 = +other.m[0 * 4 + 1]
		const b02 = +other.m[0 * 4 + 2]
		const b03 = +other.m[0 * 4 + 3]
		const b10 = +other.m[1 * 4 + 0]
		const b11 = +other.m[1 * 4 + 1]
		const b12 = +other.m[1 * 4 + 2]
		const b13 = +other.m[1 * 4 + 3]
		const b20 = +other.m[2 * 4 + 0]
		const b21 = +other.m[2 * 4 + 1]
		const b22 = +other.m[2 * 4 + 2]
		const b23 = +other.m[2 * 4 + 3]
		const b30 = +other.m[3 * 4 + 0]
		const b31 = +other.m[3 * 4 + 1]
		const b32 = +other.m[3 * 4 + 2]
		const b33 = +other.m[3 * 4 + 3]
		
		const m00 = (a00 * b00) + (a01 * b10) + (a02 * b20) + (a03 * b30) 
		const m01 = (a00 * b01) + (a01 * b11) + (a02 * b21) + (a03 * b31) 
		const m02 = (a00 * b02) + (a01 * b12) + (a02 * b22) + (a03 * b32) 
		const m03 = (a00 * b03) + (a01 * b13) + (a02 * b23) + (a03 * b33) 
		const m10 = (a10 * b00) + (a11 * b10) + (a12 * b20) + (a13 * b30) 
		const m11 = (a10 * b01) + (a11 * b11) + (a12 * b21) + (a13 * b31) 
		const m12 = (a10 * b02) + (a11 * b12) + (a12 * b22) + (a13 * b32) 
		const m13 = (a10 * b03) + (a11 * b13) + (a12 * b23) + (a13 * b33) 
		const m20 = (a20 * b00) + (a21 * b10) + (a22 * b20) + (a23 * b30) 
		const m21 = (a20 * b01) + (a21 * b11) + (a22 * b21) + (a23 * b31) 
		const m22 = (a20 * b02) + (a21 * b12) + (a22 * b22) + (a23 * b32) 
		const m23 = (a20 * b03) + (a21 * b13) + (a22 * b23) + (a23 * b33) 
		const m30 = (a30 * b00) + (a31 * b10) + (a32 * b20) + (a33 * b30) 
		const m31 = (a30 * b01) + (a31 * b11) + (a32 * b21) + (a33 * b31) 
		const m32 = (a30 * b02) + (a31 * b12) + (a32 * b22) + (a33 * b32) 
		const m33 = (a30 * b03) + (a31 * b13) + (a32 * b23) + (a33 * b33) 

		return new Mat4(
		[
			m00, m01, m02, m03,
			m10, m11, m12, m13,
			m20, m21, m22, m23,
			m30, m31, m32, m33
		])
		
		/*let result =
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
					acc += this.m[j * 4 + k] * other.m[k * 4 + i]
				
				result[j][i] = acc
			}
		}
		
		return new Mat4(result)*/
	}


	mulVec4(v)
	{
		let result = [0, 0, 0, 0]

		for (let i = 0; i < 4; i++)
		{
			let acc = 0
			for (let k = 0; k < 4; k++)
				acc += this.m[i * 4 + k] * v[k]
			
			result[i] = acc
		}

		return result
	}


	mulPoint(vec)
	{
		const v = [vec.x, vec.y, vec.z, 1]
		let result = [0, 0, 0, 0]

		for (let i = 0; i < 4; i++)
		{
			let acc = 0
			for (let k = 0; k < 4; k++)
				acc += this.m[i * 4 + k] * v[k]
			
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
				acc += this.m[i * 4 + k] * v[k]
			
			result[i] = acc
		}

		return new Vec3(result[0], result[1], result[2])
	}
	
	
	asFloat32Array()
	{
		return this.m/*new Float32Array([
			this.m[0 * 4 + 0], this.m[0 * 4 + 1], this.m[0 * 4 + 2], this.m[0 * 4 + 3],
			this.m[1 * 4 + 0], this.m[1 * 4 + 1], this.m[1 * 4 + 2], this.m[1 * 4 + 3],
			this.m[2 * 4 + 0], this.m[2 * 4 + 1], this.m[2 * 4 + 2], this.m[2 * 4 + 3],
			this.m[3 * 4 + 0], this.m[3 * 4 + 1], this.m[3 * 4 + 2], this.m[3 * 4 + 3]])*/
	}
	
	
	invert()
	{
		// From https://stackoverflow.com/questions/1148309/inverting-a-4x4-matrix
		
		const a2323 = this.m[2 * 4 + 2] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 2]
		const a1323 = this.m[2 * 4 + 1] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 1]
		const a1223 = this.m[2 * 4 + 1] * this.m[3 * 4 + 2] - this.m[2 * 4 + 2] * this.m[3 * 4 + 1]
		const a0323 = this.m[2 * 4 + 0] * this.m[3 * 4 + 3] - this.m[2 * 4 + 3] * this.m[3 * 4 + 0]
		const a0223 = this.m[2 * 4 + 0] * this.m[3 * 4 + 2] - this.m[2 * 4 + 2] * this.m[3 * 4 + 0]
		const a0123 = this.m[2 * 4 + 0] * this.m[3 * 4 + 1] - this.m[2 * 4 + 1] * this.m[3 * 4 + 0]
		const a2313 = this.m[1 * 4 + 2] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 2]
		const a1313 = this.m[1 * 4 + 1] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 1]
		const a1213 = this.m[1 * 4 + 1] * this.m[3 * 4 + 2] - this.m[1 * 4 + 2] * this.m[3 * 4 + 1]
		const a2312 = this.m[1 * 4 + 2] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 2]
		const a1312 = this.m[1 * 4 + 1] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 1]
		const a1212 = this.m[1 * 4 + 1] * this.m[2 * 4 + 2] - this.m[1 * 4 + 2] * this.m[2 * 4 + 1]
		const a0313 = this.m[1 * 4 + 0] * this.m[3 * 4 + 3] - this.m[1 * 4 + 3] * this.m[3 * 4 + 0]
		const a0213 = this.m[1 * 4 + 0] * this.m[3 * 4 + 2] - this.m[1 * 4 + 2] * this.m[3 * 4 + 0]
		const a0312 = this.m[1 * 4 + 0] * this.m[2 * 4 + 3] - this.m[1 * 4 + 3] * this.m[2 * 4 + 0]
		const a0212 = this.m[1 * 4 + 0] * this.m[2 * 4 + 2] - this.m[1 * 4 + 2] * this.m[2 * 4 + 0]
		const a0113 = this.m[1 * 4 + 0] * this.m[3 * 4 + 1] - this.m[1 * 4 + 1] * this.m[3 * 4 + 0]
		const a0112 = this.m[1 * 4 + 0] * this.m[2 * 4 + 1] - this.m[1 * 4 + 1] * this.m[2 * 4 + 0]

		const det = 1 / (
			this.m[0 * 4 + 0] * (this.m[1 * 4 + 1] * a2323 - this.m[1 * 4 + 2] * a1323 + this.m[1 * 4 + 3] * a1223) -
			this.m[0 * 4 + 1] * (this.m[1 * 4 + 0] * a2323 - this.m[1 * 4 + 2] * a0323 + this.m[1 * 4 + 3] * a0223) + 
			this.m[0 * 4 + 2] * (this.m[1 * 4 + 0] * a1323 - this.m[1 * 4 + 1] * a0323 + this.m[1 * 4 + 3] * a0123) -
			this.m[0 * 4 + 3] * (this.m[1 * 4 + 0] * a1223 - this.m[1 * 4 + 1] * a0223 + this.m[1 * 4 + 2] * a0123))
		
		return new Mat4(
		[
			det *  (this.m[1 * 4 + 1] * a2323 - this.m[1 * 4 + 2] * a1323 + this.m[1 * 4 + 3] * a1223),
			det * -(this.m[0 * 4 + 1] * a2323 - this.m[0 * 4 + 2] * a1323 + this.m[0 * 4 + 3] * a1223),
			det *  (this.m[0 * 4 + 1] * a2313 - this.m[0 * 4 + 2] * a1313 + this.m[0 * 4 + 3] * a1213),
			det * -(this.m[0 * 4 + 1] * a2312 - this.m[0 * 4 + 2] * a1312 + this.m[0 * 4 + 3] * a1212),
		
			det * -(this.m[1 * 4 + 0] * a2323 - this.m[1 * 4 + 2] * a0323 + this.m[1 * 4 + 3] * a0223),
			det *  (this.m[0 * 4 + 0] * a2323 - this.m[0 * 4 + 2] * a0323 + this.m[0 * 4 + 3] * a0223),
			det * -(this.m[0 * 4 + 0] * a2313 - this.m[0 * 4 + 2] * a0313 + this.m[0 * 4 + 3] * a0213),
			det *  (this.m[0 * 4 + 0] * a2312 - this.m[0 * 4 + 2] * a0312 + this.m[0 * 4 + 3] * a0212),
		
			det *  (this.m[1 * 4 + 0] * a1323 - this.m[1 * 4 + 1] * a0323 + this.m[1 * 4 + 3] * a0123),
			det * -(this.m[0 * 4 + 0] * a1323 - this.m[0 * 4 + 1] * a0323 + this.m[0 * 4 + 3] * a0123),
			det *  (this.m[0 * 4 + 0] * a1313 - this.m[0 * 4 + 1] * a0313 + this.m[0 * 4 + 3] * a0113),
			det * -(this.m[0 * 4 + 0] * a1312 - this.m[0 * 4 + 1] * a0312 + this.m[0 * 4 + 3] * a0112),

			det * -(this.m[1 * 4 + 0] * a1223 - this.m[1 * 4 + 1] * a0223 + this.m[1 * 4 + 2] * a0123),
			det *  (this.m[0 * 4 + 0] * a1223 - this.m[0 * 4 + 1] * a0223 + this.m[0 * 4 + 2] * a0123),
			det * -(this.m[0 * 4 + 0] * a1213 - this.m[0 * 4 + 1] * a0213 + this.m[0 * 4 + 2] * a0113),
			det *  (this.m[0 * 4 + 0] * a1212 - this.m[0 * 4 + 1] * a0212 + this.m[0 * 4 + 2] * a0112),
		]).transpose()
	}
}


const identity = new Mat4(
[
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
])