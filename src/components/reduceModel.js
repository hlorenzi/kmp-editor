import KclLoader from "../util/kclLoader.js"
import fs from "fs"


export default function reduceModel(state, action)
{
    switch (action.type)
    {
        case "modelOpenKcl":
        {
            if (action.filename == null)
                return state
            
            const kclData = fs.readFileSync(action.filename)
            const modelBuilder = KclLoader.load(kclData, {})
            
            return {
                ...state,
                model: {
                    filename: action.filename,
                    modelBuilder,
                }
            }
        }
    }
}