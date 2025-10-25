/*
  Warnings:

  - Added the required column `precioUnitarioDolar` to the `DetalleCambio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoUnitarioDolar` to the `DetalleCompra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costoUnitarioDolar` to the `DetalleDevolucionCompra` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precioUnitarioDolar` to the `DetalleDevolucionVenta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `precioUnitarioDolar` to the `DetalleVenta` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categoriaId` to the `Inventario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Compra" ADD COLUMN "totalDolar" DECIMAL;

-- AlterTable
ALTER TABLE "MovimientoInventario" ADD COLUMN "costoUnitarioDolar" DECIMAL;
ALTER TABLE "MovimientoInventario" ADD COLUMN "precioVentaUnitarioDolar" DECIMAL;

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN "totalDolar" DECIMAL;

-- CreateTable
CREATE TABLE "Categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono1" TEXT,
    "telefono2" TEXT,
    "correo" TEXT,
    "sitioWeb" TEXT,
    "logoUrl" TEXT,
    "mensajeFactura" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DetalleCambio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cambioId" INTEGER NOT NULL,
    "inventarioSalidaId" INTEGER NOT NULL,
    "inventarioEntradaId" INTEGER NOT NULL,
    "cantidadSalida" INTEGER NOT NULL,
    "cantidadEntrada" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "precioUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleCambio_cambioId_fkey" FOREIGN KEY ("cambioId") REFERENCES "Cambio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCambio_inventarioSalidaId_fkey" FOREIGN KEY ("inventarioSalidaId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCambio_inventarioEntradaId_fkey" FOREIGN KEY ("inventarioEntradaId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetalleCambio" ("cambioId", "cantidadEntrada", "cantidadSalida", "createdAt", "id", "inventarioEntradaId", "inventarioSalidaId", "precioUnitarioCordoba", "updatedAt") SELECT "cambioId", "cantidadEntrada", "cantidadSalida", "createdAt", "id", "inventarioEntradaId", "inventarioSalidaId", "precioUnitarioCordoba", "updatedAt" FROM "DetalleCambio";
DROP TABLE "DetalleCambio";
ALTER TABLE "new_DetalleCambio" RENAME TO "DetalleCambio";
CREATE TABLE "new_DetalleCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "compraId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioCordoba" DECIMAL NOT NULL,
    "costoUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCompra_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetalleCompra" ("cantidad", "compraId", "costoUnitarioCordoba", "createdAt", "id", "inventarioId", "updatedAt") SELECT "cantidad", "compraId", "costoUnitarioCordoba", "createdAt", "id", "inventarioId", "updatedAt" FROM "DetalleCompra";
DROP TABLE "DetalleCompra";
ALTER TABLE "new_DetalleCompra" RENAME TO "DetalleCompra";
CREATE TABLE "new_DetalleDevolucionCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "devolucionCompraId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioCordoba" DECIMAL NOT NULL,
    "costoUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleDevolucionCompra_devolucionCompraId_fkey" FOREIGN KEY ("devolucionCompraId") REFERENCES "DevolucionCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleDevolucionCompra_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetalleDevolucionCompra" ("cantidad", "costoUnitarioCordoba", "createdAt", "devolucionCompraId", "id", "inventarioId", "updatedAt") SELECT "cantidad", "costoUnitarioCordoba", "createdAt", "devolucionCompraId", "id", "inventarioId", "updatedAt" FROM "DetalleDevolucionCompra";
DROP TABLE "DetalleDevolucionCompra";
ALTER TABLE "new_DetalleDevolucionCompra" RENAME TO "DetalleDevolucionCompra";
CREATE TABLE "new_DetalleDevolucionVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "devolucionVentaId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "precioUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleDevolucionVenta_devolucionVentaId_fkey" FOREIGN KEY ("devolucionVentaId") REFERENCES "DevolucionVenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleDevolucionVenta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetalleDevolucionVenta" ("cantidad", "createdAt", "devolucionVentaId", "id", "inventarioId", "precioUnitarioCordoba", "updatedAt") SELECT "cantidad", "createdAt", "devolucionVentaId", "id", "inventarioId", "precioUnitarioCordoba", "updatedAt" FROM "DetalleDevolucionVenta";
DROP TABLE "DetalleDevolucionVenta";
ALTER TABLE "new_DetalleDevolucionVenta" RENAME TO "DetalleDevolucionVenta";
CREATE TABLE "new_DetalleVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "precioUnitarioDolar" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DetalleVenta" ("cantidad", "createdAt", "id", "inventarioId", "precioUnitarioCordoba", "updatedAt", "ventaId") SELECT "cantidad", "createdAt", "id", "inventarioId", "precioUnitarioCordoba", "updatedAt", "ventaId" FROM "DetalleVenta";
DROP TABLE "DetalleVenta";
ALTER TABLE "new_DetalleVenta" RENAME TO "DetalleVenta";
CREATE TABLE "new_Inventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroParte" TEXT NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "costoPromedioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaPromedioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaSugeridoCordoba" DECIMAL NOT NULL DEFAULT 0,
    "costoPromedioDolar" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaPromedioDolar" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaSugeridoDolar" DECIMAL NOT NULL DEFAULT 0,
    "codigoSustituto" TEXT,
    "marcaSustitutoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inventario_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventario_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventario_codigoSustituto_marcaSustitutoId_fkey" FOREIGN KEY ("codigoSustituto", "marcaSustitutoId") REFERENCES "Inventario" ("numeroParte", "marcaId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Inventario" ("codigoSustituto", "costoPromedioCordoba", "createdAt", "descripcion", "id", "marcaId", "marcaSustitutoId", "nombre", "numeroParte", "precioVentaPromedioCordoba", "precioVentaSugeridoCordoba", "stockActual", "updatedAt") SELECT "codigoSustituto", "costoPromedioCordoba", "createdAt", "descripcion", "id", "marcaId", "marcaSustitutoId", "nombre", "numeroParte", "precioVentaPromedioCordoba", "precioVentaSugeridoCordoba", "stockActual", "updatedAt" FROM "Inventario";
DROP TABLE "Inventario";
ALTER TABLE "new_Inventario" RENAME TO "Inventario";
CREATE UNIQUE INDEX "Inventario_numeroParte_marcaId_key" ON "Inventario"("numeroParte", "marcaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_ruc_key" ON "Configuracion"("ruc");
