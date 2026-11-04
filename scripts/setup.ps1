param([string]$ArchivePath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$siteRoot = Join-Path $projectRoot 'site'
$version = '2.2.22'
$expectedHash = '51339A524B7D1065DE45A695B19CDE4BCFE36629DF6EB125DA39EAA4EC77E0BF'
if (Test-Path -LiteralPath "$siteRoot\vendor\autoload.php") {
    Write-Output 'Grav runtime already exists; current installation and content preserved.'
    return
}
if (!$ArchivePath) { $ArchivePath = "D:\cache\yxy\grav-admin-$version.zip" }
if (!(Test-Path -LiteralPath $ArchivePath)) {
    New-Item -ItemType Directory -Path (Split-Path $ArchivePath -Parent) -Force | Out-Null
    Invoke-WebRequest -Uri "https://getgrav.org/download/core/grav-admin/$version" -OutFile $ArchivePath -TimeoutSec 180
}
# Pin the SHA-256 published for the official grav-admin release asset.
# Existing installations and their plugins are upgraded separately.
if ((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Archive differs from the pinned official release. Inspect before replacing the runtime.'
}
$localDir = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
$stage = Join-Path $localDir ('setup-' + [guid]::NewGuid().ToString('N'))
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $stage
$source = Join-Path $stage 'grav-admin'
New-Item -ItemType Directory -Path $siteRoot -Force | Out-Null
foreach ($entry in Get-ChildItem -LiteralPath $source -Force) {
    if ($entry.Name -ne 'user') { Copy-Item -LiteralPath $entry.FullName -Destination $siteRoot -Recurse }
}
$userRoot = Join-Path $siteRoot 'user'
New-Item -ItemType Directory -Path $userRoot -Force | Out-Null
foreach ($entry in Get-ChildItem -LiteralPath "$source\user" -Force) {
    if ($entry.Name -in @('config','pages','themes')) { continue }
    if (!(Test-Path -LiteralPath (Join-Path $userRoot $entry.Name))) {
        Copy-Item -LiteralPath $entry.FullName -Destination $userRoot -Recurse
    }
}
Write-Output "Installed Grav $version runtime; project config, pages and theme preserved."
