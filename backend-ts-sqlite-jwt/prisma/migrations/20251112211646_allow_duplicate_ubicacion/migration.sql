-- DropIndex
DROP INDEX "Inventario_ubicacion_key";

-- CreateIndex
CREATE INDEX "Inventario_ubicacion_idx" ON "Inventario"("ubicacion");
