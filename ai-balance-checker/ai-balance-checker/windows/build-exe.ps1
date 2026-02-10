param(
  [string]$Output
)

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  Write-Error 'This build script is Windows-only.'
  exit 1
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$inputFile = Join-Path $PSScriptRoot 'ai-balance-gui.ps1'
if (-not (Test-Path $inputFile)) {
  Write-Error "Input script not found: $inputFile"
  exit 1
}

if (-not $Output) {
  $Output = Join-Path $repoRoot 'dist\windows\ai-balance-gui.exe'
}

try {
  if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) {
    Import-Module ps2exe -ErrorAction SilentlyContinue | Out-Null
  }
} catch {}

if (-not (Get-Command Invoke-ps2exe -ErrorAction SilentlyContinue)) {
  Write-Host 'Missing ps2exe.'
  Write-Host 'Install it (CurrentUser):'
  Write-Host '  Install-Module ps2exe -Scope CurrentUser'
  exit 1
}

$outDir = Split-Path -Parent $Output
if ($outDir -and -not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

Invoke-ps2exe -InputFile $inputFile -OutputFile $Output -NoConsole -Title 'AI Balance GUI' | Out-Null
Write-Host "Built: $Output"
