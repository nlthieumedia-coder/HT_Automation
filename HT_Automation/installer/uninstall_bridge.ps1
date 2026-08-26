$ErrorActionPreference = "Stop"
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $runKey -Name "HT_Automation_FFmpeg_Bridge" -ErrorAction SilentlyContinue
$connections = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 19888 -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
    if ($connection.OwningProcess -and $connection.OwningProcess -ne $PID) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
$runtimeDir = Join-Path $env:LOCALAPPDATA "HT_Automation\Bridge"
if (Test-Path -LiteralPath $runtimeDir) { Remove-Item -LiteralPath $runtimeDir -Recurse -Force }
$whisperDir = Join-Path $env:LOCALAPPDATA "HT_Automation\Whisper"
if (Test-Path -LiteralPath $whisperDir) { Remove-Item -LiteralPath $whisperDir -Recurse -Force }
Write-Host "Da go FFmpeg Bridge va Whisper cua HT_Automation."
