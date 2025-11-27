@echo off
echo ========================================
echo   AYHER - Actualizando Cambios
echo ========================================
echo.

echo Reconstruyendo y actualizando contenedores...
docker-compose up -d --build

echo.
echo ========================================
echo   Actualizacion completada!
echo ========================================
echo.
echo Frontend: http://localhost
echo Backend API: http://localhost:4000
echo.
echo Para ver los logs: docker-compose logs -f
echo.
pause
