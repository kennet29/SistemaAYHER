import { useEffect, useState } from "react";
import styled from "styled-components";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaDollarSign, FaSave, FaSync, FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api/constants";

const API_URL = buildApiUrl("/tipo-cambio");

// 🔹 Leer token desde cookie
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const TipoCambioView = () => {
  const navigate = useNavigate();
  const [valor, setValor] = useState("");
  const [tipos, setTipos] = useState<any[]>([]);
  const [ultimo, setUltimo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 📦 Cargar registros al iniciar
  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const token = getCookie("token");

      const [resUltimo, resLista] = await Promise.all([
        fetch(`${API_URL}/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(API_URL, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!resUltimo.ok && resUltimo.status !== 404)
        throw new Error("Error al obtener tipo de cambio actual");

      const dataUltimo = resUltimo.ok ? await resUltimo.json() : null;
      const dataLista = await resLista.json();

      setUltimo(dataUltimo?.tipoCambio || null);
      setTipos(dataLista.tipos || []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar datos.");
    } finally {
      setLoading(false);
    }
  };

  // 💾 Registrar nuevo tipo de cambio
  const handleGuardar = async () => {
    const token = getCookie("token");

    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0) {
      toast.warn("Ingrese un valor numérico válido.");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ valor: parseFloat(valor) }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast.warn("Ya existe un tipo de cambio registrado para hoy.");
        return;
      }

      if (!res.ok) {
        toast.error(data.message || "Error al guardar.");
        return;
      }

      toast.success("Tipo de cambio registrado correctamente.");
      setValor("");
      fetchTipos();
    } catch (error) {
      toast.error("Error de conexión con el servidor.");
    }
  };

  return (
    <Container>
      <ToastContainer position="top-right" autoClose={3000} />
      <TopBar>
        <button onClick={() => navigate("/home")}>
          <FaHome /> Volver al Home
        </button>
      </TopBar>

      <Header>
        <FaDollarSign className="icon" />
        <h1>Gestión de Tipo de Cambio</h1>
      </Header>

      <Content>
        <Card>
          <h2>Registrar nuevo valor</h2>
          <InputContainer>
            <input
              type="number"
              step="0.01"
              placeholder="Ejemplo: 36.80"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
            <button onClick={handleGuardar}>
              <FaSave /> Guardar
            </button>
          </InputContainer>

          {ultimo && (
            <Actual>
              <p>
                <strong>Actual:</strong>{" "}
                {Number(ultimo.valor).toFixed(2)} C$ —{" "}
                {new Date(ultimo.fecha).toLocaleDateString()}
              </p>
            </Actual>
          )}
        </Card>

        <Card>
          <div className="header-lista">
            <h2>Historial de Tipos de Cambio</h2>
            <button onClick={fetchTipos}>
              <FaSync /> Actualizar
            </button>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : tipos.length === 0 ? (
            <p>No hay registros.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Valor (C$)</th>
                </tr>
              </thead>
              <tbody>
                {tipos.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.fecha).toLocaleDateString()}</td>
                    <td>{Number(t.valor).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </Content>
    </Container>
  );
};

export default TipoCambioView;

// 🎨 Estilos
const Container = styled.div`
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #f9fbff, #e9efff);
  font-family: "Poppins", sans-serif;
  color: #002244;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  padding: 2% 3%;
`;

const TopBar = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
  margin-bottom: 1em;

  button {
    background: #004aad;
    color: #fff;
    border: none;
    border-radius: 0.6em;
    padding: 0.8em 1.3em;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5em;
    transition: all 0.3s ease;
    font-size: 0.95em;
  }

  button:hover {
    background: #0066ff;
    transform: scale(1.05);
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 0.8em;
  color: #004aad;
  margin-bottom: 1.5em;
  width: 100%;
  justify-content: center;

  .icon {
    font-size: 2em;
  }

  h1 {
    font-size: 1.9em;
    font-weight: 700;
  }
`;

const Content = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2em;
  justify-items: center;
  align-items: flex-start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5em;
  }
`;

const Card = styled.div`
  width: 80%;
  max-width: 600px;
  background: #fff;
  border-radius: 1em;
  box-shadow: 0 0.5em 1.5em rgba(0, 0, 50, 0.1);
  padding: 2em;
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 0.8em 1.8em rgba(0, 0, 50, 0.15);
  }

  h2 {
    color: #004aad;
    margin-bottom: 1em;
    font-size: 1.2em;
  }

  .header-lista {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1em;
  }

  button {
    background: #004aad;
    color: #fff;
    border: none;
    border-radius: 0.5em;
    padding: 0.6em 1em;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.4em;
    transition: all 0.3s ease;
  }

  button:hover {
    background: #0066ff;
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 0.8em;
  align-items: center;

  input {
    flex: 1;
    padding: 0.7em;
    font-size: 1em;
    border: 2px solid #004aad;
    border-radius: 0.5em;
    outline: none;
  }

  button {
    background: #009688;
    color: white;
    border: none;
    border-radius: 0.5em;
    padding: 0.7em 1.4em;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.4em;
  }

  button:hover {
    background: #00bfa5;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95em;

  th,
  td {
    padding: 0.8em;
    text-align: left;
  }

  th {
    background: #004aad;
    color: white;
  }

  tr:nth-child(even) {
    background: #f6f8ff;
  }
`;

const Actual = styled.div`
  margin-top: 1em;
  font-size: 1em;
  color: #333;
  background: #f6faff;
  padding: 0.8em;
  border-radius: 0.5em;
  border-left: 4px solid #004aad;
`;
