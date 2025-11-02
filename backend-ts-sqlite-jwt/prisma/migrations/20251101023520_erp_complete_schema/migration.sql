-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Remision" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cliente" TEXT,
    "usuario" TEXT,
    "observacion" TEXT,
    "facturada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Remision" ("cliente", "createdAt", "fecha", "id", "observacion", "updatedAt", "usuario") SELECT "cliente", "createdAt", "fecha", "id", "observacion", "updatedAt", "usuario" FROM "Remision";
DROP TABLE "Remision";
ALTER TABLE "new_Remision" RENAME TO "Remision";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
