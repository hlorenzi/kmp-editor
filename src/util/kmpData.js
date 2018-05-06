const { BinaryParser } = require("./binaryParser.js")
const { BinaryWriter } = require("./binaryWriter.js")
const { Vec3 } = require("../math/vec3.js")


let unhandledSections =
[
	{ id: "KTPT", entryLen: 0x1c },
	{ id: "ITPT", entryLen: 0x14 },
	{ id: "ITPH", entryLen: 0x10 },
	{ id: "CKPT", entryLen: 0x14 },
	{ id: "CKPH", entryLen: 0x10 },
	{ id: "GOBJ", entryLen: 0x3c },
	{ id: "AREA", entryLen: 0x30 },
	{ id: "CAME", entryLen: 0x48 },
	{ id: "JGPT", entryLen: 0x1c },
	{ id: "CNPT", entryLen: 0x1c },
	{ id: "MSPT", entryLen: 0x1c },
	{ id: "STGI", entryLen: 0x0c },
]


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
	
		let enemyPoints = []
		let enemyPaths = []
		let routes = []
		let unhandledSectionData = []
		
		for (let sectionOffset of sectionOffsets)
		{
			if (sectionOffset + headerLenInBytes >= parser.getLength())
				continue
			
			parser.seek(sectionOffset + headerLenInBytes)
			
			let sectionId = parser.readAsciiLength(4)
			let entryNum = parser.readUInt16()
			let extraData = parser.readUInt16()
			
			switch (sectionId)
			{
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
							let pos = parser.readVec3()
							point.pos = new Vec3(pos.x, -pos.z, -pos.y)
							point.setting1 = parser.readUInt16()
							point.setting2 = parser.readUInt16()
							
							route.points.push(point)
						}
						
						routes.push(route)
					}
					break
				}
				
				default:
				{
					let unhandledSection = unhandledSections.find(s => s.id == sectionId)
					if (unhandledSection == null)
					{
						console.error("kmp: section not handled: " + sectionId)
						break
					}
					
					let bytes = []
					for (let i = 0; i < entryNum; i++)
						for (let j = 0; j < unhandledSection.entryLen; j++)
							bytes.push(parser.readByte())
						
					unhandledSectionData.push({ id: sectionId, extraData, bytes })
					break
				}
			}
		}
		
		return { unhandledSectionData, enemyPoints, enemyPaths, routes }
	}
	
	
	static convertToWorkingFormat(kmpData)
	{
		let kmp = new KmpData()
		kmp.unhandledSectionData = kmpData.unhandledSectionData
		kmp.routes = kmpData.routes
		
		for (let i = 0; i < kmpData.enemyPoints.length; i++)
		{
			let kmpPoint = kmpData.enemyPoints[i]
			
			let node = kmp.enemyPoints.addNode()
			node.pos = new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y)
			node.size = kmpPoint.size
			node.setting1 = kmpPoint.setting1
			node.setting2 = kmpPoint.setting2
			node.setting3 = kmpPoint.setting3
		}
		
		for (let i = 0; i < kmpData.enemyPaths.length; i++)
		{
			let kmpPath = kmpData.enemyPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum - 1; p++)
				kmp.enemyPoints.linkNodes(kmp.enemyPoints.nodes[p], kmp.enemyPoints.nodes[p + 1])
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff)
				{
					let lastPoint = kmpPath.startIndex + kmpPath.pointNum - 1
					let nextPoint = kmpData.enemyPaths[kmpPath.nextGroups[j]].startIndex
					
					kmp.enemyPoints.linkNodes(kmp.enemyPoints.nodes[lastPoint], kmp.enemyPoints.nodes[nextPoint])
				}
			}
		}
		
		return kmp
	}
	
	
	convertToStorageFormat()
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
		
		for (let i = 0; i < this.unhandledSectionData.length; i++)
		{
			let order = sectionOrder.findIndex(s => s == this.unhandledSectionData[i].id)
			
			let head = w.head
			w.seek(sectionOffsetsAddr + order * 4)
			w.writeUInt32(head - headerEndAddr)
			
			let unhandledSection = unhandledSections.find(s => s.id == this.unhandledSectionData[i].id)
			
			w.seek(head)
			w.writeAscii(this.unhandledSectionData[i].id)
			w.writeUInt16(this.unhandledSectionData[i].bytes.length / unhandledSection.entryLen)
			w.writeUInt16(this.unhandledSectionData[i].extraData)
			w.writeBytes(this.unhandledSectionData[i].bytes)
		}
		
		let enemyPaths = this.enemyPoints.convertToStorageFormat()
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
		
		// Write POTI
		let sectionPotiAddr = w.head
		let sectionPotiOrder = sectionOrder.findIndex(s => s == "POTI")
		w.seek(sectionOffsetsAddr + sectionPotiOrder * 4)
		w.writeUInt32(sectionPotiAddr - headerEndAddr)
		
		w.seek(sectionPotiAddr)
		w.writeAscii("POTI")
		w.writeUInt16(this.routes.length)
		w.writeUInt16(this.routes.reduce((accum, route) => accum + route.points.length, 0))
		for (let route of this.routes)
		{
			if (route.points.length > 0xffff)
				throw "kmp encode: max route point number surpassed (have " + route.points.length + ", max 65535)"
			
			w.writeUInt16(route.points.length)
			w.writeByte(route.setting1)
			w.writeByte(route.setting2)
			
			for (let point of route.points)
			{
				w.writeVec3(new Vec3(point.pos.x, -point.pos.z, -point.pos.y))
				w.writeUInt16(point.setting1)
				w.writeUInt16(point.setting2)
			}
		}
		
		w.seek(fileLenAddr)
		w.writeUInt32(w.getLength())
		
		return w.getBytes()
	}
	
	
	constructor()
	{
		this.unhandledSectionData = []
		
		this.routes = []
		
		this.enemyPoints = new NodeGraph()
		this.enemyPoints.maxNextNodes = 6
		this.enemyPoints.maxPrevNodes = 6
		this.enemyPoints.onAddNode = (node) =>
		{
			node.size = 10
			node.setting1 = 0
			node.setting2 = 0
			node.setting3 = 0
		}
		this.enemyPoints.onCloneNode = (newNode, oldNode) =>
		{
			newNode.size = oldNode.size
			newNode.setting1 = oldNode.setting1
			newNode.setting2 = oldNode.setting2
			newNode.setting3 = oldNode.setting3
		}
	}
	
	
	clone()
	{
		let cloned = new KmpData()
		cloned.unhandledSectionData = this.unhandledSectionData
		cloned.routes = this.routes
		cloned.enemyPoints = this.enemyPoints.clone()
		return cloned
	}
}


class NodeGraph
{
	constructor()
	{
		this.nodes = []
		this.maxNextNodes = 1
		this.maxPrevNodes = 1
		this.onAddNode = () => { }
		this.onCloneNode = () => { }
	}
	
	
	addNode()
	{
		let node =
		{
			pos: new Vec3(0, 0, 0),
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
				pos: node.pos.clone(),
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
	
	
	convertToStorageFormat()
	{
		let paths = []
		
		let nodesToHandle = this.nodes.map(n => n)
		let nodesToPath = new Map()
		
		while (nodesToHandle.length > 0)
		{
			let node = nodesToHandle.splice(0, 1)[0]
			
			let path = { nodes: [], next: [], prev: [] }
			if (nodesToPath.has(node))
				path = nodesToPath.get(node)
			else
			{
				nodesToPath.set(node, path)
				paths.push(path)
			}
			
			path.nodes.push(node)
			
			while (node.next.length == 1 && node.next[0].node.prev.length == 1 && !nodesToPath.has(node.next[0].node))
			{
				node = node.next[0].node
				nodesToPath.set(node, path)
				path.nodes.push(node)
				
				let index = nodesToHandle.findIndex(n => n == node)
				if (index >= 0)
					nodesToHandle.splice(index, 1)
			}
		}
		
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
		}
			
		return paths
	}
}


if (module)
	module.exports = { KmpData }