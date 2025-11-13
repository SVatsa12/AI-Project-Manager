<#
test-backend.ps1
Usage:
  Open PowerShell in your project folder and run:
    .\test-backend.ps1

Customize the variables below (AdminEmail/AdminPassword and API_BASE) if needed.
#>

# ----- Config -----
$API_BASE = "http://localhost:4003"
$AuthPath = "/api/auth/login"
$StudentsPath = "/api/students"

# Admin credentials (change to your admin account)
$AdminEmail = "sv@example.com"
$AdminPassword = "SVatsa123"

# Student test data (change if you like)
$TestStudent = @{
  name  = "Automated Test Student"
  email = "automated-test+pwsh@example.com"
  skills = @("ReactJS","NodeJS","MongoDB")
} 

# Whether to delete the test student at the end
$DeleteAfter = $false

# ----- Helper -----
function ExitOnError($msg, $ex = $null) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  if ($ex) { Write-Host $ex.ToString() -ForegroundColor DarkRed }
  exit 1
}

try {
  Write-Host "1) Logging in as admin..." -ForegroundColor Cyan
  $loginResp = Invoke-RestMethod -Uri ("$API_BASE$AuthPath") -Method POST -Body (@{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json) -ContentType "application/json" -ErrorAction Stop
} catch {
  ExitOnError "Login failed. Check server, URL, and admin credentials." $_
}

$token = $loginResp.token
if (-not $token) { ExitOnError "Login succeeded but no token returned. Inspect login response: $($loginResp | ConvertTo-Json -Depth 5)" }

Write-Host "-> Received token (length): $($token.Length)" -ForegroundColor Green

# Create student
try {
  Write-Host "`n2) Creating test student..." -ForegroundColor Cyan
  $body = $TestStudent | ConvertTo-Json
  $createResp = Invoke-RestMethod -Uri ("$API_BASE$StudentsPath") -Method POST -Headers @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" } -Body $body -ErrorAction Stop
} catch {
  ExitOnError "Create student failed. Check server logs and payload." $_
}

Write-Host "-> Create response:" -ForegroundColor Green
$createResp | ConvertTo-Json -Depth 6 | Write-Host

# Extract identifier to use for later fetch/delete
$createdStudent = $createResp.student
if (-not $createdStudent) { ExitOnError "Server did not return 'student' in create response." }

# Fetch all students and filter for our created student's email
try {
  Write-Host "`n3) Fetching students and locating created record..." -ForegroundColor Cyan
  $all = Invoke-RestMethod -Uri ("$API_BASE$StudentsPath") -Method GET -Headers @{ "Authorization" = "Bearer $token" } -ErrorAction Stop
} catch {
  ExitOnError "GET /api/students failed." $_
}

$found = $all.students | Where-Object { $_.email -eq $createdStudent.email }
if (-not $found) {
  Write-Host "WARNING: Created student not found in GET response. Raw GET output:" -ForegroundColor Yellow
  $all | ConvertTo-Json -Depth 6 | Write-Host
} else {
  Write-Host "`n-> Found student object from GET:" -ForegroundColor Green
  $found | ConvertTo-Json -Depth 6 | Write-Host
}

# Optional: verify by raw DB hint (manual step for mongosh)
Write-Host "`nTIP: To inspect in DB with mongosh:" -ForegroundColor Cyan
Write-Host "  mongosh -> use <your_db_name> ; db.enrollments.find({ email: '$($createdStudent.email)' }).pretty()" -ForegroundColor DarkCyan

# Optional: Delete the created student (uncomment to enable)
if ($DeleteAfter) {
  try {
    Write-Host "`n4) Deleting the created test student..." -ForegroundColor Cyan
    # prefer using Mongo _id for delete. Use createdStudent._id or createdStudent.id
    if ($createdStudent._id) {
    $idToDelete = $createdStudent._id
} else {
    $idToDelete = $createdStudent.id
}

    if (-not $idToDelete) { Write-Host "No _id available to delete. Skipping." -ForegroundColor Yellow }
    else {
      $del = Invoke-RestMethod -Uri ("$API_BASE$StudentsPath/$idToDelete") -Method DELETE -Headers @{ "Authorization" = "Bearer $token" } -ErrorAction Stop
      Write-Host "-> Delete response:" -ForegroundColor Green
      $del | ConvertTo-Json -Depth 5 | Write-Host
    }
  } catch {
    Write-Host "Delete failed (non-fatal):" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor DarkYellow
  }
}

Write-Host "`nAll done." -ForegroundColor Green
