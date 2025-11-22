-- AlterTable
ALTER TABLE "Remision" ADD COLUMN "pio" TEXT;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "pio" TEXT;

-- CreateTable
CREATE TABLE "ProductoCotizado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventarioId" INTEGER NOT NULL,
    "clienteId" INTEGER,
    "cantidad" INTEGER NOT NULL DEFAULT 1,
    "precioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioDolar" DECIMAL NOT NULL DEFAULT 0,
    "moneda" TEXT NOT NULL DEFAULT 'NIO',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductoCotizado_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProductoCotizado_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductoCotizado_inventarioId_fecha_idx" ON "ProductoCotizado"("inventarioId", "fecha");

-- CreateIndex
CREATE INDEX "ProductoCotizado_clienteId_idx" ON "ProductoCotizado"("clienteId");
