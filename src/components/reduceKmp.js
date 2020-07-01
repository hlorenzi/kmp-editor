import KmpData from "../util/kmpData.js"
import reduceModel from "./reduceModel.js"
import fs from "fs"


export default function reduceKmp(state, action)
{
    switch (action.type)
    {
        case "kmpOpen":
        {
            if (action.filename == null)
                return state
            
            const bytes = fs.readFileSync(action.filename)
            const data = KmpData.load(bytes)
            
            state = {
                ...state,
                kmp: {
                    filename: action.filename,
                    data,
                }
            }

            let courseKclFilename = action.filename.replace(/\\/g, "/")
            courseKclFilename = courseKclFilename
                .substr(0, courseKclFilename.lastIndexOf("/")) + "/course.kcl"

            console.log(courseKclFilename)
            if (fs.existsSync(courseKclFilename))
            {
                state = reduceModel(state, {
                    type: "modelOpenKcl",
                    filename: courseKclFilename
                })
            }

            return state
        }
    }
}