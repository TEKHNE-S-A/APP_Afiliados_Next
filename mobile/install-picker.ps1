# Script de instalación para el componente Picker
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Instalando @react-native-picker/picker" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Set-Location -Path $PSScriptRoot

Write-Host "Instalando dependencia compatible con Expo 48..." -ForegroundColor Yellow
npx expo install @react-native-picker/picker@2.4.8

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Instalación completada exitosamente" -ForegroundColor Green
    Write-Host "`nVersión instalada: @react-native-picker/picker@2.4.8 (compatible con Expo 48)" -ForegroundColor Gray
    Write-Host "`nPróximo paso:" -ForegroundColor Cyan
    Write-Host "  npx expo start" -ForegroundColor White
} else {
    Write-Host "`n❌ Error en la instalación" -ForegroundColor Red
    Write-Host "Intenta ejecutar manualmente:" -ForegroundColor Yellow
    Write-Host "  npx expo install @react-native-picker/picker@2.4.8" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
