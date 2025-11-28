require('dotenv/config');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanSeedData() {
  console.log('🧹 Limpiando datos de semilla...');

  // Eliminar movimientos de inventario de productos de semilla
  const deletedMovimientos = await prisma.movimientoInventario.deleteMany({
    where: {
      observacion: {
        contains: 'semilla'
      }
    }
  });
  console.log(`✅ Eliminados ${deletedMovimientos.count} movimientos de semilla`);

  // Eliminar productos de semilla (SEED-ENTRADA)
  const deletedInventario = await prisma.inventario.deleteMany({
    where: {
      numeroParte: 'SEED-ENTRADA'
    }
  });
  console.log(`✅ Eliminados ${deletedInventario.count} productos de semilla`);

  // Opcional: Eliminar marca y categoría GENERICA/GENERAL si no tienen otros productos
  const marcaGenerica = await prisma.marca.findUnique({ where: { nombre: 'GENERICA' } });
  if (marcaGenerica) {
    const productosConMarca = await prisma.inventario.count({ where: { marcaId: marcaGenerica.id } });
    if (productosConMarca === 0) {
      await prisma.marca.delete({ where: { id: marcaGenerica.id } });
      console.log('✅ Eliminada marca GENERICA');
    }
  }

  const categoriaGeneral = await prisma.categoria.findUnique({ where: { nombre: 'GENERAL' } });
  if (categoriaGeneral) {
    const productosConCategoria = await prisma.inventario.count({ where: { categoriaId: categoriaGeneral.id } });
    if (productosConCategoria === 0) {
      await prisma.categoria.delete({ where: { id: categoriaGeneral.id } });
      console.log('✅ Eliminada categoría GENERAL');
    }
  }

  console.log('✅ Limpieza completada');
}

cleanSeedData()
  .catch((e) => {
    console.error('❌ Error en limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
