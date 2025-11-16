@echo off
setlocal enabledelayedexpansion

REM Navega al backend y prepara el entorno
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%..\\backend-ts-sqlite-jwt"
cd /d "%BACKEND_DIR%"

if not exist node_modules (
  echo Instalando dependencias del backend...
  npm install
)

if not exist dist\server.js (
  echo Compilando el backend...
  npm run build
)

if not exist dist\ayher.db (
  if exist prisma\dist\ayher.db (
    copy /y "prisma\dist\ayher.db" "dist\ayher.db" >nul
  )
)

if not exist dist\ayher.db (
  echo ERROR: el archivo dist\ayher.db no fue generado. Ejecuta npm run prisma:generate && npm run build.
  pause
  exit /b 1
)

set "NODE_ENV=production"
set "DATABASE_URL=file:%BACKEND_DIR%\dist\ayher.db"
set "PORT=4000"

echo Iniciando servidor AYHER (backend)...
node dist\src\server.js
