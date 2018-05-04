const { BinaryParser } = require("./binaryParser.js")
const { Vec3 } = require("../math/vec3.js")


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
		
		for (let sectionOffset of sectionOffsets)
		{
			parser.seek(sectionOffset + headerLenInBytes)
			
			let sectionName = parser.readAsciiLength(4)
			let entryNum = parser.readUInt16()
			let extraData = parser.readUInt16()
			
			
			switch (sectionName)
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
				
				default:
					console.log("kmp: section not handled: " + sectionName)
			}
		}
		
		return { enemyPoints, enemyPaths }
	}
	
	
	static convertToWorkingFormat(kmpData)
	{
		let kmp = new KmpData()
		
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
	
	
	constructor()
	{
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
}


if (module)
	module.exports = { KmpData }