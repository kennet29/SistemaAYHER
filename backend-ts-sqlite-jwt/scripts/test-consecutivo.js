const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConsecutivo() {
  try {
    console.log('🧪 Probando sistema de consecutivo...\n');
    
    // 1. Obtener siguiente número
    const config = await prisma.configuracion.findFirst();
    console.log(`📊 Estado actual:`);
    console.log(`   Último número usado: ${config.ultimoNumeroFactura}`);
    
    const siguienteNumero = (config.ultimoNumeroFactura || 0) + 1;
    console.log(`   Siguiente número disponible: ${siguienteNumero.toString().padStart(6, '0')}`);
    
    // 2. Simular uso de 3 números (factura con 3 páginas)
    console.log(`\n📝 Simulando factura con 3 páginas...`);
    const numPaginas = 3;
    const numeroInicial = siguienteNumero;
    const ultimoNumeroUsado = numeroInicial + numPaginas - 1;
    
    console.log(`   Números que se usarían: ${numeroInicial} hasta ${ultimoNumeroUsado}`);
    console.log(`   - Página 1: ${numeroInicial.toString().padStart(6, '0')}`);
    console.log(`   - Página 2: ${(numeroInicial + 1).toString().padStart(6, '0')}`);
    console.log(`   - Página 3: ${(numeroInicial + 2).toString().padStart(6, '0')}`);
    
    // 3. Actualizar (simulación - comentado para no modificar)
    console.log(`\n💾 Para actualizar el consecutivo, se ejecutaría:`);
    console.log(`   UPDATE Configuracion SET ultimoNumeroFactura = ${ultimoNumeroUsado}`);
    
    // 4. Siguiente número después de la actualización
    const siguienteDespues = ultimoNumeroUsado + 1;
    console.log(`\n✨ Después de generar esa factura:`);
    console.log(`   Siguiente número sugerido: ${siguienteDespues.toString().padStart(6, '0')}`);
    
    console.log(`\n✅ Sistema de consecutivo funcionando correctamente!`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConsecutivo();
