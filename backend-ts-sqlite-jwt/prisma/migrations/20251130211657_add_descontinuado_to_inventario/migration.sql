-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numeroParte" TEXT NOT NULL,
    "marcaId" INTEGER NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER,
    "ubicacion" TEXT,
    "descontinuado" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Inventario" ("categoriaId", "codigoSustituto", "costoPromedioCordoba", "costoPromedioDolar", "createdAt", "descripcion", "id", "marcaId", "marcaSustitutoId", "nombre", "numeroParte", "precioVentaPromedioCordoba", "precioVentaPromedioDolar", "precioVentaSugeridoCordoba", "precioVentaSugeridoDolar", "stockActual", "stockMinimo", "ubicacion", "updatedAt") SELECT "categoriaId", "codigoSustituto", "costoPromedioCordoba", "costoPromedioDolar", "createdAt", "descripcion", "id", "marcaId", "marcaSustitutoId", "nombre", "numeroParte", "precioVentaPromedioCordoba", "precioVentaPromedioDolar", "precioVentaSugeridoCordoba", "precioVentaSugeridoDolar", "stockActual", "stockMinimo", "ubicacion", "updatedAt" FROM "Inventario";
DROP TABLE "Inventario";
ALTER TABLE "new_Inventario" RENAME TO "Inventario";
CREATE INDEX "Inventario_ubicacion_idx" ON "Inventario"("ubicacion");
CREATE UNIQUE INDEX "Inventario_numeroParte_marcaId_key" ON "Inventario"("numeroParte", "marcaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
