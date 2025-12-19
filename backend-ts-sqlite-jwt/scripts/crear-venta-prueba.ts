require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function crearVentaPrueba(numArticulos: number, pioSuffix: string) {
  try {
    // Obtener el primer cliente
    const cliente = await prisma.cliente.findFirst();
    if (!cliente) {
      console.error('❌ No hay clientes en la base de datos');
      return;
    }

    // Obtener productos del inventario
    const productos = await prisma.inventario.findMany({
      take: numArticulos,
      include: {
        marca: true
      }
    });

    if (productos.length < numArticulos) {
      console.error(`❌ Solo hay ${productos.length} productos en el inventario, se necesitan al menos ${numArticulos}`);
      return;
    }

    // Obtener el tipo de cambio actual
    const tipoCambio = await prisma.tipoCambio.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    const tc = Number(tipoCambio?.valor || 36.62);

    // Crear la venta
    const venta = await prisma.venta.create({
      data: {
        clienteId: cliente.id,
        fecha: new Date(),
        tipoPago: 'CONTADO',
        estadoPago: 'PAGADO',
        cancelada: false,
        tipoCambioValor: new Prisma.Decimal(tc),
        totalCordoba: new Prisma.Decimal(0), // Se calculará después
        totalDolar: new Prisma.Decimal(0),   // Se calculará después
        usuario: 'seed-user',
        observacion: `Venta de prueba con ${numArticulos} artículos`,
        pio: `PIO-TEST-${pioSuffix}`,
        detalles: {
          create: productos.map((producto: any, index: number) => {
            const cantidad = Math.floor(Math.random() * 5) + 1; // Entre 1 y 5 unidades
            const precioCordoba = Number(producto.precioVentaPromedioCordoba || 100);
            const precioDolar = precioCordoba / tc;

            return {
              inventarioId: producto.id,
              cantidad: cantidad,
              precioUnitarioCordoba: new Prisma.Decimal(precioCordoba),
              precioUnitarioDolar: new Prisma.Decimal(precioDolar)
            };
          })
        }
      },
      include: {
        detalles: true
      }
    });

    // Calcular totales
    let totalCordoba = 0;
    let totalDolar = 0;

    for (const detalle of venta.detalles) {
      totalCordoba += Number(detalle.cantidad) * Number(detalle.precioUnitarioCordoba);
      totalDolar += Number(detalle.cantidad) * Number(detalle.precioUnitarioDolar);
    }

    // Actualizar la venta con los totales
    await prisma.venta.update({
      where: { id: venta.id },
      data: {
        totalCordoba: new Prisma.Decimal(totalCordoba),
        totalDolar: new Prisma.Decimal(totalDolar)
      }
    });

    console.log('✅ Venta de prueba creada exitosamente');
    console.log(`   ID: ${venta.id}`);
    console.log(`   Cliente: ${cliente.nombre}`);
    console.log(`   Artículos: ${venta.detalles.length}`);
    console.log(`   Total C$: ${totalCordoba.toFixed(2)}`);
    console.log(`   Total $: ${totalDolar.toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error al crear venta de prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Crear las 3 ventas de prueba
async function crearTodasLasVentas() {
  console.log('🚀 Creando ventas de prueba...\n');
  
  // Venta con 30 artículos (2 páginas)
  await crearVentaPrueba(30, '002');
  console.log('');
  
  // Venta con 10 artículos (1 página)
  await crearVentaPrueba(10, '003');
  
  console.log('\n✅ Todas las ventas de prueba han sido creadas');
}

crearTodasLasVentas();
