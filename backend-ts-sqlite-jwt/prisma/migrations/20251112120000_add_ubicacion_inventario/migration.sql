-- Add ubicacion column and unique index to Inventario
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Add nullable column
ALTER TABLE "Inventario" ADD COLUMN "ubicacion" TEXT;

-- Unique index to ensure one artículo por ubicación (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "Inventario_ubicacion_key" ON "Inventario" ("ubicacion");

COMMIT;
PRAGMA foreign_keys=ON;

