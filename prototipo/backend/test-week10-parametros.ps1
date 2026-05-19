param([string]$BaseUrl="http://localhost:3000")
$ErrorActionPreference="Stop"
Write-Host "=== TEST WEEK 10: PARAMETROS con PRISMA ===" -ForegroundColor Cyan
$loginBody=@{username="admin";password="admin123"}|ConvertTo-Json -Compress
$loginResp=Invoke-WebRequest -Uri "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -TimeoutSec 10
$token=($loginResp.Content|ConvertFrom-Json).token
$headers=@{"Authorization"="Bearer $token";"Content-Type"="application/json"}
$resp=Invoke-WebRequest -Uri "$BaseUrl/admin/parametros" -Method GET -Headers $headers -TimeoutSec 10
$data=$resp.Content|ConvertFrom-Json
if($data.total -lt 100){Write-Host "FAIL: total=$($data.total)";exit 1}
Write-Host "PASS: listAll OK (total:$($data.total))" -ForegroundColor Green
exit 0
