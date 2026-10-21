$Port = 8099
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$phpPath = 'D:\devtool\scoop\apps\php84\current\php.exe'
if (!(Test-Path -LiteralPath $phpPath)) {
    $phpCommand = Get-Command php -ErrorAction SilentlyContinue
    if (!$phpCommand) { throw 'PHP 8.3.11+ is required. Install through your existing runtime manager.' }
    $phpPath = $phpCommand.Source
}
if (!(Test-Path -LiteralPath "$projectRoot\site\vendor\autoload.php")) {
    throw 'Grav runtime is missing. Run scripts/setup.ps1 first.'
}
$phpDirectory = Split-Path $phpPath -Parent
$phpArguments = @('-c', "$PSScriptRoot\php.ini", '-d', "extension_dir=$phpDirectory\ext")
& $phpPath @phpArguments "$PSScriptRoot\init-local.php"
if ($LASTEXITCODE -ne 0) { throw 'Local initialization failed.' }
$localDir = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Path $localDir -Force | Out-Null
$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $running = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)"
    if ($running.CommandLine -notlike '*system/router.php*' -or $running.CommandLine -notlike "*$Port*") {
        throw "Port $Port is already in use by a different process."
    }
    $savedPid = Get-Content "$localDir\server.pid" -ErrorAction SilentlyContinue
    if ([string]$savedPid -ne [string]$running.ProcessId) { throw 'Listener ownership could not be verified.' }
    Write-Output "Already running: http://127.0.0.1:$Port/admin"
    return
}
$arguments = "-c `"$PSScriptRoot\php.ini`" -d `"extension_dir=$phpDirectory\ext`" -S 127.0.0.1:$Port system/router.php"
$process = Start-Process -FilePath $phpPath -ArgumentList $arguments -WorkingDirectory "$projectRoot\site" -WindowStyle Hidden -PassThru -RedirectStandardOutput "$localDir\server.stdout.log" -RedirectStandardError "$localDir\server.stderr.log"
Set-Content -LiteralPath "$localDir\server.pid" -Value $process.Id
Write-Output "Started PID $($process.Id): http://127.0.0.1:$Port/admin"
Write-Output "Credentials: $localDir\admin-credentials.json"
