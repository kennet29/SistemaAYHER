Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando Docker como Servicio de Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] Este script necesita ejecutarse como Administrador" -ForegroundColor Yellow
    Write-Host "Haz clic derecho en el archivo y selecciona 'Ejecutar como administrador'" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "Verificando servicios de Docker..." -ForegroundColor Yellow

# Verificar Docker Service
$dockerService = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue

if ($dockerService) {
    Write-Host "[OK] Docker Service encontrado" -ForegroundColor Green
    Write-Host "Estado actual: $($dockerService.Status)" -ForegroundColor Cyan
    
    # Configurar inicio automático
    Set-Service -Name "com.docker.service" -StartupType Automatic
    Write-Host "[OK] Docker Service configurado para inicio automatico" -ForegroundColor Green
    
    # Iniciar el servicio si no está corriendo
    if ($dockerService.Status -ne "Running") {
        Write-Host "Iniciando Docker Service..." -ForegroundColor Yellow
        Start-Service -Name "com.docker.service"
        Write-Host "[OK] Docker Service iniciado" -ForegroundColor Green
    }
} else {
    Write-Host "[!] Docker Service no encontrado" -ForegroundColor Red
    Write-Host "Asegurate de que Docker Desktop este instalado correctamente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configuracion completada!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Docker Desktop se iniciara automaticamente con Windows." -ForegroundColor Green
Write-Host "Tus contenedores se iniciaran automaticamente cuando Docker este listo." -ForegroundColor Green
Write-Host ""
pause
