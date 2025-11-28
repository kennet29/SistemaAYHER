# Guía de Instalación - Sistema AYHER

Esta guía te ayudará a instalar el Sistema AYHER en una computadora nueva usando Docker.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

1. **Docker Desktop** (Windows/Mac) o **Docker Engine** (Linux)
   - Descarga: https://www.docker.com/products/docker-desktop/
   - Versión mínima recomendada: Docker 20.10+

2. **Git** (opcional, para clonar el repositorio)
   - Descarga: https://git-scm.com/downloads

## 🚀 Instalación Paso a Paso

### Paso 1: Obtener los Archivos del Sistema

**Opción A: Clonar con Git**
```bash
git clone [URL-DEL-REPOSITORIO]
cd SistemaAYHER
```

**Opción B: Descargar ZIP**
1. Descarga el archivo ZIP del proyecto
2. Extrae el contenido en una carpeta (ejemplo: `C:\SistemaAYHER`)
3. Abre una terminal en esa carpeta

### Paso 2: Verificar Docker

Abre una terminal (CMD o PowerShell) y verifica que Docker esté instalado:

```bash
docker --version
docker-compose --version
```

Deberías ver las versiones instaladas. Si no, instala Docker Desktop primero.

### Paso 3: Desplegar el Sistema

Ejecuta el script de despliegue según tu sistema:

**Windows (CMD):**
```bash
deploy-docker.bat
```

**Windows (PowerShell):**
```powershell
.\deploy-docker.ps1
```

**Linux/Mac:**
```bash
chmod +x deploy-docker.sh
./deploy-docker.sh
```

Este proceso puede tomar varios minutos la primera vez, ya que descargará las imágenes de Docker necesarias.

### Paso 4: Verificar la Instalación

Una vez completado el despliegue, abre tu navegador y accede a:

- **Sistema Web**: http://localhost
- **API Backend**: http://localhost:4000

Si ves la página de inicio de sesión, ¡la instalación fue exitosa! ✅

## 👤 Acceso al Sistema

Usa estas credenciales para iniciar sesión:

**Usuario Principal:**
- Email: `cramber83@gmail.com`
- Contraseña: `ayher123`

**Usuario Administrador:**
- Email: `admin@local.test`
- Contraseña: `admin123`

## 🔧 Configuración Inicial

### 1. Configurar Información de la Empresa

1. Inicia sesión en el sistema
2. Ve a **Configuración** en el menú
3. Completa los datos de tu empresa:
   - RUC
   - Razón Social
   - Dirección
   - Teléfonos
   - Correo electrónico
   - Número de factura inicial (ejemplo: 875)

### 2. Configurar Métodos de Pago

En la misma página de Configuración:
1. Agrega tus cuentas bancarias
2. Completa: Banco, Número de Cuenta, Titular, Moneda

### 3. Agregar Marcas y Categorías

1. Ve a **Inventario** → **Marcas**
2. Agrega las marcas de productos que manejas
3. Ve a **Inventario** → **Categorías**
4. Agrega las categorías de productos

### 4. Agregar Productos

1. Ve a **Inventario** → **Productos**
2. Haz clic en **Nuevo Producto**
3. Completa la información del producto

## 🗄️ Gestión de Base de Datos

### Acceder a Prisma Studio (Editor Visual)

Para editar registros de la base de datos con una interfaz visual:

**Windows (CMD):**
```bash
prisma-studio.bat
```

**Windows (PowerShell):**
```powershell
.\prisma-studio.ps1
```

Luego abre tu navegador en: **http://localhost:5555**

### Crear Respaldos de la Base de Datos

Es importante crear respaldos periódicos:

**Windows (CMD):**
```bash
backup-db.bat
```

**Windows (PowerShell):**
```powershell
.\backup-db.ps1
```

Los respaldos se guardan automáticamente en la carpeta `./respaldo/` con fecha y hora.

### Restaurar un Respaldo

Si necesitas restaurar un respaldo:

1. Detén los contenedores:
```bash
docker-compose down
```

2. Copia el archivo de respaldo:
```bash
docker cp ./respaldo/ayher_backup_YYYYMMDD_HHMMSS.db ayher-backend-1:/app/data/ayher.db
```

3. Inicia los contenedores:
```bash
docker-compose up -d
```

## 🔄 Actualizar el Sistema

Cuando haya una nueva versión del sistema:

**Windows (CMD):**
```bash
update-docker.bat
```

**Windows (PowerShell):**
```powershell
.\update-docker.ps1
```

Este script:
1. Crea un respaldo automático de la base de datos
2. Descarga la nueva versión
3. Actualiza los contenedores
4. Mantiene tus datos intactos

## 🛠️ Comandos Útiles

### Ver logs del sistema
```bash
# Ver logs del backend
docker-compose logs -f backend

# Ver logs del frontend
docker-compose logs -f frontend

# Ver todos los logs
docker-compose logs -f
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Detener el sistema
```bash
docker-compose down
```

### Iniciar el sistema
```bash
docker-compose up -d
```

### Ver estado de los contenedores
```bash
docker-compose ps
```

## ❓ Solución de Problemas

### El sistema no inicia

1. Verifica que Docker Desktop esté corriendo
2. Verifica que los puertos 80, 4000 y 5555 no estén ocupados:
```bash
netstat -ano | findstr :80
netstat -ano | findstr :4000
netstat -ano | findstr :5555
```

3. Revisa los logs:
```bash
docker-compose logs
```

### No puedo acceder a http://localhost

1. Verifica que el contenedor frontend esté corriendo:
```bash
docker-compose ps
```

2. Si está detenido, reinicia:
```bash
docker-compose restart frontend
```

### Error de base de datos

1. Crea un respaldo de seguridad
2. Detén los contenedores:
```bash
docker-compose down
```

3. Elimina los volúmenes:
```bash
docker volume rm sistemaayher_backend-data
```

4. Vuelve a desplegar:
```bash
deploy-docker.bat
```

### El puerto 80 está ocupado

Si tienes otro servicio usando el puerto 80, puedes cambiar el puerto del frontend:

1. Edita `docker-compose.yml`
2. Cambia la línea `- '80:80'` por `- '8080:80'`
3. Reinicia: `docker-compose up -d`
4. Accede en: http://localhost:8080

## 📞 Soporte

Si tienes problemas con la instalación:

1. Revisa los logs: `docker-compose logs`
2. Verifica que Docker esté actualizado
3. Asegúrate de tener suficiente espacio en disco (mínimo 2GB)
4. Contacta al equipo de soporte

## 📁 Estructura de Archivos

```
SistemaAYHER/
├── backend-ts-sqlite-jwt/     # Código del backend
├── FrontEnd-React/            # Código del frontend
├── respaldo/                  # Respaldos de base de datos
├── docker-compose.yml         # Configuración de Docker
├── deploy-docker.bat          # Script de despliegue (Windows CMD)
├── deploy-docker.ps1          # Script de despliegue (PowerShell)
├── update-docker.bat          # Script de actualización (CMD)
├── update-docker.ps1          # Script de actualización (PowerShell)
├── prisma-studio.bat          # Acceso a Prisma Studio (CMD)
├── prisma-studio.ps1          # Acceso a Prisma Studio (PowerShell)
├── backup-db.bat              # Crear respaldo (CMD)
├── backup-db.ps1              # Crear respaldo (PowerShell)
└── README.md                  # Documentación general
```

## ✅ Checklist de Instalación

- [ ] Docker Desktop instalado y corriendo
- [ ] Archivos del sistema descargados
- [ ] Script de despliegue ejecutado exitosamente
- [ ] Sistema accesible en http://localhost
- [ ] Inicio de sesión exitoso
- [ ] Configuración de empresa completada
- [ ] Métodos de pago configurados
- [ ] Primer respaldo de base de datos creado

¡Felicidades! El Sistema AYHER está listo para usar. 🎉