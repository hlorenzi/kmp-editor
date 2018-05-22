class Vec3
{
	constructor(x, y, z)
	{
		this.x = x
		this.y = y
		this.z = z
	}
	
	
	clone()
	{
		return new Vec3(this.x, this.y, this.z)
	}


	magn()
	{
		return Math.sqrt(this.dot(this))
	}


	normalize()
	{
		const magn = this.magn()
		
		return new Vec3(
			this.x / magn,
			this.y / magn,
			this.z / magn)
	}


	add(other)
	{
		return new Vec3(
			this.x + other.x,
			this.y + other.y,
			this.z + other.z)
	}


	sub(other)
	{
		return new Vec3(
			this.x - other.x,
			this.y - other.y,
			this.z - other.z)
	}


	neg()
	{
		return new Vec3(
			-this.x,
			-this.y,
			-this.z)
	}


	scale(f)
	{
		return new Vec3(
			this.x * f,
			this.y * f,
			this.z * f)
	}


	mul(other)
	{
		return new Vec3(
			this.x * other.x,
			this.y * other.y,
			this.z * other.z)
	}


	dot(other)
	{
		return (this.x * other.x + this.y * other.y + this.z * other.z)
	}


	cross(other)
	{
		return new Vec3(
			this.y * other.z - this.z * other.y,
			this.z * other.x - this.x * other.z,
			this.x * other.y - this.y * other.x)
	}
	
	
	lerp(other, amount)
	{
		return new Vec3(
			this.x + (other.x - this.x) * amount,
			this.y + (other.y - this.y) * amount,
			this.z + (other.z - this.z) * amount)
	}
	
	
	min(other)
	{
		if (other == null)
			return this
		
		return new Vec3(
			Math.min(this.x, other.x),
			Math.min(this.y, other.y),
			Math.min(this.z, other.z))
	}
	
	
	max(other)
	{
		if (other == null)
			return this
		
		return new Vec3(
			Math.max(this.x, other.x),
			Math.max(this.y, other.y),
			Math.max(this.z, other.z))
	}
	
	
	project(other)
	{
		return other.scale(this.dot(other) / other.dot(other))
	}

	
	projectOnPlane(planeNormal)
	{
		return this.sub(this.project(planeNormal))
	}
	
	
	directionToPlane(planeNormal, pointOnPlane)
	{
		let vec = this.sub(pointOnPlane)
		let proj = vec.projectOnPlane(planeNormal)
		
		return pointOnPlane.add(proj).sub(this)
	}
	
	
	asArray()
	{
		return [this.x, this.y, this.z]
	}
	
	
	isFinite()
	{
		return isFinite(this.x) && isFinite(this.y) && isFinite(this.z)
	}
}


if (module)
	module.exports = { Vec3 }