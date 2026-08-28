$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) { throw "Hay dong Premiere Pro truoc khi go cai dat." }
$identity=[Security.Principal.WindowsIdentity]::GetCurrent(); $principal=New-Object Security.Principal.WindowsPrincipal($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw "Can quyen Administrator de go plugin."}
$externalRoot=[IO.Path]::GetFullPath((Join-Path $env:ProgramFiles "Common Files\Adobe\UXP\Plugins\External")); $target=[IO.Path]::GetFullPath((Join-Path $externalRoot "com.hieuyt.htbinbuilder"))
if(-not $target.StartsWith($externalRoot,[StringComparison]::OrdinalIgnoreCase)){throw "Duong dan dich khong an toan."}
if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}
$legacyUserTarget=Join-Path $env:APPDATA "Adobe\UXP\Plugins\External\com.hieuyt.htbinbuilder"; if(Test-Path -LiteralPath $legacyUserTarget){Remove-Item -LiteralPath $legacyUserTarget -Recurse -Force}
[System.Windows.MessageBox]::Show("Da go HT_BinBuilder khoi tai khoan Windows nay.","HT_BinBuilder","OK","Information") | Out-Null
