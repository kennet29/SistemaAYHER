import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Views/Login";
import Home from "./Views/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/Home" element={<Home />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
