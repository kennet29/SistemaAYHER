const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestInvoice() {
  try {
    const ventaId = process.argv[2];

    if (!ventaId) {
      console.log('❌ Debes proporcionar el ID de la venta a eliminar');
      console.log('   Uso: node backend-ts-sqlite-jwt/scripts/delete-test-invoice.js <ID>');
      console.log('\n📋 Facturas de prueba disponibles:');
      
      const ventasPrueba = await prisma.venta.findMany({
        where: {
          numeroFactura: {
            startsWith: 'TEST-'
          }
        },
        include: {
          cliente: true,
          _count: {
            select: { detalles: true }
          }
        }
      });

      if (ventasPrueba.length === 0) {
        console.log('   No hay facturas de prueba');
      } else {
        ventasPrueba.forEach(v => {
          console.log(`   ID: ${v.id} | ${v.numeroFactura} | ${v.cliente?.nombre} | ${v._count.detalles} artículos`);
        });
      }
      return;
    }

    const id = parseInt(ventaId);
    if (isNaN(id)) {
      console.error('❌ El ID debe ser un número válido');
      return;
    }

    // Verificar que la venta existe
    const venta = await prisma.venta.findUnique({
      where: { id },
      include: {
        cliente: true,
        _count: {
          select: { detalles: true }
        }
      }
    });

    if (!venta) {
      console.error(`❌ No se encontró la venta con ID ${id}`);
      return;
    }

    console.log(`🗑️  Eliminando factura: ${venta.numeroFactura}`);
    console.log(`   Cliente: ${venta.cliente?.nombre}`);
    console.log(`   Artículos: ${venta._count.detalles}`);

    // Eliminar detalles primero
    await prisma.detalleVenta.deleteMany({
      where: { ventaId: id }
    });

    // Eliminar la venta
    await prisma.venta.delete({
      where: { id }
    });

    console.log('✅ Factura eliminada exitosamente');

  } catch (error) {
    console.error('❌ Error al eliminar la factura:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestInvoice();
