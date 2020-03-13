open System
open System.IO

type Content = 
    | SVG of string
    | Markdown of string
    | HTML of string
    | Text of string

let printerNotebook (content : Content) =
    let write (extension : string) (str : string) =
        File.WriteAllText("Notebook/" + Guid.NewGuid().ToString() + "." + extension, str)
    match content with
    | SVG svg -> write "svg" svg
    | Markdown md -> write "md" md
    | HTML html -> write "html" html
    | Text txt -> write "txt" txt
    |> ignore

    null

fsi.AddPrinter(printerNotebook)