-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
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
    "creditoHabilitado" BOOLEAN NOT NULL DEFAULT false,
    "creditoMaximoCordoba" DECIMAL,
    "creditoMaximoDolar" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cliente" ("correo1", "correo2", "createdAt", "direccion", "empresa", "estado", "id", "nombre", "nombreContacto", "observacion", "razonSocial", "ruc", "telefono1", "telefono2", "tipoCliente", "updatedAt") SELECT "correo1", "correo2", "createdAt", "direccion", "empresa", "estado", "id", "nombre", "nombreContacto", "observacion", "razonSocial", "ruc", "telefono1", "telefono2", "tipoCliente", "updatedAt" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
