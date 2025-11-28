@echo off
echo ========================================
echo   Respaldo de Base de Datos
echo ========================================
echo.

set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

echo Creando respaldo...
docker cp ayher-backend-1:/app/data/ayher.db ./respaldo/ayher_backup_%TIMESTAMP%.db

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Respaldo creado exitosamente
    echo   Archivo: ayher_backup_%TIMESTAMP%.db
    echo   Ubicacion: ./respaldo/
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Error al crear respaldo
    echo ========================================
)

echo.
pause
