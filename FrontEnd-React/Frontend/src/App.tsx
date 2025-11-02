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
import Remisiones from "./Views/Remision";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/configuracion" element={<ConfiguracionView />} />
        <Route path="/marcas" element={<MarcasView />} />
        <Route path="/categorias" element={<CategoriasView />} />
        <Route path="/inventario" element={<InventarioView />} /> 
        <Route path="/tipo-cambio" element={<TipoCambioView/>} />
        <Route path="/movimientos" element={<MovimientosView/>}/>
        <Route path="/facturacion" element={<FacturacionView/>} />
        <Route path="/clientes" element={<Clientes/>} />
        <Route path="/remisiones" element={<Remisiones/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
