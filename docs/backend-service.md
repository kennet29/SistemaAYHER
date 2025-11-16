# Backend como proceso independiente para AYHER

Este documento explica como arrancar el backend de AYHER como un servicio o proceso independiente y como preparar el frontend para avisar cuando el backend no esta disponible.

## 1. Preparar el backend

1. Abri una terminal en `backend-ts-sqlite-jwt`.
2. Instala dependencias con `npm install`.
3. Genera el cliente Prisma con `npm run prisma:generate`.
4. Compila el servidor con `npm run build`.
5. Verifica que `prisma/dist/ayher.db` exista y, si hace falta, copialo manualmente a `dist/ayher.db`. El empaquetado tambien lo replica.

Una vez listo, podes usar los scripts de `scripts/` para ejecutar el backend sin empaquetarlo dentro del instalador del frontend.

## 2. Scripts de arranque (Windows)

### `scripts/start-backend.bat`

- Instala dependencias si no existen (npm install).
- Compila `dist/server.js` cuando hace falta.
- Copia `prisma/dist/ayher.db` a `dist/ayher.db` si falta.
- Define `PORT`, `NODE_ENV` y `DATABASE_URL` para usar la base compartida.
- Arranca `node dist/server.js` en modo produccion.

Ejecutalo con:

```cmd
scripts\start-backend.bat
```

La ventana queda abierta mientras el backend corre. Es util para crear un acceso directo en el escritorio.

### `scripts/start-backend.ps1`

La version PowerShell hace los mismos pasos y luego ejecuta `node dist/server.js`. Es facil integrarla con tareas programadas o wrappers como NSSM.

```powershell
.\scripts\start-backend.ps1
```

Pasale `-InstallAsService` si solo queres usar el script para registrar el backend como servicio (sin iniciar el servidor).

## 3. Ajustes del frontend

- `src/components/BackendStatusBanner.tsx` hace polling del endpoint `/health` y muestra un banner fijo si el backend no responde. Usa `resolveApiBase()` y reintenta cada 5 segundos.
- Importamos ese componente en `src/App.tsx` y lo renderizamos encima de las rutas para que cualquier pantalla vea la alerta.
- El estilo va en `src/components/BackendStatusBanner.css`; modifica los colores o el layout alli si queres otro look.

## 4. Guia para el usuario final

1. Ejecuta `scripts/start-backend.bat` o `scripts/start-backend.ps1` para iniciar el backend en `http://127.0.0.1:4000`.
2. Instala/abre el frontend (`frot Setup 0.0.0.exe`). Si el backend no responde, aparece el banner que sugiere reintentar.
3. Si el banner dice que no puede conectar:
   - Confirma que `node` sigue corriendo.
   - Proba `curl http://127.0.0.1:4000/health` para ver el `{"ok":true}`.
   - Toca **Reintentar** o reinicia el frontend una vez que el backend este listo.

Podes crear accesos directos separados para cada parte, o registrar el backend como servicio de Windows para que se levante automaticamente.

## 5. Alternativa con Docker

Si preferís evitar instalar Node/Prisma en cada PC, hay una opción lista para correr el backend en un contenedor:

1. Instalá Docker Desktop (o Docker Engine + Compose) en la máquina destino.
2. Desde la raíz del repositorio ejecutá `docker compose up --build backend`; eso construye la imagen usando `backend-ts-sqlite-jwt/Dockerfile`, copia la plantilla `prisma/dist/ayher.db` al volumen `backend-data` y expone el backend en `http://127.0.0.1:4000`.
3. Podés seguir los logs con `docker compose logs -f backend` para confirmar que responde.
4. El frontend sigue apuntando a `http://127.0.0.1:4000`, así que el banner solo aparece si el contenedor no responde.
5. Para detener o resetear la base usá `docker compose down --volumes`; si no querés perder los datos podés omitir `--volumes`.
