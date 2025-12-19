require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  const users = [
    {
      name: process.env.ADMIN_NAME || 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@local.test',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'ADMIN'
    },
    {
      name: 'Cramber',
      email: 'cramber83@gmail.com',
      password: 'ayher123',
      role: 'ADMIN'
    }
  ];

  for (const user of users) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await prisma.user.create({
        data: { name: user.name, email: user.email, passwordHash, role: user.role }
      });
      console.log('✅ Usuario creado:', user.email);
    } else {
      console.log('ℹ️ Usuario ya existe:', user.email);
    }
  }
}

async function seedTipoMovimiento() {
  const data = [
    { nombre: 'Entrada', afectaStock: true, esEntrada: true,  descripcion: 'Ingreso por compra u otros' },
    { nombre: 'Salida',  afectaStock: true, esEntrada: false, descripcion: 'Egreso por venta u otros' },
    { nombre: 'Devolución de Cliente', afectaStock: true, esEntrada: true,  descripcion: 'Cliente devuelve producto' },
    { nombre: 'Devolución a Proveedor', afectaStock: true, esEntrada: false, descripcion: 'Devolución al proveedor' },
    { nombre: 'Cambio Entrada', afectaStock: true, esEntrada: true,  descripcion: 'Entrada por cambio' },
    { nombre: 'Cambio Salida',  afectaStock: true, esEntrada: false, descripcion: 'Salida por cambio' },
    { nombre: "Salida por Remisión", afectaStock: true, esEntrada: false, descripcion: "Salida de inventario por remisión" },
    { nombre: 'Armado - Salida', afectaStock: true, esEntrada: false, descripcion: 'Salida de componentes para armar un producto' },
    { nombre: 'Armado - Entrada', afectaStock: true, esEntrada: true, descripcion: 'Entrada del producto armado' },
    { nombre: 'Desarmado - Salida', afectaStock: true, esEntrada: false, descripcion: 'Salida del producto a desarmar' },
    { nombre: 'Desarmado - Entrada', afectaStock: true, esEntrada: true, descripcion: 'Entrada de componentes del desarmado' },
    { nombre: 'Entrada Compra', afectaStock: true, esEntrada: true, descripcion: 'Entrada por compra con costo unitario' },
  ];

  for (const tm of data) {
    await prisma.tipoMovimiento.upsert({
      where: { nombre: tm.nombre },
      update: tm,
      create: tm
    });
  }

  console.log('✅ Tipos de Movimiento listos.');
}

async function seedTipoCambioBase() {
  const existing = await prisma.tipoCambio.findFirst({ orderBy: { createdAt: 'desc' } });
  if (existing) return existing;
  const tc = await prisma.tipoCambio.create({
    data: { valor: new Prisma.Decimal(36.62) },
  });
  console.log('✅ Tipo de cambio base creado:', tc.valor.toString());
  return tc;
}

async function seedCategoriasYMarcas() {
  // Categorías
  const categorias = [
    { nombre: 'Mecánica', descripcion: 'Productos y repuestos mecánicos' },
    { nombre: 'Eléctrica', descripcion: 'Productos y componentes eléctricos' },
    { nombre: 'Electrónica', descripcion: 'Productos y componentes electrónicos' }
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: cat,
      create: cat
    });
  }

  console.log('✅ Categorías creadas: Mecánica, Eléctrica, Electrónica');

  // Marcas
  const marcas = [
    { nombre: 'Jinzen', descripcion: 'Marca Jinzen' },
    { nombre: 'Shifeng', descripcion: 'Marca Shifeng' },
    { nombre: 'StrongH', descripcion: 'Marca StrongH' },
    { nombre: 'YESO', descripcion: 'Marca YESO' },
    { nombre: 'Siruba', descripcion: 'Marca Siruba' },
    { nombre: 'Nistar', descripcion: 'Marca Nistar' }
  ];

  for (const marca of marcas) {
    await prisma.marca.upsert({
      where: { nombre: marca.nombre },
      update: marca,
      create: marca
    });
  }

  console.log('✅ Marcas creadas: Jinzen, Shifeng, StrongH, YESO, Siruba, Nistar');
}

async function seedClientes() {
  const clientes = [
    {
      tipoCliente: 'EMPRESA',
      nombre: 'KAIZEN, S.A.',
      empresa: 'KAIZEN, S.A.',
      ruc: 'J0310000239584',
      direccion: 'Km 45, 1/2 carretera a La Boquita, Diriamba, Carazo',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'YS TEXTILES, S.A.',
      empresa: 'YS TEXTILES, S.A.',
      ruc: 'J0310000405719',
      direccion: 'KM 12.5 Carretera Norte, Módulo 30, Las Mercedes, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'TEXNICA DOS, S.A.',
      empresa: 'TEXNICA DOS, S.A.',
      ruc: 'J0310000409188',
      direccion: 'Puente Denivel Portezuelo, 800 mtrs al lago, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Texnica Internacional S.A',
      empresa: 'Texnica Internacional S.A',
      ruc: 'J0310000019612',
      direccion: 'Semáforos Portezuelo, KM 5.5 Carretera Norte, 400 mts Norte, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'BC LOGISTIC S.A',
      empresa: 'BC LOGISTIC S.A',
      ruc: 'J0310000383537',
      direccion: 'KM 14 1/2 Carretera nueva a León, Parque SBC ALLIAN',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'KENTEX, S.A.',
      empresa: 'KENTEX, S.A.',
      ruc: 'J0310000234990',
      direccion: 'KM 14 1/2 Carretera nueva a León, Módulo N8, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Textiles Unlimited, S.A.',
      empresa: 'Textiles Unlimited, S.A.',
      ruc: 'J0310000106967',
      direccion: 'Carretera Masaya 28 1/2 Km, Zona Franca Coyotepe, Masaya, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GF INDUSTRIES S.A',
      empresa: 'GF INDUSTRIES S.A',
      ruc: 'J0310000384657',
      direccion: 'Gass Uno, 1 cuadra Este, Masatepe – Masaya',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ISTMO TEXTILES S.A',
      empresa: 'ISTMO TEXTILES S.A',
      ruc: 'J0310000226318',
      direccion: 'Unión Fenosa, 200 mts sur, 100 mts este, KM 32 Carretera Masaya–Granada',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ANNIC II S.A — GLD-03',
      empresa: 'ANNIC II S.A',
      ruc: 'J0310000234752',
      direccion: 'Zona Franca Las Palmeras, KM 45 1/2 San Marcos, Masatepe',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ANNIC II S.A — GLD-03-1',
      empresa: 'ANNIC II S.A',
      ruc: 'J0310000234752',
      direccion: 'Zona Franca Las Palmeras, KM 45 1/2 San Marcos, Masatepe',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GILDAN ACTIVEWEAR CHINANDEGA S.A',
      empresa: 'GILDAN ACTIVEWEAR CHINANDEGA S.A',
      ruc: 'J0310000397465',
      direccion: 'Zona Franca Internacional Chinandega S.A, KM 124 Carretera León – Chinandega',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Complejo Judicial León',
      empresa: 'Complejo Judicial León',
      ruc: 'J1330000034642',
      direccion: 'KM 88.5 Carretera León – Managua, Frente a Seminario San Agustín',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Gildan Activewear Rivas II S.A — GLD-01',
      empresa: 'Gildan Activewear Rivas II S.A',
      ruc: 'J0310000234779',
      direccion: 'Zona Franca Nicaragua, Bo. Conchagua, KM 109.5 Carretera Panamericana Rivas',
      estado: 'ACTIVO',
      creditoHabilitado: true
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GILDAN ACTIVEWEAR SAN MARCOS II S.A',
      empresa: 'GILDAN ACTIVEWEAR SAN MARCOS II S.A',
      ruc: 'J0310000203423',
      direccion: 'Km 45 Carretera San Marcos–Jinotepe, San Marcos, Carazo, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: true
    }
  ];

  for (const cliente of clientes) {
    await prisma.cliente.upsert({
      where: { ruc: cliente.ruc },
      update: cliente,
      create: cliente
    });
  }

  console.log('✅ Clientes iniciales creados.');
}

async function seedConfiguracion() {
  const existing = await prisma.configuracion.findFirst();
  
  const configData = {
    razonSocial: 'Servicios Multiples e importaciones AYHER',
    ruc: '0411301830006D',
    direccion: 'Gasolinera Puma 3. al Sur 1/2 arriba',
    telefono1: '8972-8438',
    telefono2: null,
    correo: 'cramber83@gmail.com',
    sitioWeb: null,
    logoUrl: null,
    mensajeFactura: 'Gracias por su preferencia. Precios sujetos a cambio sin previo aviso.',
  };

  if (existing) {
    const config = await prisma.configuracion.update({
      where: { id: existing.id },
      data: configData
    });
    console.log('✅ Configuración de empresa actualizada:', config.razonSocial);
  } else {
    const config = await prisma.configuracion.create({
      data: configData
    });
    console.log('✅ Configuración de empresa creada:', config.razonSocial);
  }
}

async function seedMetodosPago() {
  const metodosPago = [
    {
      nombre: 'BAC',
      tipoCuenta: 'BANCO',
      banco: 'BAC',
      numeroCuenta: '362101875',
      titular: 'Dustin Adonis Ayerdis Espinoza',
      moneda: 'NIO',
      activo: true,
      observaciones: 'Cuenta principal para pagos en córdobas'
    }
  ];

  for (const metodo of metodosPago) {
    const existing = await prisma.metodoPago.findFirst({
      where: {
        banco: metodo.banco,
        numeroCuenta: metodo.numeroCuenta
      }
    });

    if (!existing) {
      await prisma.metodoPago.create({
        data: metodo
      });
      console.log(`✅ Método de pago creado: ${metodo.banco} - ${metodo.numeroCuenta}`);
    } else {
      console.log(`ℹ️ Método de pago ya existe: ${metodo.banco} - ${metodo.numeroCuenta}`);
    }
  }
}

async function seedVentaPrueba() {
  // Verificar si ya existe una venta de prueba
  const ventaExistente = await prisma.venta.findFirst({
    where: { observacion: 'VENTA DE PRUEBA - 15 ARTICULOS' }
  });

  if (ventaExistente) {
    console.log('ℹ️ Venta de prueba ya existe');
    return;
  }

  // Obtener el primer cliente
  const cliente = await prisma.cliente.findFirst();
  if (!cliente) {
    console.log('⚠️ No hay clientes para crear venta de prueba');
    return;
  }

  // Obtener productos del inventario (hasta 15)
  const productos = await prisma.inventario.findMany({
    take: 15,
    include: { marca: true }
  });

  if (productos.length === 0) {
    console.log('⚠️ No hay productos en inventario para crear venta de prueba');
    return;
  }

  // Obtener tipo de cambio actual
  const tipoCambio = await prisma.tipoCambio.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  const tc = Number(tipoCambio?.valor || 36.62);

  // Crear la venta
  const venta = await prisma.venta.create({
    data: {
      cliente: {
        connect: { id: cliente.id }
      },
      tipoPago: 'CONTADO',
      estadoPago: 'PAGADO',
      cancelada: false,
      totalCordoba: 0, // Se calculará después
      totalDolar: 0,    // Se calculará después
      tipoCambioValor: new Prisma.Decimal(tc),
      observacion: 'VENTA DE PRUEBA - 15 ARTICULOS',
      pio: 'PIO-TEST-001',
      detalles: {
        create: productos.map((producto: any, index: number) => {
          const cantidad = Math.floor(Math.random() * 5) + 1; // 1-5 unidades
          const precioCordoba = Number(producto.precioVentaSugeridoCordoba || producto.precioVentaPromedioCordoba || 100);
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

  console.log(`✅ Venta de prueba creada con ${productos.length} artículos`);
  console.log(`   Total: C$ ${totalCordoba.toFixed(2)} / $ ${totalDolar.toFixed(2)}`);
}

async function main() {
  await seedAdmin();
  await seedTipoMovimiento();
  await seedTipoCambioBase();
  await seedCategoriasYMarcas();
  await seedClientes();
  await seedConfiguracion();
  await seedMetodosPago();
  await seedVentaPrueba();
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


