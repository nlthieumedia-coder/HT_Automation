$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$exePath = Join-Path $scriptDir "w64devkit.exe"
$extractPath = Join-Path $scriptDir "w64devkit"

$projectDir = Split-Path -Parent $scriptDir
$outputAddonDir1 = Join-Path $projectDir "addons\win\x64"
$outputAddonDir2 = Join-Path $projectDir "win\x64"
$outputAddonFile1 = Join-Path $outputAddonDir1 "ffmpeg-bridge.uxpaddon"
$outputAddonFile2 = Join-Path $outputAddonDir2 "ffmpeg-bridge.uxpaddon"

if (-not (Test-Path $extractPath)) {
    if (-not (Test-Path $exePath)) {
        Write-Host "Getting latest w64devkit release URL from GitHub..."
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0")
        $apiJson = $wc.DownloadString("https://api.github.com/repos/skeeto/w64devkit/releases/latest")
        $release = ConvertFrom-Json $apiJson
        $url = $null
        foreach ($a in $release.assets) {
            if ($a.name -like "w64devkit-x64-*.exe" -or $a.name -like "w64devkit-*.zip") {
                $url = $a.browser_download_url
                break
            }
        }
        if (-not $url) {
            throw "Could not find w64devkit download URL"
        }
        Write-Host "Downloading from: $url"
        $wc.DownloadFile($url, $exePath)
    }

    Write-Host "Extracting w64devkit..."
    Start-Process -FilePath $exePath -ArgumentList "-o`"$scriptDir`" -y" -Wait -NoNewWindow
}

$binDir = Join-Path $extractPath "bin"
if (-not (Test-Path $binDir)) {
    $binDir = Get-ChildItem -Path $scriptDir -Filter "g++.exe" -Recurse | Select-Object -ExpandProperty DirectoryName -First 1
}

$gpp = Join-Path $binDir "g++.exe"
if (-not $gpp -or -not (Test-Path $gpp)) {
    throw "Compiler g++.exe not found"
}

$env:PATH = "$binDir;$env:PATH"

Write-Host "Compiler found: $gpp"
Write-Host "Compiling ffmpeg_bridge.cpp with dynamic N-API bindings..."

if (-not (Test-Path $outputAddonDir1)) { New-Item -ItemType Directory -Path $outputAddonDir1 -Force | Out-Null }
if (-not (Test-Path $outputAddonDir2)) { New-Item -ItemType Directory -Path $outputAddonDir2 -Force | Out-Null }

$compileArgs = @(
    "-O2",
    "-shared",
    "-s",
    "-Iinclude",
    "-o", $outputAddonFile1,
    "ffmpeg_bridge.cpp",
    "-lkernel32"
)

Write-Host "Running compilation..."
$proc = Start-Process -FilePath $gpp -ArgumentList $compileArgs -Wait -NoNewWindow -PassThru

if ($proc.ExitCode -eq 0 -and (Test-Path $outputAddonFile1)) {
    try {
        Copy-Item $outputAddonFile1 $outputAddonFile2 -Force -ErrorAction SilentlyContinue
    } catch {}
    $fileSize = (Get-Item $outputAddonFile1).Length
    Write-Host "BUILD SUCCESSFUL!"
    Write-Host "Addon built: $outputAddonFile1 ($fileSize bytes)"
} else {
    throw "Build failed with exit code $($proc.ExitCode)"
}
