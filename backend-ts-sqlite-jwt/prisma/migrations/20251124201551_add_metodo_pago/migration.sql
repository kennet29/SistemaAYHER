-- CreateTable
CREATE TABLE "MetodoPago" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "tipoCuenta" TEXT NOT NULL,
    "banco" TEXT,
    "numeroCuenta" TEXT,
    "titular" TEXT,
    "moneda" TEXT NOT NULL DEFAULT 'NIO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
