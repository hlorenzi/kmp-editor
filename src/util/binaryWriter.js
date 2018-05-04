const { Vec3 } = require("../math/vec3.js")


class BinaryWriter
{
	constructor(bytes)
	{
		this.bytes = []
		this.head = 0
	}
	
	
	getBytes()
	{
		return this.bytes
	}
	
	
	getLength()
	{
		return this.bytes.length
	}
	
	
	seek(index)
	{
		while (index >= this.bytes.length)
			this.bytes.push(0)
		
		this.head = index
	}
	
	
	writeByte(b)
	{
		this.bytes[this.head] = b & 0xff
		this.head += 1
	}
	
	
	writeSByte(b)
	{
		if (b >= 0)
			this.writeByte(b)
		else
			this.writeByte(0x100 + b)
	}
	
	
	writeBytes(bytes)
	{
		for (let i = 0; i < bytes.length; i++)
			this.writeByte(bytes[i])
	}
	
	
	writeUInt16(x)
	{
		this.writeByte(x >> 8)
		this.writeByte(x >> 0)
	}
	
	
	writeUInt32(x)
	{
		this.writeByte(x >> 24)
		this.writeByte(x >> 16)
		this.writeByte(x >>  8)
		this.writeByte(x >>  0)
	}
	
	
	writeInt16(x)
	{
		if (x >= 0)
			this.writeUInt16(x)
		else
			this.writeUInt16(0x10000 + x)
	}
	
	
	writeInt32(x)
	{
		if (x >= 0)
			this.writeUInt32(x)
		else
			this.writeUInt32(0x100000000 + x)
	}
	
	
	writeFloat32(x)
	{
		var view = new DataView(new ArrayBuffer(4))
		view.setFloat32(0, x)
		this.writeUInt32(view.getUint32(0))
	}
	
	
	writeVec3(v)
	{
		this.writeFloat32(v.x)
		this.writeFloat32(v.y)
		this.writeFloat32(v.z)
	}
	
	
	writeAsciiLength(str, length)
	{
		for (let i = 0; i < Math.min(str.length, length); i++)
			this.writeByte(str.charCodeAt(i))
		
		for (let i = str.length; i < length; i++)
			this.writeByte(0)
	}
	
	
	writeAscii(str)
	{
		for (let i = 0; i < str.length; i++)
			this.writeByte(str.charCodeAt(i))
	}
}


if (module)
	module.exports = { BinaryWriter }