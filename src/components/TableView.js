import React from "react"
import Table from "./Table.js"
import Scene from "../gl/scene.js"
import CollisionMesh from "../util/collisionMesh.js"
import Mat4 from "../math/mat4.js"
import Vec3 from "../math/vec3.js"


export default function TableView(props)
{
    if (!props.state.kmp.data)
        return <div/>

    const sectionTabs =
    [
        { id: "ENPH" },
        { id: "ITPH" },
        { id: "GOBJ" },
        { id: "CNPT" },
    ]

    const setSectionTab = (id) =>
    {
        props.dispatch({ type: "set", state: { sectionTab: id } })
    }
    
    return <>
        <div style={{
            display: "grid",
            gridTemplate: "auto 1fr / 1fr",
            width: "100%",
            height: "100%",
            padding: "0.5em",
        }}>
            <div style={{
                marginBottom: "0.5em",
            }}>
                { sectionTabs.map(tab =>
                    <button
                        key={ tab.id }
                        onClick={ () => setSectionTab(tab.id) }
                        style={{
                            border: "2px solid " + (props.state.sectionTab == tab.id ? "#f00" : "#0000"),
                    }}>
                        { tab.id }
                    </button>
                )}
            </div>

            { props.state.sectionTab != "ENPH" ? null :
                <TableViewENPH state={props.state} dispatch={props.dispatch}/>
            }
        </div>
    </>
}


function TableViewENPH(props)
{
    const columns = [
        { title: "Start", mode: "decHex" },
        { title: "Length", mode: "decHex" },
        { title: "Last1", mode: "decHex" },
        { title: "Last2", mode: "decHex" },
        { title: "Last3", mode: "decHex" },
        { title: "Last4", mode: "decHex" },
        { title: "Last5", mode: "decHex" },
        { title: "Last6", mode: "decHex" },
        { title: "Next1", mode: "decHex" },
        { title: "Next2", mode: "decHex" },
        { title: "Next3", mode: "decHex" },
        { title: "Next4", mode: "decHex" },
        { title: "Next5", mode: "decHex" },
        { title: "Next6", mode: "decHex" },
    ]

    const rows = (props.state.kmp.data.enemyPaths || []).map(path => [
        path.startIndex,
        path.pointNum,
        ...path.prevGroups,
        ...path.nextGroups,
    ])

    return <div style={{
    }}>
        <div style={{
            display: "grid",
            gridTemplate: "auto 1fr / 1fr",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: 0,
        }}>
            <div>
            </div>
            
            <div style={{ overflow: "auto", fontSize: "90%" }}>
                <Table columns={ columns } rows={ rows }/>
            </div>
        </div>
    </div>
}