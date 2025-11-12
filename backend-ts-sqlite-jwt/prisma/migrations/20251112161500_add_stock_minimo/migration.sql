-- Add stockMinimo to Inventario
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

ALTER TABLE "Inventario" ADD COLUMN "stockMinimo" INTEGER;

COMMIT;
PRAGMA foreign_keys=ON;

