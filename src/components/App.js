import React from "react"
import Electron from "electron"
import TableView from "./TableView.js"
import ThreeDView from "./ThreeDView.js"
import reduceKmp from "./reduceKmp.js"
import reduceModel from "./reduceModel.js"
import KmpData from "../util/kmpData.js"


function reduceState(state, action)
{
    switch (action.type)
    {
        case "init":
            return {
                kmp: {
                    filename: null,
                    data: new KmpData(),
                },
                model: {
                    filename: null,
                },
                sectionTab: "ENPH",
            }

        case "set":
            return { ...state, ...action.state }

        case "setKmpData":
            return { ...state, kmp: { ...state.kmp, data: action.data } }

        default:
            state = reduceKmp(state, action) || state
            state = reduceModel(state, action) || state
            console.log(action, state)
            return state
    }
}


export default function App(props)
{
    const [state, dispatch] = React.useReducer(reduceState, null, () => reduceState(null, { type: "init" }))

    return <>
        <div style={{
            backgroundColor: "#eee",
            display: "grid",
            gridTemplate: "auto 1fr / 1fr",
            width: "100vw",
            height: "100vh",
        }}>
            <AppToolbar state={state} dispatch={dispatch}/>
            <div style={{
                display: "grid",
                gridTemplate: "auto / 1fr 1fr",
                width: "100%",
                height: "100%",
            }}>
                <TableView state={state} dispatch={dispatch}/>
                <ThreeDView state={state} dispatch={dispatch}/>
            </div>
        </div>
    </>
}


function AppToolbar(props)
{
    const kmpOpen = () =>
    {
		let filters =
			[ { name: "KMP file (*.kmp)", extensions: ["kmp"] } ]
			
		let result = Electron.remote.dialog.showOpenDialogSync({ properties: ["openFile"], filters })
		if (result)
            props.dispatch({ type: "kmpOpen", filename: result[0] })
    }

    const modelOpenKcl = () =>
    {
		let filters =
			[ { name: "Supported model formats (*.obj, *.brres, *.kcl)", extensions: ["obj", "brres", "kcl"] } ]
			
		let result = Electron.remote.dialog.showOpenDialogSync({ properties: ["openFile"], filters })
		if (result)
            props.dispatch({ type: "modelOpenKcl", filename: result[0] })
    }

    return <div style={{
        display: "grid",
        gridTemplate: "auto auto / auto auto 1fr",
        padding: "0.5em",
    }}>
        <div>KMP</div>
        <div>Model</div>
        <div/>

        <div style={{ marginRight: "1em" }}>
            <button
                title="New"    
            >
                📄
            </button>
            
            <button
                title="Open..."    
                onClick={ kmpOpen }
            >
                📂
            </button>

            <button
                title="Save"    
            >
                💾
            </button>

            <button
                title="Save as..."    
            >
                💾 As...
            </button>
        </div>
        
        <div>
            <button
                title="New"    
            >
                📄
            </button>
            
            <button
                title="Open..."
                onClick={ modelOpenKcl }
            >
                📂
            </button>
        </div>
    </div>
}