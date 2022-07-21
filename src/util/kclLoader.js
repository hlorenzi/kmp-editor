const { BinaryParser } = require("./binaryParser.js")
const { ModelBuilder } = require("./modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


class KclLoader
{
	static load(bytes, cfg, hl)
	{
		let parser = new BinaryParser(bytes)
		
		let section1Offset = parser.readUInt32()
		let section2Offset = parser.readUInt32()
		let section3Offset = parser.readUInt32()
		let section4Offset = parser.readUInt32()
		
		let vertices = []
		parser.seek(section1Offset)
		while (parser.head < section2Offset)
		{
			let x = parser.readFloat32()
			let y = parser.readFloat32()
			let z = parser.readFloat32()
			vertices.push(new Vec3(x, -z, -y))
		}
		
		let normals = []
		parser.seek(section2Offset)
		while (parser.head < section3Offset + 0x10)
		{
			let x = parser.readFloat32()
			let y = parser.readFloat32()
			let z = parser.readFloat32()
			normals.push(new Vec3(x, -z, -y))
		}
		
		let model = new ModelBuilder()

		if (!cfg.kclEnableModel)
			return model
		
		let collisionTypeData =
		[
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 1.0, 1.0, 1.0] }, // Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 0.9, 0.8, 1.0] }, // Slippery Road (sand/dirt)
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.0, 0.8, 0.0, 1.0] }, // Weak Off-Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.0, 0.6, 0.0, 1.0] }, // Off-Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.0, 0.4, 0.0, 1.0] }, // Heavy Off-Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.8, 0.9, 1.0, 1.0] }, // Slippery Road (ice)
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 0.5, 0.0, 1.0] }, // Boost Panel
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 0.6, 0.0, 1.0] }, // Boost Ramp
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 0.8, 0.0, 1.0] }, // Slow Ramp
			{ isDeath: false, isInvis: true,  isEffect: false, isWall: false, c: [0.9, 0.9, 1.0, 0.5] }, // Item Road
			{ isDeath: true,  isInvis: false, isEffect: false, isWall: false, c: [0.7, 0.1, 0.1, 1.0] }, // Solid Fall
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.0, 0.5, 1.0, 1.0] }, // Moving Water
			{ isDeath: false, isInvis: false, isEffect: false, isWall: true,  c: [0.6, 0.6, 0.6, 1.0] }, // Wall
			{ isDeath: false, isInvis: true,  isEffect: false, isWall: true,  c: [0.0, 0.0, 0.6, 0.8] }, // Invisible Wall
			{ isDeath: false, isInvis: true,  isEffect: false, isWall: false, c: [0.6, 0.6, 0.7, 0.5] }, // Item Wall
			{ isDeath: false, isInvis: false, isEffect: false, isWall: true,  c: [0.6, 0.6, 0.6, 1.0] }, // Wall
			{ isDeath: true,  isInvis: false, isEffect: false, isWall: false, c: [0.8, 0.0, 0.0, 0.8] }, // Fall Boundary
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: false, c: [1.0, 0.0, 0.5, 0.8] }, // Cannon Activator
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: false, c: [0.5, 0.0, 1.0, 0.5] }, // Force Recalculation
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.0, 0.3, 1.0, 1.0] }, // Half-pipe Ramp
			{ isDeath: false, isInvis: false, isEffect: false, isWall: true,  c: [0.6, 0.6, 0.6, 1.0] }, // Wall (items pass through)
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.9, 0.9, 1.0, 1.0] }, // Moving Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.9, 0.7, 1.0, 1.0] }, // Sticky Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [1.0, 1.0, 1.0, 1.0] }, // Road (alt sfx)
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: false, c: [1.0, 0.0, 1.0, 0.8] }, // Sound Trigger
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: true,  c: [0.4, 0.6, 0.4, 0.8] }, // Weak Wall
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: false, c: [0.8, 0.0, 1.0, 0.8] }, // Effect Trigger
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: false, c: [1.0, 0.0, 1.0, 0.5] }, // Item State Modifier
			{ isDeath: false, isInvis: false, isEffect: true,  isWall: true,  c: [0.0, 0.6, 0.0, 0.8] }, // Half-pipe Invis Wall
			{ isDeath: false, isInvis: false, isEffect: false, isWall: false, c: [0.9, 0.9, 1.0, 1.0] }, // Rotating Road
			{ isDeath: false, isInvis: false, isEffect: false, isWall: true,  c: [0.8, 0.7, 0.8, 1.0] }, // Special Wall
			{ isDeath: false, isInvis: false, isEffect: false, isWall: true,  c: [0.6, 0.6, 0.6, 1.0] }, // Wall
		]
		
		parser.seek(section3Offset + 0x10)
		while (parser.head < section4Offset)
		{
			let len = parser.readFloat32()
			let posIndex = parser.readUInt16()
			let dirIndex = parser.readUInt16()
			let normAIndex = parser.readUInt16()
			let normBIndex = parser.readUInt16()
			let normCIndex = parser.readUInt16()
			let collisionFlags = parser.readUInt16()
			
			if (posIndex >= vertices.length ||
				dirIndex >= normals.length ||
				normAIndex >= normals.length ||
				normBIndex >= normals.length ||
				normCIndex >= normals.length)
				continue
			
			let vertex = vertices[posIndex]
			let direction = normals[dirIndex]
			let normalA = normals[normAIndex]
			let normalB = normals[normBIndex]
			let normalC = normals[normCIndex]
			
			let crossA = normalA.cross(direction)
			let crossB = normalB.cross(direction)
			let v1 = vertex
			let v2 = vertex.add(crossB.scale(len / crossB.dot(normalC)))
			let v3 = vertex.add(crossA.scale(len / crossA.dot(normalC)))
			
			if (!v1.isFinite() || !v2.isFinite() || !v3.isFinite())
				continue
			
			let flagBasicType = collisionFlags & 0x1f
			if (flagBasicType >= collisionTypeData.length)
				continue
			
			let data = collisionTypeData[flagBasicType]

			if (hl.enabled() &&
				(hl.baseType == -1 || flagBasicType == hl.baseType) &&
				(hl.basicEffect == -1 || ((collisionFlags >>> 5) & 0x7) == hl.basicEffect) &&
				(hl.blightEffect == -1 || ((collisionFlags >>> 8) & 0x7) == hl.blightEffect) &&
				(hl.intensity == -1 || ((collisionFlags >>> 11) & 0x3) == hl.intensity) &&
				(hl.collisionEffect == -1 || ((collisionFlags >>> 13) & 0x7) == hl.collisionEffect))
			{
				let color = [1, 1, 0, 1]
				model.addTri(v1, v2, v3, color, color, color)
				continue
			}

			if (cfg && data.isWall && cfg.kclEnableWalls !== undefined && !cfg.kclEnableWalls)
				continue

			if (cfg && data.isDeath && cfg.kclEnableDeathBarriers !== undefined && !cfg.kclEnableDeathBarriers)
				continue
			
			if (cfg && data.isInvis && cfg.kclEnableInvisible !== undefined && !cfg.kclEnableInvisible)
				continue
			
			if (cfg && data.isEffect && cfg.kclEnableEffects !== undefined && !cfg.kclEnableEffects)
				continue
			
			let color = data.c
			if (cfg && cfg.kclEnableColors !== undefined && !cfg.kclEnableColors)
				color = [1, 1, 1, 1]

			if (cfg && cfg.kclHighlighter !== undefined)
			{
				let highlighted = false
				switch (cfg.kclHighlighter)
				{
					case 1:
						highlighted = collisionFlags & 0x2000
						break

					case 2:
						let v1to2 = v2.sub(v1)
						let v1to3 = v3.sub(v1)
						let normal = v1to2.cross(v1to3).normalize()
						highlighted = data.isWall && normal.dot(new Vec3(0, 0, 1)) > 0.9
						break

					case 3:
						highlighted = data.isWall && collisionFlags & 0x8000
						break
				}

				if (highlighted)
					color = [1.0, 1.0, 0.0, 1.0]
			}
			
			model.addTri(v1, v2, v3, color, color, color)
		}
		
		return model.calculateNormals()
	}
}


if (module)
	module.exports = { KclLoader }