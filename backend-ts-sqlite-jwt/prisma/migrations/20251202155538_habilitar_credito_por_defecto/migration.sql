-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipoCliente" TEXT NOT NULL DEFAULT 'PERSONA',
    "codigo" TEXT,
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
    "creditoHabilitado" BOOLEAN NOT NULL DEFAULT true,
    "creditoMaximoCordoba" DECIMAL NOT NULL DEFAULT 100000,
    "creditoMaximoDolar" DECIMAL NOT NULL DEFAULT 2739.73,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cliente" ("codigo", "correo1", "correo2", "createdAt", "creditoHabilitado", "creditoMaximoCordoba", "creditoMaximoDolar", "direccion", "empresa", "estado", "id", "nombre", "nombreContacto", "observacion", "razonSocial", "ruc", "telefono1", "telefono2", "tipoCliente", "updatedAt") SELECT "codigo", "correo1", "correo2", "createdAt", "creditoHabilitado", coalesce("creditoMaximoCordoba", 100000) AS "creditoMaximoCordoba", coalesce("creditoMaximoDolar", 2739.73) AS "creditoMaximoDolar", "direccion", "empresa", "estado", "id", "nombre", "nombreContacto", "observacion", "razonSocial", "ruc", "telefono1", "telefono2", "tipoCliente", "updatedAt" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE UNIQUE INDEX "Cliente_ruc_key" ON "Cliente"("ruc");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
