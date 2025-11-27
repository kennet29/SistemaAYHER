"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const auth_routes_1 = require("./modules/auth/auth.routes");
const user_routes_1 = require("./modules/user/user.routes");
// NUEVOS
const marca_routes_1 = require("./modules/marca/marca.routes");
const categoria_routes_1 = require("./modules/categoria/categoria.routes");
const inventario_routes_1 = require("./modules/inventario/inventario.routes");
const tipo_movimiento_routes_1 = require("./modules/tipo-movimiento/tipo-movimiento.routes");
const compras_routes_1 = require("./modules/compras/compras.routes");
const ventas_routes_1 = require("./modules/ventas/ventas.routes");
const devolucion_routes_1 = require("./modules/devoluciones/devolucion.routes");
const cambio_routes_1 = require("./modules/cambio/cambio.routes");
const configuracion_routes_1 = require("./modules/configuracion/configuracion.routes");
const remision_routes_1 = require("./modules/remision/remision.routes");
const cotizacion_routes_1 = require("./modules/cotizacion/cotizacion.routes");
const metodosPago_routes_1 = require("./modules/configuracion/metodosPago.routes");
const database_routes_1 = __importDefault(require("./modules/database/database.routes"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth_routes_1.authRouter);
app.use('/api/users', user_routes_1.userRouter);
const tipo_cambio_routes_1 = require("./modules/tipo-cambio/tipo-cambio.routes");
const reportes_routes_1 = require("./modules/reportes/reportes.routes");
const MovimientoInventario_routes_1 = require("./modules/movimientoInventario/MovimientoInventario.routes");
const cliente_routes_1 = require("./modules/clientes/cliente.routes");
// ...
app.use('/api/tipo-cambio', tipo_cambio_routes_1.tipoCambioRouter);
app.use('/api/reportes', reportes_routes_1.reportesRouter);
app.use('/api/remision', remision_routes_1.remisionRouter);
app.use('/api/clientes', cliente_routes_1.clienteRouter);
app.use('/api/configuracion', configuracion_routes_1.configuracionRouter);
app.use('/api/remision', remision_routes_1.remisionRouter);
app.use('/api/cotizaciones', cotizacion_routes_1.cotizacionRouter);
app.use('/api/metodos-pago', metodosPago_routes_1.metodosPagoRouter);
// NUEVOS
app.use('/api/marcas', marca_routes_1.marcaRouter);
app.use('/api/inventario', inventario_routes_1.inventarioRouter);
app.use('/api/tipos-movimiento', tipo_movimiento_routes_1.tipoMovimientoRouter);
app.use('/api/compras', compras_routes_1.compraRouter);
app.use('/api/ventas', ventas_routes_1.ventaRouter);
app.use('/api/devoluciones', devolucion_routes_1.devolucionRouter);
app.use('/api/cambios', cambio_routes_1.cambioRouter);
app.use('/api/categorias', categoria_routes_1.categoriaRouter);
app.use('/api/MovimientoInventario', MovimientoInventario_routes_1.movimientoInventarioRouter);
app.use('/api/database', database_routes_1.default);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Error interno' });
});
app.listen(env_1.env.PORT, () => {
    console.log(`API escuchando en http://localhost:${env_1.env.PORT}`);
});
