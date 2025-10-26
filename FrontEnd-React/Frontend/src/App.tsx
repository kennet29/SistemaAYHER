import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Views/Login";
import Home from "./Views/Home";
import ConfiguracionView from "./Views/Configuracion";
import MarcasView from "./Views/Marcas";
import CategoriasView from "./Views/Categorias";
import InventarioView from "./Views/Inventario";
import TipoCambioView from "./Views/Tipo-Cambio";

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
        <Route path="/tipo-cambio"element={<TipoCambioView/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
