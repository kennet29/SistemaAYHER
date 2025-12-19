-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductoCotizado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventarioId" INTEGER,
    "clienteId" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioDolar" DECIMAL NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'NIO',
    "numeroParteLibre" TEXT,
    "nombreLibre" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductoCotizado_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductoCotizado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProductoCotizado" ("cantidad", "clienteId", "createdAt", "fecha", "id", "inventarioId", "moneda", "precioCordoba", "precioDolar", "updatedAt") SELECT "cantidad", "clienteId", "createdAt", "fecha", "id", "inventarioId", "moneda", "precioCordoba", "precioDolar", "updatedAt" FROM "ProductoCotizado";
DROP TABLE "ProductoCotizado";
ALTER TABLE "new_ProductoCotizado" RENAME TO "ProductoCotizado";
CREATE INDEX "ProductoCotizado_inventarioId_fecha_idx" ON "ProductoCotizado"("inventarioId", "fecha");
CREATE INDEX "ProductoCotizado_clienteId_idx" ON "ProductoCotizado"("clienteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
