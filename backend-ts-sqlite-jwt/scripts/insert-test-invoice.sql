-- Script para crear una factura de prueba con 45 artículos
-- Para probar la impresión de facturas con múltiples páginas

-- Insertar la venta principal
INSERT INTO Venta (
    fecha,
    clienteId,
    numeroFactura,
    tipoPago,
    plazoDias,
    fechaVencimiento,
    totalCordoba,
    totalDolar,
    tipoCambioValor,
    usuario,
    observacion,
    pio,
    estadoPago,
    cancelada,
    montoPendiente
) VALUES (
    datetime('now'),
    1, -- Asumiendo que existe un cliente con ID 1
    'TEST-45-ITEMS',
    'CREDITO',
    30,
    datetime('now', '+30 days'),
    45000.00,
    1250.00,
    36.00,
    'TEST_USER',
    'Factura de prueba con 45 artículos para validar impresión',
    'PO-TEST-2024-001',
    'PENDIENTE',
    0,
    45000.00
);

-- Obtener el ID de la venta recién creada
-- SQLite usa last_insert_rowid() para obtener el último ID insertado

-- Insertar 45 detalles de venta
-- Artículo 1
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 2, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 2
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 1, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 3
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 3, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 4
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 1, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 5
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 2, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 6
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 4, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 7
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 2, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 8
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 1, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 9
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 3, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 10
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 1, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 11
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 2, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 12
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 1, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 13
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 3, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 14
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 1, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 15
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 2, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 16
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 1, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 17
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 2, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 18
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 1, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 19
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 3, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 20
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 1, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 21
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 2, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 22
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 1, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 23
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 3, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 24
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 1, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 25
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 2, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 26
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 1, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 27
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 2, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 28
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 1, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 29
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 3, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 30
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 1, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 31
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 2, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 32
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 1, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 33
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 3, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 34
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 1, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 35
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 2, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 36
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 1, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 37
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 2, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 38
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 1, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 39
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 3, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 40
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 1, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Artículo 41
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 1, 2, 500.00, 13.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 1);

-- Artículo 42
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 2, 1, 750.00, 20.83 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 2);

-- Artículo 43
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 3, 3, 450.00, 12.50 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 3);

-- Artículo 44
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 4, 1, 890.00, 24.72 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 4);

-- Artículo 45
INSERT INTO DetalleVenta (ventaId, inventarioId, cantidad, precioUnitarioCordoba, precioUnitarioDolar)
SELECT last_insert_rowid(), 5, 2, 320.00, 8.89 WHERE EXISTS (SELECT 1 FROM Inventario WHERE id = 5);

-- Verificar la inserción
SELECT 'Venta creada con ID: ' || last_insert_rowid() as resultado;
SELECT COUNT(*) as total_detalles FROM DetalleVenta WHERE ventaId = last_insert_rowid();
