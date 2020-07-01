import React from "react"
import Scene from "../gl/scene.js"
import CollisionMesh from "../util/collisionMesh.js"
import Mat4 from "../math/mat4.js"
import Vec3 from "../math/vec3.js"


export default function Table(props)
{
    const gridTemplate = React.useMemo(() =>
    {
        let res = "auto / auto "
        for (const col in props.columns)
            res += "auto "

        res += "1fr"

        return res

    }, [props.columns])

    const headerStyle =
    {
        backgroundColor: "#ddd",
        borderTop: "1px solid #ccc",
        borderRight: "1px solid #ccc",
        borderBottom: "1px solid #888",
        textAlign: "center",
        fontWeight: "bold",
        padding: "0.25em",
        minWidth: 0,
        minHeight: 0,
        position: "sticky",
        top: 0,
    }

    const indexHeaderStyle =
    {
        ...headerStyle,
        backgroundColor: "#ddd",
        borderLeft: "1px solid #ccc",
        position: "sticky",
        left: 0,
        zIndex: 1,
    }

    const cellStyle =
    {
        backgroundColor: "#fff",
        borderRight: "1px solid #ccc",
        borderBottom: "1px solid #ccc",
        padding: "0.25em",
        minWidth: 0,
        minHeight: 0,
    }

    const indexStyle =
    {
        ...cellStyle,
        backgroundColor: "#ddd",
        borderLeft: "1px solid #ccc",
        position: "sticky",
        left: 0,
    }

    const getCellDisplay = (mode, value) =>
    {
        switch (mode)
        {
            case "decHex":
                return value.toString(16)
                return value.toString() + " (0x" + value.toString(16) + ")"

            default:
                return value.toString()
        }
    }


    return <>
        <div style={{
            display: "grid",
            gridTemplate: gridTemplate,
            alignContent: "start",
            alignItems: "stretch",
            width: "max-content",
            height: "max-content",
            ...props.style,
        }}>
            <div style={ indexHeaderStyle }>
                Index
            </div>

            { props.columns.map((col, c) => <div key={ c } style={ headerStyle }>

                { col.title }

            </div>)}

            <div/>
            
            { props.rows.map((row, r) => <React.Fragment key={ r }>

                <div style={ indexStyle }>
                    { getCellDisplay("decHex", r) }
                </div>

                { props.columns.map((col, c) => <div key={ c } style={ cellStyle }>

                    { getCellDisplay(col.mode, row[c]) }

                </div>)}

                <div/>

            </React.Fragment> )}
        </div>
    </>
}