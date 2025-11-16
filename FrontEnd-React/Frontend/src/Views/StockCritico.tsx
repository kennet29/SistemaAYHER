import { useEffect, useState } from "react";
import { FaExclamationTriangle, FaArrowLeft } from "react-icons/fa";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api/constants";

 // rótulo aún usable, backend define la regla

type InventoryItem = {
  id: number;
  nombre?: string;
  numeroParte?: string;
  stockActual?: number | string;
  stockMinimo?: number | string;
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const StockCritico = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    const token = getCookie("token") || localStorage.getItem("token") || "";

    async function loadStock() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(buildApiUrl("/inventario/low-stock"), {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("No se pudo consultar el inventario");
        }
        const payload = await response.json();
        const rawItems: InventoryItem[] = Array.isArray(payload)
          ? payload
          : payload.items ?? payload.data ?? payload.productos ?? [];
        const normalized = rawItems
          .map((item) => ({
            ...item,
            stockActual: Number(item.stockActual ?? 0),
            stockMinimo: Number(item.stockMinimo ?? 0),
          }))
          .sort((a, b) => a.stockActual - b.stockActual);

        setItems(normalized);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error desconocido");
        }
      } finally {
        setLoading(false);
      }
    }

    loadStock();
    return () => controller.abort();
  }, []);

  return (
    <Page>
      <AnimatedBackground />
      <Content>
        <TopBar>
          <button type="button" onClick={() => navigate("/home")}>
            <FaArrowLeft /> Volver
          </button>
          <h1>
            <FaExclamationTriangle /> Stock crítico
          </h1>
         
        </TopBar>

        {loading && <Message>Cargando productos...</Message>}
        {error && <Message as="p" $error>{error}</Message>}

        {!loading && !error && (
          <>
            {items.length === 0 ? (
              <Message>Actualmente no hay productos en stock crítico.</Message>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>N.º Parte</th>
                    <th>Stock actual</th>
                    <th>Stock mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nombre || "Sin nombre"}</td>
                      <td>{item.numeroParte || "—"}</td>
                      <td>{item.stockActual}</td>
                      <td>{item.stockMinimo ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            {items.length > 0 && (
              <ActionRow>
                <button type="button" onClick={() => navigate("/inventario")}>
                  Revisar inventario completo
                </button>
              </ActionRow>
            )}
          </>
        )}
      </Content>
    </Page>
  );
};

export default StockCritico;

const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #0b1f3a 0%, #021126 60%, #000810 100%);
  color: #fff;
  padding-bottom: 3rem;
`;

const AnimatedBackground = styled.div`
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.1), transparent 55%),
    radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.15), transparent 40%);
  z-index: 0;
  pointer-events: none;
`;

const Content = styled.main`
  position: relative;
  z-index: 1;
  width: min(1100px, 92%);
  margin: 0 auto;
  padding: 3rem 0;
`;

const TopBar = styled.header`
  margin-bottom: 2rem;

  button {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    padding: 0.5rem 1.25rem;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  h1 {
    font-size: 2.4rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  p {
    margin: 0.25rem 0 0;
    color: rgba(255, 255, 255, 0.85);
  }
`;

const Message = styled.p<{ $error?: boolean }>`
  background: ${({ $error }) =>
    $error ? "rgba(255, 77, 77, 0.2)" : "rgba(255, 255, 255, 0.08)"};
  border: 1px solid
    ${({ $error }) =>
      $error ? "rgba(255, 77, 77, 0.6)" : "rgba(255, 255, 255, 0.2)"};
  padding: 1rem;
  border-radius: 1rem;
  margin-bottom: 1.25rem;
  font-size: 1rem;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);

  th,
  td {
    padding: 1rem;
    text-align: left;
  }

  thead {
    background: rgba(0, 0, 0, 0.25);
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  tbody tr:last-child {
    border-bottom: none;
  }
`;

const ActionRow = styled.div`
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;

  button {
    border: none;
    background: linear-gradient(135deg, #ff8f00, #ffc107);
    color: #111;
    padding: 0.75rem 1.75rem;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
  }
`;
