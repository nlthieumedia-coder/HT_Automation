$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectDir "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$distDir = Join-Path $projectDir "dist"
$toolsDir = Join-Path $projectDir ".build-tools"
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $node -or -not $npm) { throw "Can Node.js LTS de dong goi HT_Finder." }
Get-ChildItem -LiteralPath (Join-Path $projectDir "src") -Recurse -Filter "*.js" | ForEach-Object { & $node --check $_.FullName; if ($LASTEXITCODE -ne 0) { throw "JavaScript co loi: $($_.FullName)" } }
if (-not (Test-Path -LiteralPath (Join-Path $toolsDir "node_modules\archiver"))) { & $npm install --prefix $toolsDir --no-save --no-audit --no-fund archiver@7.0.1; if ($LASTEXITCODE -ne 0) { throw "Khong cai duoc archiver." } }
$pluginFiles = @("manifest.json", "index.html", "styles", "src", "icons")
$releaseFiles = @("installer\install.ps1", "installer\uninstall.ps1", "cong_cu\cai_dat\CAI_DAT_MOT_CLICK.bat", "cong_cu\cai_dat\SUA_CHUA.bat", "cong_cu\cai_dat\GO_CAI_DAT.bat", "HUONG_DAN_CAI_DAT.txt", "README.md")
$payloadFiles = @("bin\ht_finder_bridge.ps1", "bin\yt-dlp.exe")
foreach ($file in $pluginFiles + $releaseFiles + $payloadFiles) { if (-not (Test-Path -LiteralPath (Join-Path $projectDir $file))) { throw "Thieu file: $file" } }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$resolvedProject = [IO.Path]::GetFullPath($projectDir)
$resolvedDist = [IO.Path]::GetFullPath($distDir)
if (-not $resolvedDist.StartsWith($resolvedProject, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolvedDist) -ne "dist") { throw "Thu muc dist khong an toan; huy don du lieu build cu." }
# Moi version chi giu lai artifact vua build. Xoa ZIP/CCX va thu muc da giai nen cua version truoc.
Get-ChildItem -LiteralPath $resolvedDist -Force -ErrorAction SilentlyContinue | ForEach-Object {
  Remove-Item -LiteralPath $_.FullName -Recurse -Force
}
$stage = Join-Path ([IO.Path]::GetTempPath()) ("HT_Finder_CCX_" + [guid]::NewGuid().ToString("N"))
$setup = Join-Path ([IO.Path]::GetTempPath()) ("HT_Finder_Setup_" + [guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $stage, $setup -Force | Out-Null
  foreach ($file in $pluginFiles) { Copy-Item -LiteralPath (Join-Path $projectDir $file) -Destination (Join-Path $stage $file) -Recurse -Force }
  $ccx = Join-Path $distDir "HT_Finder_PremierePro.ccx"
  if (Test-Path -LiteralPath $ccx) { Remove-Item -LiteralPath $ccx -Force }
  $oldNodePath = $env:NODE_PATH
  try { $env:NODE_PATH = Join-Path $toolsDir "node_modules"; & $node (Join-Path $projectDir "build_ccx.js") $stage $ccx; if ($LASTEXITCODE -ne 0) { throw "Dong goi CCX that bai." } } finally { $env:NODE_PATH = $oldNodePath }
  Copy-Item -LiteralPath $ccx -Destination $setup
  foreach ($file in $releaseFiles) { $target = Join-Path $setup $file; New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $projectDir $file) -Destination $target -Force }
  foreach ($file in $payloadFiles) { $target = Join-Path $setup ("payload\" + $file); New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $projectDir $file) -Destination $target -Force }
  @{ product = "HT_Finder"; version = [string]$manifest.version; bridgeVersion = [string]$manifest.version; premiereMinimum = [string]$manifest.host.minVersion; builtAt = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $setup "package-info.json") -Encoding UTF8
  $zip = Join-Path $distDir "HT_Finder_Setup_Windows.zip"
  if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
  Compress-Archive -Path (Join-Path $setup "*") -DestinationPath $zip -CompressionLevel Optimal
  Write-Host "Da tao: $ccx" -ForegroundColor Green
  Write-Host "Da tao: $zip" -ForegroundColor Green
} finally {
  if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
  if (Test-Path -LiteralPath $setup) { Remove-Item -LiteralPath $setup -Recurse -Force }
}
