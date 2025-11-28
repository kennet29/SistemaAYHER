# SistemaAYHER

Sistema de gestión de inventario, ventas y facturación para AYHER.

## 🚀 Inicio Rápido con Docker

### Desplegar la aplicación
```bash
# Windows (CMD)
deploy-docker.bat

# Windows (PowerShell)
.\deploy-docker.ps1
```

### Actualizar la aplicación
```bash
# Windows (CMD)
update-docker.bat

# Windows (PowerShell)
.\update-docker.ps1
```

## 🗄️ Gestión de Base de Datos

### Acceder a Prisma Studio
Para editar registros de la base de datos visualmente:

```bash
# Windows (CMD)
prisma-studio.bat

# Windows (PowerShell)
.\prisma-studio.ps1
```

Luego abre tu navegador en: **http://localhost:5555**

### Crear Respaldo de Base de Datos
```bash
# Windows (CMD)
backup-db.bat

# Windows (PowerShell)
.\backup-db.ps1
```

Los respaldos se guardan en la carpeta `./respaldo/`

## 📋 Acceso al Sistema

- **Frontend**: http://localhost
- **Backend API**: http://localhost:4000
- **Prisma Studio**: http://localhost:5555 (cuando esté activo)

## 👤 Usuarios por Defecto

- **Email**: cramber83@gmail.com  
  **Contraseña**: ayher123

- **Email**: admin@local.test  
  **Contraseña**: admin123

## 🛠️ Comandos Útiles

### Ver logs del backend
```bash
docker-compose logs -f backend
```

### Ver logs del frontend
```bash
docker-compose logs -f frontend
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Detener servicios
```bash
docker-compose down
```

## 📁 Estructura del Proyecto

```
SistemaAYHER/
├── backend-ts-sqlite-jwt/    # Backend (Node.js + Express + Prisma)
├── FrontEnd-React/           # Frontend (React + TypeScript)
├── respaldo/                 # Respaldos de base de datos
├── docker-compose.yml        # Configuración de Docker
└── scripts/                  # Scripts de utilidad
```