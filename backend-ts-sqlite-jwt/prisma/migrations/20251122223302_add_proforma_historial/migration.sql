-- CreateTable
CREATE TABLE "Proforma" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" INTEGER,
    "totalCordoba" DECIMAL NOT NULL DEFAULT 0,
    "totalDolar" DECIMAL NOT NULL DEFAULT 0,
    "tipoCambioValor" DECIMAL,
    "pio" TEXT,
    "incoterm" TEXT,
    "plazoEntrega" TEXT,
    "condicionPago" TEXT,
    "detallesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Proforma_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Proforma_clienteId_fecha_idx" ON "Proforma"("clienteId", "fecha");
