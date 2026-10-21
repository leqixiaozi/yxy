$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$pidFile = Join-Path $projectRoot '.local\server.pid'
if (!(Test-Path -LiteralPath $pidFile)) { Write-Output 'No recorded local server.'; return }
$serverPid = [int](Get-Content -LiteralPath $pidFile)
$process = Get-CimInstance Win32_Process -Filter "ProcessId=$serverPid" -ErrorAction SilentlyContinue
if ($process) {
    if ($process.Name -ne 'php.exe' -or $process.CommandLine -notlike '*127.0.0.1:*system/router.php*') {
        throw 'Recorded PID no longer belongs to this local PHP server.'
    }
    Stop-Process -Id $serverPid
}
Remove-Item -LiteralPath $pidFile
Write-Output 'Local Grav server stopped.'
