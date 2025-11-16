import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Views/Login";
import Home from "./Views/Home";
import ConfiguracionView from "./Views/Configuracion";
import MarcasView from "./Views/Marcas";
import CategoriasView from "./Views/Categorias";
import InventarioView from "./Views/Inventario";
import TipoCambioView from "./Views/Tipo-Cambio";
import MovimientosView from "./Views/MovimientoInventario";
import FacturacionView from "./Views/Facturacion";
import Clientes from "./Views/Clientes";
import Proforma from "./Views/Proforma"
import Remisiones from "./Views/Remision";
import RemisionesHistorico from "./Views/RemisionesHistorico";
import RemisionesPendientes from "./Views/RemisionesPendientes";
import Ventas from "./Views/Ventas";
import CarteraClientes from "./Views/CarteraClientes";
import FacturasPendientes from "./Views/FacturasPendientes";
import StockCritico from "./Views/StockCritico";
function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/configuracion" element={<ConfiguracionView />} />
          <Route path="/marcas" element={<MarcasView />} />
          <Route path="/categorias" element={<CategoriasView />} />
          <Route path="/inventario" element={<InventarioView />} />
          <Route path="/tipo-cambio" element={<TipoCambioView />} />
          <Route path="/movimientos" element={<MovimientosView />} />
          <Route path="/facturacion" element={<FacturacionView />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/remisiones" element={<Remisiones />} />
          <Route
            path="/remisiones/pendientes"
            element={<RemisionesPendientes />}
          />
          <Route
            path="/remisiones/historico"
            element={<RemisionesHistorico />}
          />
          <Route path="/proforma" element={<Proforma />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/cartera-clientes" element={<CarteraClientes />} />
          <Route
            path="/facturas-pendientes"
            element={<FacturasPendientes />}
          />
          <Route path="/stock-critico" element={<StockCritico />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
