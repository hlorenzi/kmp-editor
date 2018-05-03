const { BinaryParser } = require("./binaryParser.js")
const { ModelBuilder } = require("./modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


class KclLoader
{
	static load(bytes)
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
		
		let collisionTypeColors =
		[
			[1.0, 1.0, 1.0, 1.0], // Road
			[1.0, 0.9, 0.8, 1.0], // Slippery Road
			[0.0, 0.8, 0.0, 1.0], // Weak Off-Road
			[0.0, 0.6, 0.0, 1.0], // Off-Road
			[0.0, 0.4, 0.0, 1.0], // Heavy Off-Road
			[1.0, 0.9, 0.8, 1.0], // Slippery Road
			[1.0, 0.5, 0.0, 1.0], // Boost Pad
			[1.0, 0.6, 0.0, 1.0], // Boost Ramp
			[1.0, 0.7, 0.0, 1.0], // Jump Pad
			[1.0, 1.0, 1.0, 0.5], // Item Road
			[0.8, 0.0, 0.0, 0.8], // Solid Fall
			[0.0, 0.5, 1.0, 1.0], // Moving Water
			[0.6, 0.6, 0.6, 1.0], // Wall
			[0.0, 0.0, 0.6, 0.8], // Invisible Wall
			[0.6, 0.6, 0.6, 0.5], // Item Wall
			[0.6, 0.6, 0.6, 1.0], // Wall
			[0.8, 0.0, 0.0, 0.8], // Fall Boundary
			[1.0, 0.0, 0.5, 1.0], // Cannon Activator
			[1.0, 0.0, 1.0, 1.0], // Force Recalculation
			[0.0, 0.3, 1.0, 1.0], // Half-pipe Ramp
			[0.6, 0.6, 0.6, 1.0], // Wall
			[0.9, 0.9, 1.0, 1.0], // Moving Road
			[0.9, 0.7, 1.0, 1.0], // Gravity Road
			[1.0, 1.0, 1.0, 1.0], // Road
			[1.0, 0.0, 1.0, 1.0], // Sound Trigger
			[1.0, 0.0, 1.0, 1.0], // Unknown
			[1.0, 0.0, 1.0, 1.0], // Effect Trigger
			[1.0, 0.0, 1.0, 1.0], // Unknown
			[1.0, 0.0, 1.0, 1.0], // Unknown
			[0.9, 0.9, 1.0, 1.0], // Moving Road
			[0.8, 0.7, 0.8, 1.0], // Special Wall
			[0.6, 0.6, 0.6, 1.0], // Wall
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
			
			let flagBasicType = collisionFlags & 0x1f
			let color =
				flagBasicType < collisionTypeColors.length ?
				collisionTypeColors[flagBasicType] : [1, 1, 1, 1]
			
			model.addTri(v1, v2, v3, color, color, color)
		}
		
		model.calculateNormals()
		return model
	}
}


if (module)
	module.exports = { KclLoader }