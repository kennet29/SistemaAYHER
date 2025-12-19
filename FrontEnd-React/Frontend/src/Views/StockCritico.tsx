import { useEffect, useMemo, useState } from "react";
import { FaExclamationTriangle, FaArrowLeft, FaFileExcel, FaBan } from "react-icons/fa";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api/constants";

// Nombre de titulo aun usable, backend define la regla

type InventoryItem = {
  id: number;
  nombre?: string;
  numeroParte?: string;
  marcaNombre?: string;
  stockActual?: number;
  stockMinimo?: number;
  descontinuado?: boolean;
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const StockCritico = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [filtro, setFiltro] = useState("");
  const [soloDescontinuados, setSoloDescontinuados] = useState(false);
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

        const normalized = rawItems.map((item) => {
          const stockActual = Number((item as any).stockActual ?? (item as any).stock ?? 0);
          const stockMinimo = Number((item as any).stockMinimo ?? (item as any).stockCritico ?? 0);
          const marcaNombre = (item as any).marca?.nombre ?? (item as any).marcaNombre ?? (item as any).marca ?? "";
          const descontinuado = Boolean((item as any).descontinuado);
          return {
            ...item,
            stockActual,
            stockMinimo,
            marcaNombre,
            descontinuado,
          } as InventoryItem;
        });

        setItems(normalized.sort((a, b) => (a.stockActual ?? 0) - (b.stockActual ?? 0)));
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

  const exportarExcel = async () => {
    if (!items.length) return;
    setGenerando(true);
    try {
      const token = getCookie("token") || localStorage.getItem("token") || "";
      const res = await fetch(buildApiUrl("/inventario/low-stock/excel"), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("No se pudo generar el Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `stock_critico_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("No se pudo generar Excel de stock critico", e);
      alert("No se pudo generar el Excel de stock critico");
    } finally {
      setGenerando(false);
    }
  };

  const marcarDescontinuado = async (id: number, estado: boolean) => {
    const confirmar = window.confirm(estado ? "Marcar este producto como descontinuado" : "Revertir descontinuado para este producto");
    if (!confirmar) return;
    setMarcando(id);
    try {
      const token = getCookie("token") || localStorage.getItem("token") || "";
      const res = await fetch(buildApiUrl(`/inventario/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ descontinuado: estado }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado del producto");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, descontinuado: estado } : it)));
    } catch (e: any) {
      alert(e?.message || "Error al actualizar el producto");
    } finally {
      setMarcando(null);
    }
  };

  const itemsFiltrados = useMemo(() => {
    const query = filtro.trim().toLowerCase();
    return items
      .filter((item) =>
        soloDescontinuados ? Boolean(item.descontinuado) : !item.descontinuado
      )
      .filter((item) => {
        if (!query) return true;
        return [item.nombre, item.numeroParte, item.marcaNombre]
          .some((value) => value?.toString().toLowerCase().includes(query));
      });
  }, [items, filtro, soloDescontinuados]);

  return (
    <Page>
      <AnimatedBackground />
      <Content>
        <TopBar>
          <div className="left">
            <button type="button" onClick={() => navigate("/home")}>
              <FaArrowLeft /> Volver
            </button>
            <h1>
              <FaExclamationTriangle /> Stock critico
            </h1>
          </div>

          <div className="actions">
            <button
              type="button"
              className={`secondary ${soloDescontinuados ? "active" : ""}`}
              onClick={() => setSoloDescontinuados((prev) => !prev)}
              title={soloDescontinuados ? "Ver stock critico" : "Ver solo descontinuados"}
            >
              {soloDescontinuados ? "Ver stock critico" : "Ver descontinuados"}
            </button>
            <button
              type="button"
              className="excel"
              onClick={exportarExcel}
              disabled={!items.length || generando}
              title={items.length ? "Descargar listado de stock critico" : "No hay items para exportar"}
            >
              <FaFileExcel />
              {generando ? "Generando..." : "Excel Stock critico"}
            </button>
            <button type="button" className="secondary" onClick={() => navigate("/inventario")}>Revisar inventario completo</button>
          </div>
        </TopBar>

        <Filters>
          <label htmlFor="filtro-stock">
            Buscar
            <input
              id="filtro-stock"
              type="text"
              placeholder="Producto, marca o numero de parte"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </label>
          <span className="counter">
            {soloDescontinuados ? "Descontinuados" : "En stock critico"}: {itemsFiltrados.length}
          </span>
        </Filters>

        {loading && <Message>Cargando productos...</Message>}
        {error && (
          <Message as="p" $error>
            {error}
          </Message>
        )}

        {!loading && !error && (
          <>
            {itemsFiltrados.length === 0 ? (
              <Message>
                {soloDescontinuados
                  ? "No hay productos descontinuados."
                  : "Actualmente no hay productos en stock critico."}
              </Message>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th>N. Parte</th>
                    <th>Stock actual</th>
                    <th>Stock minimo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFiltrados.map((item) => (
                    <tr key={item.id} className={item.descontinuado ? "is-off" : undefined}>
                      <td>{item.nombre || "Sin nombre"}</td>
                      <td>{item.marcaNombre || "-"}</td>
                      <td>{item.numeroParte || "-"}</td>
                      <td>{item.stockActual}</td>
                      <td>{item.stockMinimo ?? "-"}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn-small danger ${item.descontinuado ? "outline" : ""}`}
                          disabled={marcando === item.id}
                          onClick={() => marcarDescontinuado(item.id, !item.descontinuado)}
                        >
                          <FaBan /> {marcando === item.id ? "Guardando..." : item.descontinuado ? "Revertir" : "Descontinuar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
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
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;

  .left {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

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
  }

  h1 {
    font-size: 2.4rem;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .actions .excel {
    background: linear-gradient(135deg, #1e9e44, #34d399);
    border: none;
    color: #0b2a11;
    min-width: 190px;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(30, 158, 68, 0.35);
    padding: 0.65rem 1.4rem;
  }

  .actions .secondary {
    background: linear-gradient(135deg, #ff8f00, #ffc107);
    border: none;
    color: #111;
    padding: 0.65rem 1.4rem;
  }

  .actions .secondary.active {
    background: linear-gradient(135deg, #0ea5e9, #22c55e);
    color: #0b1f3a;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Filters = styled.div`
  margin: 0 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;

  label {
    color: #cfd8dc;
    font-weight: 600;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-size: 0.95rem;
  }

  input {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    padding: 0.6rem 0.75rem;
    border-radius: 12px;
    min-width: 260px;
  }

  .counter {
    font-weight: 700;
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

  tbody tr.is-off {
    opacity: 0.7;
  }

  button.btn-small {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: #fff;
    padding: 0.35rem 0.7rem;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  button.btn-small.danger {
    background: linear-gradient(135deg, #b91c1c, #ef4444);
    border: none;
    color: #fff;
  }

  button.btn-small.danger.outline {
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: #fff;
  }

  button.btn-small:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;


