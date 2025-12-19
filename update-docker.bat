@echo off
setlocal
echo ========================================
echo   AYHER - Actualizando Cambios
echo ========================================
echo.

REM --- Configuracion de respaldo del volumen SQLite ---
set "BACKUP_DIR=%cd%\respaldo"
if not exist "%BACKUP_DIR%" (
  mkdir "%BACKUP_DIR%"
)
for /f %%i in ('powershell -NoP -Command "(Get-Date).ToString('yyyyMMdd_HHmmss')"') do set "TS=%%i"

echo Creando respaldo de la base de datos (backend-data -> %BACKUP_DIR%)...
docker run --rm -v backend-data:/data -v "%BACKUP_DIR%":/backup alpine sh -c "if [ -f /data/ayher.db ]; then cp /data/ayher.db /backup/ayher_%TS%.db; fi"
echo.

echo Descargando imagenes actualizadas...
docker-compose pull
echo.

echo Reconstruyendo y actualizando contenedores...
docker-compose up -d --build
echo.

echo Ejecutando migraciones de base de datos (Prisma)...
docker-compose exec backend npx prisma migrate deploy
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
