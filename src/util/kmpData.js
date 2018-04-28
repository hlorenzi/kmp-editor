const { BinaryParser } = require("./binaryParser.js")


class KmpData
{
	static load(bytes)
	{
		let parser = new BinaryParser(bytes)
		
		if (parser.readAsciiLength(4) != "RKMD")
			throw "kmp invalid magic number"
		
		let fileLenInBytes = parser.readUInt32()
		let sectionNum = parser.readUInt16()
		let headerLenInBytes = parser.readUInt16()
		parser.readUInt32()
		
		let sectionOffsets = []
		for (let i = 0; i < sectionNum; i++)
			sectionOffsets.push(parser.readUInt32())
		
		if (parser.head != headerLenInBytes)
			throw "kmp invalid header length"
	
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
				}
				
				default:
					console.error("kmp section not handled: " + sectionName)
			}
		}
			
		console.log(enemyPoints)
		console.log(enemyPaths)
	}
}


if (module)
	module.exports = { KmpData }