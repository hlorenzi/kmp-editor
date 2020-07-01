import KmpData from "../util/kmpData"
import Mat4 from "../math/mat4.js"
import Vec3 from "../math/vec3"
import Memoized from "../util/memoized.js"


class ThreeDViewHandler
{
    onMouseDown(manager, ev, mousePos, camera, ray, hit)
    {

    }


    onMouseMove(manager, ev, mousePos, camera, ray, hit)
    {

    }
}


export default class ThreeDViewEnph extends ThreeDViewHandler
{
    constructor()
    {
        super()
        this.cachedGraph = new Memoized(data => KmpData.getEnphGraph(data))
        this.cachedElems = new Memoized(enemyPoints =>
        {
            return enemyPoints
        })
    }


    getElements(manager)
    {
        return this.cachedElems.get(manager.state.kmp.data.enemyPoints)
    }


    onMouseGrabMove(manager, fnModifyPos)
    {
        let newEnemyPoints = [...manager.state.kmp.data.enemyPoints]
        
        for (let i = 0; i < newEnemyPoints.length; i++)
        {
            const selectId = newEnemyPoints[i].kind + newEnemyPoints[i].index
            
            if (!manager.selectedIds.has(selectId))
                continue

            newEnemyPoints[i] = {
                ...newEnemyPoints[i],
                pos: fnModifyPos(manager.modifyOrigState.kmp.data.enemyPoints[i].pos),
            }
        }

        const newKmpData = {
            ...manager.state.kmp.data,
            enemyPoints: newEnemyPoints,
        }
        manager.dispatch({ type: "setKmpData", data: newKmpData })
    }


    render(manager)
    {
        const graph = this.cachedGraph.get(manager.state.kmp.data)

        const colorCore = [1, 0, 0, 1]
        const colorPath = [1, 0.75, 0, 1]
        const colorRadius = [1, 0.5, 0, 0.5]
        const colorSelectedOutline = [1, 0.5, 0.5, 1]

        manager.scene.doStencilStampPass(() =>
        {
            for (const node of graph.nodes)
            {
                const scale = node.size * 100
                manager.scene.pushTranslationScale(
                    node.pos.x, node.pos.y, node.pos.z,
                    scale, scale, scale)
                manager.scene.drawModel(
                    manager.scene.modelPoint,
                    manager.scene.materialUnshaded,
                    colorRadius)
                manager.scene.popTranslationScale()
            }
        })

        for (const node of graph.nodes)
        {
            manager.scene.drawPoint(
                node.pos,
                manager.mouseHoverElem && manager.mouseHoverElem.index === node.index ? 300 : 200,
                colorCore)

            for (const nextNode of node.next)
            {
                manager.scene.drawArrow(
                    node.pos,
                    nextNode.node.pos,
                    100,
                    colorPath)
            }
        }

        manager.scene.clearDepth()
        
        for (const node of graph.nodes)
        {
            if (!manager.selectedIds.has(node.kind + node.index))
                continue
            
            manager.scene.drawPointSelected(
                node.pos,
                manager.mouseHoverElem && manager.mouseHoverElem.index === node.index ? 300 : 200,
                colorCore,
                colorSelectedOutline)
        }
    }
}