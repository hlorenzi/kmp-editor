const { Vec3 } = require("../math/vec3.js")


class BinaryParser
{
	constructor(bytes)
	{
		this.bytes = bytes
		this.head = 0
		this.littleEndian = false
	}
	
	
	getLength()
	{
		return this.bytes.length
	}
	
	
	seek(index)
	{
		this.head = index
	}
	
	
	readByte()
	{
		let b = this.bytes[this.head]
		this.head += 1
		return b
	}
	
	
	readSByte()
	{
		let x = this.readByte()
		if ((x & 0x80) == 0)
			return x
		
		return -((~x) + 1)
	}
	
	
	readBytes(length)
	{
		let arr = []
		for (let i = 0; i < length; i++)
			arr.push(this.readByte())
		
		if (this.littleEndian)
			arr = arr.reverse()
		
		return arr
	}
	
	
	readUInt16()
	{
		let b = this.readBytes(2)
		
		let result = (b[0] << 8) | b[1]
		
		if (result < 0)
			return 0x10000 + result
		else
			return result
	}
	
	
	readUInt16s(length)
	{
		let arr = []
		for (let i = 0; i < length; i++)
			arr.push(this.readUInt16())
		
		return arr
	}
	
	
	readUInt32()
	{
		let b = this.readBytes(4)
		
		let result = (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]
		
		if (result < 0)
			return 0x100000000 + result
		else
			return result
	}
	
	
	readInt16()
	{
		let x = this.readUInt16()
		if ((x & 0x8000) == 0)
			return x
		
		return -((~x) + 1)
	}
	
	
	readInt32()
	{
		let x = this.readUInt32()
		if ((x & 0x80000000) == 0)
			return x
		
		return -((~x) + 1)
	}
	
	
	readFloat32()
	{
		let b = this.readBytes(4)
		
		let buf = new ArrayBuffer(4)
		let view = new DataView(buf)

		view.setUint8(0, b[0])
		view.setUint8(1, b[1])
		view.setUint8(2, b[2])
		view.setUint8(3, b[3])

		return view.getFloat32(0)
	}
	
	
	readFloat32MSB2()
	{
		let b = this.readBytes(2)
		
		let buf = new ArrayBuffer(4)
		let view = new DataView(buf)

		view.setUint8(0, b[0])
		view.setUint8(1, b[1])
		view.setUint8(2, 0)
		view.setUint8(3, 0)

		return view.getFloat32(0)
	}
	
	
	readVec3()
	{
		let x = this.readFloat32()
		let y = this.readFloat32()
		let z = this.readFloat32()
		
		return new Vec3(x, y, z)
	}


	readPosVec3()
	{
		let x = this.readFloat32()
		let y = this.readFloat32()
		let z = this.readFloat32()
		
		return new Vec3(x, -z, -y)
	}
	
	
	readAsciiLength(length)
	{
		let str = ""
		for (let i = 0; i < length; i++)
			str += String.fromCharCode(this.readByte())
		
		if (this.littleEndian)
			str = str.split('').reverse().join('')
		
		return str
	}
	
	
	readAsciiZeroTerminated()
	{
		let str = ""
		while (true)
		{
			let c = this.readByte()
			if (c == 0)
				break
			
			str += String.fromCharCode(c)
		}

		if (this.littleEndian)
			str = str.split('').reverse().join('')
		
		return str
	}


	read(type)
	{
		if (type instanceof Array)
			return this["read" + type[0]](type[1])
		else
			return this["read" + type]()
	}
}


if (module)
	module.exports = { BinaryParser }