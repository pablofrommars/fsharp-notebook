open System
open System.IO
open System.Text
#r "nuget: FSharp.Data"
#r "nuget: XPlot.Plotly"
#r "nuget: Microsoft.Data.Analysis"
open XPlot.Plotly
open Microsoft.Data.Analysis


type Cell = 
    | SVG of string
    | Markdown of string
    | HTML of string
    | Plotly of PlotlyChart
    | DataFrame of DataFrame
    | Text of obj


let dataframeToHtml (df:Microsoft.Data.Analysis.DataFrame) =
    let sb = new System.Text.StringBuilder("<pre>")
    sb.Append(df.ToString())
    sb.Append("</pre>")
    sb.ToString()

let printerNotebook (content : Cell) =
    let write (extension : string) (str : string) =
        let CACHE_PATH = "cache/notebook"
        let folderExists = System.IO.Directory.Exists(CACHE_PATH)
        if(not folderExists) then System.IO.Directory.CreateDirectory(CACHE_PATH) |> ignore

        let id = Guid.NewGuid().ToString()
        let filename = sprintf "%s/%s.%s" CACHE_PATH id extension
        File.WriteAllText(filename, str)
    match content with
    | SVG svg -> write "svg" svg
    | Markdown md -> write "md" md
    | HTML html -> write "html" html
    | Plotly chart -> chart.Id <- System.Guid.NewGuid().ToString() ; write "html" (chart.GetInlineHtml())
    | DataFrame df -> write "html" (dataframeToHtml df)
    | Text o -> write "txt" (sprintf "%.20A" o)
    |> ignore

    null

fsi.AddPrinter(printerNotebook)
