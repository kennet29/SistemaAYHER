@echo off
echo ========================================
echo Configurando Docker como Servicio de Windows
echo ========================================
echo.

echo Verificando servicios de Docker...
sc query "com.docker.service" | findstr "RUNNING"
if %errorlevel% == 0 (
    echo [OK] Docker Service esta ejecutandose
) else (
    echo [!] Docker Service NO esta ejecutandose
    echo Intentando iniciar el servicio...
    sc start "com.docker.service"
)

echo.
echo Configurando inicio automatico...
sc config "com.docker.service" start=auto
if %errorlevel% == 0 (
    echo [OK] Docker Service configurado para inicio automatico
) else (
    echo [ERROR] No se pudo configurar. Ejecuta este script como Administrador
    pause
    exit /b 1
)

echo.
echo ========================================
echo Configuracion completada!
echo ========================================
echo.
echo Docker Desktop se iniciara automaticamente con Windows.
echo Tus contenedores se iniciaran automaticamente cuando Docker este listo.
echo.
pause
