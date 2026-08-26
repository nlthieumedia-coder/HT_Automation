$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
$root = Split-Path -Parent $PSScriptRoot
$ccx = Join-Path $root "HT_BinBuilder_PremierePro.ccx"
if (-not (Test-Path -LiteralPath $ccx -PathType Leaf)) { throw "Khong tim thay HT_BinBuilder_PremierePro.ccx." }
if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) { throw "Hay dong Premiere Pro truoc khi cai dat." }
$manifestText = & tar.exe -xOf $ccx manifest.json
if (-not $manifestText) { throw "Khong doc duoc manifest trong CCX." }
$manifest = $manifestText | ConvertFrom-Json
if ($manifest.id -ne "com.hieuyt.htbinbuilder") { throw "CCX khong phai HT_BinBuilder." }
$externalRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA "Adobe\UXP\Plugins\External"))
$target = [IO.Path]::GetFullPath((Join-Path $externalRoot $manifest.id))
if (-not $target.StartsWith($externalRoot,[StringComparison]::OrdinalIgnoreCase)) { throw "Duong dan dich khong an toan." }
New-Item -ItemType Directory -Path $externalRoot -Force | Out-Null
$stage = Join-Path $externalRoot ("." + $manifest.id + ".new")
$backup = Join-Path $externalRoot ("." + $manifest.id + ".backup")
try {
  if(Test-Path $stage){Remove-Item -LiteralPath $stage -Recurse -Force}; New-Item -ItemType Directory -Path $stage | Out-Null
  & tar.exe -xf $ccx -C $stage; if($LASTEXITCODE -ne 0){throw "Khong giai nen duoc CCX."}
  $installed = Get-Content -LiteralPath (Join-Path $stage "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
  if($installed.id -ne $manifest.id -or $installed.version -ne $manifest.version){throw "Manifest sau giai nen khong hop le."}
  if(Test-Path $backup){Remove-Item -LiteralPath $backup -Recurse -Force}; if(Test-Path $target){Move-Item -LiteralPath $target -Destination $backup}
  Move-Item -LiteralPath $stage -Destination $target; if(Test-Path $backup){Remove-Item -LiteralPath $backup -Recurse -Force}
} catch { if(Test-Path $target){Remove-Item -LiteralPath $target -Recurse -Force}; if(Test-Path $backup){Move-Item -LiteralPath $backup -Destination $target}; throw }
[System.Windows.MessageBox]::Show("Da cai HT_BinBuilder $($manifest.version).`n`nMo Premiere Pro > Window > UXP Plugins > HT_BinBuilder.","HT_BinBuilder","OK","Information") | Out-Null
