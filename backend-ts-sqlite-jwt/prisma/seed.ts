require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL || 'admin@local.test';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, passwordHash, role: 'ADMIN' }
    });
    console.log('✅ Admin creado:', email);
  } else {
    console.log('ℹ️ Admin ya existe:', email);
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

async function seedClientes() {
  const clientes = [
    {
      tipoCliente: 'EMPRESA',
      nombre: 'KAIZEN, S.A.',
      empresa: 'KAIZEN, S.A.',
      ruc: 'J0310000239584',
      direccion: 'Km 45, 1/2 carretera a La Boquita, Diriamba, Carazo',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'YS TEXTILES, S.A.',
      empresa: 'YS TEXTILES, S.A.',
      ruc: 'J0310000405719',
      direccion: 'KM 12.5 Carretera Norte, Módulo 30, Las Mercedes, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'TEXNICA DOS, S.A.',
      empresa: 'TEXNICA DOS, S.A.',
      ruc: 'J0310000409188',
      direccion: 'Puente Denivel Portezuelo, 800 mtrs al lago, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Texnica Internacional S.A',
      empresa: 'Texnica Internacional S.A',
      ruc: 'J0310000019612',
      direccion: 'Semáforos Portezuelo, KM 5.5 Carretera Norte, 400 mts Norte, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'BC LOGISTIC S.A',
      empresa: 'BC LOGISTIC S.A',
      ruc: 'J0310000383537',
      direccion: 'KM 14 1/2 Carretera nueva a León, Parque SBC ALLIAN',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'KENTEX, S.A.',
      empresa: 'KENTEX, S.A.',
      ruc: 'J0310000234990',
      direccion: 'KM 14 1/2 Carretera nueva a León, Módulo N8, Managua, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Textiles Unlimited, S.A.',
      empresa: 'Textiles Unlimited, S.A.',
      ruc: 'J0310000106967',
      direccion: 'Carretera Masaya 28 1/2 Km, Zona Franca Coyotepe, Masaya, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GF INDUSTRIES S.A',
      empresa: 'GF INDUSTRIES S.A',
      ruc: 'J0310000384657',
      direccion: 'Gass Uno, 1 cuadra Este, Masatepe – Masaya',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ISTMO TEXTILES S.A',
      empresa: 'ISTMO TEXTILES S.A',
      ruc: 'J0310000226318',
      direccion: 'Unión Fenosa, 200 mts sur, 100 mts este, KM 32 Carretera Masaya–Granada',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ANNIC II S.A — GLD-03',
      empresa: 'ANNIC II S.A',
      ruc: 'J0310000234752',
      direccion: 'Zona Franca Las Palmeras, KM 45 1/2 San Marcos, Masatepe',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'ANNIC II S.A — GLD-03-1',
      empresa: 'ANNIC II S.A',
      ruc: 'J0310000234752',
      direccion: 'Zona Franca Las Palmeras, KM 45 1/2 San Marcos, Masatepe',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GILDAN ACTIVEWEAR CHINANDEGA S.A',
      empresa: 'GILDAN ACTIVEWEAR CHINANDEGA S.A',
      ruc: 'J0310000397465',
      direccion: 'Zona Franca Internacional Chinandega S.A, KM 124 Carretera León – Chinandega',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Complejo Judicial León',
      empresa: 'Complejo Judicial León',
      ruc: 'J1330000034642',
      direccion: 'KM 88.5 Carretera León – Managua, Frente a Seminario San Agustín',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'Gildan Activewear Rivas II S.A — GLD-01',
      empresa: 'Gildan Activewear Rivas II S.A',
      ruc: 'J0310000234779',
      direccion: 'Zona Franca Nicaragua, Bo. Conchagua, KM 109.5 Carretera Panamericana Rivas',
      estado: 'ACTIVO',
      creditoHabilitado: false
    },
    {
      tipoCliente: 'EMPRESA',
      nombre: 'GILDAN ACTIVEWEAR SAN MARCOS II S.A',
      empresa: 'GILDAN ACTIVEWEAR SAN MARCOS II S.A',
      ruc: 'J0310000203423',
      direccion: 'Km 45 Carretera San Marcos–Jinotepe, San Marcos, Carazo, Nicaragua',
      estado: 'ACTIVO',
      creditoHabilitado: false
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

async function main() {
  await seedAdmin();
  await seedTipoMovimiento();
  await seedClientes();
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

