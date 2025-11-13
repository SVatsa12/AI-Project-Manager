# invoke-endpoints-interactive.ps1
# Interactive endpoint tester for your server
# Usage:
#   .\invoke-endpoints-interactive.ps1
# Or dot-source to call functions directly:
#   . .\invoke-endpoints-interactive.ps1
#   Test-Ping -BaseUrl "http://localhost:4003"

param(
  [string]$BaseUrl = "http://localhost:4003"
)

function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }

function Safe-Invoke {
  param(
    [string]$Method = "GET",
    [string]$Url,
    [hashtable]$Headers = @{},
    $Body = $null,
    [int]$TimeoutSec = 60
  )
  try {
    if ($Method -in @("GET","DELETE")) {
      $resp = Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -TimeoutSec $TimeoutSec -ErrorAction Stop
      return @{ ok = $true; status = 200; body = $resp }
    } else {
      $jbody = $null
      if ($Body -ne $null) { $jbody = $Body | ConvertTo-Json -Depth 10 }
      $resp = Invoke-WebRequest -Method $Method -Uri $Url -Headers (@{ "Content-Type" = "application/json" } + $Headers) -Body $jbody -TimeoutSec $TimeoutSec -ErrorAction Stop
      try {
        $parsed = $resp.Content | ConvertFrom-Json -ErrorAction Stop
        return @{ ok = $true; status = $resp.StatusCode; body = $parsed }
      } catch {
        return @{ ok = $true; status = $resp.StatusCode; body = $resp.Content }
      }
    }
  } catch {
    $err = $_.Exception
    if ($err.Response -and $err.Response.StatusCode) {
      $status = [int]$err.Response.StatusCode
      try { $text = (New-Object System.IO.StreamReader($err.Response.GetResponseStream())).ReadToEnd() } catch { $text = $err.Message }
      return @{ ok = $false; status = $status; error = $text }
    } else {
      return @{ ok = $false; status = 0; error = $err.Message }
    }
  }
}

function Print-Result($r) {
  if (-not $r) { Write-Fail "No result"; return }
  if ($r.ok) {
    Write-Ok "HTTP $($r.status)"
    if ($null -ne $r.body) {
      if ($r.body -is [System.String]) {
        if ($r.body.Length -gt 2000) {
          Write-Host ($r.body.Substring(0,2000) + "...(truncated)")
        } else {
          Write-Host $r.body
        }
      } else {
        $j = $r.body | ConvertTo-Json -Depth 10
        Write-Host $j
      }
    } else {
      Write-Host "<no-body>"
    }
  } else {
    Write-Fail "HTTP $($r.status) Error: $($r.error)"
    if ($r.error) { Write-Host $r.error }
  }
}

# --- Endpoint tests (single-call functions) ---
function Test-Ping { param([string]$BaseUrl) 
  $url = "$BaseUrl/api/ping"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url
  Print-Result $r
  return $r
}

function Test-Health { param([string]$BaseUrl)
  $url = "$BaseUrl/api/health"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url
  Print-Result $r
  return $r
}

function Test-Sources { param([string]$BaseUrl)
  $url = "$BaseUrl/api/competitions/sources"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url
  Print-Result $r
  return $r
}

function Test-Competitions {
  param([string]$BaseUrl, [string]$Query = "", [switch]$UpcomingOnly, [int]$Limit = 50)
  $qs = @()
  if ($Query) { $qs += "q=$( [uri]::EscapeDataString($Query) )" }
  if ($UpcomingOnly) { $qs += "upcomingOnly=1" }
  if ($Limit) { $qs += "limit=$Limit" }
  $suffix = ""
  if ($qs.Count -gt 0) { $suffix = "?" + ($qs -join "&") }
  $url = "$BaseUrl/api/competitions$suffix"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url -TimeoutSec 120
  Print-Result $r
  return $r
}

function Test-Competitions-Persisted { param([string]$BaseUrl)
  $url = "$BaseUrl/api/competitions/persisted"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url
  Print-Result $r
  return $r
}

function Test-DebugRaw { param([string]$BaseUrl, [string]$TargetUrl)
  if (-not $TargetUrl) { Write-Fail "TargetUrl required"; return }
  $encoded = [uri]::EscapeDataString($TargetUrl)
  $url = "$BaseUrl/api/competitions/debug-raw?url=$encoded"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url -TimeoutSec 120
  Print-Result $r
  return $r
}

function Test-DebugSource { param([string]$BaseUrl, [string]$SourceId)
  if (-not $SourceId) { Write-Fail "SourceId required"; return }
  $encoded = [uri]::EscapeDataString($SourceId)
  $url = "$BaseUrl/api/competitions/debug-source?id=$encoded"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url -TimeoutSec 120
  Print-Result $r
  return $r
}

function Test-ImportCsv {
  param([string]$BaseUrl, [array]$Rows)
  if (-not $Rows) {
    $Rows = @(
      @{ email = "ps-test+1@example.com"; name = "PS Test 1"; skills = "node,express" },
      @{ email = "ps-test+2@example.com"; name = "PS Test 2"; skills = "react,tailwind" }
    )
  }
  Write-Host "⚠️ This will POST to $BaseUrl/api/students/importcsv and may create DB users." -ForegroundColor Yellow
  $confirm = Read-Host "Proceed? (yes/no)"
  if ($confirm -ne "yes") { Write-Host "Aborted import."; return @{ ok = $false; status = 0; error = "user aborted" } }

  $url = "$BaseUrl/api/students/importcsv"
  Write-Info "POST $url"
  $payload = @{ rows = $Rows }
  $r = Safe-Invoke -Method POST -Url $url -Body $payload -TimeoutSec 120
  Print-Result $r
  return $r
}

function Test-Students-List {
  param([string]$BaseUrl)
  $url = "$BaseUrl/api/students"
  Write-Info "GET $url"
  $r = Safe-Invoke -Method GET -Url $url
  Print-Result $r
  return $r
}

# --- Interactive Menu ---
function Show-Menu {
  Write-Host ""
  Write-Host "Interactive endpoint tester (BaseUrl = $BaseUrl)" -ForegroundColor Magenta
  Write-Host "1) GET /api/ping"
  Write-Host "2) GET /api/health"
  Write-Host "3) GET /api/competitions/sources"
  Write-Host "4) GET /api/competitions (live)"
  Write-Host "5) GET /api/competitions?upcomingOnly=1"
  Write-Host "6) GET /api/competitions/persisted"
  Write-Host "7) GET /api/competitions/debug-raw?url=<url>"
  Write-Host "8) GET /api/competitions/debug-source?id=<id>"
  Write-Host "9) GET /api/students"
  Write-Host "10) POST /api/students/importcsv (creates users) - confirmation required"
  Write-Host "q) Quit"
  $choice = Read-Host "Choose an option"
  switch ($choice) {
    "1" { Test-Ping -BaseUrl $BaseUrl }
    "2" { Test-Health -BaseUrl $BaseUrl }
    "3" { Test-Sources -BaseUrl $BaseUrl }
    "4" { Test-Competitions -BaseUrl $BaseUrl }
    "5" { Test-Competitions -BaseUrl $BaseUrl -UpcomingOnly }
    "6" { Test-Competitions-Persisted -BaseUrl $BaseUrl }
    "7" {
      $u = Read-Host "Enter target URL (e.g. https://example.com)"
      if ($u) { Test-DebugRaw -BaseUrl $BaseUrl -TargetUrl $u } else { Write-Host "No URL entered." }
    }
    "8" {
      $id = Read-Host "Enter source id (use option 3 to list sources)"
      if ($id) { Test-DebugSource -BaseUrl $BaseUrl -SourceId $id } else { Write-Host "No id entered." }
    }
    "9" { Test-Students-List -BaseUrl $BaseUrl }
    "10" {
      $do = Read-Host "Use default sample rows? (yes to use defaults)"
      if ($do -eq "yes") {
        Test-ImportCsv -BaseUrl $BaseUrl
      } else {
        $count = Read-Host "How many rows do you want to enter?"
        if (-not [int]::TryParse($count, [ref]$null) -or [int]$count -le 0) {
          Write-Host "Invalid number. Aborting."
        } else {
          $rows = @()
          for ($i = 1; $i -le [int]$count; $i++) {
            $email = Read-Host "Row $i - email"
            $name = Read-Host "Row $i - name (optional)"
            $skills = Read-Host "Row $i - skills (comma-separated, optional)"
            $row = @{ email = $email }
            if ($name) { $row.name = $name }
            if ($skills) { $row.skills = $skills }
            $rows += $row
          }
          Test-ImportCsv -BaseUrl $BaseUrl -Rows $rows
        }
      }
    }
    "q" { Write-Host "Quitting..."; return $false }
    default { Write-Host "Invalid choice." }
  }
  return $true
}

# Main loop
Write-Host "Endpoint tester started. BaseUrl = $BaseUrl" -ForegroundColor Yellow
while ($true) {
  $cont = Show-Menu
  if ($cont -eq $false) { break }
  Write-Host ""
  $enter = Read-Host "Press Enter to continue..."
}
Write-Host "Bye." -ForegroundColor Yellow
