param(
    [Parameter(Mandatory = $true)][string]$PackageRoot,
    [Parameter(Mandatory = $true)][ValidateSet("Install", "UpdateLocal", "Repair", "Uninstall")][string]$Action
)
$ErrorActionPreference = "Stop"

$isAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdministrator) {
    $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ('"{0}"' -f $PSCommandPath), "-PackageRoot", ('"{0}"' -f $PackageRoot), "-Action", $Action)
    try {
        $elevated = Start-Process powershell.exe -Verb RunAs -Wait -PassThru -ArgumentList $arguments
        exit $elevated.ExitCode
    } catch {
        Write-Host "Khong nhan duoc quyen Administrator: $($_.Exception.Message)" -ForegroundColor Red
        exit 1223
    }
}

$logDir = Join-Path $env:TEMP "HT_Automation_Logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logPath = Join-Path $logDir ("{0}_{1}.log" -f $Action, (Get-Date -Format "yyyyMMdd_HHmmss"))
$success = $false
try {
    Start-Transcript -LiteralPath $logPath -Force | Out-Null
    Write-Host "HT_Automation - $Action" -ForegroundColor Cyan
    Write-Host "Nhat ky: $logPath" -ForegroundColor DarkGray
    switch ($Action) {
        "Install" { & (Join-Path $PackageRoot "installer\install.ps1") -PackageRoot $PackageRoot }
        "UpdateLocal" { & (Join-Path $PackageRoot "installer\install.ps1") -PackageRoot $PackageRoot }
        "Repair" { & (Join-Path $PackageRoot "installer\install.ps1") -PackageRoot $PackageRoot -Repair }
        "Uninstall" { & (Join-Path $PackageRoot "installer\uninstall.ps1") }
    }
    $success = $true
} catch {
    $message = "THAO TAC THAT BAI.`n`n$($_.Exception.Message)`n`nNhat ky: $logPath"
    Write-Host $message -ForegroundColor Red
    try {
        Add-Type -AssemblyName PresentationFramework
        [System.Windows.MessageBox]::Show($message, "HT_Automation - Loi", "OK", "Error") | Out-Null
    } catch {}
} finally {
    try { Stop-Transcript | Out-Null } catch {}
}

if ($success) {
    Write-Host "THAO TAC HOAN TAT THANH CONG." -ForegroundColor Green
    exit 0
}
exit 1
