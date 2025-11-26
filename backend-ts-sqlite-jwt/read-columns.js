const ExcelJS = require('exceljs');

const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('Formatos de impresion de facturas.xlsx').then(() => {
  const ws = wb.worksheets[0];
  
  console.log('=== ANCHOS DE COLUMNAS ===\n');
  for(let i = 1; i <= 10; i++) {
    const col = ws.getColumn(i);
    const letter = String.fromCharCode(64 + i);
    console.log(`Columna ${letter}: width = ${col.width || 'default'}`);
  }
  
  console.log('\n=== ALTURAS DE FILAS ===\n');
  for(let i = 1; i <= 45; i++) {
    const row = ws.getRow(i);
    if(row.height) {
      console.log(`Fila ${i}: height = ${row.height}`);
    }
  }
});
