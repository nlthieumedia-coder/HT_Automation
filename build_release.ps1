$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $projectDir "dist"
$manifestPath = Join-Path $projectDir "manifest.json"
$ffmpegPath = Join-Path $projectDir "bin\ffmpeg.exe"
$addonPath = Join-Path $projectDir "win\x64\ffmpeg-bridge.uxpaddon"
$nodeBuildScript = Join-Path $projectDir "build_ccx.js"
$buildToolsDir = Join-Path $projectDir ".build-tools"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TAO BO CAI HT_AUTOMATION CHO WINDOWS X64" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (-not [Environment]::Is64BitOperatingSystem) {
    throw "Bo cai nay chi ho tro Windows x64."
}

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Khong tim thay manifest.json."
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $manifest.id -or -not $manifest.version) {
    throw "manifest.json thieu id hoac version."
}

if (-not (Test-Path -LiteralPath $ffmpegPath -PathType Leaf)) {
    Write-Host "Chua co FFmpeg. Dang tai tu nguon duoc khai bao trong download_ffmpeg.ps1..." -ForegroundColor Yellow
    & (Join-Path $projectDir "download_ffmpeg.ps1")
}

if (-not (Test-Path -LiteralPath $ffmpegPath -PathType Leaf)) {
    throw "Khong the chuan bi bin\ffmpeg.exe."
}

if ((Get-Item -LiteralPath $ffmpegPath).Length -lt 1MB) {
    throw "bin\ffmpeg.exe co kich thuoc bat thuong; huy dong goi."
}

if (-not (Test-Path -LiteralPath $addonPath -PathType Leaf)) {
    throw "Thieu native addon: win\x64\ffmpeg-bridge.uxpaddon"
}

if (-not (Test-Path -LiteralPath $nodeBuildScript -PathType Leaf)) {
    throw "Thieu build_ccx.js."
}

$nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -and (Test-Path -LiteralPath "C:\Program Files\nodejs\node.exe")) {
    $nodeExe = "C:\Program Files\nodejs\node.exe"
}
if (-not $npmCmd -and (Test-Path -LiteralPath "C:\Program Files\nodejs\npm.cmd")) {
    $npmCmd = "C:\Program Files\nodejs\npm.cmd"
}
if (-not $nodeExe -or -not $npmCmd) {
    throw "Can Node.js LTS tren may phat trien de tao CCX dung chuan Adobe."
}

$archiverModule = Join-Path $buildToolsDir "node_modules\archiver"
if (-not (Test-Path -LiteralPath $archiverModule)) {
    Write-Host "Dang cai cong cu dong goi archiver vao .build-tools..." -ForegroundColor Yellow
    & $npmCmd install --prefix $buildToolsDir --no-save --no-audit --no-fund archiver@7.0.1
    if ($LASTEXITCODE -ne 0) {
        throw "Khong cai duoc cong cu dong goi archiver."
    }
}

$requiredFiles = @(
    "manifest.json",
    "index.html",
    "index.js",
    "icons\plugin-icon.svg",
    "icons\panel-dark.svg",
    "icons\panel-light.svg",
    "win\x64\ffmpeg-bridge.uxpaddon",
    "bin\ffmpeg.exe",
    "bin\ffmpeg_bridge_server.ps1",
    "CHAY_FFMPEG_BRIDGE.bat",
    "THIRD_PARTY_NOTICES.md",
    "HUONG_DAN_CAI_DAT.txt"
)

foreach ($relativePath in $requiredFiles) {
    $sourcePath = Join-Path $projectDir $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Thieu file bat buoc: $relativePath"
    }
}

if (-not (Test-Path -LiteralPath $distDir)) {
    New-Item -ItemType Directory -Path $distDir | Out-Null
}

$tempRoot = [System.IO.Path]::GetTempPath()
$stageDir = Join-Path $tempRoot ("HT_Automation_CCX_" + [Guid]::NewGuid().ToString("N"))
# Match the filename convention used by Adobe UXP Developer Tool.
$packageName = "{0}_{1}.ccx" -f $manifest.id, $manifest.host.app
$packagePath = Join-Path $distDir $packageName

try {
    New-Item -ItemType Directory -Path $stageDir | Out-Null

    foreach ($relativePath in $requiredFiles) {
        $sourcePath = Join-Path $projectDir $relativePath
        $targetPath = Join-Path $stageDir $relativePath
        $targetParent = Split-Path -Parent $targetPath
        if (-not (Test-Path -LiteralPath $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
    }

    if (Test-Path -LiteralPath $packagePath) {
        Remove-Item -LiteralPath $packagePath -Force
    }

    $previousNodePath = $env:NODE_PATH
    try {
        $env:NODE_PATH = Join-Path $buildToolsDir "node_modules"
        & $nodeExe $nodeBuildScript $stageDir $packagePath
        if ($LASTEXITCODE -ne 0) {
            throw "Cong cu dong goi CCX tra ve ma loi $LASTEXITCODE."
        }
    } finally {
        $env:NODE_PATH = $previousNodePath
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($packagePath)
    try {
        $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace("/", "\") })
        foreach ($relativePath in $requiredFiles) {
            if ($entryNames -notcontains $relativePath) {
                throw "Kiem tra goi that bai, thieu: $relativePath"
            }
        }
    } finally {
        $archive.Dispose()
    }

    $hash = (Get-FileHash -LiteralPath $packagePath -Algorithm SHA256).Hash
    $sizeMB = [math]::Round((Get-Item -LiteralPath $packagePath).Length / 1MB, 2)

    Write-Host ""
    Write-Host "TAO BO CAI THANH CONG" -ForegroundColor Green
    Write-Host "File   : $packagePath" -ForegroundColor Green
    Write-Host "Dung luong: $sizeMB MB"
    Write-Host "SHA-256: $hash"
    Write-Host ""
    Write-Host "May khac chi can nhap dup file .ccx va chon Install." -ForegroundColor Cyan
} finally {
    $resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
    $resolvedStage = [System.IO.Path]::GetFullPath($stageDir)
    if ($resolvedStage.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Test-Path -LiteralPath $resolvedStage)) {
        Remove-Item -LiteralPath $resolvedStage -Recurse -Force
    }
}
