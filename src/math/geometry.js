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
}


if (module)
	module.exports = { Geometry }