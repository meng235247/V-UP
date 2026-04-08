$path = "c:\Users\roksn\.gemini\antigravity\scratch\v-up"
$port = 8090
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server started on port $port"
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $filepath = $req.Url.LocalPath
        if ($filepath -eq "/") { $filepath = "/index.html" }
        $full = Join-Path $path $filepath
        
        Write-Host "Request: $filepath"
        
        if (Test-Path $full -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($full)
            $res.ContentLength64 = $bytes.Length
            
            if ($filepath -match "\.html$") { $res.ContentType = "text/html; charset=utf-8" }
            elseif ($filepath -match "\.css$") { $res.ContentType = "text/css; charset=utf-8" }
            elseif ($filepath -match "\.js$") { $res.ContentType = "application/javascript" }
            elseif ($filepath -match "\.png$") { $res.ContentType = "image/png" }
            elseif ($filepath -match "\.svg$") { $res.ContentType = "image/svg+xml" }
            elseif ($filepath -match "\.jpg$|\.jpeg$") { $res.ContentType = "image/jpeg" }
            
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
        }
        $res.Close()
    } catch {
        Write-Host "Error: $_"
    }
}
