// Script para actualizar el crédito de todos los clientes existentes
require('dotenv/config');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

async function actualizarCreditoClientes() {
  try {
    console.log('🔄 Actualizando crédito de clientes existentes...');
    
    const result = await prisma.cliente.updateMany({
      data: {
        creditoHabilitado: true,
        creditoMaximoCordoba: new Prisma.Decimal(100000),
        creditoMaximoDolar: new Prisma.Decimal(2739.73)
      }
    });
    
    console.log(`✅ ${result.count} clientes actualizados con crédito habilitado`);
    console.log('   - Crédito habilitado: true');
    console.log('   - Crédito máximo córdobas: C$ 100,000.00');
    console.log('   - Crédito máximo dólares: $ 2,739.73');
    
  } catch (error) {
    console.error('❌ Error actualizando clientes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

actualizarCreditoClientes();
