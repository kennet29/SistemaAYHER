/*
  Warnings:

  - You are about to drop the column `cliente` on the `Remision` table. All the data in the column will be lost.
  - Added the required column `clienteId` to the `Remision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numero` to the `Remision` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DetalleRemision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "remisionId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "facturado" BOOLEAN NOT NULL DEFAULT false,
    "movimientoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleRemision_remisionId_fkey" FOREIGN KEY ("remisionId") REFERENCES "Remision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleRemision_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleRemision_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "MovimientoInventario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetalleRemision" ("cantidad", "createdAt", "facturado", "id", "inventarioId", "remisionId", "updatedAt") SELECT "cantidad", "createdAt", "facturado", "id", "inventarioId", "remisionId", "updatedAt" FROM "DetalleRemision";
DROP TABLE "DetalleRemision";
ALTER TABLE "new_DetalleRemision" RENAME TO "DetalleRemision";
CREATE UNIQUE INDEX "DetalleRemision_movimientoId_key" ON "DetalleRemision"("movimientoId");
CREATE TABLE "new_Remision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER NOT NULL,
    "usuario" TEXT,
    "observacion" TEXT,
    "facturada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Remision_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Remision" ("createdAt", "facturada", "fecha", "id", "observacion", "updatedAt", "usuario") SELECT "createdAt", "facturada", "fecha", "id", "observacion", "updatedAt", "usuario" FROM "Remision";
DROP TABLE "Remision";
ALTER TABLE "new_Remision" RENAME TO "Remision";
CREATE UNIQUE INDEX "Remision_numero_key" ON "Remision"("numero");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
