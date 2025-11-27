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
