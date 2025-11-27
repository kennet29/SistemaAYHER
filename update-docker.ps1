Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AYHER - Actualizando Cambios" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Reconstruyendo y actualizando contenedores..." -ForegroundColor Yellow
docker-compose up -d --build

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Actualizacion completada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost" -ForegroundColor White
Write-Host "Backend API: http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "Para ver los logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host ""
