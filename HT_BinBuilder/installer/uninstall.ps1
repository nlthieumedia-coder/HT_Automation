$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework
if (Get-Process -Name "Adobe Premiere Pro" -ErrorAction SilentlyContinue) { throw "Hay dong Premiere Pro truoc khi go cai dat." }
$externalRoot=[IO.Path]::GetFullPath((Join-Path $env:APPDATA "Adobe\UXP\Plugins\External")); $target=[IO.Path]::GetFullPath((Join-Path $externalRoot "com.hieuyt.htbinbuilder"))
if(-not $target.StartsWith($externalRoot,[StringComparison]::OrdinalIgnoreCase)){throw "Duong dan dich khong an toan."}
if(Test-Path -LiteralPath $target){Remove-Item -LiteralPath $target -Recurse -Force}
[System.Windows.MessageBox]::Show("Da go HT_BinBuilder khoi tai khoan Windows nay.","HT_BinBuilder","OK","Information") | Out-Null
