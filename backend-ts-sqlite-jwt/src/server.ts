import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './modules/auth/auth.routes';
import { userRouter } from './modules/user/user.routes';

// NUEVOS
import { marcaRouter } from './modules/marca/marca.routes';
import { inventarioRouter } from './modules/inventario/inventario.routes';
import { tipoMovimientoRouter } from './modules/tipo-movimiento/tipo-movimiento.routes';
import { compraRouter } from './modules/compras/compras.routes';
import { ventaRouter } from './modules/ventas/ventas.routes';
import { devolucionRouter } from './modules/devoluciones/devolucion.routes';
import { cambioRouter } from './modules/cambio/cambio.routes';
import { configuracionRouter } from './modules/configuracion/configuracion.routes';
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
import { tipoCambioRouter } from './modules/tipo-cambio/tipo-cambio.routes';
import { reportesRouter } from './modules/reportes/reportes.routes';

// ...
app.use('/api/tipo-cambio', tipoCambioRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/configuracion',configuracionRouter);
// NUEVOS
app.use('/api/marcas', marcaRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/tipos-movimiento', tipoMovimientoRouter);
app.use('/api/compras', compraRouter);
app.use('/api/ventas', ventaRouter);
app.use('/api/devoluciones', devolucionRouter);
app.use('/api/cambios', cambioRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ message: 'Error interno' });
});

app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT}`);
});
