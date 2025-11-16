#!/bin/sh
set -e

DATA_DIR=/app/data
DB_FILE=$DATA_DIR/ayher.db
BACKUP_DIR=${BACKUP_DIR:-/app/respaldo}
DESKTOP_BACKUP_DIR=${DESKTOP_BACKUP_DIR:-/app/respaldo-desktop}

mkdir -p "$DATA_DIR"
if [ ! -f "$DB_FILE" ]; then
  if [ -f /app/prisma/dist/ayher.db ]; then
    cp /app/prisma/dist/ayher.db "$DB_FILE"
  else
    touch "$DB_FILE"
  fi
fi

# Mirror the active database into the shared respaldo folder.
mkdir -p "$BACKUP_DIR"
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$BACKUP_DIR/ayher.db"
  echo "Backup updated at $BACKUP_DIR/ayher.db"
else
  echo "Inspecting DB path: $DB_FILE not present yet."
fi

# Mirror into the optional desktop folder so you can analyze offline.
mkdir -p "$DESKTOP_BACKUP_DIR"
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$DESKTOP_BACKUP_DIR/ayher.db"
  echo "Desktop backup updated at $DESKTOP_BACKUP_DIR/ayher.db"
else
  echo "Desktop DB path: $DB_FILE missing, skip."
fi
# Run the pre-built seed script so we don't need TypeScript tooling in the runtime image.
if [ -f /app/dist/seed.js ]; then
  node /app/dist/seed.js || true
else
  echo "dist/seed.js missing, skipping seed execution."
fi

exec node dist/src/server.js
