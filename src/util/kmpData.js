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
		let enemyPoints = []
		for (let i = 0; i < kmpData.enemyPoints.length; i++)
		{
			let kmpPoint = kmpData.enemyPoints[i]
			
			enemyPoints.push({
				pos: new Vec3(kmpPoint.pos.x, -kmpPoint.pos.z, -kmpPoint.pos.y),
				size: kmpPoint.size,
				next: [],
				prev: []
			})
		}
		
		for (let i = 0; i < kmpData.enemyPaths.length; i++)
		{
			let kmpPath = kmpData.enemyPaths[i]
		
			for (let p = kmpPath.startIndex; p < kmpPath.startIndex + kmpPath.pointNum; p++)
			{
				if (p > kmpPath.startIndex)
					enemyPoints[p].prev.push(enemyPoints[p - 1])
				
				if (p < kmpPath.startIndex + kmpPath.pointNum - 1)
					enemyPoints[p].next.push(enemyPoints[p + 1])
			}
			
			for (let j = 0; j < 6; j++)
			{
				if (kmpPath.nextGroups[j] != 0xff)
				{
					let lastPoint = enemyPoints[kmpPath.startIndex + kmpPath.pointNum - 1]
					let nextPoint = enemyPoints[kmpData.enemyPaths[kmpPath.nextGroups[j]].startIndex]
					
					lastPoint.next.push(nextPoint)
					nextPoint.prev.push(lastPoint)
				}
			}
		}
		
		return { enemyPoints }
	}
}


if (module)
	module.exports = { KmpData }