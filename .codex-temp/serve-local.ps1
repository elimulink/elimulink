$root = (Resolve-Path 'dist-institution').Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://127.0.0.1:5175/')
$listener.Start()
function Get-MimeType([string]$file) {
  switch ([IO.Path]::GetExtension($file).ToLowerInvariant()) {
    '.html' { 'text/html; charset=utf-8' }
    '.js' { 'application/javascript; charset=utf-8' }
    '.css' { 'text/css; charset=utf-8' }
    '.json' { 'application/json; charset=utf-8' }
    '.svg' { 'image/svg+xml' }
    '.png' { 'image/png' }
    '.jpg' { 'image/jpeg' }
    '.jpeg' { 'image/jpeg' }
    '.ico' { 'image/x-icon' }
    default { 'application/octet-stream' }
  }
}
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $req = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($req) -or $req -eq 'institution' -or $req.StartsWith('institution/')) { $req = 'index.html' }
    $full = Join-Path $root $req
    if (-not (Test-Path $full -PathType Leaf)) { $full = Join-Path $root 'index.html' }
    $bytes = [IO.File]::ReadAllBytes($full)
    $ctx.Response.StatusCode = 200
    $ctx.Response.ContentType = Get-MimeType $full
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } finally {
    $ctx.Response.OutputStream.Close()
    $ctx.Response.Close()
  }
}
