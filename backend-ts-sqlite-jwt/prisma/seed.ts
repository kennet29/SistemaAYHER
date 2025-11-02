import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

async function main() {
  await seedAdmin();
  await seedTipoMovimiento();
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
