Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Prisma Studio en Docker" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prisma Studio estara disponible en:" -ForegroundColor Green
Write-Host "http://localhost:5555" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

docker-compose exec backend npx prisma studio --browser none --port 5555 --hostname 0.0.0.0

Read-Host "Presiona Enter para salir"
