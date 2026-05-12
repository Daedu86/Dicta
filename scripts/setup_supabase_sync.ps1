# Dicta Supabase sync bootstrapper (single-profile, free-tier friendly).
# This script:
# - checks Supabase CLI is available
# - links the repo to a Supabase project (optional but recommended)
# - patches docs/supabase-sync.sql with your chosen profile id
# - applies the SQL to create the sync table + RLS policies
#
# It does NOT create a Supabase project for you.
#
# Usage (interactive):
#   powershell -ExecutionPolicy Bypass -File scripts\setup_supabase_sync.ps1
#
# Usage (non-interactive):
#   powershell -ExecutionPolicy Bypass -File scripts\setup_supabase_sync.ps1 -ProjectRef <ref> -ProfileId <id>

param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectRef,
  [Parameter(Mandatory = $false)]
  [string]$ProfileId,
  [Parameter(Mandatory = $false)]
  [switch]$SkipLink
)

$ErrorActionPreference = "Stop"

function Invoke-External([string]$label, [scriptblock]$command) {
  & $command
  if ($LASTEXITCODE -ne 0) {
    throw "$label failed (exit code $LASTEXITCODE)."
  }
}

function Require-Command($name) {
  if (Get-Command $name -ErrorAction SilentlyContinue) { return }

  # Scoop installs shims under this path, but they may not be on PATH for the current shell.
  $scoopShim = Join-Path $env:USERPROFILE "scoop\shims\$name.exe"
  if (Test-Path $scoopShim) {
    $env:PATH = (Split-Path $scoopShim -Parent) + ";" + $env:PATH
    if (Get-Command $name -ErrorAction SilentlyContinue) { return }
  }

  throw "Missing '$name'. Install it first (recommended: 'scoop install supabase')."
}

function Prompt-NonEmpty($label) {
  while ($true) {
    $value = Read-Host $label
    if ($null -ne $value -and $value.Trim().Length -gt 0) { return $value.Trim() }
  }
}

Require-Command "supabase"

Write-Host ""
Write-Host "== Dicta Supabase Sync Setup =="
Write-Host ""

# Best-effort login check. If not logged in, many commands will fail with a clear error.
try {
  Invoke-External "supabase projects list" { supabase projects list | Out-Null }
} catch {
  Write-Host "Supabase CLI is not logged in."
  Write-Host "Run: supabase login"
  throw
}

if (-not $ProjectRef -or $ProjectRef.Trim().Length -eq 0) {
  $ProjectRef = Prompt-NonEmpty "Supabase project ref (e.g. abcdefghijklmnop)"
}
if (-not $ProfileId -or $ProfileId.Trim().Length -eq 0) {
  $ProfileId = Prompt-NonEmpty "Sync profile id (must match the RLS policy; e.g. dicta-main)"
}

$ProjectRef = $ProjectRef.Trim()
$ProfileId = $ProfileId.Trim()

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sqlPath = Join-Path $repoRoot "docs\supabase-sync.sql"

if (-not (Test-Path $sqlPath)) {
  throw "Missing SQL file: $sqlPath"
}

# Create a temporary patched SQL (avoid modifying tracked file automatically).
$tempSql = Join-Path $env:TEMP ("dicta-supabase-sync-" + [Guid]::NewGuid().ToString("N") + ".sql")

$raw = Get-Content $sqlPath -Raw
if ($raw -notmatch "replace-with-your-profile-id") {
  throw "Expected placeholder 'replace-with-your-profile-id' not found in $sqlPath"
}

$patched = $raw -replace "replace-with-your-profile-id", $ProfileId
$patched = ($patched -split "`r?`n" | Where-Object { $_ -notmatch "^\s*--" }) -join [Environment]::NewLine
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tempSql, $patched, $utf8NoBom)

Write-Host ""
if ($SkipLink) {
  Write-Host "Skipping 'supabase link' (requested)."
} else {
  Write-Host "Linking repo to Supabase project..."
  try {
    Invoke-External "supabase link" { supabase link --project-ref $ProjectRef | Out-Null }
  } catch {
    Write-Host "Link failed (you can still continue). Error: $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Host "Applying SQL to your Supabase database..."
Invoke-External "supabase db query" { supabase db query --file $tempSql --linked | Out-Null }

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "1) Set these env vars in Vercel (then redeploy):"
Write-Host "   - VITE_SUPABASE_URL"
Write-Host "   - VITE_SUPABASE_ANON_KEY"
Write-Host "   - VITE_SUPABASE_SYNC_PROFILE_ID=$ProfileId"
Write-Host "2) Open Dicta -> Admin and confirm 'Supabase sync: Synced...'"
Write-Host ""

Remove-Item -LiteralPath $tempSql -Force
