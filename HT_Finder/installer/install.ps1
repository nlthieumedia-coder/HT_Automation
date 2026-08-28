param([string]$PackageRoot = (Split-Path -Parent $PSScriptRoot), [switch]$Repair)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
$root = [IO.Path]::GetFullPath($PackageRoot)
$logPath = Join-Path $root "HT_Finder_Install.log"
try { Start-Transcript -LiteralPath $logPath -Force | Out-Null } catch {}
try {
  if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) { throw "Hay dong hoan toan Premiere Pro truoc khi cai dat." }
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent(); $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw "Bo cai chua co quyen Administrator." }
  $ccx = Join-Path $root "HT_Finder_PremierePro.ccx"
  $bridgeSource = Join-Path $root "payload\bin\ht_finder_bridge.ps1"
  $ytdlpSource = Join-Path $root "payload\bin\yt-dlp.exe"
  foreach ($file in @($ccx, $bridgeSource, $ytdlpSource)) { if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Bo cai thieu file: $file" } }
  $manifestText = & tar.exe -xOf $ccx manifest.json
  if (-not $manifestText) { throw "Khong doc duoc manifest trong CCX." }
  $manifest = $manifestText | ConvertFrom-Json
  if ($manifest.id -ne "com.hieuyt.htfinder") { throw "CCX khong phai HT_Finder." }

  # Cai UXP truoc. Bridge loi khong duoc phep lam plugin bien mat khoi menu Premiere.
  Write-Host "Dang cai plugin UXP HT_Finder..." -ForegroundColor Cyan
  $commonRoot = [IO.Path]::GetFullPath(${env:CommonProgramFiles})
  $externalRoot = [IO.Path]::GetFullPath((Join-Path $commonRoot "Adobe\UXP\Plugins\External"))
  $target = [IO.Path]::GetFullPath((Join-Path $externalRoot $manifest.id))
  if (-not $externalRoot.StartsWith($commonRoot, [StringComparison]::OrdinalIgnoreCase) -or -not $target.StartsWith($externalRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($target) -ne $manifest.id) { throw "Duong dan plugin khong an toan." }
  New-Item -ItemType Directory -Path $externalRoot -Force | Out-Null
  $stage = Join-Path $externalRoot (".htfinder_new_" + [guid]::NewGuid().ToString("N"))
  $backup = Join-Path $externalRoot (".htfinder_backup_" + [guid]::NewGuid().ToString("N"))
  try {
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    & tar.exe -xf $ccx -C $stage
    if ($LASTEXITCODE -ne 0) { throw "Khong giai nen duoc CCX." }
    $installed = Get-Content -LiteralPath (Join-Path $stage "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($installed.id -ne $manifest.id -or $installed.version -ne $manifest.version -or $installed.manifestVersion -ne 6) { throw "Manifest UXP sau giai nen khong hop le." }
    if (-not (Test-Path -LiteralPath (Join-Path $stage "index.html"))) { throw "CCX thieu index.html." }
    if (Test-Path -LiteralPath $target) { Move-Item -LiteralPath $target -Destination $backup }
    Move-Item -LiteralPath $stage -Destination $target
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Recurse -Force }
  } catch {
    if (-not (Test-Path -LiteralPath $target) -and (Test-Path -LiteralPath $backup)) { Move-Item -LiteralPath $backup -Destination $target }
    throw
  } finally { if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue } }
  $verifyManifest = Get-Content -LiteralPath (Join-Path $target "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($verifyManifest.id -ne "com.hieuyt.htfinder") { throw "Khong xac minh duoc plugin da cai." }
  $legacyTarget = Join-Path $env:APPDATA "Adobe\UXP\Plugins\External\com.hieuyt.htfinder"
  if (Test-Path -LiteralPath $legacyTarget) { Remove-Item -LiteralPath $legacyTarget -Recurse -Force }
  Write-Host "Da cai UXP tai: $target" -ForegroundColor Green

  # Cai Bridge rieng vao LOCALAPPDATA va dang ky tu khoi dong.
  Write-Host "Dang cai HT_Finder Bridge..." -ForegroundColor Cyan
  $localRoot = [IO.Path]::GetFullPath($env:LOCALAPPDATA)
  $runtimeRoot = [IO.Path]::GetFullPath((Join-Path $localRoot "HT_Finder\Bridge"))
  if (-not $runtimeRoot.StartsWith($localRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($runtimeRoot) -ne "Bridge") { throw "Duong dan Bridge khong an toan." }
  $runtimeBin = Join-Path $runtimeRoot "bin"; New-Item -ItemType Directory -Path $runtimeBin -Force | Out-Null
  $bridgeTarget = Join-Path $runtimeBin "ht_finder_bridge.ps1"; $ytdlpTarget = Join-Path $runtimeBin "yt-dlp.exe"
  Copy-Item -LiteralPath $bridgeSource -Destination $bridgeTarget -Force
  Copy-Item -LiteralPath $ytdlpSource -Destination $ytdlpTarget -Force
  # Khong giu binary/script cua runtime version cu; chi bao toan dung hai file hien tai.
  Get-ChildItem -LiteralPath $runtimeBin -Force | Where-Object { $_.Name -notin @("ht_finder_bridge.ps1", "yt-dlp.exe") } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
  $runKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
  $runCommand = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $bridgeTarget
  New-Item -Path $runKey -Force | Out-Null
  New-ItemProperty -Path $runKey -Name "HT_Finder_Bridge" -Value $runCommand -PropertyType String -Force | Out-Null
  Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 19889 -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -and $_.OwningProcess -ne $PID) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }
  Start-Sleep -Milliseconds 300
  Start-Process powershell.exe -ArgumentList @("-NoProfile", "-WindowStyle", "Hidden", "-ExecutionPolicy", "Bypass", "-File", ('"{0}"' -f $bridgeTarget)) -WindowStyle Hidden
  $ready = $false
  for ($attempt = 0; $attempt -lt 20; $attempt++) { Start-Sleep -Milliseconds 250; try { $health = Invoke-RestMethod "http://127.0.0.1:19889/health" -TimeoutSec 1; if ($health.success -and $health.ytdlpReady) { $ready = $true; break } } catch {} }
  if (-not $ready) { throw "Plugin da cai, nhung Bridge chua khoi dong. Hay chay SUA_CHUA.bat; xem $logPath" }
  [System.Windows.MessageBox]::Show("Da cai HT_Finder $($manifest.version) va Bridge.`n`nMo Premiere Pro > Window > UXP Plugins > HT_Finder.", "HT_Finder - Cai dat", "OK", "Information") | Out-Null
} catch {
  $message = $_.Exception.Message
  Write-Error $message
  [System.Windows.MessageBox]::Show("Cai dat HT_Finder khong thanh cong:`n`n$message`n`nNhat ky: $logPath", "HT_Finder - Loi cai dat", "OK", "Error") | Out-Null
  exit 1
} finally { try { Stop-Transcript | Out-Null } catch {} }
