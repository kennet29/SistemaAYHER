# 🐳 Despliegue de AYHER en Docker

## Requisitos Previos

- Docker Desktop instalado y ejecutándose
- Docker Compose (incluido en Docker Desktop)

## 🚀 Despliegue Rápido

### Opción 1: Script Automático (Recomendado)

**Windows (CMD):**
```bash
deploy-docker.bat
```

**Windows (PowerShell):**
```powershell
.\deploy-docker.ps1
```

### Opción 2: Manual

1. **Detener contenedores existentes:**
```bash
docker-compose down
```

2. **Construir las imágenes:**
```bash
docker-compose build --no-cache
```

3. **Iniciar los contenedores:**
```bash
docker-compose up -d
```

4. **Verificar el estado:**
```bash
docker-compose ps
```

## 📦 Servicios Desplegados

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend | 80 | http://localhost |
| Backend API | 4000 | http://localhost:4000 |

## 🔄 Configurar Inicio Automático con Windows

Para que tu software esté **siempre disponible** cuando enciendas la PC:

### Método 1: Configuración Rápida (Recomendado)

**Ejecuta como Administrador:**

```bash
# CMD
configurar-docker-servicio.bat

# PowerShell
.\configurar-docker-servicio.ps1
```

Este script configura Docker Desktop como servicio de Windows para inicio automático.

### Método 2: Configuración Manual

#### Paso 1: Configurar Docker Desktop

1. Abre Docker Desktop
2. Haz clic en el ícono de engranaje (Settings)
3. En la sección "General", activa:
   - ✅ **"Start Docker Desktop when you log in"**
   - ✅ **"Use the WSL 2 based engine"** (si está disponible)
4. Haz clic en "Apply & Restart"

#### Paso 2: Configurar Servicio de Windows (Opcional pero recomendado)

1. Presiona `Win + R` y escribe `services.msc`
2. Busca el servicio **"Docker Desktop Service"** o **"com.docker.service"**
3. Haz doble clic en el servicio
4. En "Tipo de inicio", selecciona **"Automático"**
5. Haz clic en "Aplicar" y luego en "Iniciar" si no está corriendo

#### Paso 3: Verificar política de reinicio automático

Tu `docker-compose.yml` ya está configurado con `restart: unless-stopped`, lo que significa que:
- ✅ Los contenedores se reiniciarán automáticamente si se detienen por error
- ✅ Los contenedores se iniciarán automáticamente cuando Docker Desktop arranque
- ✅ Los contenedores NO se reiniciarán si los detienes manualmente con `docker-compose stop`

### Probar el inicio automático

1. **Despliega tu aplicación:**
   ```bash
   docker-compose up -d
   ```

2. **Reinicia tu PC**

3. **Espera 30-60 segundos** a que Docker Desktop inicie completamente

4. **Abre tu navegador** y ve a http://localhost

5. **Tu aplicación debería estar funcionando automáticamente** ✅

### Verificar que todo funciona

```bash
# Ver estado de Docker
docker info

# Ver contenedores en ejecución
docker-compose ps

# Ver logs de inicio
docker-compose logs
```

### Políticas de reinicio disponibles

Si necesitas cambiar el comportamiento en `docker-compose.yml`:

- `restart: "no"` - Nunca reinicia automáticamente (por defecto)
- `restart: always` - Siempre reinicia, incluso si lo detienes manualmente
- `restart: unless-stopped` - Reinicia siempre, excepto si lo detienes manualmente ⭐ **(recomendado)**
- `restart: on-failure` - Solo reinicia si el contenedor falla

### Solución de problemas de inicio automático

**Docker Desktop no inicia con Windows:**
- Verifica que la opción esté activada en Settings → General
- Ejecuta `configurar-docker-servicio.bat` como Administrador
- Revisa que el servicio esté en "Automático" en `services.msc`

**Los contenedores no inician automáticamente:**
- Verifica que tengan `restart: unless-stopped` en docker-compose.yml
- Asegúrate de haberlos iniciado al menos una vez con `docker-compose up -d`
- Revisa los logs: `docker-compose logs`

**Docker tarda mucho en iniciar:**
- Es normal que tarde 30-60 segundos en la primera carga
- Considera usar WSL 2 para mejor rendimiento (Settings → General)

## 🔧 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f
```

### Ver logs de un servicio específico
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Detener servicios
```bash
docker-compose stop
```

### Detener y eliminar contenedores
```bash
docker-compose down
```

### Detener y eliminar contenedores + volúmenes (⚠️ Elimina la base de datos)
```bash
docker-compose down -v
```

### Reconstruir solo un servicio
```bash
docker-compose build backend
docker-compose build frontend
```

### Acceder a la shell de un contenedor
```bash
docker-compose exec backend sh
docker-compose exec frontend sh
```

## 💾 Gestión de Base de Datos

### Ubicación de la base de datos
La base de datos se almacena en un volumen Docker persistente llamado `backend-data`.

### Hacer respaldo de la base de datos
```bash
docker-compose exec backend cp /app/data/ayher.db /app/respaldo/backup-$(date +%Y%m%d-%H%M%S).db
```

### Restaurar base de datos
1. Coloca tu archivo .db en la carpeta `respaldo/`
2. Usa la interfaz web en: http://localhost/restaurar-db

### Ver archivos de la base de datos
```bash
docker-compose exec backend ls -la /app/data/
```

## 🔄 Actualizar la Aplicación

Cuando hagas cambios en el código:

1. **Reconstruir y reiniciar:**
```bash
docker-compose up -d --build
```

2. **O usar el script de despliegue:**
```bash
deploy-docker.bat
```

## 🐛 Solución de Problemas

### El frontend no carga
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### El backend no responde
```bash
docker-compose logs backend
docker-compose restart backend
```

### Error de puerto en uso
```bash
# Ver qué está usando el puerto
netstat -ano | findstr :80
netstat -ano | findstr :4000

# Detener el proceso o cambiar el puerto en docker-compose.yml
```

### Limpiar todo y empezar de nuevo
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

### Ver uso de recursos
```bash
docker stats
```

## 📊 Monitoreo

### Ver estado de contenedores
```bash
docker-compose ps
```

### Ver uso de recursos
```bash
docker stats
```

### Inspeccionar un contenedor
```bash
docker inspect ayher-backend
docker inspect ayher-frontend
```

## 🔐 Seguridad

- La base de datos está protegida en un volumen Docker
- El frontend se comunica con el backend a través de proxy inverso
- Los archivos de respaldo se almacenan en volúmenes montados

## 📝 Notas Importantes

1. **Primera ejecución:** La primera vez puede tardar varios minutos en construir las imágenes
2. **Datos persistentes:** La base de datos se mantiene entre reinicios gracias al volumen Docker
3. **Respaldos:** Se recomienda hacer respaldos regulares de la base de datos
4. **Actualizaciones:** Después de actualizar el código, reconstruye las imágenes

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs: `docker-compose logs -f`
2. Verifica que Docker Desktop esté ejecutándose
3. Asegúrate de que los puertos 80 y 4000 estén disponibles
4. Intenta reconstruir desde cero: `docker-compose down -v && docker-compose up -d --build`
