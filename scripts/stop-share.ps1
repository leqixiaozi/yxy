$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
foreach ($shareRole in @('tunnel', 'preview')) {
    $sharePidFile = Join-Path $projectRoot ".local/share-$shareRole.pid"
    if (!(Test-Path -LiteralPath $sharePidFile)) { continue }
    $shareProcessId = [int](Get-Content -LiteralPath $sharePidFile)
    $shareProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$shareProcessId"
    if (!$shareProcess) { continue }
    $shareExpected = if ($shareRole -eq 'tunnel') { '*80:127.0.0.1:8100*nokey@localhost.run*' } else { '*yxy*share-preview.py*serve*' }
    if ($shareProcess.CommandLine -notlike $shareExpected) {
        throw "PID $shareProcessId no longer belongs to this preview; leaving it untouched."
    }
    Stop-Process -Id $shareProcessId
    Write-Output "Stopped share $shareRole PID $shareProcessId"
}
