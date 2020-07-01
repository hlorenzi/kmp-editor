import Vec3 from "../math/vec3.js"


export default class CollisionMesh
{
	constructor()
	{
		this.triangles = []
		
		this.bboxMin = null
		this.bboxMax = null
		
		this.cacheSubdiv = null
	}
	
	
	addTri(v1, v2, v3)
	{
		let tri = {}
		tri.v1 = v1,
		tri.v1to2 = v2.sub(v1),
		tri.v1to3 = v3.sub(v1),
		tri.normal = tri.v1to2.cross(tri.v1to3).normalize()
		
		tri.bboxMin = v1.min(v2.min(v3))
		tri.bboxMax = v1.max(v2.max(v3))
		
		this.bboxMin = tri.bboxMin.min(this.bboxMin)
		this.bboxMax = tri.bboxMax.max(this.bboxMax)
		
		this.triangles.push(tri)
		this.cacheSubdiv = null
	}
	
	
	buildCacheSubdiv(xSubdivs = 10, ySubdivs = 10, zSubdivs = 10)
	{
		if (this.triangles.length == 0)
			return this
		
		let cache = 
		{
			xSubdivs: xSubdivs,
			ySubdivs: ySubdivs,
			zSubdivs: zSubdivs,
			cells: []
		}
		
		for (let zSubdiv = 0; zSubdiv < zSubdivs; zSubdiv++)
		{
			let zCells = []
			let zMin = this.bboxMin.z + (this.bboxMax.z - this.bboxMax.z) / zSubdivs * zSubdiv
			let zMax = this.bboxMin.z + (this.bboxMax.z - this.bboxMax.z) / zSubdivs * (zSubdiv + 1)
			
			for (let ySubdiv = 0; ySubdiv < ySubdivs; ySubdiv++)
			{
				let yCells = []
				let yMin = this.bboxMin.y + (this.bboxMax.y - this.bboxMax.y) / ySubdivs * ySubdiv
				let yMax = this.bboxMin.y + (this.bboxMax.y - this.bboxMax.y) / ySubdivs * (ySubdiv + 1)
			
				for (let xSubdiv = 0; xSubdiv < xSubdivs; xSubdiv++)
				{
					let xCells = []
					let xMin = this.bboxMin.x + (this.bboxMax.x - this.bboxMax.x) / xSubdivs * xSubdiv
					let xMax = this.bboxMin.x + (this.bboxMax.x - this.bboxMax.x) / xSubdivs * (xSubdiv + 1)
					
					for (let tri of this.triangles)
					{
						if (tri.bboxMin.x - 1 > xMax || tri.bboxMax.x + 1 < xMin)
							continue
						
						if (tri.bboxMin.y - 1 > yMax || tri.bboxMax.y + 1 < yMin)
							continue
						
						if (tri.bboxMin.z - 1 > zMax || tri.bboxMax.z + 1 < zMin)
							continue
						
						xCells.push(tri)
					}
					
					yCells.push(xCells)
				}
				
				zCells.push(yCells)
			}
			
			cache.cells.push(zCells)
		}
		
		this.cacheSubdiv = cache
		return this
	}
	
	
	raycast(origin, dir, margin = 0.000001)
	{
		if (false)//this.cacheSubdiv != null)
		{
			let cache = this.cacheSubdiv
			
			let current = origin
			let step = dir.normalize().scale(Math.min(
				(this.bboxMax.x - this.bboxMin.x) / cache.xSubdivs,
				(this.bboxMax.y - this.bboxMin.y) / cache.ySubdivs,
				(this.bboxMax.z - this.bboxMin.z) / cache.zSubdivs) * 0.9)
				
			let lastZCell = -1
			let lastYCell = -1
			let lastXCell = -1
			for (let i = 0; i < 500; i++)
			{
				if ((current.x > this.bboxMax.x && dir.x > 0) ||
					(current.x < this.bboxMin.x && dir.x < 0) ||
					(current.y > this.bboxMax.y && dir.y > 0) ||
					(current.y < this.bboxMin.y && dir.y < 0) ||
					(current.z > this.bboxMax.z && dir.z > 0) ||
					(current.z < this.bboxMin.z && dir.z < 0))
					break
				
				let xCell = Math.floor((current.x - this.bboxMin.x) / (this.bboxMax.x - this.bboxMin.x) * cache.xSubdivs)
				let yCell = Math.floor((current.y - this.bboxMin.y) / (this.bboxMax.y - this.bboxMin.y) * cache.ySubdivs)
				let zCell = Math.floor((current.z - this.bboxMin.z) / (this.bboxMax.z - this.bboxMin.z) * cache.zSubdivs)
				
				if (xCell >= 0 && xCell < cache.xSubdivs)
				if (yCell >= 0 && yCell < cache.ySubdivs)
				if (zCell >= 0 && zCell < cache.zSubdivs)
				if (xCell != lastXCell || yCell != lastYCell || zCell != lastZCell)
				{
					let hit = this.raycastTris(origin, dir, cache.cells[zCell][yCell][xCell], margin)
					if (hit != null)
					{
						console.log(i)
						return hit
					}
				}
				
				lastXCell = xCell
				lastYCell = yCell
				lastZCell = zCell
				
				current = current.add(step)
			}
			
			return null
		}
			
		
		return this.raycastTris(origin, dir, this.triangles, margin)
	}
	
	
	raycastTris(origin, dir, tris, margin = 0.000001)
	{
		let nearestHit = null
		
		for (let tri of tris)
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
					dist: distScaled * dir.magn(),
					position: origin.add(dir.scale(distScaled)),
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