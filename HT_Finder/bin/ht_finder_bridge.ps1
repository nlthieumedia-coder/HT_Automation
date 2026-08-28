param([int]$Port = 19889)
$ErrorActionPreference = "Stop"
$script:Root = Split-Path -Parent $PSScriptRoot
$script:Ytdlp = Join-Path $script:Root "bin\yt-dlp.exe"

function Send-Json($Context, [int]$Status, $Value) {
  $json = $Value | ConvertTo-Json -Depth 20 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $Context.Response.StatusCode = $Status
  $Context.Response.ContentType = "application/json; charset=utf-8"
  $Context.Response.ContentLength64 = $bytes.Length
  $Context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Context.Response.Close()
}
function Read-Body($Request) {
  $reader = [IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
  try { $raw = $reader.ReadToEnd() } finally { $reader.Dispose() }
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  return $raw | ConvertFrom-Json
}
function Safe-Name([string]$Value) {
  $name = ($Value -replace '[<>:"/\\|?*]', '_').Trim()
  if ($name.Length -gt 70) { $name = $name.Substring(0, 70) }
  if (-not $name) { $name = "broll" }
  return $name
}
function Run-Ytdlp([string[]]$Arguments) {
  if (-not (Test-Path -LiteralPath $script:Ytdlp)) { throw "Khong tim thay yt-dlp.exe: $script:Ytdlp" }
  $output = & $script:Ytdlp @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($output -join "`n") }
  return @($output)
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()
Write-Host "HT_Finder Bridge dang chay tai http://127.0.0.1:$Port/"
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      $route = $context.Request.Url.AbsolutePath.ToLowerInvariant()
      if ($route -eq "/health") {
        Send-Json $context 200 @{ success = $true; bridgeVersion = "2.0.3"; ytdlpPath = $script:Ytdlp; ytdlpReady = (Test-Path -LiteralPath $script:Ytdlp) }
        continue
      }
      $body = Read-Body $context.Request
      if ($route -eq "/youtube-search") {
        $count = [Math]::Max(1, [Math]::Min(100, [int]$body.count))
        $lines = Run-Ytdlp @("ytsearch$($count):$($body.query)", "--dump-json", "--skip-download", "--no-warnings")
        $items = @($lines | Where-Object { $_ -and $_.ToString().TrimStart().StartsWith("{") } | ForEach-Object { $_ | ConvertFrom-Json })
        Send-Json $context 200 @{ success = $true; items = $items }
        continue
      }
      if ($route -eq "/extract") {
        $lines = Run-Ytdlp @("--dump-single-json", "--skip-download", "--no-warnings", [string]$body.url)
        $item = ($lines -join "`n") | ConvertFrom-Json
        Send-Json $context 200 @{ success = $true; item = $item }
        continue
      }
      if ($route -eq "/download") {
        $provider = [string]$body.asset.provider
        $baseDir = [string]$body.baseDir
        $target = [string]$body.overwritePath
        if (-not $target) {
          if (-not $baseDir) { throw "Chua chon thu muc luu B-roll." }
          $providerFolder = switch ($provider) { "pexels" { "Pexels" } "pixabay" { "Pixabay" } "wikimedia" { "Wikimedia" } "youtube" { "YouTube" } default { "DirectURL" } }
          $dir = Join-Path $baseDir "Stock\$providerFolder"
          [IO.Directory]::CreateDirectory($dir) | Out-Null
          $stem = Safe-Name "$($body.asset.title)_$($body.asset.providerAssetId)"
          $mime = [string]$body.option.mimeType
          $ext = if ($mime -match "png") { ".png" } elseif ($mime -match "jpe?g|image") { ".jpg" } elseif ($mime -match "webm") { ".webm" } elseif ($mime -match "ogg") { ".ogv" } else { ".mp4" }
          $target = Join-Path $dir ($stem + $ext)
        } else { [IO.Directory]::CreateDirectory((Split-Path -Parent $target)) | Out-Null }
        if ($provider -in @("youtube", "ytdlp")) {
          $format = if ($body.option.formatCode) { [string]$body.option.formatCode } else { "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" }
          Run-Ytdlp @("-f", $format, "--merge-output-format", "mp4", "-o", $target, [string]$body.option.url) | Out-Null
        } else {
          Invoke-WebRequest -Uri ([string]$body.option.url) -OutFile $target -UseBasicParsing -Headers @{ "User-Agent" = "HT_Finder/2.0" }
        }
        Send-Json $context 200 @{ success = $true; localPath = $target }
        continue
      }
      Send-Json $context 404 @{ success = $false; error = "Endpoint khong ton tai." }
    } catch {
      try { Send-Json $context 500 @{ success = $false; error = $_.Exception.Message } } catch {}
    }
  }
} finally { $listener.Stop(); $listener.Close() }
