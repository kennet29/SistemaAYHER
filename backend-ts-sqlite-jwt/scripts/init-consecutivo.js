const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initConsecutivo() {
  try {
    console.log('🔧 Inicializando campo de consecutivo de facturas...\n');
    
    const config = await prisma.configuracion.findFirst();
    
    if (!config) {
      console.log('❌ No hay configuración en la base de datos');
      console.log('   Crea una configuración primero desde la interfaz');
      return;
    }

    // Si ya tiene un valor, no hacer nada
    if (config.ultimoNumeroFactura !== null && config.ultimoNumeroFactura !== undefined) {
      console.log(`✅ El consecutivo ya está inicializado: ${config.ultimoNumeroFactura}`);
      return;
    }

    // Inicializar en 0 (el siguiente será 1)
    await prisma.configuracion.update({
      where: { id: config.id },
      data: { ultimoNumeroFactura: 0 }
    });

    console.log('✅ Consecutivo inicializado en 0');
    console.log('   La próxima factura sugerirá el número 1');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

initConsecutivo();
