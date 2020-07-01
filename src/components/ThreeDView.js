import React from "react"
import Scene from "../gl/scene.js"
import CollisionMesh from "../util/collisionMesh.js"
import Geometry from "../math/geometry"
import Mat4 from "../math/mat4.js"
import Vec3 from "../math/vec3.js"
import Memoized from "../util/memoized.js"
import ThreeDViewEnph from "./threeDViewEnph.js"


export default function ThreeDView(props)
{
    const canvas = React.useRef(null)
    const manager = React.useRef(null)
    const handler = React.useRef(null)


    React.useEffect(() =>
    {
        if (!canvas.current)
            return
        
        manager.current = new Manager(canvas.current)
        manager.current.setHandler(handler.current)
        
    }, [canvas.current])


    React.useEffect(() =>
    {
        handler.current = new ThreeDViewEnph()
        manager.current.setHandler(handler.current)
        
    }, [props.state.sectionTab])


    React.useEffect(() =>
    {
        manager.current.setState(props.state, props.dispatch)
        manager.current.render()

    }, [props.state])


    return <>
        <div style={{
            display: "grid",
            gridTemplate: "1fr / 1fr",
            width: "100%",
            height: "100%",
        }}>
            <canvas ref={ canvas } style={{
                gridRow: 1,
                gridColumn: 1,
                width: "100%",
                height: "100%",
            }}/>

            <div style={{
                gridRow: 1,
                gridColumn: 1,
                width: "100%",
                height: "100%",
                display: "grid",
                alignContent: "end",
                color: "#fff",
                textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 1,
            }}>
                <div style={{ padding: "0.5em" }}>
                    Double Right-Click 🖱️: Focus<br/>
                    Right 🖱️: Rotate view<br/>
                    Right 🖱️ + <span style={{ border: "1px solid #fff", padding: "0 0.5em" }}>Shift</span>: Pan view<br/>
                    Wheel 🖱️: Zoom view<br/>
                </div>
            </div>
        </div>
    </>
}


class Manager
{
    constructor(canvas)
    {
        this.canvas = canvas
        window.addEventListener("resize", () => this.resize())
        this.canvas.onmousedown = (ev) => this.onMouseDown(ev)
        this.canvas.onmousemove = (ev) => this.onMouseMove(ev)
        this.canvas.onmouseup = (ev) => this.onMouseUp(ev)
        this.canvas.onwheel = (ev) => this.onMouseWheel(ev)

		/*this.canvas.onmousedown = (ev) => this.onMouseDown(ev)
		document.addEventListener("mousemove", (ev) => this.onMouseMove(ev))
		document.addEventListener("mouseup", (ev) => this.onMouseUp(ev))
		document.addEventListener("mouseleave", (ev) => this.onMouseUp(ev))
		this.canvas.onwheel = (ev) => this.onMouseWheel(ev)
        document.onkeydown = (ev) => this.onKeyDown(ev)*/
        
        this.mouseDown = false
        this.mousePos = { x: 0, y: 0 }
        this.mousePosLast = { x: 0, y: 0 }
        this.mousePosDown = { x: 0, y: 0 }
        this.mouseLastClickDate = new Date()
        this.mouseAction = null
        this.mouseHoverElem = null
        this.mouseGrabMoveAllowed = false

        this.dateMoveHandled = new Date()

        this.selectedIds = new Set()
        this.modifyOrigState = null

        this.cameraLookAt = new Vec3(0, 0, 0)
        this.cameraDist = 100000
        this.cameraVertAngle = Math.PI / 4
        this.cameraHorzAngle = 0
		
        this.gl = this.canvas.getContext("webgl", { stencil: true })
        this.scene = new Scene(this.gl)
        this.state = null
        this.dispatch = null
        this.handler = null

        this.cachedModel = new Memoized(model =>
        {
            if (!model.modelBuilder)
                return null
            
            return model.modelBuilder.makeModel(this.scene.gl)
        })

        this.cachedCollision = new Memoized(model =>
        {
            if (!model.modelBuilder)
                return new CollisionMesh()
            
            return model.modelBuilder.makeCollision()
        })

        this.resize()
    }


    setState(state, dispatch)
    {
        this.state = state
        this.dispatch = dispatch
    }


    setHandler(handler)
    {
        this.handler = handler
    }
    
    
    resize()
    {
		const rect = this.canvas.getBoundingClientRect()
		
		this.width = this.canvas.width = rect.width
        this.height = this.canvas.height = rect.height
        
        this.render()
    }
	
	
	transformEventMouse(ev)
	{
		let rect = this.canvas.getBoundingClientRect()
		
		return {
			x: ev.clientX - rect.left,
			y: ev.clientY - rect.top
		}
	}
	
	
	getScreenRay(x, y)
	{
		let camera = this.getCamera()
		
		let xViewport = (x / this.width) * 2 - 1
		let yViewport = (y / this.height) * 2 - 1
		
		let matrix = camera.view.mul(camera.projection).invert()
		
		let near = matrix.mulVec4([xViewport, -yViewport, -1, 1])
		let far = matrix.mulVec4([xViewport, -yViewport, 1, 1])
			
		near = new Vec3(near[0], near[1], near[2]).scale(1 / near[3])
		far = new Vec3(far[0], far[1], far[2]).scale(1 / far[3])
		
		return { origin: near, direction: far.sub(near).normalize() }
	}


	getHoverElement(elems, camera, ray, hit)
	{
        if (!elems)
            return null
        
		let hoverElem = null
		
		let minDistToCamera = (hit ? hit.dist : Infinity) + 1000
		let minDistToPoint = Infinity
		for (const elem of elems)
		{
			let distToCamera = elem.pos.sub(camera.eye).magn()
			if (distToCamera >= minDistToCamera)
				continue
			
			let scale = 200
			
			let pointDistToRay = Geometry.linePointDistance(ray.origin, ray.direction, elem.pos)
			
			if (pointDistToRay < scale * 4 && pointDistToRay < minDistToPoint)
			{
				hoverElem = elem
				minDistToCamera = distToCamera
				minDistToPoint = pointDistToRay
			}
		}
		
		return hoverElem
	}
	
	
	transformWorldToScreen(pos, camera = null)
	{
		camera = camera || this.getCamera()
		
		let p = camera.projection.transpose().mul(camera.view.transpose()).mulVec4([pos.x, pos.y, pos.z, 1])
		
		p[0] /= p[3]
		p[1] /= p[3]
		p[2] /= p[3]
		
		return {
			x: (p[0] + 1) / 2 * this.width,
			y: (1 - (p[1] + 1) / 2) * this.height,
			z: p[2],
			w: p[3]
		}
	}


    onMouseDown(ev)
    {
        if (this.mouseDown)
            return

        this.mouseDown = true
        this.mousePos = this.mousePosDown = this.mousePosLast = this.transformEventMouse(ev)
        this.mouseGrabMoveAllowed = false

		const ray = this.getScreenRay(this.mousePos.x, this.mousePos.y)
		const camera = this.getCamera()
        
        const collision = this.cachedCollision.get(this.state.model)
		const hit = collision.raycast(ray.origin, ray.direction)
		const distToHit = (hit == null ? 1000000 : hit.distScaled)
		
        const doubleClick = (new Date().getTime() - this.mouseLastClickDate.getTime()) < 300
        this.mouseLastClickDate = new Date()

        this.mouseAction = null
        
        if (ev.button == 1 || ev.shiftKey)
        {
            this.mouseAction = "pan"
        }
        else if (ev.button == 2 && doubleClick)
        {
            if (hit != null)
            {
                this.cameraLookAt = hit.position
                this.cameraDist = 8000
            }
        }
        else if (ev.button == 2)
        {
            this.mouseAction = "orbit"
        }
        else if (ev.button == 0 && this.handler)
        {
            const elems = this.handler.getElements(this)

            if (!ev.ctrlKey)
                this.selectedIds.clear()

            const elem = this.getHoverElement(elems, camera, ray, hit)
            if (elem)
                this.selectedIds.add(elem.kind + elem.index)

            this.modifyOrigState = this.state
            
            this.handler.onMouseDown(this, ev, this.mousePos, camera, ray, hit)
            this.mouseAction = "grab"
        }

        this.render()
    }


    onMouseMove(ev)
    {
        const date = new Date()
        if (date.getTime() - this.dateMoveHandled.getTime() < 1000 / 70)
            return

        this.dateMoveHandled = date

        this.mousePosLast = this.mousePos
        this.mousePos = this.transformEventMouse(ev)

        const mouseDownDelta = {
            x: this.mousePos.x - this.mousePosDown.x,
            y: this.mousePos.y - this.mousePosDown.y,
        }

        if (Math.abs(mouseDownDelta.x) > 4 || Math.abs(mouseDownDelta.y) > 4)
            this.mouseGrabMoveAllowed = true

		const ray = this.getScreenRay(this.mousePos.x, this.mousePos.y)
		const camera = this.getCamera()
		
        const collision = this.cachedCollision.get(this.state.model)
		const hit = collision.raycast(ray.origin, ray.direction)
		
        let dx = this.mousePos.x - this.mousePosLast.x
        let dy = this.mousePos.y - this.mousePosLast.y

        if (this.mouseDown)
        {
            if (this.mouseAction == "pan")
            {
				let matrix = camera.view
				let delta = matrix.mulDirection(new Vec3(
                    -dx * this.cameraDist / 500,
                    -dy * this.cameraDist / 500,
                    0))
				
				this.cameraLookAt = this.cameraLookAt.add(delta)
            }
            else if (this.mouseAction == "orbit")
            {
				this.cameraHorzAngle += dx * 0.0075
				this.cameraVertAngle += dy * 0.0075
				
				this.cameraVertAngle = Math.max(-Math.PI / 2 + 0.0001, Math.min(Math.PI / 2 - 0.0001, this.cameraVertAngle))
            }
            else if (this.handler)
            {
                if (this.mouseAction == "grab" && this.mouseGrabMoveAllowed)
                {
                    this.handler.onMouseGrabMove(this, (pos) =>
                    {
                        let screenPosMoved = this.transformWorldToScreen(pos, camera)
                        screenPosMoved.x += mouseDownDelta.x
                        screenPosMoved.y += mouseDownDelta.y
                        let pointRayMoved = this.getScreenRay(screenPosMoved.x, screenPosMoved.y)
                        
                        let hit = collision.raycast(pointRayMoved.origin, pointRayMoved.direction)
                        if (hit != null)
                            return hit.position

                        let screenPos = this.transformWorldToScreen(pos, camera)
                        let pointRay = this.getScreenRay(screenPos.x, screenPos.y)
                        let origDistToScreen = pos.sub(pointRay.origin).magn()
                        
                        return pointRayMoved.origin.add(pointRayMoved.direction.scale(origDistToScreen))
                    })
                }
                else
                    this.handler.onMouseMove(this, ev, this.mousePos, camera, ray, hit)
            }
        }
        else if (this.handler)
        {
            const elems = this.handler.getElements(this)
            this.mouseHoverElem = this.getHoverElement(elems, camera, ray, hit)
        }
        
        this.render()
    }


    onMouseUp(ev)
    {
        if (!this.mouseDown)
            return
        
        this.mouseDown = false
    }


    onMouseWheel(ev)
    {
		if (ev.deltaY > 0)
			this.cameraDist = Math.min(500000, this.cameraDist * 1.25)
		else if (ev.deltaY < 0)
            this.cameraDist = Math.max(1000, this.cameraDist / 1.25)
            
        this.render()
	}


    getCamera()
    {
        let lookAt = this.cameraLookAt

		let eyeZDist = Math.cos(this.cameraVertAngle)
		
		let eye = new Vec3(
			lookAt.x + Math.cos(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
			lookAt.y - Math.sin(this.cameraHorzAngle) * this.cameraDist * eyeZDist,
            lookAt.z - Math.sin(this.cameraVertAngle) * this.cameraDist)

        let up = new Vec3(0, 0, -1)

        let view = Mat4.lookat(eye, lookAt, up)
        let projection = Mat4.perspective(30 * Math.PI / 180, this.width / this.height, 100, 1000000)
            
        return {
            lookAt,
            eye,
            up,
            view,
            projection,
        }
    }


    render()
    {
        if (!this.state)
            return
        
        this.scene.begin()
        this.scene.viewport(0, 0, this.width, this.height)
        this.scene.clear(0, 0, 0, 1, 1)

        const camera = this.getCamera()    
        this.scene.setProjection(camera.projection)
        this.scene.setView(camera.view)

        const model = this.cachedModel.get(this.state.model)
        if (model)
            this.scene.drawModel(model, this.scene.material, [1, 1, 1, 1])

        if (this.handler)
            this.handler.render(this)
    }
}