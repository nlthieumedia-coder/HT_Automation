param([Parameter(Mandatory = $true)][string]$PackageRoot)
$ErrorActionPreference = "Stop"
$packageRootPath = [System.IO.Path]::GetFullPath($PackageRoot)
$ccx = Get-ChildItem -LiteralPath $packageRootPath -Filter "*.ccx" -File | Select-Object -First 1
$bridgeSource = Join-Path $packageRootPath "payload\ffmpeg_bridge_server.ps1"
if (-not $ccx) { throw "Khong tim thay file CCX. Hay giai nen day du bo cai." }
if (-not (Test-Path -LiteralPath $bridgeSource -PathType Leaf)) { throw "Bo cai thieu FFmpeg Bridge." }

$runtimeDir = Join-Path $env:LOCALAPPDATA "HT_Automation\Bridge"
$bridgeTarget = Join-Path $runtimeDir "ffmpeg_bridge_server.ps1"
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
Copy-Item -LiteralPath $bridgeSource -Destination $bridgeTarget -Force

$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$runCommand = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $bridgeTarget
New-Item -Path $runKey -Force | Out-Null
New-ItemProperty -Path $runKey -Name "HT_Automation_FFmpeg_Bridge" -Value $runCommand -PropertyType String -Force | Out-Null

$ready = $false
try {
    $health = Invoke-RestMethod "http://127.0.0.1:19888/health" -TimeoutSec 2
    $ready = $health.status -eq "ok"
} catch {}
if (-not $ready) {
    Start-Process "powershell.exe" -ArgumentList @("-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", ('"{0}"' -f $bridgeTarget)) -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        Start-Sleep -Milliseconds 300
        try {
            $health = Invoke-RestMethod "http://127.0.0.1:19888/health" -TimeoutSec 1
            if ($health.status -eq "ok") { $ready = $true; break }
        } catch {}
    }
}
if (-not $ready) { throw "Khong khoi dong duoc FFmpeg Bridge tai cong 19888." }

Write-Host "FFmpeg Bridge da duoc cai va dang chay." -ForegroundColor Green
Write-Host "Dang mo Creative Cloud..." -ForegroundColor Cyan
Start-Process -FilePath $ccx.FullName
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show("Bridge da duoc cai va se tu khoi dong cung Windows.`n`nTrong Creative Cloud, chon Install. Sau do mo lai Premiere Pro.", "HT_Automation - Cai dat", "OK", "Information") | Out-Null
