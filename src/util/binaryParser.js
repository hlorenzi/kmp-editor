const { Vec3 } = require("../math/vec3.js")


class BinaryParser
{
	constructor(bytes)
	{
		this.bytes = bytes
		this.head = 0
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
		
		return arr
	}
	
	
	readUInt16()
	{
		let b0 = this.readByte()
		let b1 = this.readByte()
		
		return (b0 << 8) | b1
	}
	
	
	readUInt32()
	{
		let b0 = this.readByte()
		let b1 = this.readByte()
		let b2 = this.readByte()
		let b3 = this.readByte()
		
		return (b0 << 24) | (b1 << 16) | (b2 << 8) | b3
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
		let b0 = this.readByte()
		let b1 = this.readByte()
		let b2 = this.readByte()
		let b3 = this.readByte()
		
		let buf = new ArrayBuffer(4)
		let view = new DataView(buf)

		view.setUint8(0, b0)
		view.setUint8(1, b1)
		view.setUint8(2, b2)
		view.setUint8(3, b3)

		return view.getFloat32(0)
	}
	
	
	readVec3()
	{
		let x = this.readFloat32()
		let y = this.readFloat32()
		let z = this.readFloat32()
		
		return new Vec3(x, y, z)
	}
	
	
	readAsciiLength(length)
	{
		let str = ""
		for (let i = 0; i < length; i++)
			str += String.fromCharCode(this.readByte())
		
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
		
		return str
	}
}


if (module)
	module.exports = { BinaryParser }