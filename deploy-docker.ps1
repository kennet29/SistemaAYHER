Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AYHER - Despliegue en Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Deteniendo contenedores existentes..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "[2/4] Construyendo imagenes..." -ForegroundColor Yellow
docker-compose build --no-cache

Write-Host ""
Write-Host "[3/4] Iniciando contenedores..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "[4/4] Verificando estado..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
docker-compose ps

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Despliegue completado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend: http://localhost" -ForegroundColor White
Write-Host "Backend API: http://localhost:4000" -ForegroundColor White
Write-Host ""
Write-Host "Para ver los logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "Para detener: docker-compose down" -ForegroundColor Gray
Write-Host ""
