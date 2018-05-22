const { BinaryParser } = require("./binaryParser.js")
const { ModelBuilder } = require("./modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


class KclLoader
{
	static load(bytes, cfg)
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
		while (parser.head < section3Offset)
		{
			let x = parser.readFloat32()
			let y = parser.readFloat32()
			let z = parser.readFloat32()
			normals.push(new Vec3(x, -z, -y))
		}
		
		let model = new ModelBuilder()
		
		let collisionTypeData =
		[
			{ c: [1.0, 1.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Road
			{ c: [1.0, 0.9, 0.8, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Slippery Road
			{ c: [0.0, 0.8, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Weak Off-Road
			{ c: [0.0, 0.6, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Off-Road
			{ c: [0.0, 0.4, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Heavy Off-Road
			{ c: [1.0, 0.9, 0.8, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Slippery Road
			{ c: [1.0, 0.5, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Boost Pad
			{ c: [1.0, 0.6, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Boost Ramp
			{ c: [1.0, 0.7, 0.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Jump Pad
			{ c: [1.0, 1.0, 1.0, 0.5], isDeath: false, isInvis: true,  isEffect: false }, // Item Road
			{ c: [0.8, 0.0, 0.0, 0.8], isDeath: true,  isInvis: false, isEffect: false }, // Solid Fall
			{ c: [0.0, 0.5, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Moving Water
			{ c: [0.6, 0.6, 0.6, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Wall
			{ c: [0.0, 0.0, 0.6, 0.8], isDeath: false, isInvis: true,  isEffect: false }, // Invisible Wall
			{ c: [0.6, 0.6, 0.6, 0.5], isDeath: false, isInvis: true,  isEffect: false }, // Item Wall
			{ c: [0.6, 0.6, 0.6, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Wall
			{ c: [0.8, 0.0, 0.0, 0.8], isDeath: true,  isInvis: false, isEffect: false }, // Fall Boundary
			{ c: [1.0, 0.0, 0.5, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Cannon Activator
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Force Recalculation
			{ c: [0.0, 0.3, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Half-pipe Ramp
			{ c: [0.6, 0.6, 0.6, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Wall
			{ c: [0.9, 0.9, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Moving Road
			{ c: [0.9, 0.7, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Gravity Road
			{ c: [1.0, 1.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Road
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Sound Trigger
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Unknown
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Effect Trigger
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Unknown
			{ c: [1.0, 0.0, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: true  }, // Unknown
			{ c: [0.9, 0.9, 1.0, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Moving Road
			{ c: [0.8, 0.7, 0.8, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Special Wall
			{ c: [0.6, 0.6, 0.6, 1.0], isDeath: false, isInvis: false, isEffect: false }, // Wall
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
			if (cfg && data.isDeath && cfg.kclEnableDeathBarriers !== undefined && !cfg.kclEnableDeathBarriers)
				continue
			
			if (cfg && data.isInvis && cfg.kclEnableInvisible !== undefined && !cfg.kclEnableInvisible)
				continue
			
			if (cfg && data.isEffect && cfg.kclEnableEffects !== undefined && !cfg.kclEnableEffects)
				continue
			
			let color = data.c
			if (cfg && cfg.kclEnableColors !== undefined && !cfg.kclEnableColors)
				color = [1, 1, 1, 1]
			
			model.addTri(v1, v2, v3, color, color, color)
		}
		
		return model.calculateNormals()
	}
}


if (module)
	module.exports = { KclLoader }