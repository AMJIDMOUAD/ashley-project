# Summit Studio — Local Server (serves static files + SMTP API)
# Run: powershell -ExecutionPolicy Bypass -File server.ps1
# Then open http://localhost:3000

$port = 3000
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "==================================="
Write-Host " Summit Studio Server running"
Write-Host " Open: http://localhost:$port/"
Write-Host " Close this window to stop."
Write-Host "==================================="

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $req = $ctx.Request
  $res = $ctx.Response

  # CORS
  $res.Headers.Add("Access-Control-Allow-Origin", "*")
  $res.Headers.Add("Access-Control-Allow-Methods", "POST, OPTIONS")
  $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

  if ($req.HttpMethod -eq "OPTIONS") {
    $res.StatusCode = 204; $res.Close(); continue
  }

  # --- API: send audit email ---
  if ($req.Url.AbsolutePath -eq "/send-audit" -and $req.HttpMethod -eq "POST") {
    $reader = New-Object System.IO.StreamReader($req.InputStream)
    $body = $reader.ReadToEnd(); $reader.Close()
    $data = $body | ConvertFrom-Json

    $msgBody = "New Free Audit Request`r`n`r`nName: $($data.name)`r`nBusiness: $($data.business)`r`nEmail: $($data.email)`r`nPhone: $($data.phone)"

    try {
      $smtp = New-Object Net.Mail.SmtpClient("smtp.gmail.com", 587)
      $smtp.EnableSsl = $true
      $smtp.Credentials = New-Object System.Net.NetworkCredential("ash8518@gmail.com", "uusp valv sxpg oagw")
      $msg = New-Object Net.Mail.MailMessage("ash8518@gmail.com","ash8518@gmail.com","New Free Audit Request — $($data.name) ($($data.business))",$msgBody)
      $smtp.Send($msg)
      $res.StatusCode = 200
      $bytes = [Text.Encoding]::UTF8.GetBytes('{"ok":true}')
      Write-Host "Email sent: $($data.name) — $($data.business)"
    } catch {
      $res.StatusCode = 500
      $bytes = [Text.Encoding]::UTF8.GetBytes('{"ok":false,"error":"' + $_.Exception.Message.Replace('"','\"') + '"}')
      Write-Host "ERROR: $($_.Exception.Message)"
    }
    $res.OutputStream.Write($bytes,0,$bytes.Length)
    $res.Close()
    continue
  }

  # --- Serve static files ---
  $path = $req.Url.AbsolutePath
  if ($path -eq "/") { $path = "/index.html" }

  $filePath = [System.IO.Path]::Combine($root, $path.TrimStart("/"))
  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $mime = @{
      ".html" = "text/html; charset=utf-8"
      ".css"  = "text/css; charset=utf-8"
      ".js"   = "application/javascript; charset=utf-8"
      ".svg"  = "image/svg+xml"
      ".png"  = "image/png"
      ".jpg"  = "image/jpeg"
      ".ico"  = "image/x-icon"
    }
    $contentType = "application/octet-stream"
    if ($mime.ContainsKey($ext)) { $contentType = $mime[$ext] }
    $res.ContentType = $contentType
    $data = [System.IO.File]::ReadAllBytes($filePath)
    $res.OutputStream.Write($data,0,$data.Length)
  } else {
    $res.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("404 Not Found")
    $res.OutputStream.Write($bytes,0,$bytes.Length)
  }
  $res.Close()
}

$listener.Stop()
