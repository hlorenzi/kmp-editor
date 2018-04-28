const { ModelBuilder } = require("../util/modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


class ObjLoader
{
	static load(bytes)
	{
		let str = new TextDecoder("utf-8").decode(bytes)
		let lines = str.replace("\r\n", "\n").split("\n").map(s => s.trim())
		
		let objects = []
		let curObject = null
		let curGeometry = null
		
		for (let line of lines)
		{
			if (line.startsWith("#"))
				continue
			
			let tagO = line.match(/^o[ ]+(.*)/)
			if (tagO != null)
			{
				let object = {}
				object.name = tagO[1]
				object.vertices = []
				object.normals = []
				object.texCoords = []
				object.geometries = []
				
				objects.push(object)
				curObject = object
				continue
			}
			
			if (curObject == null)
				continue
			
			let tagV = line.match(/^v[ ]+([0-9.-]+)[ ]+([0-9.-]+)[ ]+([0-9.-]+)/)
			if (tagV != null)
			{
				let vertex = new Vec3(parseFloat(tagV[1]), -parseFloat(tagV[3]), -parseFloat(tagV[2]))
				curObject.vertices.push(vertex)
				continue
			}
			
			let tagVT = line.match(/^vt[ ]+([0-9.-]+)[ ]+([0-9.-]+)/)
			if (tagVT != null)
			{
				let texCoord = new Vec3(parseFloat(tagVT[1]), parseFloat(tagVT[2]), 0)
				curObject.texCoords.push(texCoord)
				continue
			}
			
			let tagVN = line.match(/^vn[ ]+([0-9.-]+)[ ]+([0-9.-]+)[ ]+([0-9.-]+)/)
			if (tagVN != null)
			{
				let normal = new Vec3(parseFloat(tagVN[1]), parseFloat(tagVN[2]), parseFloat(tagVN[3]))
				curObject.normals.push(normal)
				continue
			}
			
			let tagG = line.match(/^g[ ]+(.*)/)
			if (tagG != null)
			{
				let geometry = {}
				geometry.name = tagG[1]
				geometry.faces = []
				
				curObject.geometries.push(geometry)
				curGeometry = geometry
				continue
			}
			
			if (curGeometry == null)
				continue
			
			if (line.startsWith("f"))
			{
				let splits = line.substr(1).split(" ").map(v => v.trim())
				
				let face = []
				for (let split of splits)
				{
					if (split == "")
						continue
					
					let indices = split.split("/")
					
					let vertex = {}
					vertex.position = curObject.vertices[parseInt(indices[0]) - 1]
					vertex.texCoord = (indices.length < 2 ? new Vec3(0, 0, 0) : curObject.texCoords[parseInt(indices[1]) - 1])
					vertex.normal   = (indices.length < 3 ? new Vec3(0, 0, 0) : curObject.normals[parseInt(indices[2]) - 1])
					
					if (vertex.position)
						face.push(vertex)
				}
				
				curGeometry.faces.push(face)
				continue
			}
		}
		
		return objects
	}
	
	
	static makeModelBuilder(bytes)
	{
		let objects = ObjLoader.load(bytes)
		
		let model = new ModelBuilder()
		
		for (let object of objects)
		{
			for (let geometry of object.geometries)
			{
				for (let face of geometry.faces)
				{
					if (face.length >= 3)
					{
						model.addTri(face[0].position, face[1].position, face[2].position)
						model.addTri(face[0].position, face[2].position, face[1].position)
					}
				}
			}
		}
		
		return model.calculateNormals()
	}
}


if (module)
	module.exports = { ObjLoader }