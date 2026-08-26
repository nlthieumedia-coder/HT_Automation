$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$binDir = Join-Path $projectDir "bin"
$ffmpegExe = Join-Path $binDir "ffmpeg.exe"
$zipFile = Join-Path $projectDir "ffmpeg_download.zip"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

if (-not (Test-Path $ffmpegExe)) {
    Write-Host "Downloading standalone FFmpeg for Windows..."
    $url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    $wc = New-Object System.Net.WebClient
    $wc.Headers.Add("User-Agent", "Mozilla/5.0")
    $wc.DownloadFile($url, $zipFile)
    Write-Host "Downloaded zip file size: $((Get-Item $zipFile).Length) bytes"

    Write-Host "Extracting ffmpeg.exe..."
    $extractTemp = Join-Path $projectDir "ffmpeg_temp"
    Expand-Archive -Path $zipFile -DestinationPath $extractTemp -Force

    $foundExe = Get-ChildItem -Path $extractTemp -Filter "ffmpeg.exe" -Recurse | Select-Object -ExpandProperty FullName -First 1
    if ($foundExe) {
        Copy-Item $foundExe $ffmpegExe -Force
        Write-Host "FFmpeg successfully saved to: $ffmpegExe"
    } else {
        throw "ffmpeg.exe not found inside extracted zip"
    }

    # Clean up temp files
    Remove-Item $zipFile -Force -ErrorAction SilentlyContinue
    Remove-Item $extractTemp -Recurse -Force -ErrorAction SilentlyContinue
}

if (Test-Path $ffmpegExe) {
    Write-Host "FFmpeg is ready at: $ffmpegExe ($((Get-Item $ffmpegExe).Length) bytes)"
}
