param([string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'APEX-For-the-FANS'))
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path $PSScriptRoot -Parent
$installRoot = [IO.Path]::GetFullPath($InstallDirectory)
if (Test-Path -LiteralPath $installRoot) { throw "Installation folder already exists: $installRoot. Preserve it before installing another copy." }
$browserPath = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft/Edge/Application/msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'),
    (Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe')
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$browserPath) { throw 'Install Microsoft Edge or Google Chrome first.' }
$nodeVersion = 'v24.22.3'
$archiveName = "node-$nodeVersion-win-x64.zip"
$expectedHash = 'e612af99f626ab415ea225af6bce5c971feb448cb5cae250bb1c3fa50c5f7d9f'
New-Item -ItemType Directory -Path $installRoot | Out-Null
$archivePath = Join-Path $installRoot $archiveName
Write-Output 'Downloading the official Node.js runtime...'
Invoke-WebRequest -Uri "https://nodejs.org/dist/$nodeVersion/$archiveName" -OutFile $archivePath
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'Node.js download checksum mismatch. Installation stopped.' }
Expand-Archive -LiteralPath $archivePath -DestinationPath (Join-Path $installRoot 'runtime')
Remove-Item -LiteralPath $archivePath
$runtimePath = Join-Path $installRoot "runtime/node-$nodeVersion-win-x64/node.exe"
Push-Location -LiteralPath $sourceRoot
try {
    & $runtimePath build.mjs --standalone
    if ($LASTEXITCODE -ne 0) { throw 'APEX build failed.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path (Join-Path $installRoot 'dist/server') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot 'dist/server/index.js') -Destination (Join-Path $installRoot 'dist/server/index.js')
foreach ($name in @('server.mjs','package.json')) { Copy-Item -LiteralPath (Join-Path $sourceRoot $name) -Destination $installRoot }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'launcher.mjs') -Destination $installRoot
@{ port = 41732; browser = $browserPath; source = 'https://github.com/Soumesh-Mishra/Apex-For-the-FANS'; installedAt = [DateTime]::UtcNow.ToString('o'); runtime = $nodeVersion } | ConvertTo-Json | Set-Content -Encoding ascii -LiteralPath (Join-Path $installRoot 'installation.json')
# Windows .ico supports an embedded PNG; preserve the original app mark.
$png = [IO.File]::ReadAllBytes((Join-Path $sourceRoot 'pwa/icons/apex-192.png'))
$icon = New-Object IO.MemoryStream
$writer = New-Object IO.BinaryWriter($icon)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]192); $writer.Write([byte]192); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$png.Length); $writer.Write([uint32]22); $writer.Write($png)
$iconPath = Join-Path $installRoot 'apex.ico'
[IO.File]::WriteAllBytes($iconPath, $icon.ToArray()); $writer.Dispose(); $icon.Dispose()
$shell = New-Object -ComObject WScript.Shell
foreach ($mode in @('Launch','Stop')) {
    $argument = if ($mode -eq 'Stop') { ' --stop' } else { '' }
    $command = '"' + $runtimePath + '" "' + (Join-Path $installRoot 'launcher.mjs') + '"' + $argument
    $vbs = 'CreateObject("WScript.Shell").Run "' + $command.Replace('"','""') + '", 0, False'
    $vbs | Set-Content -Encoding unicode -LiteralPath (Join-Path $installRoot "$mode.vbs")
}
$menuRoot = Join-Path ([Environment]::GetFolderPath('Programs')) 'APEX'
New-Item -ItemType Directory -Path $menuRoot -Force | Out-Null
foreach ($entry in @(
    @{ Path = (Join-Path $menuRoot 'APEX - For the Fans.lnk'); Script = 'Launch.vbs' },
    @{ Path = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'APEX - For the Fans.lnk'); Script = 'Launch.vbs' },
    @{ Path = (Join-Path $menuRoot 'Stop APEX server.lnk'); Script = 'Stop.vbs' }
)) {
    $shortcut = $shell.CreateShortcut($entry.Path)
    $shortcut.TargetPath = Join-Path $env:WINDIR 'System32/wscript.exe'
    $shortcut.Arguments = '"' + (Join-Path $installRoot $entry.Script) + '"'
    $shortcut.WorkingDirectory = $installRoot
    $shortcut.IconLocation = "$iconPath,0"
    $shortcut.Description = 'APEX Formula 1 fan dashboard'
    $shortcut.Save()
}
@'
APEX local Windows installation

Open APEX - For the Fans from Start or the desktop.
Its server starts on demand at http://127.0.0.1:41732 and only listens on this device.
The Stop APEX server shortcut in Start > APEX stops it when you are finished.
No service or login startup task is installed. The included Node runtime is private to APEX.
Google sign-in is not configured in this local installation. Internet is needed for feeds.

To remove: close APEX, use Stop APEX server, delete this folder and the APEX shortcuts.
To update: keep your current copy until a new release has been verified. Browser preferences remain in Edge/Chrome site storage.
'@ | Set-Content -Encoding utf8 -LiteralPath (Join-Path $installRoot 'INSTALLATION.txt')
Write-Output "Installed APEX at $installRoot"
Write-Output 'Start Menu and desktop shortcuts created.'
