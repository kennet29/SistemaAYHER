const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTestInvoices() {
  try {
    console.log('📋 Buscando facturas de prueba...\n');
    
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
      },
      orderBy: {
        id: 'desc'
      }
    });

    if (ventasPrueba.length === 0) {
      console.log('❌ No hay facturas de prueba');
    } else {
      console.log(`✅ Encontradas ${ventasPrueba.length} facturas de prueba:\n`);
      ventasPrueba.forEach(v => {
        console.log(`   ID: ${v.id}`);
        console.log(`   Número: ${v.numeroFactura}`);
        console.log(`   Cliente: ${v.cliente?.nombre || 'N/A'}`);
        console.log(`   Artículos: ${v._count.detalles}`);
        console.log(`   Total C$: ${v.totalCordoba}`);
        console.log(`   Fecha: ${v.fecha.toLocaleDateString()}`);
        console.log(`   ---`);
      });
      
      console.log(`\n💡 Para eliminar una factura, ejecuta:`);
      console.log(`   node backend-ts-sqlite-jwt/scripts/delete-test-invoice.js <ID>`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestInvoices();
