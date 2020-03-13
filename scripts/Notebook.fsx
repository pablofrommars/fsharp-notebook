open System
open System.IO

type Content = 
    | SVG of string
    | Markdown of string
    | HTML of string
    | Text of string

let printerNotebook (content : Content) =
    let writeNotebook (extension : string) (txt : string) =
        File.WriteAllText("Notebook/" + Guid.NewGuid().ToString() + "." + extension, txt)
    match content with
    | SVG svg -> writeNotebook "svg" svg
    | Markdown md -> writeNotebook "md" md
    | HTML html -> writeNotebook "html" html
    | Text txt -> writeNotebook "txt" txt
    |> ignore

    null

fsi.AddPrinter(printerNotebook)