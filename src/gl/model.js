export default class GfxModel
{
	constructor()
	{
		this.positions = null
		this.normals = null
		this.colors = null
	}
	
	
	setPositions(positions)
	{
		this.positions = positions
		return this
	}
	
	
	setNormals(normals)
	{
		this.normals = normals
		return this
	}
	
	
	setColors(colors)
	{
		this.colors = colors
		return this
	}
}