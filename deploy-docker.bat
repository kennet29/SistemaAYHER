@echo off
echo ========================================
echo   AYHER - Despliegue en Docker
echo ========================================
echo.

echo [1/4] Deteniendo contenedores existentes...
docker-compose down

echo.
echo [2/4] Construyendo imagenes...
docker-compose build --no-cache

echo.
echo [3/4] Iniciando contenedores...
docker-compose up -d

echo.
echo [4/4] Verificando estado...
timeout /t 5 /nobreak >nul
docker-compose ps

echo.
echo ========================================
echo   Despliegue completado!
echo ========================================
echo.
echo Frontend: http://localhost
echo Backend API: http://localhost:4000
echo.
echo Para ver los logs: docker-compose logs -f
echo Para detener: docker-compose down
echo.
pause
