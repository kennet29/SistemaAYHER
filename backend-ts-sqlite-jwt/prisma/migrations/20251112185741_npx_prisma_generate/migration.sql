-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER,
    "numeroFactura" TEXT,
    "tipoPago" TEXT NOT NULL DEFAULT 'CONTADO',
    "plazoDias" INTEGER,
    "fechaVencimiento" DATETIME,
    "montoPendiente" DECIMAL DEFAULT 0,
    "estadoPago" TEXT NOT NULL DEFAULT 'PAGADO',
    "cancelada" BOOLEAN NOT NULL DEFAULT false,
    "totalCordoba" DECIMAL,
    "totalDolar" DECIMAL,
    "tipoCambioValor" DECIMAL NOT NULL DEFAULT 36.50,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("clienteId", "createdAt", "estadoPago", "fecha", "fechaVencimiento", "id", "montoPendiente", "numeroFactura", "observacion", "plazoDias", "tipoCambioValor", "tipoPago", "totalCordoba", "totalDolar", "updatedAt", "usuario") SELECT "clienteId", "createdAt", "estadoPago", "fecha", "fechaVencimiento", "id", "montoPendiente", "numeroFactura", "observacion", "plazoDias", "tipoCambioValor", "tipoPago", "totalCordoba", "totalDolar", "updatedAt", "usuario" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
