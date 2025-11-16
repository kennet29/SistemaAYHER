param(
  [switch]$InstallAsService
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$backendDir = Join-Path $scriptDir '..\backend-ts-sqlite-jwt'
Set-Location $backendDir

if (-not (Test-Path node_modules)) {
  Write-Host 'Instalando dependencias del backend...'
  npm install
}

if (-not (Test-Path dist\server.js)) {
  Write-Host 'Compilando el backend...'
  npm run build
}

if (-not (Test-Path dist\ayher.db) -and (Test-Path prisma\dist\ayher.db)) {
  Copy-Item -Force prisma\dist\ayher.db dist\ayher.db
}

if (-not (Test-Path dist\ayher.db)) {
  Write-Error 'La base de datos dist\ayher.db no existe. Generala con npm run prisma:generate.'
  exit 1
}

$env:NODE_ENV = 'production'
$env:PORT = '4000'
$env:DATABASE_URL = "file:$((Get-Location).Path)\dist\ayher.db"

if ($InstallAsService) {
  Write-Host 'Instala el backend como servicio de Windows usando NSSM, sc.exe o el instalador deseado.'
  return
}

Write-Host 'Iniciando servidor AYHER (backend)...'
node dist/src/server.js
