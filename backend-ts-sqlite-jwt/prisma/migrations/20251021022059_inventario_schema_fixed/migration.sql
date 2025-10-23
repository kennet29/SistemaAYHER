-- CreateTable
CREATE TABLE "Marca" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TipoCambio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TipoMovimiento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "afectaStock" BOOLEAN NOT NULL,
    "esEntrada" BOOLEAN NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroParte" TEXT NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "costoPromedioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaPromedioCordoba" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaSugeridoCordoba" DECIMAL NOT NULL DEFAULT 0,
    "codigoSustituto" TEXT,
    "marcaSustitutoId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Inventario_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Marca" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Inventario_codigoSustituto_marcaSustitutoId_fkey" FOREIGN KEY ("codigoSustituto", "marcaSustitutoId") REFERENCES "Inventario" ("numeroParte", "marcaId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inventarioId" INTEGER NOT NULL,
    "tipoMovimientoId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioCordoba" DECIMAL,
    "precioVentaUnitarioCordoba" DECIMAL,
    "tipoCambioValor" DECIMAL,
    "observacion" TEXT,
    "usuario" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MovimientoInventario_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MovimientoInventario_tipoMovimientoId_fkey" FOREIGN KEY ("tipoMovimientoId") REFERENCES "TipoMovimiento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedor" TEXT NOT NULL,
    "numeroFactura" TEXT,
    "totalCordoba" DECIMAL,
    "tipoCambioValor" DECIMAL NOT NULL DEFAULT 36.50,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DetalleCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "compraId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioCordoba" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCompra_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Venta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "numeroFactura" TEXT,
    "totalCordoba" DECIMAL,
    "tipoCambioValor" DECIMAL NOT NULL DEFAULT 36.50,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleVenta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevolucionVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ventaId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "motivo" TEXT,
    "usuario" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DevolucionVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleDevolucionVenta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "devolucionVentaId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleDevolucionVenta_devolucionVentaId_fkey" FOREIGN KEY ("devolucionVentaId") REFERENCES "DevolucionVenta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleDevolucionVenta_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevolucionCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "compraId" INTEGER NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedor" TEXT,
    "motivo" TEXT,
    "usuario" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DevolucionCompra_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "Compra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleDevolucionCompra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "devolucionCompraId" INTEGER NOT NULL,
    "inventarioId" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitarioCordoba" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleDevolucionCompra_devolucionCompraId_fkey" FOREIGN KEY ("devolucionCompraId") REFERENCES "DevolucionCompra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleDevolucionCompra_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cambio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "motivo" TEXT,
    "usuario" TEXT,
    "observacion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DetalleCambio" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cambioId" INTEGER NOT NULL,
    "inventarioSalidaId" INTEGER NOT NULL,
    "inventarioEntradaId" INTEGER NOT NULL,
    "cantidadSalida" INTEGER NOT NULL,
    "cantidadEntrada" INTEGER NOT NULL,
    "precioUnitarioCordoba" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DetalleCambio_cambioId_fkey" FOREIGN KEY ("cambioId") REFERENCES "Cambio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCambio_inventarioSalidaId_fkey" FOREIGN KEY ("inventarioSalidaId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DetalleCambio_inventarioEntradaId_fkey" FOREIGN KEY ("inventarioEntradaId") REFERENCES "Inventario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Marca_nombre_key" ON "Marca"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TipoMovimiento_nombre_key" ON "TipoMovimiento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Inventario_numeroParte_marcaId_key" ON "Inventario"("numeroParte", "marcaId");
