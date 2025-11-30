const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestInvoice() {
  try {
    console.log('🔍 Verificando datos existentes...');

    // Verificar que exista al menos un cliente
    const cliente = await prisma.cliente.findFirst();
    if (!cliente) {
      console.error('❌ No hay clientes en la base de datos. Crea al menos un cliente primero.');
      return;
    }
    console.log(`✅ Cliente encontrado: ${cliente.nombre} (ID: ${cliente.id})`);

    // Verificar que existan productos en inventario
    const inventarios = await prisma.inventario.findMany({
      take: 10,
      include: {
        marca: true,
        categoria: true
      }
    });

    if (inventarios.length === 0) {
      console.error('❌ No hay productos en el inventario. Agrega productos primero.');
      return;
    }
    console.log(`✅ Productos encontrados: ${inventarios.length}`);

    // Verificar configuración
    const config = await prisma.configuracion.findFirst();
    console.log(`✅ Configuración: ${config?.razonSocial || 'No configurada'}`);

    // Crear la venta con 45 artículos
    console.log('\n📝 Creando factura de prueba con 45 artículos...');

    const tipoCambio = 36.50;
    const fecha = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

    // Crear detalles de venta (45 artículos)
    const detalles = [];
    for (let i = 0; i < 45; i++) {
      const inventario = inventarios[i % inventarios.length];
      const cantidad = Math.floor(Math.random() * 5) + 1; // 1-5 unidades
      const precioCordoba = Number(inventario.precioVentaSugeridoCordoba) || 500;
      const precioDolar = precioCordoba / tipoCambio;

      detalles.push({
        inventarioId: inventario.id,
        cantidad: cantidad,
        precioUnitarioCordoba: precioCordoba,
        precioUnitarioDolar: precioDolar
      });
    }

    // Calcular totales
    const totalCordoba = detalles.reduce((sum, d) => sum + (d.cantidad * d.precioUnitarioCordoba), 0);
    const totalDolar = totalCordoba / tipoCambio;

    // Crear la venta
    const venta = await prisma.venta.create({
      data: {
        fecha: fecha,
        clienteId: cliente.id,
        numeroFactura: `TEST-45-${Date.now()}`,
        tipoPago: 'CREDITO',
        plazoDias: 30,
        fechaVencimiento: fechaVencimiento,
        totalCordoba: totalCordoba,
        totalDolar: totalDolar,
        tipoCambioValor: tipoCambio,
        usuario: 'TEST_USER',
        observacion: 'Factura de prueba con 45 artículos para validar impresión en múltiples páginas',
        pio: 'PO-TEST-2024-001',
        estadoPago: 'PENDIENTE',
        cancelada: false,
        montoPendiente: totalCordoba,
        detalles: {
          create: detalles
        }
      },
      include: {
        cliente: true,
        detalles: {
          include: {
            inventario: {
              include: {
                marca: true,
                categoria: true
              }
            }
          }
        }
      }
    });

    console.log('\n✅ Factura de prueba creada exitosamente!');
    console.log(`   ID: ${venta.id}`);
    console.log(`   Número: ${venta.numeroFactura}`);
    console.log(`   Cliente: ${venta.cliente?.nombre}`);
    console.log(`   Total artículos: ${venta.detalles.length}`);
    console.log(`   Total C$: ${venta.totalCordoba?.toFixed(2)}`);
    console.log(`   Total $: ${venta.totalDolar?.toFixed(2)}`);
    console.log('\n📋 Primeros 10 artículos:');
    venta.detalles.slice(0, 10).forEach((detalle, index) => {
      console.log(`   ${index + 1}. ${detalle.inventario.nombre} - Cant: ${detalle.cantidad} - C$ ${detalle.precioUnitarioCordoba}`);
    });
    console.log(`   ... y ${venta.detalles.length - 10} artículos más`);

    console.log('\n💡 Para eliminar esta factura de prueba, ejecuta:');
    console.log(`   node backend-ts-sqlite-jwt/scripts/delete-test-invoice.js ${venta.id}`);

  } catch (error) {
    console.error('❌ Error al crear la factura de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestInvoice();
