import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Views/Login";
import Home from "./Views/Home";
import ConfiguracionView from "./Views/Configuracion";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Home" element={<Home />}/>
        <Route path="/Configuracion" element={<ConfiguracionView/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
