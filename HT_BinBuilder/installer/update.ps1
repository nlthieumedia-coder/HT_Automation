param([string]$Repository = "nlthieumedia-coder/HT_Studio")
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$pluginManifest = Join-Path ${env:CommonProgramFiles} "Adobe\UXP\Plugins\External\com.hieuyt.htbinbuilder\manifest.json"
$currentVersion = [version]"0.0.0"
if (Test-Path -LiteralPath $pluginManifest -PathType Leaf) {
  try { $currentVersion = [version]((Get-Content -LiteralPath $pluginManifest -Raw -Encoding UTF8 | ConvertFrom-Json).version) } catch {}
}

Write-Host "HT_BinBuilder hien tai: $currentVersion" -ForegroundColor Cyan
Write-Host "Dang tim ban HT_BinBuilder moi tren GitHub Releases..." -ForegroundColor Cyan
$headers = @{ "User-Agent" = "HT-BinBuilder-Updater"; "Accept" = "application/vnd.github+json" }
try {
  $releases = @(Invoke-RestMethod -Uri "https://api.github.com/repos/$Repository/releases?per_page=50" -Headers $headers -TimeoutSec 30)
} catch {
  throw "Khong kiem tra duoc GitHub Releases cua $Repository. Chi tiet: $($_.Exception.Message)"
}

$asset = $null
foreach ($release in $releases) {
  if ($release.draft -or $release.prerelease) { continue }
  $candidate = @($release.assets) | Where-Object { $_.name -eq "HT_BinBuilder_Setup_Windows.zip" } | Select-Object -First 1
  if ($candidate) { $asset = $candidate; break }
}
if (-not $asset) { throw "Chua co GitHub Release nao chua HT_BinBuilder_Setup_Windows.zip." }

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("HT_BinBuilder_Update_" + [Guid]::NewGuid().ToString("N"))
$zipPath = Join-Path $tempRoot "update.zip"
$extractPath = Join-Path $tempRoot "package"
try {
  New-Item -ItemType Directory -Path $tempRoot,$extractPath -Force | Out-Null
  Write-Host "Dang tai goi cap nhat..." -ForegroundColor Cyan
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & $curl.Source --location --fail --silent --show-error --connect-timeout 20 --max-time 600 --retry 3 --output $zipPath $asset.browser_download_url
    if ($LASTEXITCODE -ne 0) { throw "Tai bo cai that bai, curl ma loi $LASTEXITCODE." }
  } else {
    Invoke-WebRequest -Uri $asset.browser_download_url -Headers $headers -OutFile $zipPath -UseBasicParsing -TimeoutSec 600
  }
  Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force
  $packageInfoPath = Join-Path $extractPath "package-info.json"
  $installerPath = Join-Path $extractPath "installer\install.ps1"
  if (-not (Test-Path -LiteralPath $packageInfoPath -PathType Leaf) -or -not (Test-Path -LiteralPath $installerPath -PathType Leaf)) {
    throw "ZIP cap nhat khong dung cau truc HT_BinBuilder."
  }
  $packageInfo = Get-Content -LiteralPath $packageInfoPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($packageInfo.product -ne "HT_BinBuilder") { throw "Goi tai ve khong phai HT_BinBuilder." }
  $packageVersion = [version]$packageInfo.version
  if ($currentVersion -ge $packageVersion) {
    Write-Host "Ban dang dung phien ban moi nhat $currentVersion." -ForegroundColor Green
    exit 0
  }
  Write-Host "Tim thay HT_BinBuilder $packageVersion. Dang cap nhat..." -ForegroundColor Green
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installerPath
  if ($LASTEXITCODE -ne 0) { throw "Bo cai cap nhat tra ve ma loi $LASTEXITCODE." }
} finally {
  if (Test-Path -LiteralPath $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
