const ExcelJS = require('exceljs');

const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('Formatos de impresion de facturas.xlsx').then(() => {
  const ws = wb.worksheets[0];
  console.log('Nombre de la hoja:', ws.name);
  console.log('Dimensiones:', ws.dimensions);
  console.log('\n=== CONTENIDO DE CELDAS ===\n');
  
  for(let i = 1; i <= 50; i++) {
    const row = ws.getRow(i);
    let hasData = false;
    let rowData = `Fila ${i}: `;
    
    for(let j = 1; j <= 15; j++) {
      const cell = row.getCell(j);
      if(cell.value) {
        hasData = true;
        const col = String.fromCharCode(64 + j);
        rowData += `${col}${i}="${cell.value}" `;
      }
    }
    
    if(hasData) console.log(rowData);
  }
  
  console.log('\n=== CELDAS COMBINADAS ===\n');
  ws.model.merges.forEach(merge => {
    console.log('Merge:', merge);
  });
});
