Write-Host "Test Week 10" -ForegroundColor Cyan
$loginBody='{"username":"admin","password":"admin123"}'
$loginResp=Invoke-RestMethod -Uri 'http://localhost:3000/auth/login' -Method POST -ContentType 'application/json' -Body $loginBody
$token=$loginResp.token
Write-Host "Token: OK" -ForegroundColor Green
$resp=Invoke-RestMethod -Uri 'http://localhost:3000/admin/parametros' -Method GET -Headers @{'Authorization'="Bearer $token"}
Write-Host "Total: $($resp.total)" -ForegroundColor Green
Write-Host "PASS" -ForegroundColor Green
