const { BinaryParser } = require("./binaryParser.js")
const { BinaryWriter } = require("./binaryWriter.js")
const { Vec3 } = require("../math/vec3.js")


let unhandledSections = []


let sectionOrder =
[
	"KTPT",
	"ENPT",
	"ENPH",
	"ITPT",
	"ITPH",
	"CKPT",
	"CKPH",
	"GOBJ",
	"POTI",
	"AREA",
	"CAME",
	"JGPT",
	"CNPT",
	"MSPT",
	"STGI",
]


class KmpData
{
	static load(bytes)
	{
		let parser = new BinaryParser(bytes)
		
		if (parser.readAsciiLength(4) != "RKMD")
			throw "kmp: invalid magic number"
		
		let fileLenInBytes = parser.readUInt32()
		let sectionNum = parser.readUInt16()
		let headerLenInBytes = parser.readUInt16()
		parser.readUInt32()
		
		let sectionOffsets = []
		for (let i = 0; i < sectionNum; i++)
			sectionOffsets.push(parser.readUInt32())
		
		if (parser.head != headerLenInBytes)
			throw "kmp: invalid header length"
	
		let startPoints = []
		let finishPoints = []
		let enemyPoints = []
		let enemyPaths = []
		let itemPoints = []
		let itemPaths = []
		let checkpointPoints = []
		let checkpointPaths = []
		let objects = []
		let routes = []
		let areas = []
		let cameras = []
		let camHeader = 0
		let respawnPoints = []
		let cannonPoints = []
		let trackInfo = {}
		let unhandledSectionData = []
		
		for (let sectionOffset of sectionOffsets)
		{
			if (sectionOffset < 0 || sectionOffset + headerLenInBytes >= parser.getLength())
				continue
			
			parser.seek(sectionOffset + headerLenInBytes)
			
			let sectionId = parser.readAsciiLength(4)
			let entryNum = parser.readUInt16()
			let extraData = parser.readUInt16()
			
			//console.log("kmp: loading section at(" + sectionOffset + ") id(" + sectionId + ") entryNum(" + entryNum + ")")
			
			switch (sectionId)
			{
				case "KTPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let playerIndex = parser.readUInt16()
						parser.readUInt16()
						
						startPoints.push({ pos, rotation, playerIndex })
					}
					break
				}
				
				case "ENPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let size = parser.readFloat32()
						let setting1 = parser.readUInt16()
						let setting2 = parser.readByte()
						let setting3 = parser.readByte()
						
						enemyPoints.push({ pos, size, setting1, setting2, setting3 })
					}
					break
				}
				
				case "ENPH":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let startIndex = parser.readByte()
						let pointNum = parser.readByte()
						let prevGroups = parser.readBytes(6)
						let nextGroups = parser.readBytes(6)
						parser.readUInt16()
						
						enemyPaths.push({ startIndex, pointNum, prevGroups, nextGroups })
					}
					break
				}
				
				case "ITPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let size = parser.readFloat32()
						let setting1 = parser.readUInt16()
						let setting2 = parser.readUInt16()
						
						itemPoints.push({ pos, size, setting1, setting2 })
					}
					break
				}
				
				case "ITPH":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let startIndex = parser.readByte()
						let pointNum = parser.readByte()
						let prevGroups = parser.readBytes(6)
						let nextGroups = parser.readBytes(6)
						parser.readUInt16()
						
						itemPaths.push({ startIndex, pointNum, prevGroups, nextGroups })
					}
					break
				}
				
				case "CKPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let x1 = parser.readFloat32()
						let z1 = parser.readFloat32()
						let x2 = parser.readFloat32()
						let z2 = parser.readFloat32()
						let respawnIndex = parser.readByte()
						let type = parser.readByte()
						let prev = parser.readByte()
						let next = parser.readByte()
						
						checkpointPoints.push({ x1, z1, x2, z2, respawnIndex, type, prev, next })
					}
					break
				}
				
				case "CKPH":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let startIndex = parser.readByte()
						let pointNum = parser.readByte()
						let prevGroups = parser.readBytes(6)
						let nextGroups = parser.readBytes(6)
						parser.readUInt16()
						
						checkpointPaths.push({ startIndex, pointNum, prevGroups, nextGroups })
					}
					break
				}
				
				case "GOBJ":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let id = parser.readUInt16()
						parser.readUInt16()
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let scale = parser.readVec3()
						let routeIndex = parser.readUInt16()
						let settings = parser.readUInt16s(8)
						let presence = parser.readUInt16()
						
						objects.push({ id, pos, rotation, scale, routeIndex, settings, presence })
					}
					break
				}
				
				case "POTI":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let route = {}
						let pointNum = parser.readUInt16()
						route.points = []
						route.setting1 = parser.readByte()
						route.setting2 = parser.readByte()
						
						for (let j = 0; j < pointNum; j++)
						{
							let point = {}
							point.pos = parser.readVec3()
							point.setting1 = parser.readUInt16()
							point.setting2 = parser.readUInt16()
							
							route.points.push(point)
						}
						
						routes.push(route)
					}
					break
				}

				case "AREA":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let shape = parser.readByte()
						let type = parser.readByte()
						let cameraIndex = parser.readByte()
						let priority = parser.readByte()
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let scale = parser.readVec3()
						let setting1 = parser.readUInt16()
						let setting2 = parser.readUInt16()
						let routeIndex = parser.readByte()
						let enemyIndex = parser.readByte()
						parser.readUInt16()
						
						areas.push({ shape, type, cameraIndex, priority, pos, rotation, scale, setting1, setting2, routeIndex, enemyIndex })
					}
					break
				}

				case "CAME":
				{
					camHeader = extraData

					for (let i = 0; i < entryNum; i++)
					{
						let type = parser.readByte()
						let nextCam = parser.readByte()
						let shake = parser.readByte()
						let routeIndex = parser.readByte()
						let vCam = parser.readUInt16()
						let vZoom = parser.readUInt16()
						let vView = parser.readUInt16()
						let start = parser.readByte()
						let movie = parser.readByte()
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let zoomStart = parser.readFloat32()
						let zoomEnd = parser.readFloat32()
						let viewPosStart = parser.readVec3()
						let viewPosEnd = parser.readVec3()
						let time = parser.readFloat32()

						cameras.push({ type, nextCam, shake, routeIndex, vCam, vZoom, vView, start, movie, pos, rotation, zoomStart, zoomEnd, viewPosStart, viewPosEnd, time })
					}
					break
				}
				
				case "JGPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						parser.readUInt16()
						let size = parser.readUInt16()
						
						respawnPoints.push({ pos, rotation, size })
					}
					break
				}
				
				case "CNPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let id = parser.readUInt16()
						let effect = parser.readUInt16()
						
						cannonPoints.push({ pos, rotation, id, effect })
					}
					break
				}
				
				case "MSPT":
				{
					for (let i = 0; i < entryNum; i++)
					{
						let pos = parser.readVec3()
						let rotation = parser.readVec3()
						let id = parser.readUInt16()
						let unknown = parser.readUInt16()
						
						finishPoints.push({ pos, rotation, id, unknown })
					}
					break
				}
				
				case "STGI":
				{
					trackInfo.lapCount = parser.readByte()
					trackInfo.polePosition = parser.readByte()
					trackInfo.driverDistance = parser.readByte()
					trackInfo.lensFlareFlash = parser.readByte()
					trackInfo.unknown1 = parser.readByte()
					trackInfo.flareColor = parser.readBytes(4)
					trackInfo.unknown2 = parser.readByte()
					trackInfo.speedMod = parser.readFloat32MSB2()
					break
				}
				
				default:
				{
					let unhandledSection = unhandledSections.find(s => s.id == sectionId)
					if (unhandledSection == null)
						throw ("kmp: section not handled: " + sectionId)
					
					let bytes = []
					for (let i = 0; i < entryNum; i++)
						for (let j = 0; j < unhandledSection.entryLen; j++)
							bytes.push(parser.readByte())
						
					unhandledSectionData.push({ id: sectionId, extraData, bytes })
					break
				}
			}
		}
		
		return {
			unhandledSectionData,
			startPoints, finishPoints,
			enemyPoints, enemyPaths,
			itemPoints, itemPaths,
			checkpointPoints, checkpointPaths,
			objects, routes, areas, cannonPoints,
			trackInfo, cameras, camHeader,
			respawnPoints
		}
	}
	
	
	static convertToWorkingFormat(loadedKmp)
	{
		let data = new KmpData()
		data.trackInfo = loadedKmp.trackInfo
		data.unhandledSectionData = loadedKmp.unhandledSectionData
		
		for (let i = 0; i < loadedKmp.startPoints.length; i++)
		{
			let kmpPoint = loadedKmp.startPoints[i]
			
			let node = data.startPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.rotation = new Vec3(kmpPoint.rotation.x, kmpPoint.rotation.y, kmpPoint.rotation.z)
			node.playerIndex = kmpPoint.playerIndex
		}
		
		for (let i = 0; i < loadedKmp.finishPoints.length; i++)
		{
			let kmpPoint = loadedKmp.finishPoints[i]
			
			let node = data.finishPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.rotation = new Vec3(kmpPoint.rotation.x, kmpPoint.rotation.y, kmpPoint.rotation.z)
			node.id = kmpPoint.id
			node.unknown = kmpPoint.unknown
		}
		
		for (let i = 0; i < loadedKmp.enemyPoints.length; i++)
		{
			let kmpPoint = loadedKmp.enemyPoints[i]
			
			let node = data.enemyPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.size = kmpPoint.size
			node.setting1 = kmpPoint.setting1
			node.setting2 = kmpPoint.setting2
			node.setting3 = kmpPoint.setting3
		}
		
		for (let i = 0; i < loadedKmp.enemyPaths.length; i++)
		{
			let kmpPath = loadedKmp.enemyPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
			{
				data.enemyPoints.linkNodes(data.enemyPoints.nodes[p], data.enemyPoints.nodes[p + 1])
				data.enemyPoints.nodes[p].pathIndex = i
				data.enemyPoints.nodes[p + 1].pathIndex = i
			}
			
			const emptyPrevGroups = kmpPath.prevGroups.find(g => g != 0xff && g < loadedKmp.enemyPaths.length) == null
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < loadedKmp.enemyPaths.length)
				{
					const nextComesBackToThis = loadedKmp.enemyPaths[kmpPath.nextGroups[j]].nextGroups.find(g => g == i) != null
					const nextIsBattleDispatch = kmpPath.nextGroups[j] > i && loadedKmp.enemyPaths[kmpPath.nextGroups[j]].prevGroups.find(g => g != 0xff && g < loadedKmp.enemyPaths.length) == null
					
					if (!emptyPrevGroups || (!nextComesBackToThis || nextIsBattleDispatch))
					{
						let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
						let nextPoint = loadedKmp.enemyPaths[kmpPath.nextGroups[j]].startIndex
						
						data.enemyPoints.linkNodes(data.enemyPoints.nodes[lastPoint], data.enemyPoints.nodes[nextPoint])
						data.enemyPoints.nodes[lastPoint].pathIndex = i
						data.enemyPoints.nodes[nextPoint].pathIndex = kmpPath.nextGroups[j]
					}
				}
			}
		}
		
		for (let i = 0; i < loadedKmp.itemPoints.length; i++)
		{
			let kmpPoint = loadedKmp.itemPoints[i]
			
			let node = data.itemPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.size = kmpPoint.size
			node.setting1 = kmpPoint.setting1
			node.setting2 = kmpPoint.setting2
		}
		
		for (let i = 0; i < loadedKmp.itemPaths.length; i++)
		{
			let kmpPath = loadedKmp.itemPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
				data.itemPoints.linkNodes(data.itemPoints.nodes[p], data.itemPoints.nodes[p + 1])
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < loadedKmp.itemPaths.length)
				{
					let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
					let nextPoint = loadedKmp.itemPaths[kmpPath.nextGroups[j]].startIndex
					
					data.itemPoints.linkNodes(data.itemPoints.nodes[lastPoint], data.itemPoints.nodes[nextPoint])
				}
			}
		}
		
		for (let i = 0; i < loadedKmp.checkpointPoints.length; i++)
		{
			let kmpPoint = loadedKmp.checkpointPoints[i]
			
			let node = data.checkpointPoints.addNode()
			node.pos = [new Vec3(kmpPoint.x1, -kmpPoint.z1, 0), new Vec3(kmpPoint.x2, -kmpPoint.z2, 0)]
			node.type = kmpPoint.type
			node.respawnNode = null
			node.firstInPath = false
			node.isRendered = true
		}

		for (let i = 0; i < loadedKmp.checkpointPaths.length; i++)
		{
			let kmpPath = loadedKmp.checkpointPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
				data.checkpointPoints.linkNodes(data.checkpointPoints.nodes[p], data.checkpointPoints.nodes[p + 1])

			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < loadedKmp.checkpointPaths.length)
				{
					let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
					let nextPoint = loadedKmp.checkpointPaths[kmpPath.nextGroups[j]].startIndex
					
					data.checkpointPoints.linkNodes(data.checkpointPoints.nodes[lastPoint], data.checkpointPoints.nodes[nextPoint])
				}
			}
			
			data.checkpointPoints.nodes[kmpPath.startIndex].firstInPath = true
		}
		
		for (let i = 0; i < loadedKmp.objects.length; i++)
		{
			let kmpObj = loadedKmp.objects[i]
			
			let node = data.objects.addNode()
			node.pos = new Vec3(kmpObj.pos.x, -kmpObj.pos.z, -kmpObj.pos.y)
			node.rotation = new Vec3(kmpObj.rotation.x, kmpObj.rotation.y, kmpObj.rotation.z)
			node.scale = new Vec3(kmpObj.scale.x, kmpObj.scale.z, kmpObj.scale.y)
			node.id = kmpObj.id
			node.route = null
			node.routeIndex = kmpObj.routeIndex
			node.settings = kmpObj.settings
			node.presence = kmpObj.presence
		}
		
		for (let i = 0; i < loadedKmp.routes.length; i++)
		{
			let kmpRoute = loadedKmp.routes[i]
			
			let route = data.addNewRoute()
			route.setting1 = kmpRoute.setting1
			route.setting2 = kmpRoute.setting2
			
			let lastNode = null
			
			for (let kmpPoint of kmpRoute.points)
			{
				let node = route.points.addNode()
				node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
				node.setting1 = kmpPoint.setting1
				node.setting2 = kmpPoint.setting2
				
				if (lastNode != null)
					route.points.linkNodes(lastNode, node)
				
				lastNode = node
			}
		}
		
		for (let i = 0; i < loadedKmp.respawnPoints.length; i++)
		{
			let kmpPoint = loadedKmp.respawnPoints[i]
			
			let node = data.respawnPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.rotation = new Vec3(kmpPoint.rotation.x, kmpPoint.rotation.y, kmpPoint.rotation.z)
			node.size = kmpPoint.size
		}
		
		for (let i = 0; i < loadedKmp.cannonPoints.length; i++)
		{
			let kmpPoint = loadedKmp.cannonPoints[i]
			
			let node = data.cannonPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.rotation = new Vec3(kmpPoint.rotation.x, kmpPoint.rotation.y, kmpPoint.rotation.z)
			node.id = kmpPoint.id
			node.effect = kmpPoint.effect == 0xffff ? 0 : kmpPoint.effect
		}
		
		for (let i = 0; i < loadedKmp.checkpointPoints.length; i++)
		{
			let respawnIndex = loadedKmp.checkpointPoints[i].respawnIndex
			
			if (respawnIndex >= 0 && respawnIndex < data.respawnPoints.nodes.length)
				data.checkpointPoints.nodes[i].respawnNode = data.respawnPoints.nodes[respawnIndex]
		}
		
		for (let i = 0; i < loadedKmp.areas.length; i++)
		{
			let kmpArea = loadedKmp.areas[i]
			
			let node = data.areaPoints.addNode()
			node.pos = new Vec3(kmpArea.pos.x, -kmpArea.pos.z, -kmpArea.pos.y)
			node.rotation = new Vec3(kmpArea.rotation.x, kmpArea.rotation.y, kmpArea.rotation.z)
			node.scale = new Vec3(kmpArea.scale.x, kmpArea.scale.z, kmpArea.scale.y)
			node.shape = kmpArea.shape
			node.type = kmpArea.type
			node.priority = kmpArea.priority
			node.setting1 = kmpArea.setting1
			node.setting2 = kmpArea.setting2
			node.cameraIndex = kmpArea.cameraIndex
			node.routeIndex = kmpArea.routeIndex
			node.enemyIndex = kmpArea.enemyIndex
		}

		data.firstIntroCam = (loadedKmp.camHeader & 0xff00) >>> 8
		data.firstSelectionCam = loadedKmp.camHeader & 0xff
		
		for (let i = 0; i < loadedKmp.cameras.length; i++)
		{
			let kmpCam = loadedKmp.cameras[i]

			let node = data.cameras.addNode()
			node.pos = new Vec3(kmpCam.pos.x, -kmpCam.pos.z, -kmpCam.pos.y)
			node.rotation = new Vec3(kmpCam.rotation.x, kmpCam.rotation.y, kmpCam.rotation.z)
			node.type = kmpCam.type
			node.nextCam = kmpCam.nextCam
			node.shake = kmpCam.shake
			node.routeIndex = kmpCam.routeIndex
			node.vCam = kmpCam.vCam
			node.vZoom = kmpCam.vZoom
			node.vView = kmpCam.vView
			node.start = kmpCam.start
			node.movie = kmpCam.movie
			node.zoomStart = kmpCam.zoomStart
			node.zoomEnd = kmpCam.zoomEnd
			node.viewPosStart = new Vec3(kmpCam.viewPosStart.x, -kmpCam.viewPosStart.z, -kmpCam.viewPosStart.y)
			node.viewPosEnd = new Vec3(kmpCam.viewPosEnd.x, -kmpCam.viewPosEnd.z, -kmpCam.viewPosEnd.y)
			node.time = kmpCam.time
		}
		

		data.isBattleTrack = loadedKmp.itemPaths.length == 0 && loadedKmp.checkpointPaths.length == 0 && loadedKmp.finishPoints.length > 0
		
		return data
	}
	
	
	convertToStorageFormat(asBattle = false)
	{
		let w = new BinaryWriter()
		
		let sectionNum = 15
		
		w.writeAscii("RKMD")
		
		let fileLenAddr = w.head
		w.writeUInt32(0)
		
		w.writeUInt16(sectionNum)
		
		let headerLenAddr = w.head
		w.writeUInt16(0)
		
		w.writeUInt32(0x9d8)
		
		let sectionOffsetsAddr = w.head
		for (let i = 0; i < sectionNum; i++)
			w.writeUInt32(0xffffffff)
		
		let headerEndAddr = w.head
		w.seek(headerLenAddr)
		w.writeUInt16(headerEndAddr)
		w.seek(headerEndAddr)
		
		let writeUnhandledSection = (tag) =>
		{
			let unhandledSection = this.unhandledSectionData.find(s => s.id == tag)
			if (unhandledSection == null)
			{
				unhandledSection =
				{
					id: tag,
					bytes: [],
					extraData: 0
				}
			}
			
			let unhandledSectionProperties = unhandledSections.find(s => s.id == tag)
			let order = sectionOrder.findIndex(s => s == tag)
			
			let head = w.head
			w.seek(sectionOffsetsAddr + order * 4)
			w.writeUInt32(head - headerEndAddr)
			
			w.seek(head)
			w.writeAscii(unhandledSection.id)
			w.writeUInt16(unhandledSection.bytes.length / unhandledSectionProperties.entryLen)
			w.writeUInt16(unhandledSection.extraData)
			w.writeBytes(unhandledSection.bytes)
		}
		
		// Write KTPT
		let sectionKtptAddr = w.head
		let sectionKtptOrder = sectionOrder.findIndex(s => s == "KTPT")
		w.seek(sectionOffsetsAddr + sectionKtptOrder * 4)
		w.writeUInt32(sectionKtptAddr - headerEndAddr)
		
		w.seek(sectionKtptAddr)
		w.writeAscii("KTPT")
		w.writeUInt16(this.startPoints.nodes.length)
		w.writeUInt16(0)
		for (let p of this.startPoints.nodes)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.rotation.x)
			w.writeFloat32(p.rotation.y)
			w.writeFloat32(p.rotation.z)
			w.writeUInt16(p.playerIndex)
			w.writeUInt16(0)
		}
		
		// Prepare enemy points
		let enemyPaths = this.enemyPoints.convertToStorageFormat(asBattle)
		let enemyPoints = []
		enemyPaths.forEach(path => path.nodes.forEach(node => enemyPoints.push(node)))
		
		if (enemyPaths.length >= 0xff)
			throw "kmp encode: max enemy path number surpassed (have " + enemyPaths.length + ", max 254)"
		
		if (enemyPoints.length > 0xff)
			throw "kmp encode: max enemy point number surpassed (have " + enemyPoints.length + ", max 255)"
		
		// Write ENPT
		let sectionEnptAddr = w.head
		let sectionEnptOrder = sectionOrder.findIndex(s => s == "ENPT")
		w.seek(sectionOffsetsAddr + sectionEnptOrder * 4)
		w.writeUInt32(sectionEnptAddr - headerEndAddr)
		
		w.seek(sectionEnptAddr)
		w.writeAscii("ENPT")
		w.writeUInt16(enemyPoints.length)
		w.writeUInt16(0)
		for (let p of enemyPoints)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.size)
			w.writeUInt16(p.setting1)
			w.writeByte(p.setting2)
			w.writeByte(p.setting3)
		}
		
		// Write ENPH
		let sectionEnphAddr = w.head
		let sectionEnphOrder = sectionOrder.findIndex(s => s == "ENPH")
		w.seek(sectionOffsetsAddr + sectionEnphOrder * 4)
		w.writeUInt32(sectionEnphAddr - headerEndAddr)
		
		w.seek(sectionEnphAddr)
		w.writeAscii("ENPH")
		w.writeUInt16(enemyPaths.length)
		w.writeUInt16(0)
		for (let path of enemyPaths)
		{
			if (path.nodes.length > 0xff)
				throw "kmp encode: max enemy point number in a path surpassed (have " + path.nodes.length + ", max 255)"
			
			w.writeByte(enemyPoints.findIndex(n => n == path.nodes[0]))
			w.writeByte(path.nodes.length)
			
			let incomingPaths = path.prev.reduce((accum, p) => accum + 1, 0)
			let outgoingPaths = path.next.reduce((accum, p) => accum + 1, 0)
			
			if (incomingPaths > 6)
				throw "kmp encode: max incoming connections to an enemy point surpassed (have " + incomingPaths + ", max 6)"
			
			if (outgoingPaths > 6)
				throw "kmp encode: max outgoing connections to an enemy point surpassed (have " + outgoingPaths + ", max 6)"
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.prev.length)
					w.writeByte(enemyPaths.findIndex(p => p == path.prev[i]))
				else
					w.writeByte(0xff)
			}
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.next.length)
					w.writeByte(enemyPaths.findIndex(p => p == path.next[i]))
				else
					w.writeByte(0xff)
			}
			
			w.writeUInt16(0)
		}
		
		// Prepare item points
		let itemPaths = this.itemPoints.convertToStorageFormat()
		let itemPoints = []
		itemPaths.forEach(path => path.nodes.forEach(node => itemPoints.push(node)))
		
		if (itemPaths.length >= 0xff)
			throw "kmp encode: max item path number surpassed (have " + itemPaths.length + ", max 254)"
		
		if (itemPoints.length > 0xff)
			throw "kmp encode: max item point number surpassed (have " + itemPoints.length + ", max 255)"
		
		// Write ITPT
		let sectionItptAddr = w.head
		let sectionItptOrder = sectionOrder.findIndex(s => s == "ITPT")
		w.seek(sectionOffsetsAddr + sectionItptOrder * 4)
		w.writeUInt32(sectionItptAddr - headerEndAddr)
		
		w.seek(sectionItptAddr)
		w.writeAscii("ITPT")
		w.writeUInt16(itemPoints.length)
		w.writeUInt16(0)
		for (let p of itemPoints)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.size)
			w.writeUInt16(p.setting1)
			w.writeUInt16(p.setting2)
		}
		
		// Write ITPH
		let sectionItphAddr = w.head
		let sectionItphOrder = sectionOrder.findIndex(s => s == "ITPH")
		w.seek(sectionOffsetsAddr + sectionItphOrder * 4)
		w.writeUInt32(sectionItphAddr - headerEndAddr)
		
		w.seek(sectionItphAddr)
		w.writeAscii("ITPH")
		w.writeUInt16(itemPaths.length)
		w.writeUInt16(0)
		for (let path of itemPaths)
		{
			if (path.nodes.length > 0xff)
				throw "kmp encode: max item point number in a path surpassed (have " + path.nodes.length + ", max 255)"
			
			w.writeByte(itemPoints.findIndex(n => n == path.nodes[0]))
			w.writeByte(path.nodes.length)
			
			let incomingPaths = path.prev.reduce((accum, p) => accum + 1, 0)
			let outgoingPaths = path.next.reduce((accum, p) => accum + 1, 0)
			
			if (incomingPaths > 6)
				throw "kmp encode: max incoming connections to an item point surpassed (have " + incomingPaths + ", max 6)"
			
			if (outgoingPaths > 6)
				throw "kmp encode: max outgoing connections to an item point surpassed (have " + outgoingPaths + ", max 6)"
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.prev.length)
					w.writeByte(itemPaths.findIndex(p => p == path.prev[i]))
				else
					w.writeByte(0xff)
			}
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.next.length)
					w.writeByte(itemPaths.findIndex(p => p == path.next[i]))
				else
					w.writeByte(0xff)
			}
			
			w.writeUInt16(0)
		}
						
		// Prepare checkpoints
		let checkpointPaths = this.checkpointPoints.convertToStorageFormat()
		let checkpointPoints = []
		checkpointPaths.forEach(path => path.nodes.forEach(node => checkpointPoints.push(node)))
		
		if (checkpointPaths.length >= 0xff)
			throw "kmp encode: max checkpoint path number surpassed (have " + checkpointPaths.length + ", max 254)"
		
		if (checkpointPoints.length > 0xff)
			throw "kmp encode: max checkpoint point number surpassed (have " + checkpointPoints.length + ", max 255)"
		
		// Write CKPT
		let sectionCkptAddr = w.head
		let sectionCkptOrder = sectionOrder.findIndex(s => s == "CKPT")
		w.seek(sectionOffsetsAddr + sectionCkptOrder * 4)
		w.writeUInt32(sectionCkptAddr - headerEndAddr)
		
		w.seek(sectionCkptAddr)
		w.writeAscii("CKPT")
		w.writeUInt16(checkpointPoints.length)
		w.writeUInt16(0)
		for (let i = 0; i < checkpointPoints.length; i++)
		{
			let p = checkpointPoints[i]
			
			w.writeFloat32(p.pos[0].x)
			w.writeFloat32(-p.pos[0].y)
			w.writeFloat32(p.pos[1].x)
			w.writeFloat32(-p.pos[1].y)
			
			let respawnIndex = this.respawnPoints.nodes.findIndex(p2 => p.respawnNode === p2)
			if (respawnIndex == -1)
				respawnIndex = 0
			
			w.writeByte(respawnIndex)
			w.writeByte(p.type)
			
			let path = checkpointPaths.find(pth => pth.nodes.find(p2 => p === p2) != null)
			let indexInPath = path.nodes.findIndex(p2 => p === p2)
			
			w.writeByte(indexInPath > 0 ? (i - 1) : 0xff)
			w.writeByte(indexInPath < path.nodes.length - 1 ? (i + 1) : 0xff)
		}
		
		// Write CKPH
		let sectionCkphAddr = w.head
		let sectionCkphOrder = sectionOrder.findIndex(s => s == "CKPH")
		w.seek(sectionOffsetsAddr + sectionCkphOrder * 4)
		w.writeUInt32(sectionCkphAddr - headerEndAddr)
		
		w.seek(sectionCkphAddr)
		w.writeAscii("CKPH")
		w.writeUInt16(checkpointPaths.length)
		w.writeUInt16(0)
		for (let path of checkpointPaths)
		{
			if (path.nodes.length > 0xff)
				throw "kmp encode: max checkpoint point number in a path surpassed (have " + path.nodes.length + ", max 255)"
			
			w.writeByte(checkpointPoints.findIndex(n => n == path.nodes[0]))
			w.writeByte(path.nodes.length)
			
			let incomingPaths = path.prev.reduce((accum, p) => accum + 1, 0)
			let outgoingPaths = path.next.reduce((accum, p) => accum + 1, 0)
			
			if (incomingPaths > 6)
				throw "kmp encode: max incoming connections to an checkpoint point surpassed (have " + incomingPaths + ", max 6)"
			
			if (outgoingPaths > 6)
				throw "kmp encode: max outgoing connections to an checkpoint point surpassed (have " + outgoingPaths + ", max 6)"
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.prev.length)
					w.writeByte(checkpointPaths.findIndex(p => p == path.prev[i]))
				else
					w.writeByte(0xff)
			}
			
			for (let i = 0; i < 6; i++)
			{
				if (i < path.next.length)
					w.writeByte(checkpointPaths.findIndex(p => p == path.next[i]))
				else
					w.writeByte(0xff)
			}
			
			w.writeUInt16(0)
		}
		
		// Write GOBJ
		let sectionGobjAddr = w.head
		let sectionGobjOrder = sectionOrder.findIndex(s => s == "GOBJ")
		w.seek(sectionOffsetsAddr + sectionGobjOrder * 4)
		w.writeUInt32(sectionGobjAddr - headerEndAddr)
		
		w.seek(sectionGobjAddr)
		w.writeAscii("GOBJ")
		w.writeUInt16(this.objects.nodes.length)
		w.writeUInt16(0)
		for (let i = 0; i < this.objects.nodes.length; i++)
		{
			let obj = this.objects.nodes[i]
			
			w.writeUInt16(obj.id)
			w.writeUInt16(0)
			w.writeFloat32(obj.pos.x)
			w.writeFloat32(-obj.pos.z)
			w.writeFloat32(-obj.pos.y)
			w.writeFloat32(obj.rotation.x)
			w.writeFloat32(obj.rotation.y)
			w.writeFloat32(obj.rotation.z)
			w.writeFloat32(obj.scale.x)
			w.writeFloat32(obj.scale.z)
			w.writeFloat32(obj.scale.y)
			w.writeUInt16(obj.routeIndex)
			for (let s = 0; s < 8; s++)
				w.writeUInt16(obj.settings[s])
			
			w.writeUInt16(obj.presence)
		}
		
		// Write POTI
		let sectionPotiAddr = w.head
		let sectionPotiOrder = sectionOrder.findIndex(s => s == "POTI")
		w.seek(sectionOffsetsAddr + sectionPotiOrder * 4)
		w.writeUInt32(sectionPotiAddr - headerEndAddr)
		
		w.seek(sectionPotiAddr)
		w.writeAscii("POTI")
		w.writeUInt16(this.routes.length)
		w.writeUInt16(this.routes.reduce((accum, route) => accum + route.points.nodes.length, 0))
		for (let route of this.routes)
		{
			// Prepare route points
			let routePaths = route.points.convertToStorageFormat()
			let routePoints = []
			routePaths.forEach(path => path.nodes.forEach(node => routePoints.push(node)))
			
			if (routePoints.length > 0xffff)
				throw "kmp encode: max route point number surpassed (have " + routePoints.length + ", max 65535)"
			
			w.writeUInt16(routePoints.length)
			w.writeByte(route.setting1)
			w.writeByte(route.setting2)
			
			for (let point of routePoints)
			{
				w.writeVec3(new Vec3(point.pos.x, -point.pos.z, -point.pos.y))
				w.writeUInt16(point.setting1)
				w.writeUInt16(point.setting2)
			}
		}
		
		// Write AREA
		let sectionAreaAddr = w.head
		let sectionAreaOrder = sectionOrder.findIndex(s => s == "AREA")
		w.seek(sectionOffsetsAddr + sectionAreaOrder * 4)
		w.writeUInt32(sectionAreaAddr - headerEndAddr)
		
		w.seek(sectionAreaAddr)
		w.writeAscii("AREA")
		w.writeUInt16(this.areaPoints.nodes.length)
		w.writeUInt16(0)
		for (let i = 0; i < this.areaPoints.nodes.length; i++)
		{
			let area = this.areaPoints.nodes[i]
			
			w.writeByte(area.shape)
			w.writeByte(area.type)
			w.writeByte(area.type == 0 ? area.cameraIndex : 0xff)
			w.writeByte(area.priority)
			w.writeFloat32(area.pos.x)
			w.writeFloat32(-area.pos.z)
			w.writeFloat32(-area.pos.y)
			w.writeFloat32(area.rotation.x)
			w.writeFloat32(area.rotation.y)
			w.writeFloat32(area.rotation.z)
			w.writeFloat32(area.scale.x)
			w.writeFloat32(area.scale.z)
			w.writeFloat32(area.scale.y)
			w.writeUInt16(area.setting1)
			w.writeUInt16(area.setting2)
			w.writeByte(area.routeIndex)
			w.writeByte(area.type == 4 ? area.enemyIndex : 0xff)
			w.writeUInt16(0)
		}
		
		// Write CAME
		let sectionCameAddr = w.head
		let sectionCameOrder = sectionOrder.findIndex(s => s == "CAME")
		w.seek(sectionOffsetsAddr + sectionCameOrder * 4)
		w.writeUInt32(sectionCameAddr - headerEndAddr)
		
		w.seek(sectionCameAddr)
		w.writeAscii("CAME")
		w.writeUInt16(this.cameras.nodes.length)
		w.writeByte(this.firstIntroCam)
		w.writeByte(this.firstSelectionCam)
		for (let i = 0; i < this.cameras.nodes.length; i++)
		{
			let cam = this.cameras.nodes[i]
			
			w.writeByte(cam.type)
			w.writeByte(cam.nextCam)
			w.writeByte(cam.shake)
			w.writeByte(cam.routeIndex)
			w.writeUInt16(cam.vCam)
			w.writeUInt16(cam.vZoom)
			w.writeUInt16(cam.vView)
			w.writeByte(cam.start)
			w.writeByte(cam.movie)
			w.writeFloat32(cam.pos.x)
			w.writeFloat32(-cam.pos.z)
			w.writeFloat32(-cam.pos.y)
			w.writeFloat32(cam.rotation.x)
			w.writeFloat32(cam.rotation.y)
			w.writeFloat32(cam.rotation.z)
			w.writeFloat32(cam.zoomStart)
			w.writeFloat32(cam.zoomEnd)
			w.writeFloat32(cam.viewPosStart.x)
			w.writeFloat32(-cam.viewPosStart.z)
			w.writeFloat32(-cam.viewPosStart.y)
			w.writeFloat32(cam.viewPosEnd.x)
			w.writeFloat32(-cam.viewPosEnd.z)
			w.writeFloat32(-cam.viewPosEnd.y)
			w.writeFloat32(cam.time)
		}
		
		// Write JGPT
		let sectionJgptAddr = w.head
		let sectionJgptOrder = sectionOrder.findIndex(s => s == "JGPT")
		w.seek(sectionOffsetsAddr + sectionJgptOrder * 4)
		w.writeUInt32(sectionJgptAddr - headerEndAddr)
		
		w.seek(sectionJgptAddr)
		w.writeAscii("JGPT")
		w.writeUInt16(this.respawnPoints.nodes.length)
		w.writeUInt16(0)
		for (let i = 0; i < this.respawnPoints.nodes.length; i++)
		{
			let p = this.respawnPoints.nodes[i]
			
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.rotation.x)
			w.writeFloat32(p.rotation.y)
			w.writeFloat32(p.rotation.z)
			w.writeUInt16(i)
			w.writeUInt16(p.size)
		}
		
		// Write CNPT
		let sectionCnptAddr = w.head
		let sectionCnptOrder = sectionOrder.findIndex(s => s == "CNPT")
		w.seek(sectionOffsetsAddr + sectionCnptOrder * 4)
		w.writeUInt32(sectionCnptAddr - headerEndAddr)
		
		w.seek(sectionCnptAddr)
		w.writeAscii("CNPT")
		w.writeUInt16(this.cannonPoints.nodes.length)
		w.writeUInt16(0)
		for (let p of this.cannonPoints.nodes)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.rotation.x)
			w.writeFloat32(p.rotation.y)
			w.writeFloat32(p.rotation.z)
			w.writeUInt16(p.id)
			w.writeUInt16(p.effect)
		}
		
		// Write MSPT
		let sectionMsptAddr = w.head
		let sectionMsptOrder = sectionOrder.findIndex(s => s == "MSPT")
		w.seek(sectionOffsetsAddr + sectionMsptOrder * 4)
		w.writeUInt32(sectionMsptAddr - headerEndAddr)
		
		w.seek(sectionMsptAddr)
		w.writeAscii("MSPT")
		w.writeUInt16(this.finishPoints.nodes.length)
		w.writeUInt16(0)
		for (let p of this.finishPoints.nodes)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.rotation.x)
			w.writeFloat32(p.rotation.y)
			w.writeFloat32(p.rotation.z)
			w.writeUInt16(p.id)
			w.writeUInt16(p.unknown)
		}
		
		// Write STGI
		let sectionStgiAddr = w.head
		let sectionStgiOrder = sectionOrder.findIndex(s => s == "STGI")
		w.seek(sectionOffsetsAddr + sectionStgiOrder * 4)
		w.writeUInt32(sectionStgiAddr - headerEndAddr)
		
		w.seek(sectionStgiAddr)
		w.writeAscii("STGI")
		w.writeUInt16(1)
		w.writeUInt16(0)
		w.writeByte(this.trackInfo.lapCount)
		w.writeByte(this.trackInfo.polePosition)
		w.writeByte(this.trackInfo.driverDistance)
		w.writeByte(this.trackInfo.lensFlareFlash)
		w.writeByte(this.trackInfo.unknown1)
		w.writeBytes(this.trackInfo.flareColor)
		w.writeByte(this.trackInfo.unknown2)
		w.writeFloat32MSB2(this.trackInfo.speedMod)
		
		// Write file length
		w.seek(fileLenAddr)
		w.writeUInt32(w.getLength())
		
		return w.getBytes()
	}
	
	
	constructor()
	{
		this.unhandledSectionData = []
		
		this.startPoints = new NodeGraph()
		this.startPoints.maxNodes = 12
		this.startPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.playerIndex = 0xffff
		}
		this.startPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.playerIndex = oldNode.playerIndex
		}
		
		this.routes = []
		
		this.enemyPoints = new NodeGraph()
		this.enemyPoints.maxNextNodes = 6
		this.enemyPoints.maxPrevNodes = 6
		this.enemyPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.size = 10
			node.setting1 = 0
			node.setting2 = 0
			node.setting3 = 0
		}
		this.enemyPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.size = oldNode.size
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
			newNode.setting3 = oldNode.setting3
		}
		
		this.itemPoints = new NodeGraph()
		this.itemPoints.maxNextNodes = 6
		this.itemPoints.maxPrevNodes = 6
		this.itemPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.size = 10
			node.setting1 = 0
			node.setting2 = 0
		}
		this.itemPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.size = oldNode.size
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
		}
		
		this.objects = new NodeGraph()
		this.objects.maxNodes = 9999
		this.objects.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.scale = new Vec3(1, 1, 1)
			node.id = 0
			node.route = null
			node.routeIndex = 0xffff
			node.settings = [0, 0, 0, 0, 0, 0, 0, 0]
			node.presence = 7
		}
		this.objects.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.scale = oldNode.scale.clone()
			newNode.id = oldNode.id
			newNode.route = oldNode.route
			newNode.routeIndex = oldNode.routeIndex
			newNode.settings = []
			for (let i = 0; i < 8; i++) newNode.settings[i] = oldNode.settings[i]
			newNode.presence = oldNode.presence
		}
		
		this.checkpointPoints = new NodeGraph()
		this.checkpointPoints.maxNextNodes = 6
		this.checkpointPoints.maxPrevNodes = 6
		this.checkpointPoints.onAddNode = (node) =>
		{
			node.pos = [new Vec3(0, 0, 0), new Vec3(0, 0, 0)]
			node.respawnNode = null
			node.respawnIndex = 0
			node.type = 0xff
			node.firstInPath = false
			node.isRendered = true
		}
		this.checkpointPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = [oldNode.pos[0].clone(), oldNode.pos[1].clone()]
			newNode.respawnNode = oldNode.respawnNode
			newNode.respawnIndex = oldNode.respawnIndex
			newNode.type = oldNode.type
			newNode.firstInPath = oldNode.firstInPath
			newNode.isRendered = oldNode.isRendered
		}
		this.checkpointPoints.findFirstNode = (nodes) =>
		{
			return nodes.find(n => n.type == 0)
		}
		
		this.respawnPoints = new NodeGraph()
		this.respawnPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.size = 0xffff
		}
		this.respawnPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.size = oldNode.size
		}
		
		this.cannonPoints = new NodeGraph()
		this.cannonPoints.maxNodes = 8
		this.cannonPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.id = 0
			node.effect = 0xffff
		}
		this.cannonPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.id = oldNode.id
			newNode.effect = oldNode.effect
		}
		
		this.finishPoints = new NodeGraph()
		this.finishPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.id = 0
			node.unknown = 0xffff
		}
		this.finishPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.id = oldNode.id
			newNode.unknown = oldNode.unknown
		}

		this.areaPoints = new NodeGraph()
		this.areaPoints.enableCOOB = false
		this.areaPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.scale = new Vec3(1, 1, 1)
			node.shape = 0
			node.type = 0
			node.priority = 0
			node.setting1 = 0
			node.setting2 = 0
			node.cameraIndex = 0xff
			node.routeIndex = 0xff
			node.enemyIndex = 0xff
			node.isRendered = false
		}
		this.areaPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.scale = oldNode.scale.clone()
			newNode.shape = oldNode.shape
			newNode.type = oldNode.type
			newNode.priority = oldNode.priority
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
			newNode.cameraIndex = oldNode.cameraIndex
			newNode.routeIndex = oldNode.routeIndex
			newNode.enemyIndex = oldNode.enemyIndex
			newNode.isRendered = oldNode.isRendered
		}

		this.cameras = new NodeGraph()
		this.firstIntroCam = 0
		this.firstSelectionCam = 0
		this.cameras.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.type = 0
			node.nextCam = 0
			node.shake = 0
			node.routeIndex = 0xff
			node.vCam = 0
			node.vZoom = 0
			node.vView = 0
			node.start = 0
			node.movie = 0
			node.zoomStart = 0
			node.zoomEnd = 0
			node.viewPosStart = new Vec3(0, 0, 0)
			node.viewPosEnd = new Vec3(0, 0, 0)
			node.time = 0
		}
		this.cameras.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.type = oldNode.type
			newNode.nextCam = oldNode.nextCam
			newNode.shake = oldNode.shake
			newNode.routeIndex = oldNode.routeIndex
			newNode.vCam = oldNode.vCam
			newNode.vZoom = oldNode.vZoom
			newNode.vView = oldNode.vView
			newNode.start = oldNode.start
			newNode.movie = oldNode.movie
			newNode.zoomStart = oldNode.zoomStart
			newNode.zoomEnd = oldNode.zoomEnd
			newNode.viewPosStart = oldNode.viewPosStart.clone()
			newNode.viewPosEnd = oldNode.viewPosEnd.clone()
			newNode.time = oldNode.time
		}
		
		this.trackInfo = {}
		this.trackInfo.lapCount = 3
		this.trackInfo.polePosition = 0
		this.trackInfo.driverDistance = 0
		this.trackInfo.lensFlareFlash = 0
		this.trackInfo.unknown1 = 0
		this.trackInfo.flareColor = [0xff, 0xff, 0xff, 0x00]
		this.trackInfo.unknown2 = 0
		this.trackInfo.speedMod = 0
	}
	
	
	addNewRoute()
	{
		let route = {}
		route.setting1 = 0
		route.setting2 = 0
		
		route.points = new NodeGraph()
		route.points.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.setting1 = 0
			node.setting2 = 0
		}
		route.points.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
		}
		
		this.routes.push(route)
		return route
	}
	
	
	removeRespawnPointLinks(node)
	{
		for (let checkpoint of this.checkpointPoints.nodes)
		{
			if (checkpoint.respawnNode === node)
				checkpoint.respawnNode = null
		}
	}
	
	
	refreshIndices(asBattle)
	{
		this.enemyPoints.convertToStorageFormat(asBattle)
		this.itemPoints.convertToStorageFormat()
		this.checkpointPoints.convertToStorageFormat()
	}
	
	
	clone()
	{
		let cloned = new KmpData()
		
		cloned.trackInfo = {}
		cloned.trackInfo.lapCount = this.trackInfo.lapCount
		cloned.trackInfo.polePosition = this.trackInfo.polePosition
		cloned.trackInfo.driverDistance = this.trackInfo.driverDistance
		cloned.trackInfo.lensFlareFlash = this.trackInfo.lensFlareFlash
		cloned.trackInfo.unknown1 = this.trackInfo.unknown1
		cloned.trackInfo.flareColor = [
			this.trackInfo.flareColor[0],
			this.trackInfo.flareColor[1],
			this.trackInfo.flareColor[2],
			this.trackInfo.flareColor[3]
		]
		cloned.trackInfo.unknown2 = this.trackInfo.unknown2
		cloned.trackInfo.speedMod = this.trackInfo.speedMod

		cloned.unhandledSectionData = this.unhandledSectionData
		cloned.startPoints = this.startPoints.clone()
		cloned.finishPoints = this.finishPoints.clone()
		cloned.enemyPoints = this.enemyPoints.clone()
		cloned.itemPoints = this.itemPoints.clone()
		cloned.checkpointPoints = this.checkpointPoints.clone()
		cloned.objects = this.objects.clone()
		cloned.respawnPoints = this.respawnPoints.clone()
		cloned.cannonPoints = this.cannonPoints.clone()
		cloned.areaPoints = this.areaPoints.clone()
		cloned.cameras = this.cameras.clone()
		cloned.firstIntroCam = this.firstIntroCam
		cloned.firstSelectionCam = this.firstSelectionCam
		
		for (let route of this.routes)
		{
			let newRoute = cloned.addNewRoute()
			newRoute.setting1 = route.setting1
			newRoute.setting2 = route.setting2
			newRoute.points = route.points.clone()
		}
		
		for (let checkpoint of cloned.checkpointPoints.nodes)
		{
			let respawnIndex = this.respawnPoints.nodes.findIndex(p => p == checkpoint.respawnNode)
			checkpoint.respawnNode = null
			
			if (respawnIndex >= 0)
				checkpoint.respawnNode = cloned.respawnPoints.nodes[respawnIndex]
		}
		
		return cloned
	}
}


class NodeGraph
{
	constructor()
	{
		this.nodes = []
		this.maxNodes = 255
		this.maxNextNodes = 1
		this.maxPrevNodes = 1
		this.onAddNode = () => { }
		this.onCloneNode = () => { }
		this.findFirstNode = (nodes) => (nodes.length > 0 ? nodes[0] : null)
	}
	
	
	addNode()
	{
		if (this.nodes.length >= this.maxNodes)
		{
			alert("KMP error!\n\nMaximum number of points surpassed (" + this.maxNodes + ")")
			return
		}

		let node =
		{
			next: [],
			prev: []
		}
		
		this.onAddNode(node)
		
		this.nodes.push(node)
		return node
	}
	
	
	removeNode(node)
	{
		for (let prev of node.prev)
		{
			let nextIndex = prev.node.next.findIndex(n => n.node == node)
			if (nextIndex >= 0)
				prev.node.next.splice(nextIndex, 1)
		}
		
		for (let next of node.next)
		{
			let prevIndex = next.node.prev.findIndex(n => n.node == node)
			if (prevIndex >= 0)
				next.node.prev.splice(prevIndex, 1)
		}
		
		this.nodes.splice(this.nodes.findIndex(n => n == node), 1)
	}
	
	
	linkNodes(node1, node2)
	{
		if (node1 == node2)
			return

		let node1NextIndex = node1.next.findIndex(n => n.node == node2)
		if (node1NextIndex >= 0)
			node1.next[node1NextIndex].count += 1
		else
			node1.next.push({ node: node2, count: 1 })
		
		let node2PrevIndex = node2.prev.findIndex(n => n.node == node1)
		if (node2PrevIndex >= 0)
			node2.prev[node2PrevIndex].count += 1
		else
			node2.prev.push({ node: node1, count: 1 })
	}
	
	
	unlinkNodes(node1, node2)
	{
		let node1NextIndex = node1.next.findIndex(n => n.node == node2)
		if (node1NextIndex >= 0)
		{
			node1.next[node1NextIndex].count -= 1
			if (node1.next[node1NextIndex].count <= 0)
				node1.next.splice(node1NextIndex, 1)
		}
		
		let node2PrevIndex = node2.prev.findIndex(n => n.node == node1)
		if (node2PrevIndex >= 0)
		{
			node2.prev[node2PrevIndex].count -= 1
			if (node2.prev[node2PrevIndex].count <= 0)
				node2.prev.splice(node2PrevIndex, 1)
		}
	}
	
	
	clone()
	{
		let clonedNodes = []
		let clonedNodesMap = new Map()
		for (let node of this.nodes)
		{
			let clonedNode =
			{
				next: [],
				prev: []
			}
			
			this.onCloneNode(clonedNode, node)
			
			clonedNodesMap.set(node, clonedNode)
			clonedNodes.push(clonedNode)
		}
		
		for (let node of this.nodes)
		{
			let clonedNode = clonedNodesMap.get(node)
			
			for (let next of node.next)
			{
				clonedNode.next.push({
					node: clonedNodesMap.get(next.node),
					count: next.count
				})
			}
			
			for (let prev of node.prev)
			{
				clonedNode.prev.push({
					node: clonedNodesMap.get(prev.node),
					count: prev.count
				})
			}
		}
		
		let graph = new NodeGraph()
		graph.nodes = clonedNodes
		graph.maxNextNodes = this.maxNextNodes
		graph.maxPrevNodes = this.maxPrevNodes
		graph.onAddNode = this.onAddNode
		graph.onCloneNode = this.onCloneNode
		return graph
	}
	
	
	convertToStorageFormat(asBattle = false)
	{
		let paths = []
		
		let nodesToHandle = this.nodes.map(n => n)
		let nodesToPath = new Map()
		
		const firstNode = this.findFirstNode(this.nodes) || (this.nodes.length > 0 ? this.nodes[0] : null)
		if (firstNode)
		{
			nodesToHandle.filter(n => n !== firstNode)
			nodesToHandle.unshift(firstNode)
		}
		
		const nodeIsBattleDispatcher = (node) => (asBattle && node.next.length + node.prev.length > 2)
		
		while (nodesToHandle.length > 0)
		{
			const node = nodesToHandle[0]
			
			const pathIndex = paths.length
			let path = { nodes: [], next: [], prev: [] }
			paths.push(path)
			
			if (nodeIsBattleDispatcher(node))
			{
				node.pathIndex = pathIndex
				path.nodes.push(node)
				nodesToPath.set(node, path)
				nodesToHandle = nodesToHandle.filter(n => n !== node)
				continue
			}
			
			let nodeAtPathStart = node
			if (node !== firstNode)
			{
				while (nodeAtPathStart.prev.length == 1 && nodeAtPathStart.prev[0].node.next.length == 1 && !nodeIsBattleDispatcher(nodeAtPathStart.prev[0].node))
				{
					if (nodesToPath.get(nodeAtPathStart.prev[0].node, path))
						break
					
					nodeAtPathStart = nodeAtPathStart.prev[0].node
					if (nodeAtPathStart === node)
						break
				}
			}
			
			nodeAtPathStart.pathIndex = pathIndex
			path.nodes.push(nodeAtPathStart)
			nodesToPath.set(nodeAtPathStart, path)
			nodesToHandle = nodesToHandle.filter(n => n !== nodeAtPathStart)
			
			let nodeAtPath = nodeAtPathStart
			while (nodeAtPath.next.length == 1 && nodeAtPath.next[0].node.prev.length == 1 && !nodeIsBattleDispatcher(nodeAtPath.next[0].node))
			{
				nodeAtPath = nodeAtPath.next[0].node
				if (nodesToPath.get(nodeAtPath, path))
					break
				
				if ('firstInPath' in nodeAtPath && nodeAtPath.firstInPath)
					break
				
				nodeAtPath.pathIndex = pathIndex
				path.nodes.push(nodeAtPath)
				nodesToPath.set(nodeAtPath, path)
				nodesToHandle = nodesToHandle.filter(n => n !== nodeAtPath)
			}
		}

		let pointIndex = 0
		for (let path of paths)
		{
			let lastNode = path.nodes[path.nodes.length - 1]
			
			for (let next of lastNode.next)
			{
				let nextPath = nodesToPath.get(next.node)
				for (let i = 0; i < next.count; i++)
					path.next.push(nextPath)
				
				nextPath.prev.push(path)
			}
			
			for (let i = 0; i < path.nodes.length; i++)
			{
				path.nodes[i].pathPointIndex = i
				path.nodes[i].pointIndex = pointIndex
				pointIndex += 1
			}
		}

		let checkpointPaths = paths.filter(p => 'firstInPath' in p.nodes[0])
		if (checkpointPaths.length > 0)
		{
			for (let path of checkpointPaths)
				for (let node of path.nodes)
					node.pathLayer = null

			const calculateGroupLayers = (group, layer) =>
			{
				group.layer = layer
				if (layer > this.maxLayer)
					this.maxLayer = layer
				if (checkpointPaths.length > 1)
				{
					for (let next of group.next)
						if (!('layer' in next) || next.layer == null)
							calculateGroupLayers(next, layer + 1)
					for (let prev of group.prev)
						if (!('layer' in prev) || prev.layer == null)
							calculateGroupLayers(prev, layer - 1)
				}
			}
		
			this.maxLayer = 1
			calculateGroupLayers(checkpointPaths[0], 1)
		
			for (let path of checkpointPaths)
				for (let node of path.nodes)
				{
					node.pathLen = path.nodes.length
					node.pathLayer = path.layer
				}
		}
		
		if (asBattle)
		{
			for (let path of paths)
			{
				if (path.nodes.length == 1 && path.next.length + path.prev.length > 2)
				{
					for (let prev of path.prev)
					{
						if (path.next.find(g => g === prev))
							continue
						
						path.next.push(prev)
					}
					
					path.prev = []
				}
			}
		}
		
		return paths
	}
}


if (module)
	module.exports = { KmpData }