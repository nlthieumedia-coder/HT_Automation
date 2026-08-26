$ErrorActionPreference = "Stop"

if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) {
    throw "Hay dong hoan toan Adobe Premiere Pro truoc khi go HT_Automation."
}

Write-Host "Dang dung FFmpeg Bridge..." -ForegroundColor Cyan
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $runKey -Name "HT_Automation_FFmpeg_Bridge" -ErrorAction SilentlyContinue
$connections = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 19888 -ErrorAction SilentlyContinue
foreach ($connection in $connections) {
    if ($connection.OwningProcess -and $connection.OwningProcess -ne $PID) {
        Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Dang xoa runtime Bridge, FFmpeg va Whisper..." -ForegroundColor Cyan
$localRoot = [System.IO.Path]::GetFullPath($env:LOCALAPPDATA)
$automationRoot = [System.IO.Path]::GetFullPath((Join-Path $localRoot "HT_Automation"))
if (-not $automationRoot.StartsWith($localRoot, [StringComparison]::OrdinalIgnoreCase) -or [System.IO.Path]::GetFileName($automationRoot) -ne "HT_Automation") {
    throw "Duong dan runtime khong an toan; huy go cai dat."
}
if (Test-Path -LiteralPath $automationRoot) {
    Remove-Item -LiteralPath $automationRoot -Recurse -Force
}
$desktopUpdater = Join-Path ([Environment]::GetFolderPath("Desktop")) "CAP_NHAT_HT_AUTOMATION.bat"
if (Test-Path -LiteralPath $desktopUpdater -PathType Leaf) { Remove-Item -LiteralPath $desktopUpdater -Force }

Write-Host "Dang xoa plugin UXP HT_Automation..." -ForegroundColor Cyan
$externalRoot = [System.IO.Path]::GetFullPath((Join-Path $env:APPDATA "Adobe\UXP\Plugins\External"))
$roamingRoot = [System.IO.Path]::GetFullPath($env:APPDATA)
if (-not $externalRoot.StartsWith($roamingRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Duong dan UXP khong an toan; huy go cai dat."
}
if (Test-Path -LiteralPath $externalRoot -PathType Container) {
    $pluginFolders = Get-ChildItem -LiteralPath $externalRoot -Directory -Force | Where-Object {
        $_.Name -match '^com\.hieuyt\.htautomation(?:[._]|$)'
    }
    foreach ($pluginFolder in $pluginFolders) {
        $resolvedPlugin = [System.IO.Path]::GetFullPath($pluginFolder.FullName)
        if ($resolvedPlugin.StartsWith($externalRoot, [StringComparison]::OrdinalIgnoreCase)) {
            Remove-Item -LiteralPath $resolvedPlugin -Recurse -Force
            Write-Host "  Da xoa $($pluginFolder.Name)" -ForegroundColor DarkGray
        }
    }
}

Write-Host "Da go HT_Automation, Whisper va FFmpeg Bridge." -ForegroundColor Green
