const { BinaryParser } = require("./binaryParser.js")
const { ModelBuilder } = require("./modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


class BrresLoader
{
	static load(bytes)
	{
		let parser = new BinaryParser(bytes)
		
		if (parser.readAsciiLength(4) != "bres")
			throw "brres: invalid magic number"
		
		let byteOrderMark = parser.readUInt16()
		if (byteOrderMark != 0xfeff)
			throw "brres: unsupported endianness"
		
		parser.readUInt16()
		let fileLenInBytes = parser.readUInt32()
		let rootSectionOffset = parser.readUInt16()
		let sectionNum = parser.readUInt16()
		
		parser.seek(rootSectionOffset)
		
		let rootSection = BrresLoader.readRootSection(parser)
		let sections = []
		
		for (let i = 0; i < rootSection.folders.length; i++)
		{
			for (let j = 1; j < rootSection.folders[i].entries.length; j++)
			{
				parser.seek(rootSection.folders[i].addr + rootSection.folders[i].entries[j].dataOffset)
				
				let sectionHeader = BrresLoader.readCommonSectionHeader(parser)
				sections.push(sectionHeader)
			}
		}
		
		let courseModelMDL0 = null
		
		let debugStructure = "BRRES File\n"
		for (let i = 0; i < rootSection.folders.length; i++)
		{
			debugStructure += "└ " + rootSection.root.entries[i + 1].name + "\n"
			
			for (let j = 1; j < rootSection.folders[i].entries.length; j++)
			{
				let entry = rootSection.folders[i].entries[j]
				
				debugStructure += "   └ " + entry.name + " {" + entry.dataTag + "}\n"
				
				if (entry.name == "course" && entry.dataTag == "MDL0")
					courseModelMDL0 = entry
			}
		}
		console.log(debugStructure)
		
		if (courseModelMDL0 == null)
			throw new "brres: no course model found"
		
		parser.seek(courseModelMDL0.offsetBase + courseModelMDL0.dataOffset)
		let mdl0 = BrresLoader.readMdl0Section(parser)
		
		let model = new ModelBuilder()
		for (let polygon of mdl0.generatedPolygons)
		{
			for (let instr of polygon.instructions)
			{
				if (instr.kind == "DrawQuads")
				{
					for (let i = 0; i < instr.count; i += 4)
					{
						let v0 = instr.vertices[i + 0]
						let v1 = instr.vertices[i + 1]
						let v2 = instr.vertices[i + 2]
						let v3 = instr.vertices[i + 3]
						
						if (v0 && v1 && v2 && v3)
							model.addQuad(v0, v1, v2, v3)
					}
				}
				else if (instr.kind == "DrawTriangles")
				{
					for (let i = 0; i < instr.count; i += 3)
					{
						let v0 = instr.vertices[i + 0]
						let v1 = instr.vertices[i + 1]
						let v2 = instr.vertices[i + 2]
						
						if (v0 && v1 && v2)
							model.addTri(v0, v2, v1)
					}
				}
				else if (instr.kind == "DrawTriangleStrip")
				{
					let v0 = instr.vertices[0]
					let v1 = instr.vertices[1]
					let winding = false
					
					for (let i = 2; i < instr.count; i += 1)
					{
						let v2 = instr.vertices[i]
						
						if (v0 && v1 && v2)
							if (winding)
								model.addTri(v0, v1, v2)
							else
								model.addTri(v0, v2, v1)
						
						v0 = v1
						v1 = v2
						winding = !winding
					}
				}
				else if (instr.kind == "DrawTriangleFan")
				{
					let v0 = instr.vertices[0]
					let v1 = instr.vertices[1]
					
					for (let i = 2; i < instr.count; i += 1)
					{
						let v2 = instr.vertices[i]
						
						if (v0 && v1 && v2)
							model.addTri(v0, v2, v1)
						
						v1 = v2
					}
				}
			}
		}
		
		return model.calculateNormals()
	}
	
	
	static readRootSection(parser)
	{
		let addr = parser.head
		let tag = parser.readAsciiLength(4)
		if (tag != "root")
			throw "brres: invalid root section magic number"
		
		let len = parser.readInt32()
		
		let root = BrresLoader.readIndexGroup(parser)
		
		let folders = []
		
		for (let i = 1; i < root.entries.length; i++)
		{
			parser.seek(root.addr + root.entries[i].dataOffset)
			folders.push(BrresLoader.readIndexGroup(parser))
		}
		
		return { addr, tag, len, root, folders }
	}
	
	
	static readIndexGroup(parser)
	{
		let addr = parser.head
		
		let len = parser.readInt32()
		let entryNum = parser.readInt32()
		
		let entries = []
		
		for (let i = 0; i <= entryNum; i++)
		{
			let entry = BrresLoader.readIndexEntry(parser)
			entry.offsetBase = addr
			entry.nameLen = 0
			entry.name = null
			entry.dataTag = null
			
			entries.push(entry)
		}
		
		for (let i = 1; i < entries.length; i++)
		{
			parser.seek(addr + entries[i].nameOffset - 4)
			entries[i].nameLen = parser.readUInt32()
			entries[i].name = parser.readAsciiLength(entries[i].nameLen)
			
			if (entries[i].dataOffset != 0)
			{
				parser.seek(addr + entries[i].dataOffset)
				entries[i].dataTag = parser.readAsciiLength(4)
			}
		}
		
		parser.seek(addr + 0x8 + entries.length * 0x10)
		
		return { addr, len, entries }
	}
	
	
	static readIndexEntry(parser)
	{
		let addr = parser.head
		
		let id = parser.readUInt16()
		parser.readUInt16()
		let left = parser.readUInt16()
		let right = parser.readUInt16()
		let nameOffset = parser.readInt32()
		let dataOffset = parser.readInt32()
		
		return { addr, id, left, right, nameOffset, dataOffset }
	}
	
	
	static readCommonSectionHeader(parser)
	{
		let addr = parser.head
		
		let tag = parser.readAsciiLength(4)
		let len = parser.readInt32()
		let version = parser.readInt32()
		let offset = parser.readInt32()
		
		return { addr, tag, len, version, offset }
	}
	
	
	static readMdl0Section(parser)
	{
		let addr = parser.head
		
		if (parser.readAsciiLength(4) != "MDL0")
			throw "brres: invalid MDL0 magic number"
		
		let len = parser.readUInt32()
		let version = parser.readUInt32()
		if (version != 11)
			throw "brres: unsupported MDL0 version"
		
		let parentOffset = parser.readInt32()
		
		let sectionOffsets = []
		for (let i = 0; i < 14; i++)
			sectionOffsets.push(parser.readInt32())
		
		let nameOffset = parser.readInt32()
		
		let header = BrresLoader.readMdl0Header(parser)
		
		let sections = []
		for (let i = 0; i < sectionOffsets.length; i++)
		{
			if (sectionOffsets[i] != 0)
			{
				parser.seek(addr + sectionOffsets[i])
				sections.push(BrresLoader.readIndexGroup(parser))
			}
			else
				sections.push(null)
		}
		
		let vertexGroups = []
		if (sections[2] != null)
		{
			for (let i = 1; i < sections[2].entries.length; i++)
			{
				parser.seek(sections[2].addr + sections[2].entries[i].dataOffset)
				vertexGroups.push(BrresLoader.readMdl0VertexGroup(parser))
			}
		}
		
		let polygons = []
		if (sections[10] != null)
		{
			for (let i = 1; i < sections[10].entries.length; i++)
			{
				parser.seek(sections[10].addr + sections[10].entries[i].dataOffset)
				let polygon = BrresLoader.readMdl0Polygon(parser)
				
				for (let vertexGroup of vertexGroups)
				{
					if (vertexGroup.index == polygon.vertexGroupIndex)
						polygon.vertexGroup = vertexGroup
				}
				
				polygons.push(polygon)
			}
		}
		
		let generatedPolygons = []
		for (let polygon of polygons)
			generatedPolygons.push(BrresLoader.generatePolygon(null, polygon))
		
		return { generatedPolygons }
	}
	
	
	static readMdl0Header(parser)
	{
		let addr = parser.head
		let len = parser.readInt32()
		let mdl0Offset = parser.readInt32()
		parser.readInt32()
		parser.readInt32()
		let vertexCount = parser.readInt32()
		let faceCount = parser.readInt32()
		parser.readInt32()
		let boneCount = parser.readInt32()
		parser.readInt32()
		let boneTableOffset = parser.readInt32()
		
		parser.readFloat32()
		parser.readFloat32()
		parser.readFloat32()
		
		parser.readFloat32()
		parser.readFloat32()
		parser.readFloat32()
		
		return { addr, len, mdl0Offset, vertexCount, faceCount, boneCount, boneTableOffset }
	}
	
	
	static readMdl0VertexGroup(parser)
	{
		let addr = parser.head
		
		let len = parser.readInt32()
		let mdl0Offset = parser.readInt32()
		let dataOffset = parser.readInt32()
		let nameOffset = parser.readInt32()
		let index = parser.readInt32()
		parser.readUInt32()
		let type = parser.readInt32()
		let divisor = Math.pow(2, parser.readByte())
		let stride = parser.readByte()
		let vertexCount = parser.readInt16()
		
		parser.readFloat32()
		parser.readFloat32()
		parser.readFloat32()
		
		parser.readFloat32()
		parser.readFloat32()
		parser.readFloat32()
		
		parser.seek(addr + dataOffset)
		
		let vertices = []
		for (let i = 0; i < vertexCount; i++)
		{
			let x = 0
			let y = 0
			let z = 0
			
			switch (type)
			{
				case 0:
					x = parser.readByte() / divisor
					y = parser.readByte() / divisor
					z = parser.readByte() / divisor
					break
				case 1:
					x = parser.readSByte() / divisor
					y = parser.readSByte() / divisor
					z = parser.readSByte() / divisor
					break
				case 2:
					x = parser.readUInt16() / divisor
					y = parser.readUInt16() / divisor
					z = parser.readUInt16() / divisor
					break
				case 3:
					x = parser.readInt16() / divisor
					y = parser.readInt16() / divisor
					z = parser.readInt16() / divisor
					break
				case 4:
					x = parser.readFloat32()
					y = parser.readFloat32()
					z = parser.readFloat32()
					break
				default:
					throw "brres: mdl0 invalid vertex group type"
			}
			
			let vec = new Vec3(x, -z, -y)
			vec.index = i
			vertices.push(vec)
		}
		
		return { addr, len, mdl0Offset, dataOffset, nameOffset, index, type, divisor, stride, vertexCount, vertices }
	}
	
	
	static readMdl0Polygon(parser)
	{
		let addr = parser.head
		
		let len = parser.readInt32()
		let mdl0Offset = parser.readInt32()
		let boneIndex = parser.readInt32()
		parser.readInt32()
		parser.readInt32()
		parser.readInt32()
		
		let sections = []
		for (let i = 0; i < 2; i++)
		{
			let sectionAddr = parser.head
			let size = parser.readInt32()
			let size2 = parser.readInt32()
			let offset = parser.readInt32()
			sections.push({ addr: sectionAddr, size, size2, offset })
		}
		
		parser.readInt32()
		parser.readInt32()
		
		let nameOffset = parser.readInt32()
		let index = parser.readInt32()
		let vertexCount = parser.readInt32()
		let faceCount = parser.readInt32()
		let vertexGroupIndex = parser.readInt16()
		let normalGroupIndex = parser.readInt16()
		let colorGroupIndices = [parser.readInt16(), parser.readInt16()]
		let texCoordGroupIndices = []
		for (let i = 0; i < 8; i++)
			texCoordGroupIndices.push(parser.readInt16())
		
		parser.readInt32()
		let boneTableOffset = parser.readInt32()
		
		parser.seek(sections[0].addr + sections[0].offset)
		let vertexDefinitions = parser.readBytes(sections[0].size)
		
		parser.seek(sections[1].addr + sections[1].offset)
		let vertexData = parser.readBytes(sections[1].size)
		
		return {
			addr, len, mdl0Offset, boneIndex, sections,
			nameOffset, index, vertexCount, faceCount,
			vertexGroupIndex, normalGroupIndex,
			colorGroupIndices, texCoordGroupIndices, boneTableOffset,
			vertexDefinitions, vertexData,
			vertexGroup: null }
	}
	
	
	static generatePolygon(mdl0, polygon)
	{
		let parser = new BinaryParser(polygon.vertexData)
		
		let vertexDescription = BrresLoader.readVertexDescription(polygon.vertexDefinitions)
		let instructions = []
		
		end: while (parser.head < polygon.vertexData.length)
		{
			let opcode = parser.readByte()
			let count = 0
			let instr = { kind: null }
			
			switch (opcode & 0xf8)
			{
				case 0x00:
					break
					
				case 0x20:
					console.error("brres: unimplemented SetMatrix instruction")
					parser.readUInt16()
					parser.readInt16()
					break
					
				case 0x28:
				case 0x30:
				case 0x38:
					parser.readInt32()
					break
					
				case 0x80:
					instr.kind = "DrawQuads"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0x90:
					instr.kind = "DrawTriangles"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0x98:
					instr.kind = "DrawTriangleStrip"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0xa0:
					instr.kind = "DrawTriangleFan"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0xa8:
					instr.kind = "DrawLines"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0xb0:
					instr.kind = "DrawLineStrip"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				case 0xb8:
					instr.kind = "DrawPoints"
					instr.count = parser.readUInt16()
					instr.vertices = BrresLoader.readVertices(parser, polygon, vertexDescription, instr.count)
					break
					
				default:
					break end
			}
			
			if (instr.kind != null)
				instructions.push(instr)
		}
		
		return { vertexDescription, instructions }
	}
	
	
	static readVertexDescription(bytes)
	{
		let parser = new BinaryParser(bytes)
		
		let byteDequant = 0
		let normalIndex3 = 0
		
		let matrix =
		{
			pos: false, norm: false,
			colfalse: false, col1: false,
			texfalse: false, tex1: false, tex2: false, tex3: false,
			tex4: false, tex5: false, tex6: false, tex7: false
		}		
		
		let presence =
		{
			pos: 0, norm: 0,
			col0: 0, col1: 0,
			tex0: 0, tex1: 0, tex2: 0, tex3: 0,
			tex4: 0, tex5: 0, tex6: 0, tex7: 0
		}
		
		let fields =
		{
			pos: 0, norm: 0,
			col0: 0, col1: 0,
			tex0: 0, tex1: 0, tex2: 0, tex3: 0,
			tex4: 0, tex5: 0, tex6: 0, tex7: 0
		}
		
		let format =
		{
			pos: 0, norm: 0,
			col0: 0, col1: 0,
			tex0: 0, tex1: 0, tex2: 0, tex3: 0,
			tex4: 0, tex5: 0, tex6: 0, tex7: 0
		}
		
		let scale = 
		{
			pos: 0, norm: 0,
			col0: 0, col1: 0,
			tex0: 0, tex1: 0, tex2: 0, tex3: 0,
			tex4: 0, tex5: 0, tex6: 0, tex7: 0
		}
		
		let colorCount = 0
		let normalCount = 0
		let textureCount = 0
		
		end: while (parser.head < bytes.length)
		{
			let opcode = parser.readByte()
			let current = 0
			
			switch (opcode)
			{
				case 0x0:
					break
				
				case 0x8:
				{
					let opcode2 = parser.readByte()
					switch (opcode2 & 0xf0)
					{
						case 0x50:
							parser.readByte()
							current = parser.readByte()
							presence.col1 = (current << 1 & 0x2)
							current = parser.readByte()
							presence.col1 |= (current >> 7 & 0x1)
							presence.col0 = (current >> 5 & 0x3)
							presence.norm = (current >> 3 & 0x3)
							presence.pos = (current >> 1 & 0x3)
							matrix.tex7 = (current & 0x1) > 0
							current = parser.readByte()
							matrix.tex6 = (current & 0x80) > 0
							matrix.tex5 = (current & 0x40) > 0
							matrix.tex4 = (current & 0x20) > 0
							matrix.tex3 = (current & 0x10) > 0
							matrix.tex2 = (current & 0x8) > 0
							matrix.tex1 = (current & 0x4) > 0
							matrix.tex0 = (current & 0x2) > 0
							matrix.pos = (current & 0x1) > 0
							break
							
						case 0x60:
							parser.readByte()
							parser.readByte()
							current = parser.readByte()
							presence.tex7 = (current >> 6 & 0x3)
							presence.tex6 = (current >> 4 & 0x3)
							presence.tex5 = (current >> 2 & 0x3)
							presence.tex4 = (current >> 0 & 0x3)
							current = parser.readByte()
							presence.tex3 = (current >> 6 & 0x3)
							presence.tex2 = (current >> 4 & 0x3)
							presence.tex1 = (current >> 2 & 0x3)
							presence.tex0 = ((current >> 0) & 0x3)
							break

						case 0x70:
							current = parser.readByte()
							normalIndex3 = (current & 0x80) > 0
							byteDequant = (current & 0x40) > 0
							scale.tex0 = current >> 1 & 0x1f
							format.tex0 = (current << 2 & 0x4)
							current = parser.readByte()
							format.tex0 |= (current >> 6 & 0x3)
							fields.tex0 = ((current & 0x20) > 0) ? 2 : 1 // not implemented
							format.col1 = (current >> 2 & 0x7)
							fields.col1 = ((current & 0x2) > 0) ? 4 : 3 // not implemented
							format.col0 = (current << 2 & 0x4)
							current = parser.readByte()
							format.col0 |= (current >> 6 & 0x3)
							fields.col0 = ((current & 0x20) > 0) ? 4 : 3 // not implemented
							format.norm = (current >> 2 & 0x7)
							fields.norm = ((current & 0x2) > 0) ? 3 : 1 // not implemented
							scale.pos = (current << 4 & 0x10) + ((current = parser.readByte()) >> 4 & 0xf)
							format.pos = (current >> 1 & 0x7)
							fields.pos = ((current & 0x1) > 0) ? 3 : 2 // not implemented                                    
							break
						case 0x80:
							current = parser.readByte()
							format.tex4 = (current >> 4 & 0x3)
							fields.tex4 = ((current & 0x8) > 0) ? 2 : 1 // not implemented
							scale.tex3 = (current << 2 & 0x1c) + ((current = parser.readByte()) >> 6 & 0x3)
							format.tex3 = (current >> 3 & 0x3)
							fields.tex3 = ((current & 0x4) > 0) ? 2 : 1 // not implemented
							scale.tex2 = (current << 3 & 0x18) + ((current = parser.readByte()) >> 5 & 0x7)
							format.tex2 = (current >> 2 & 0x3)
							fields.tex2 = ((current & 0x2) > 0) ? 2 : 1 // not implemented
							scale.tex1 = (current << 4 & 0x10) + ((current = parser.readByte()) >> 4 & 0xf)
							format.tex1 = (current >> 1 & 0x3)
							fields.tex1 = ((current & 0x1) > 0) ? 2 : 1 // not implemented
							break
						case 0x90:
							current = parser.readByte()
							scale.tex7 = current >> 3 & 0x1f
							format.tex7 = (current >> 0 & 0x3)
							current = parser.readByte()
							fields.tex7 = ((current & 0x80) > 0) ? 2 : 1 // not implemented
							scale.tex6 = current >> 2 & 0x1f
							format.tex6 = (current << 1 & 0x2)
							current = parser.readByte()
							format.tex6 |= (current >> 7 & 0x1)
							fields.tex6 = ((current & 0x40) > 0) ? 2 : 1 // not implemented
							scale.tex5 = current >> 1 & 0x1f
							current = parser.readByte()
							format.tex5 |= (current >> 6 & 0x3)
							fields.tex5 = ((current & 0x20) > 0) ? 2 : 1 // not implemented
							scale.tex4 = current >> 0 & 0x1f
							break
							
						default:
							parser.readByte()
							parser.readByte()
							parser.readByte()
							parser.readByte()
							break
					}
					break
				}
				
				case 0x10:
					parser.readByte()
					current = parser.readByte()

					switch (parser.readInt16())
					{
						case 0x0810:
							parser.readByte()
							parser.readByte()
							parser.readByte()
							parser.readByte()
							current = parser.readByte()

							textureCount = current >> 4 & 0xf
							normalCount = current >> 2 & 0x3
							colorCount = current >> 0 & 0x3
							break;
							
						default:
							for (let i = 0; i < 1 + 4 * ((current & 0xf) + 1); i++)
								parser.readByte()
							
							break
					}
					break
					
				default:
					break end
			}
		}
		
		return { matrix, presence, fields, format, scale, colorCount, normalCount, textureCount }
	}
	
	
	static readVertices(parser, polygon, descr, count)
	{
		let vertices = []
		
		for (let i = 0; i < count; i++)
		{
			if (descr.matrix.pos ||
				descr.matrix.tex0 || descr.matrix.tex1 || descr.matrix.tex2 || descr.matrix.tex3 ||
				descr.matrix.tex4 || descr.matrix.tex5 || descr.matrix.tex6 || descr.matrix.tex7)
				throw "brres: mdl0 unsupported vertex description matrix"
				
			switch (descr.presence.pos)
			{
				case 0:
					break
				case 1:
					throw "brres: mdl0 unsupported direct vertex presence"
				case 2:
					vertices.push(polygon.vertexGroup.vertices[parser.readByte()])
					break
				case 3:
					vertices.push(polygon.vertexGroup.vertices[parser.readUInt16()])
					break
			}
			
			switch (descr.presence.norm)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct normal presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.col0)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct col0 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.col1)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct col1 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex0)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex0 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex1)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex1 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex2)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex2 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex3)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex3 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex4)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex4 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex5)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex5 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex6)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex6 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
			
			switch (descr.presence.tex7)
			{
				case 0: break
				case 1: throw "brres: mdl0 unsupported direct tex7 presence"
				case 2: parser.readByte(); break
				case 3: parser.readUInt16(); break
			}
		}
		
		return vertices
	}
}


if (module)
	module.exports = { BrresLoader }