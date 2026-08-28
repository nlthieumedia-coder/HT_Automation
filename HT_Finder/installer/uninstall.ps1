$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) { throw "Hay dong hoan toan Premiere Pro truoc khi go cai dat." }
$identity = [Security.Principal.WindowsIdentity]::GetCurrent(); $principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw "Can quyen Administrator de go plugin." }
$runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $runKey -Name "HT_Finder_Bridge" -ErrorAction SilentlyContinue
$connections = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 19889 -ErrorAction SilentlyContinue
foreach ($connection in $connections) { if ($connection.OwningProcess -and $connection.OwningProcess -ne $PID) { Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue } }
$localRoot = [IO.Path]::GetFullPath($env:LOCALAPPDATA); $runtimeRoot = [IO.Path]::GetFullPath((Join-Path $localRoot "HT_Finder"))
if (-not $runtimeRoot.StartsWith($localRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($runtimeRoot) -ne "HT_Finder") { throw "Duong dan runtime khong an toan." }
if (Test-Path -LiteralPath $runtimeRoot) { Remove-Item -LiteralPath $runtimeRoot -Recurse -Force }
$externalRoot = [IO.Path]::GetFullPath((Join-Path ${env:CommonProgramFiles} "Adobe\UXP\Plugins\External")); $target = [IO.Path]::GetFullPath((Join-Path $externalRoot "com.hieuyt.htfinder"))
if (-not $target.StartsWith($externalRoot, [StringComparison]::OrdinalIgnoreCase)) { throw "Duong dan plugin khong an toan." }
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
$legacyTarget = Join-Path $env:APPDATA "Adobe\UXP\Plugins\External\com.hieuyt.htfinder"
if (Test-Path -LiteralPath $legacyTarget) { Remove-Item -LiteralPath $legacyTarget -Recurse -Force }
[System.Windows.MessageBox]::Show("Da go HT_Finder va Bridge.", "HT_Finder", "OK", "Information") | Out-Null
