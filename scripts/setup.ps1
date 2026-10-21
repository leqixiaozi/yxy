param([string]$ArchivePath)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$siteRoot = Join-Path $projectRoot 'site'
$version = '2.2.11'
$expectedHash = 'BC3693CEFC95C05A034B31BBC2A85C9D1F938C6B378E1A7D497CC6F3F2AC5FD2'
if (Test-Path -LiteralPath "$siteRoot\vendor\autoload.php") {
    Write-Output 'Grav runtime already exists; current installation and content preserved.'
    return
}
if (!$ArchivePath) { $ArchivePath = "D:\cache\yxy\grav-admin-$version.zip" }
if (!(Test-Path -LiteralPath $ArchivePath)) {
    New-Item -ItemType Directory -Path (Split-Path $ArchivePath -Parent) -Force | Out-Null
    Invoke-WebRequest -Uri "https://getgrav.org/download/core/grav-admin/$version" -OutFile $ArchivePath -TimeoutSec 180
}
# Reproduce the exact official archive used during local validation.
# This is our recorded download digest, not an upstream-signed checksum.
if ((Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Archive differs from the evaluated package. Inspect before replacing the runtime.'
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
