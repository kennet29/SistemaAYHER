/*
  Warnings:

  - You are about to drop the column `cliente` on the `Venta` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipoCliente" TEXT NOT NULL DEFAULT 'PERSONA',
    "nombre" TEXT NOT NULL,
    "empresa" TEXT,
    "nombreContacto" TEXT,
    "ruc" TEXT,
    "razonSocial" TEXT,
    "telefono1" TEXT,
    "telefono2" TEXT,
    "correo1" TEXT,
    "correo2" TEXT,
    "direccion" TEXT,
    "observacion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Remision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DetalleRemision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "remisionId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "facturado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleRemision_remisionId_fkey" FOREIGN KEY ("remisionId") REFERENCES "Remision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleRemision_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DetalleVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "remisionDetalleId" INTEGER,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "precioUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_remisionDetalleId_fkey" FOREIGN KEY ("remisionDetalleId") REFERENCES "DetalleRemision" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DetalleVenta" ("cantidad", "createdAt", "id", "inventarioId", "precioUnitarioCordoba", "precioUnitarioDolar", "updatedAt", "ventaId") SELECT "cantidad", "createdAt", "id", "inventarioId", "precioUnitarioCordoba", "precioUnitarioDolar", "updatedAt", "ventaId" FROM "DetalleVenta";
DROP TABLE "DetalleVenta";
ALTER TABLE "new_DetalleVenta" RENAME TO "DetalleVenta";
CREATE UNIQUE INDEX "DetalleVenta_remisionDetalleId_key" ON "DetalleVenta"("remisionDetalleId");
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
    "totalCordoba" DECIMAL,
    "totalDolar" DECIMAL,
    "tipoCambioValor" DECIMAL NOT NULL DEFAULT 36.50,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("createdAt", "fecha", "id", "numeroFactura", "observacion", "tipoCambioValor", "totalCordoba", "totalDolar", "updatedAt", "usuario") SELECT "createdAt", "fecha", "id", "numeroFactura", "observacion", "tipoCambioValor", "totalCordoba", "totalDolar", "updatedAt", "usuario" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");
