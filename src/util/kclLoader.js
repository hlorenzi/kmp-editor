const { BinaryParser } = require("./binaryParser.js")
const { ModelBuilder } = require("./modelBuilder.js")
const { Vec3 } = require("../math/vec3.js")


const cat = (isDeath, isInvis, isEffect, isWall, isItem) => { return { isDeath, isInvis, isEffect, isWall, isItem }}
const collisionTypeData =
[
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 1.0, 1.0, 1.0], priority: 0, name: "Road"                      },
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 0.9, 0.8, 1.0], priority: 0, name: "Slippery Road (sand/dirt)" },
	{ f: cat(0, 0, 0, 0, 0), c: [0.0, 0.8, 0.0, 1.0], priority: 0, name: "Weak Off-Road"             },
	{ f: cat(0, 0, 0, 0, 0), c: [0.0, 0.6, 0.0, 1.0], priority: 0, name: "Off-Road"                  },
	{ f: cat(0, 0, 0, 0, 0), c: [0.0, 0.4, 0.0, 1.0], priority: 0, name: "Heavy Off-Road"            },
	{ f: cat(0, 0, 0, 0, 0), c: [0.8, 0.9, 1.0, 1.0], priority: 0, name: "Slippery Road (ice)"       },
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 0.5, 0.0, 1.0], priority: 0, name: "Boost Panel"               },
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 0.6, 0.0, 1.0], priority: 0, name: "Boost Ramp"                },
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 0.8, 0.0, 1.0], priority: 0, name: "Slow Ramp"                 },
	{ f: cat(0, 0, 0, 0, 1), c: [0.9, 0.9, 1.0, 0.5], priority: 2, name: "Item Road"                 },
	{ f: cat(1, 0, 0, 0, 0), c: [0.7, 0.1, 0.1, 1.0], priority: 0, name: "Solid Fall"                },
	{ f: cat(0, 0, 0, 0, 0), c: [0.0, 0.5, 1.0, 1.0], priority: 0, name: "Moving Water"              },
	{ f: cat(0, 0, 0, 1, 0), c: [0.6, 0.6, 0.6, 1.0], priority: 0, name: "Wall"                      },
	{ f: cat(0, 1, 0, 1, 0), c: [0.0, 0.0, 0.6, 0.8], priority: 3, name: "Invisible Wall"            },
	{ f: cat(0, 0, 0, 0, 1), c: [0.6, 0.6, 0.7, 0.5], priority: 2, name: "Item Wall"                 },
	{ f: cat(0, 0, 0, 1, 0), c: [0.6, 0.6, 0.6, 1.0], priority: 0, name: "Wall 2"                    },
	{ f: cat(1, 0, 0, 0, 0), c: [0.8, 0.0, 0.0, 0.8], priority: 4, name: "Fall Boundary"             },
	{ f: cat(0, 0, 1, 0, 0), c: [1.0, 0.0, 0.5, 0.8], priority: 1, name: "Cannon Activator"          },
	{ f: cat(0, 0, 1, 0, 0), c: [0.5, 0.0, 1.0, 0.5], priority: 1, name: "Force Recalculation"       },
	{ f: cat(0, 0, 0, 0, 0), c: [0.0, 0.3, 1.0, 1.0], priority: 0, name: "Half-pipe Ramp"            },
	{ f: cat(0, 1, 0, 1, 0), c: [0.8, 0.4, 0.0, 0.8], priority: 1, name: "Player-Only Wall"          },
	{ f: cat(0, 0, 0, 0, 0), c: [0.9, 0.9, 1.0, 1.0], priority: 0, name: "Moving Road"               },
	{ f: cat(0, 0, 0, 0, 0), c: [0.9, 0.7, 1.0, 1.0], priority: 0, name: "Sticky Road"               },
	{ f: cat(0, 0, 0, 0, 0), c: [1.0, 1.0, 1.0, 1.0], priority: 0, name: "Road 2"                    },
	{ f: cat(0, 0, 1, 0, 0), c: [1.0, 0.0, 1.0, 0.8], priority: 1, name: "Sound Trigger"             },
	{ f: cat(0, 1, 0, 1, 0), c: [0.4, 0.6, 0.4, 0.8], priority: 1, name: "Weak Wall"                 },
	{ f: cat(0, 0, 1, 0, 0), c: [0.8, 0.0, 1.0, 0.8], priority: 1, name: "Effect Trigger"            },
	{ f: cat(0, 0, 1, 0, 0), c: [1.0, 0.0, 1.0, 0.5], priority: 1, name: "Item State Modifier"       },
	{ f: cat(0, 1, 0, 1, 0), c: [0.0, 0.6, 0.0, 0.8], priority: 3, name: "Half-pipe Invis Wall"      },
	{ f: cat(0, 0, 0, 0, 0), c: [0.9, 0.9, 1.0, 1.0], priority: 0, name: "Rotating Road"             },
	{ f: cat(0, 0, 0, 1, 0), c: [0.8, 0.7, 0.8, 1.0], priority: 0, name: "Special Wall"              },
	{ f: cat(0, 1, 0, 1, 0), c: [0.0, 0.0, 0.6, 0.8], priority: 3, name: "Invisible Wall 2"          },
]


class KclLoader
{
	static load(bytes, cfg, hl)
	{
		let parser = new BinaryParser(bytes)
		
		let section1Offset = parser.readUInt32()
		let section2Offset = parser.readUInt32()
		let section3Offset = parser.readUInt32()
		let section4Offset = parser.readUInt32()

		let triLists = [ [], [], [], [], [] ]
		
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
		{
			model.addTri(new Vec3(0, 0, 0), new Vec3(1, 0, 0), new Vec3(0, 1, 0))
			return model.calculateNormals()
		}

		let triIndex = -1;
		
		parser.seek(section3Offset + 0x10)
		while (parser.head < section4Offset)
		{
			triIndex++

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
			
			let isTargetFlag = 
				!(hl.baseType < 0 && hl.basicEffect < 0 && hl.blightEffect < 0 && hl.intensity < 0 && hl.collisionEffect < 0) &&
				(hl.baseType == -1 || flagBasicType == hl.baseType) &&
				(hl.basicEffect == -1 || ((collisionFlags >>> 5) & 0x7) == hl.basicEffect) &&
				(hl.blightEffect == -1 || ((collisionFlags >>> 8) & 0x7) == hl.blightEffect) &&
				(hl.intensity == -1 || ((collisionFlags >>> 11) & 0x3) == hl.intensity) &&
				(hl.collisionEffect == -1 || ((collisionFlags >>> 13) & 0x7) == hl.collisionEffect)

			if (isTargetFlag || (cfg.kclTriIndex[0] <= triIndex && cfg.kclTriIndex[1] >= triIndex))
			{
				let color = [1, 1, 0, 1]
				triLists[data.priority].push({ v1, v2, v3, color })
				continue
			}

			if (cfg && data.f.isWall && cfg.kclEnableWalls !== undefined && !cfg.kclEnableWalls)
				continue

			if (cfg && data.f.isDeath && cfg.kclEnableDeathBarriers !== undefined && !cfg.kclEnableDeathBarriers)
				continue
			
			if (cfg && data.f.isInvis && cfg.kclEnableInvisible !== undefined && !cfg.kclEnableInvisible)
				continue

			if (cfg && data.f.isItem && cfg.kclEnableItemRoad !== undefined && !cfg.kclEnableItemRoad)
				continue
			
			if (cfg && data.f.isEffect && cfg.kclEnableEffects !== undefined && !cfg.kclEnableEffects)
				continue
			
			let color = data.c
			if (cfg && cfg.kclEnableColors !== undefined && !cfg.kclEnableColors)
				color = [1, 1, 1, 1]

			if (cfg && cfg.kclHighlighter !== undefined)
			{
				let v1to2 = v2.sub(v1)
				let v1to3 = v3.sub(v1)
				let normal = v1to2.cross(v1to3).normalize()

				let highlighted = false
				switch (cfg.kclHighlighter)
				{
					case 1:
						highlighted = collisionFlags & 0x2000
						break

					case 2:
						highlighted = data.f.isWall && normal.dot(new Vec3(0, 0, 1)) > 0.9
						break

					case 3:
						highlighted = data.f.isWall && collisionFlags & 0x8000
						break
					
					case 6:
						highlighted = data.f.isWall && normal.dot(new Vec3(0, 0, 1)) > 0
						break
				}

				if (highlighted)
					color = [1.0, 1.0, 0.0, 1.0]
			}
			triLists[data.priority].push({ v1, v2, v3, color })
		}

		for (let lis of triLists)
			for (let tri of lis)
				model.addTri(tri.v1, tri.v2, tri.v3, tri.color, tri.color, tri.color)

		return model.calculateNormals()
	}
}


if (module)
	module.exports = { KclLoader, collisionTypeData }