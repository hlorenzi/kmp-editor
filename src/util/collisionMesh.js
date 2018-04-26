const { Vec3 } = require("../math/vec3.js")


class CollisionMesh
{
	constructor()
	{
		this.triangles = []
	}
	
	
	addTri(v1, v2, v3)
	{
		let tri = {}
		tri.v1 = v1,
		tri.v1to2 = v2.sub(v1),
		tri.v1to3 = v3.sub(v1),
		tri.normal = tri.v1to2.cross(tri.v1to3).normalize()
		
		this.triangles.push(tri)
	}
	
	
	raycast(origin, dir, margin = 0.000001)
	{
		let nearestHit = null
		
		for (let tri of this.triangles)
		{
			const crossP = dir.cross(tri.v1to2)
			const det = crossP.dot(tri.v1to3)
			
			if (det < margin)
				continue
			
			const v1toOrigin = origin.sub(tri.v1)
			const u = v1toOrigin.dot(crossP)
			
			if (u < 0 || u > det)
				continue
			
			const crossQ = v1toOrigin.cross(tri.v1to3)
			const v = dir.dot(crossQ)
			
			if (v < 0 || u + v > det)
				continue
			
			const distScaled = Math.abs(tri.v1to2.dot(crossQ) / det)
			
			if (nearestHit == null || distScaled < nearestHit.distScaled)
			{
				nearestHit =
				{
					distScaled: distScaled,
					pos: origin.add(dir.scale(distScaled)),
					u: u,
					v: v,
					tri: tri
				}
			}
		}
		
		return nearestHit
	}
	
	
	solve(pos, speed, margin = 0.1, friction = 0.01, cutoff = 0.001)
	{
		let iters = 0
		
		while (speed.magn() > 0.001 && iters < 10)
		{
			iters += 1
			
			let speedMagn = speed.magn()
			let speedNorm = speed.normalize()
			
			let hit = this.raycast(pos, speedNorm)
			if (hit == null || hit.distScaled >= speedMagn + margin)
			{
				pos = pos.add(speed)
				speed = new Vec3(0, 0, 0)
				break
			}
			/*else if (hit.distScaled < margin)
			{
				let toPlane = pos.directionToPlane(hit.tri.normal, hit.tri.v1)
				pos = pos.sub(toPlane.normalize().scale(-(margin - toPlane.magn())))
			}*/
			else
			{
				speed = speedNorm.scale(speedMagn - (hit.distScaled - margin) - friction).projectOnPlane(hit.tri.normal)
				pos = pos.add(speedNorm.scale(hit.distScaled - margin))
			}
		}
		
		return pos
	}
}


if (module)
	module.exports = { CollisionMesh }