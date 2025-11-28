@echo off
echo ========================================
echo   Iniciando Prisma Studio en Docker
echo ========================================
echo.
echo Prisma Studio estara disponible en:
echo http://localhost:5555
echo.
echo Presiona Ctrl+C para detener
echo ========================================
echo.

docker-compose exec backend npx prisma studio --browser none --port 5555 --hostname 0.0.0.0

pause
