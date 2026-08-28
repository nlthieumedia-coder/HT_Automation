$ErrorActionPreference = "Stop"
$projectDir = $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectDir "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$distDir = Join-Path $projectDir "dist"
$toolsDir = Join-Path $projectDir ".build-tools"
$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $node -or -not $npm) { throw "Can Node.js LTS de dong goi." }
& $node --check (Join-Path $projectDir "index.js"); if ($LASTEXITCODE -ne 0) { throw "index.js co loi cu phap." }
if (-not (Test-Path (Join-Path $toolsDir "node_modules\archiver"))) { & $npm install --prefix $toolsDir --no-save --no-audit --no-fund archiver@7.0.1; if ($LASTEXITCODE -ne 0) { throw "Khong cai duoc archiver." } }
$pluginFiles = @("manifest.json","index.html","index.js","styles.css","icons\logo_icon.png","icons\plugin-icon.png","icons\plugin-icon.svg","icons\panel-dark.svg","icons\panel-light.svg")
$releaseFiles = @("installer\install.ps1","installer\update.ps1","installer\uninstall.ps1","cong_cu\cai_dat\CAI_DAT_MOT_CLICK.bat","cong_cu\cai_dat\CAP_NHAT_TU_DONG.bat","cong_cu\cai_dat\SUA_CHUA.bat","cong_cu\cai_dat\GO_CAI_DAT.bat","HUONG_DAN_CAI_DAT.txt","README.md")
foreach ($file in $pluginFiles + $releaseFiles) { if (-not (Test-Path -LiteralPath (Join-Path $projectDir $file))) { throw "Thieu file: $file" } }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null
$stage = Join-Path ([IO.Path]::GetTempPath()) ("HT_BinBuilder_" + [guid]::NewGuid().ToString("N")); $setup = Join-Path ([IO.Path]::GetTempPath()) ("HT_BinBuilder_Setup_" + [guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path $stage,$setup -Force | Out-Null
  foreach ($file in $pluginFiles) { $target=Join-Path $stage $file; New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $projectDir $file) -Destination $target }
  $ccx = Join-Path $distDir "HT_BinBuilder_PremierePro.ccx"; if(Test-Path $ccx){Remove-Item -LiteralPath $ccx -Force}
  $oldNodePath=$env:NODE_PATH; try{$env:NODE_PATH=Join-Path $toolsDir "node_modules"; & $node (Join-Path $projectDir "build_ccx.js") $stage $ccx; if($LASTEXITCODE -ne 0){throw "Dong goi CCX that bai."}}finally{$env:NODE_PATH=$oldNodePath}
  Copy-Item -LiteralPath $ccx -Destination $setup
  foreach ($file in $releaseFiles) { $target=Join-Path $setup $file; New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null; Copy-Item -LiteralPath (Join-Path $projectDir $file) -Destination $target }
  @{product="HT_BinBuilder";version=[string]$manifest.version;premiereMinimum=[string]$manifest.host.minVersion;builtAt=(Get-Date).ToString("o")} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $setup "package-info.json") -Encoding UTF8
  $zip=Join-Path $distDir "HT_BinBuilder_Setup_Windows.zip"; if(Test-Path $zip){Remove-Item -LiteralPath $zip -Force}; Compress-Archive -Path (Join-Path $setup "*") -DestinationPath $zip -CompressionLevel Optimal
  Write-Host "Da tao: $ccx" -ForegroundColor Green; Write-Host "Da tao: $zip" -ForegroundColor Green
} finally { if(Test-Path $stage){Remove-Item -LiteralPath $stage -Recurse -Force}; if(Test-Path $setup){Remove-Item -LiteralPath $setup -Recurse -Force} }
