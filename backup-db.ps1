Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Respaldo de Base de Datos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "ayher_backup_$timestamp.db"

Write-Host "Creando respaldo..." -ForegroundColor Yellow

docker cp ayher-backend-1:/app/data/ayher.db "./respaldo/$backupFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Respaldo creado exitosamente" -ForegroundColor Green
    Write-Host "  Archivo: $backupFile" -ForegroundColor White
    Write-Host "  Ubicacion: ./respaldo/" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Error al crear respaldo" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
Read-Host "Presiona Enter para salir"
