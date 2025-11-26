import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft, FaChartLine, FaSortUp, FaSortDown, FaSort } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { buildApiUrl } from "../api/constants";
import { fmtDateTime } from "../utils/dates";
import "./CotizacionesRecientes.css";

const API_COTIZACIONES = buildApiUrl("/cotizaciones/recientes");

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type RecentQuote = {
  id: number;
  inventarioId: number;
  cantidad: number;
  precioCordoba: number;
  precioDolar: number;
  moneda: string;
  fecha: string;
  inventario?: {
    id: number;
    nombre?: string | null;
    numeroParte?: string | null;
  };
  cliente?: {
    id: number;
    nombre?: string | null;
    empresa?: string | null;
    razonSocial?: string | null;
  };
};

type SortField = "producto" | "cliente" | "cantidad" | "precioCordoba" | "precioDolar" | "fecha";
type SortDirection = "asc" | "desc" | null;

const CotizacionesRecientes: React.FC = () => {
  const navigate = useNavigate();
  const [cotizaciones, setCotizaciones] = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const token = getCookie("token");
    fetch(API_COTIZACIONES, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se obtuvo respuesta del servidor");
        return res.json();
      })
      .then((data) => {
        const recientes = Array.isArray(data?.recientes) ? data.recientes : [];
        setCotizaciones(recientes);
      })
      .catch(() => {
        toast.error("No se pudieron cargar las cotizaciones recientes.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <FaSort />;
    if (sortDirection === "asc") return <FaSortUp />;
    return <FaSortDown />;
  };

  const sortedAndFilteredCotizaciones = useMemo(() => {
    let result = cotizaciones.filter((item) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const producto = item.inventario?.numeroParte
        ? `${item.inventario.numeroParte} ${item.inventario?.nombre ?? ""}`.toLowerCase()
        : (item.inventario?.nombre ?? "").toLowerCase();
      
      const cliente = (
        item.cliente?.nombre ||
        item.cliente?.razonSocial ||
        item.cliente?.empresa ||
        ""
      ).toLowerCase();

      return producto.includes(query) || cliente.includes(query);
    });

    if (sortField && sortDirection) {
      result = [...result].sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case "producto":
            aVal = a.inventario?.numeroParte || a.inventario?.nombre || "";
            bVal = b.inventario?.numeroParte || b.inventario?.nombre || "";
            break;
          case "cliente":
            aVal = a.cliente?.nombre || a.cliente?.razonSocial || a.cliente?.empresa || "";
            bVal = b.cliente?.nombre || b.cliente?.razonSocial || b.cliente?.empresa || "";
            break;
          case "cantidad":
            aVal = Number(a.cantidad);
            bVal = Number(b.cantidad);
            break;
          case "precioCordoba":
            aVal = Number(a.precioCordoba);
            bVal = Number(b.precioCordoba);
            break;
          case "precioDolar":
            aVal = Number(a.precioDolar);
            bVal = Number(b.precioDolar);
            break;
          case "fecha":
            aVal = new Date(a.fecha).getTime();
            bVal = new Date(b.fecha).getTime();
            break;
          default:
            return 0;
        }

        if (typeof aVal === "string") {
          return sortDirection === "asc" 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
      });
    }

    return result;
  }, [cotizaciones, searchQuery, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedAndFilteredCotizaciones.length / itemsPerPage);
  const paginatedCotizaciones = sortedAndFilteredCotizaciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="cotizaciones-page">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      
      <header className="cotizaciones-header">
        <button
          className="back-btn"
          title="Volver"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Volver
        </button>
        <div className="header-title">
          <FaChartLine className="header-icon" />
          <h1>Cotizaciones Recientes</h1>
        </div>
      </header>

      <div className="cotizaciones-card">
        <div className="cotizaciones-card__header">
          <div>
            <p className="cotizaciones-card__subtitle">Historial de cotizaciones</p>
            <h2>Últimos registros por producto</h2>
          </div>
          <span className="cotizaciones-card__badge">{cotizaciones.length} registros</span>
        </div>

        <div className="toolbar">
          <label>
            Buscar
            <input
              type="text"
              placeholder="por producto o cliente"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "280px" }}
            />
          </label>
          <button
            className="icon-btn"
            title="Limpiar búsqueda"
            onClick={() => setSearchQuery("")}
          >
            ×
          </button>
          <div className="flex-spacer" />
          <div className="metrics">
            <span className="chip">Mostrando: {sortedAndFilteredCotizaciones.length}</span>
            <span className="chip">Total: {cotizaciones.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="cotizaciones-empty">Cargando cotizaciones...</div>
        ) : cotizaciones.length === 0 ? (
          <div className="cotizaciones-empty">No hay cotizaciones recientes registradas.</div>
        ) : sortedAndFilteredCotizaciones.length === 0 ? (
          <div className="cotizaciones-empty">No se encontraron cotizaciones que coincidan con la búsqueda.</div>
        ) : (
          <>
            <div className="cotizaciones-table-wrapper">
              <table className="cotizaciones-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("producto")} className="sortable">
                      <div className="th-content">
                        Producto {getSortIcon("producto")}
                      </div>
                    </th>
                    <th onClick={() => handleSort("cliente")} className="sortable">
                      <div className="th-content">
                        Cliente {getSortIcon("cliente")}
                      </div>
                    </th>
                    <th onClick={() => handleSort("cantidad")} className="sortable">
                      <div className="th-content">
                        Cantidad {getSortIcon("cantidad")}
                      </div>
                    </th>
                    <th onClick={() => handleSort("precioCordoba")} className="sortable">
                      <div className="th-content">
                        Precio C$ {getSortIcon("precioCordoba")}
                      </div>
                    </th>
                    <th onClick={() => handleSort("precioDolar")} className="sortable">
                      <div className="th-content">
                        Precio $ {getSortIcon("precioDolar")}
                      </div>
                    </th>
                    <th onClick={() => handleSort("fecha")} className="sortable">
                      <div className="th-content">
                        Fecha {getSortIcon("fecha")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCotizaciones.map((item) => {
                  const producto = item.inventario?.numeroParte
                    ? `${item.inventario.numeroParte} — ${item.inventario?.nombre ?? ""}`.trim()
                    : item.inventario?.nombre ?? `#${item.inventarioId}`;
                  const cliente =
                    item.cliente?.nombre ||
                    item.cliente?.razonSocial ||
                    item.cliente?.empresa ||
                    "Cliente general";
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="cotizaciones-producto">{producto}</div>
                      </td>
                      <td>{cliente}</td>
                      <td>{Number(item.cantidad).toLocaleString()}</td>
                      <td>C$ {Number(item.precioCordoba || 0).toFixed(2)}</td>
                      <td>$ {Number(item.precioDolar || 0).toFixed(2)}</td>
                      <td>{fmtDateTime(item.fecha)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Anterior
              </button>
              
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        className={`pagination-page ${page === currentPage ? "active" : ""}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="pagination-ellipsis">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
        )}
      </div>
    </div>
  );
};

export default CotizacionesRecientes;
