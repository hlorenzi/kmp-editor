const { BinaryParser } = require("./binaryParser.js")
const { BinaryWriter } = require("./binaryWriter.js")
const { Vec3 } = require("../math/vec3.js")


let unhandledSections = ["CORS", "GLPT", "GLPH"]


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
	"CORS",
	"GLPT",
	"GLPH",
]

let format = 
{
	"KTPT":
	{
		pos: "PosVec3",
		rotation: "Vec3",
		playerIndex: "UInt16",
		unknown: "UInt16",
	},

	"ENPT":
	{
		pos: "PosVec3",
		size: "Float32",
		setting1: "UInt16",
		setting2: "Byte",
		setting3: "Byte",
	},

	"ENPH":
	{
		startIndex: "Byte",
		pointNum: "Byte",
		prevGroups: ["Bytes", 6],
		nextGroups: ["Bytes", 6],
		unknown: "UInt16",
	},

	"ITPT":
	{
		pos: "PosVec3",
		size: "Float32",
		setting1: "UInt16",
		setting2: "UInt16",
	},

	"ITPH":
	{
		startIndex: "Byte",
		pointNum: "Byte",
		prevGroups: ["Bytes", 6],
		nextGroups: ["Bytes", 6],
		unknown: "UInt16",
	},

	"CKPT":
	{
		x1: "Float32",
		z1: "Float32",
		x2: "Float32",
		z2: "Float32",
		respawnIndex: "Byte",
		type: "Byte",
		prev: "Byte",
		next: "Byte",
	},

	"CKPH":
	{
		startIndex: "Byte",
		pointNum: "Byte",
		prevGroups: ["Bytes", 6],
		nextGroups: ["Bytes", 6],
		unknown: "UInt16",
	},

	"GOBJ":
	{
		id: "UInt16",
		xpfThing: "UInt16",
		pos: "PosVec3",
		rotation: "Vec3",
		scale: "Vec3",
		routeIndex: "UInt16",
		settings: ["UInt16s", 8],
		presence: "UInt16",
	},

	"POTI":
	{
		pointNum: "UInt16",
		setting1: "Byte",
		setting2: "Byte",
	},

	"AREA":
	{
		shape: "Byte",
		type: "Byte",
		cameraIndex: "Byte",
		priority: "Byte",
		pos: "PosVec3",
		rotation: "Vec3",
		scale: "Vec3",
		setting1: "UInt16",
		setting2: "UInt16",
		routeIndex: "Byte",
		enemyIndex: "Byte",
		unknown: "UInt16",
	},

	"CAME":
	{
		type: "Byte",
		nextCam: "Byte",
		shake: "Byte",
		routeIndex: "Byte",
		vCam: "UInt16",
		vZoom: "UInt16",
		vView: "UInt16",
		start: "Byte",
		movie: "Byte",
		pos: "PosVec3",
		rotation: "Vec3",
		zoomStart: "Float32",
		zoomEnd: "Float32",
		viewPosStart: "PosVec3",
		viewPosEnd: "PosVec3",
		time: "Float32",
	},

	"JGPT":
	{
		pos: "PosVec3",
		rotation: "Vec3",
		unknown: "UInt16",
		size: "UInt16",
	},

	"CNPT":
	{
		pos: "PosVec3",
		rotation: "Vec3",
		id: "UInt16",
		effect: "UInt16",
	},

	"MSPT":
	{
		pos: "PosVec3",
		rotation: "Vec3",
		id: "UInt16",
		unknown: "UInt16",
	},

	"STGI":
	{
		lapCount: "Byte",
		polePosition: "Byte",
		driverDistance: "Byte",
		lensFlareFlash: "Byte",
		unknown1: "Byte",
		flareColor: ["Bytes", 4],
		unknown2: "Byte",
		speedMod: "Float32MSB2",
	}
}


class KmpData
{
	static load(bytes)
	{
		let parser = new BinaryParser(bytes)
		
		if (parser.readAsciiLength(4) == "RKMD")
			;
		else if (parser.readAsciiLength(4) == "DMDC")
			parser.littleEndian = true
		else
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
		
		let sectionData = { sectionNum, unhandled: [] }
		for (let i = 0; i < sectionNum; i++)
			sectionData[sectionOrder[i]] = { headerData: 0x0, entries: [] }

		for (let sectionOffset of sectionOffsets)
		{
			if (sectionOffset < 0 || sectionOffset + headerLenInBytes >= parser.getLength())
				continue

			parser.seek(sectionOffset + headerLenInBytes)
			
			let sectionId = parser.readAsciiLength(4)
			let entryNum = parser.readUInt16()
			let headerData = parser.readUInt16()
			
			if (sectionId in format)
			{
				sectionData[sectionId].headerData = headerData
				for (let i = 0; i < entryNum; i++) 
				{
					let data = {}
					for (let p in format[sectionId])
						data[p] = parser.read(format[sectionId][p])

					if(sectionId == "POTI")
					{
						data.points = []
						for (let j = 0; j < data.pointNum; j++)
						{
							let point = {}
							point.pos = parser.readPosVec3()
							point.setting1 = parser.readUInt16()
							point.setting2 = parser.readUInt16()
							data.points.push(point)
						}
					}
					sectionData[sectionId].entries.push(data)
				}
			}
			else
			{
				let unhandledSection = unhandledSections.find(s => s.id == sectionId)
				if (unhandledSection == null)
					throw ("kmp: section not handled: " + sectionId)
				
				let bytes = []
				for (let i = 0; i < entryNum; i++)
					for (let j = 0; j < unhandledSection.entryLen; j++)
						bytes.push(parser.readByte())
					
				sectionData.unhandled.push({ id: sectionId, headerData, bytes })
				break
			}
		}
		
		return sectionData
	}
	
	
	static convertToWorkingFormat(loadedKmp)
	{
		let data = new KmpData()
		data.sectionNum = loadedKmp.sectionNum
		data.trackInfo = loadedKmp["STGI"].entries[0]
		data.unhandledSectionData = loadedKmp.unhandled

		const transferProperties = (src, dst) =>
		{
			for (let p in src) {
				if (src[p] instanceof Vec3)
					dst[p] = src[p].clone()
				else
					dst[p] = src[p]
			}
		}

		for (let i = 0; i < loadedKmp["KTPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["KTPT"].entries[i]
			
			let node = data.startPoints.addNode()
			transferProperties(kmpPoint, node)
		}

		for (let i = 0; i < loadedKmp["MSPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["MSPT"].entries[i]
			
			let node = data.finishPoints.addNode()
			transferProperties(kmpPoint, node)
		}

		for (let i = 0; i < loadedKmp["ENPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["ENPT"].entries[i]
			
			let node = data.enemyPoints.addNode()
			transferProperties(kmpPoint, node)
		}

		let enemyPaths = loadedKmp["ENPH"].entries
		for (let i = 0; i < enemyPaths.length; i++)
		{
			let kmpPath = enemyPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
			{
				data.enemyPoints.linkNodes(data.enemyPoints.nodes[p], data.enemyPoints.nodes[p + 1])
				data.enemyPoints.nodes[p].pathIndex = i
				data.enemyPoints.nodes[p + 1].pathIndex = i
			}
			
			const emptyPrevGroups = kmpPath.prevGroups.find(g => g != 0xff && g < enemyPaths.length) == null
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < enemyPaths.length)
				{
					const nextComesBackToThis = enemyPaths[kmpPath.nextGroups[j]].nextGroups.find(g => g == i) != null
					const nextIsBattleDispatch = kmpPath.nextGroups[j] > i && enemyPaths[kmpPath.nextGroups[j]].prevGroups.find(g => g != 0xff && g < enemyPaths.length) == null
					
					if (!emptyPrevGroups || (!nextComesBackToThis || nextIsBattleDispatch))
					{
						let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
						let nextPoint = enemyPaths[kmpPath.nextGroups[j]].startIndex
						
						data.enemyPoints.linkNodes(data.enemyPoints.nodes[lastPoint], data.enemyPoints.nodes[nextPoint])
						data.enemyPoints.nodes[lastPoint].pathIndex = i
						data.enemyPoints.nodes[nextPoint].pathIndex = kmpPath.nextGroups[j]
					}
				}
			}
		}

		for (let i = 0; i < loadedKmp["ITPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["ITPT"].entries[i]
			
			let node = data.itemPoints.addNode()
			transferProperties(kmpPoint, node)
		}
		
		let itemPaths = loadedKmp["ITPH"].entries
		for (let i = 0; i < itemPaths.length; i++)
		{
			let kmpPath = itemPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
				data.itemPoints.linkNodes(data.itemPoints.nodes[p], data.itemPoints.nodes[p + 1])
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < itemPaths.length)
				{
					let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
					let nextPoint = itemPaths[kmpPath.nextGroups[j]].startIndex
					
					data.itemPoints.linkNodes(data.itemPoints.nodes[lastPoint], data.itemPoints.nodes[nextPoint])
				}
			}
		}
		
		for (let i = 0; i < loadedKmp["CKPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["CKPT"].entries[i]
			
			let node = data.checkpointPoints.addNode()
			node.pos = [new Vec3(kmpPoint.x1, -kmpPoint.z1, 0), new Vec3(kmpPoint.x2, -kmpPoint.z2, 0)]
			node.type = kmpPoint.type
			node.respawnNode = null
			node.firstInPath = false
			node.isRendered = true
		}

		let checkpointPaths = loadedKmp["CKPH"].entries
		for (let i = 0; i < checkpointPaths.length; i++)
		{
			let kmpPath = checkpointPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
				data.checkpointPoints.linkNodes(data.checkpointPoints.nodes[p], data.checkpointPoints.nodes[p + 1])

			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff && kmpPath.nextGroups[j] < checkpointPaths.length)
				{
					let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
					let nextPoint = checkpointPaths[kmpPath.nextGroups[j]].startIndex
					
					data.checkpointPoints.linkNodes(data.checkpointPoints.nodes[lastPoint], data.checkpointPoints.nodes[nextPoint])
				}
			}
			
			data.checkpointPoints.nodes[kmpPath.startIndex].firstInPath = true
		}
		
		for (let i = 0; i < loadedKmp["GOBJ"].entries.length; i++)
		{
			let kmpObj = loadedKmp["GOBJ"].entries[i]
			
			let node = data.objects.addNode()
			transferProperties(kmpObj, node)
		}
		
		for (let i = 0; i < loadedKmp["POTI"].entries.length; i++)
		{
			let kmpRoute = loadedKmp["POTI"].entries[i]
			
			let route = data.addNewRoute()
			route.setting1 = kmpRoute.setting1
			route.setting2 = kmpRoute.setting2
			
			let lastNode = null
			
			for (let kmpPoint of kmpRoute.points)
			{
				let node = route.points.addNode()
				node.pos = kmpPoint.pos.clone()
				node.setting1 = kmpPoint.setting1
				node.setting2 = kmpPoint.setting2
				
				if (lastNode != null)
					route.points.linkNodes(lastNode, node)
				
				lastNode = node
			}
		}
		
		for (let i = 0; i < loadedKmp["JGPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["JGPT"].entries[i]
			
			let node = data.respawnPoints.addNode()
			transferProperties(kmpPoint, node)
		}
		
		for (let i = 0; i < loadedKmp["CNPT"].entries.length; i++)
		{
			let kmpPoint = loadedKmp["CNPT"].entries[i]
			
			let node = data.cannonPoints.addNode()
			transferProperties(kmpPoint, node)
			node.effect = kmpPoint.effect == 0xffff ? 0 : kmpPoint.effect
		}
		
		for (let i = 0; i < loadedKmp["CKPT"].entries.length; i++)
		{
			let respawnIndex = loadedKmp["CKPT"].entries[i].respawnIndex
			
			if (respawnIndex >= 0 && respawnIndex < data.respawnPoints.nodes.length)
				data.checkpointPoints.nodes[i].respawnNode = data.respawnPoints.nodes[respawnIndex]
		}
		
		for (let i = 0; i < loadedKmp["AREA"].entries.length; i++)
		{
			let kmpArea = loadedKmp["AREA"].entries[i]
			
			let node = data.areaPoints.addNode()
			transferProperties(kmpArea, node)
		}

		data.firstIntroCam = (loadedKmp["CAME"].headerData & 0xff00) >>> 8
		data.firstSelectionCam = loadedKmp["CAME"].headerData & 0xff
		
		for (let i = 0; i < loadedKmp["CAME"].entries.length; i++)
		{
			let kmpCam = loadedKmp["CAME"].entries[i]

			let node = data.cameras.addNode()
			transferProperties(kmpCam, node)
		}
		
		data.isBattleTrack = loadedKmp["ITPT"].entries.length == 0 && loadedKmp["CKPT"].entries.length == 0 && loadedKmp["MSPT"].entries.length > 0
		
		return data
	}
	
	
	convertToStorageFormat(asBattle = false)
	{
		let w = new BinaryWriter()
		
		let sectionNum = this.sectionNum
		
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

		if (this.startPoints.nodes.length > 0xff)
			throw "kmp encode: max start points surpassed (have " + this.startPoints.nodes.length + ", max 255)"
			
		for (let p of this.startPoints.nodes)
		{
			w.writeFloat32(p.pos.x)
			w.writeFloat32(-p.pos.z)
			w.writeFloat32(-p.pos.y)
			w.writeFloat32(p.rotation.x)
			w.writeFloat32(p.rotation.y)
			w.writeFloat32(p.rotation.z)
			w.writeUInt16(p.playerIndex)
			w.writeUInt16(p.p0x1A)
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

		if (this.objects.nodes.length > 0xff)
			alert("Warning: More than 255 objects found (" + this.objects.nodes.length + ").\nTrack slot 5.3 is required for objects to load correctly.")

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

		if (this.areaPoints.nodes.length > 0xff)
			throw "kmp encode: max AREA points surpassed (have " + this.areaPoints.nodes.length + ", max 255)"
			
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

		if (this.cameras.nodes.length > 0xff)
			throw "kmp encode: max cameras surpassed (have " + this.cameras.nodes.length + ", max 255)"
			
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

		if (this.respawnPoints.nodes.length > 0xff)
			throw "kmp encode: max respawn points surpassed (have " + this.respawnPoints.nodes.length + ", max 255)"
			
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

		if (this.cannonPoints.nodes.length > 0xff)
			throw "kmp encode: max cannon points surpassed (have " + this.cannonPoints.nodes.length + ", max 255)"
			
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

		if (this.finishPoints.nodes.length > 0xff)
			throw "kmp encode: max finish points surpassed (have " + this.finishPoints.nodes.length + ", max 255)"
			
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
		this.startPoints.onAddNode = (node) =>
		{
			node.pos = new Vec3(0, 0, 0)
			node.rotation = new Vec3(0, 0, 0)
			node.playerIndex = 0xffff
			node.p0x1A = 0
		}
		this.startPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.pos = oldNode.pos.clone()
			newNode.rotation = oldNode.rotation.clone()
			newNode.playerIndex = oldNode.playerIndex
			newNode.p0x1A = oldNode.p0x1A
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
		this.objects.maxNodes = 0xffff
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
		route.points.maxNodes = 0xffff
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
		this.maxNodes = 0xff
		this.maxNextNodes = 1
		this.maxPrevNodes = 1
		this.headerData = 0
		this.onAddNode = () => { }
		this.onCloneNode = () => { }
		this.findFirstNode = (nodes) => (nodes.length > 0 ? nodes[0] : null)
	}
	
	
	addNode()
	{
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
		graph.headerData = this.headerData
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