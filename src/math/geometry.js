class Geometry
{
	static linePointMinimumVec(origin, direction, point)
	{
		let pointFromOrigin = point.sub(origin)
		let pointOverDirection = pointFromOrigin.project(direction)
		
		return pointFromOrigin.sub(pointOverDirection)
	}
	
	
	static linePointDistance(origin, direction, point)
	{
		return Geometry.linePointMinimumVec(origin, direction, point).magn()
	}
	
	
	static lineLineDistance(origin1, direction1, origin2, direction2)
	{
		let cross = direction1.cross(direction2)
		let crossMagn = cross.magn()
		
		if (crossMagn < 0.001)
			return Infinity // wrong but works
		
		return Math.abs(cross.scale(1 / crossMagn).dot(origin2.sub(origin1)))
	}


	// Projects line 1 such that it will intersect line 2
	static lineLineProjection(origin1, direction1, origin2, direction2)
	{
		let normal = Geometry.linePointMinimumVec(origin2, direction2, origin1).cross(direction2).normalize()
		return direction1.projectOnPlane(normal)
	}
	
	
	static lineZPlaneIntersection(origin, direction, planeZ)
	{
		return origin.add(direction.scale((planeZ - origin.z) / direction.z))
	}
}


if (module)
	module.exports = { Geometry }