// src/Views/HistorialCompras.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaHistory, FaHome, FaEye, FaTimes, FaSearch } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./HistorialCompras.css";
import { buildApiUrl } from "../api/constants";
import { useNavigate } from "react-router-dom";
import { fmtDateTime } from "../utils/dates";

const API_MOVIMIENTOS = buildApiUrl("/MovimientoInventario");
const API_TIPOS = buildApiUrl("/tipos-movimiento");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type MovimientoCompra = {
  id: number;
  tipoMovimiento?: { nombre?: string };
  inventario?: { nombre?: string; numeroParte?: string; marca?: { nombre?: string } };
  cantidad?: number;
  costoUnitarioDolar?: number;
  costoUnitarioCordoba?: number;
  tipoCambioValor?: number;
  observacion?: string;
  createdAt?: string;
  usuario?: string;
};

const HistorialCompras: React.FC = () => {
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState<MovimientoCompra[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [detalleSeleccionado, setDetalleSeleccionado] = useState<MovimientoCompra | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getCookie("token")}` };

      // Obtener el ID del tipo de movimiento "Entrada Compra"
      const tiposRes = await fetch(API_TIPOS, { headers });
      const tipos = await tiposRes.json();
      const entradaCompra = tipos.find((t: any) =>
        t.nombre?.toLowerCase().includes("entrada compra")
      );

      if (!entradaCompra) {
        toast.error("No se encontró el tipo de movimiento 'Entrada Compra'");
        setLoading(false);
        return;
      }

      // Obtener todos los movimientos
      const movRes = await fetch(API_MOVIMIENTOS, { headers });
      const todosMovimientos = await movRes.json();

      // Filtrar solo los movimientos de tipo "Entrada Compra"
      const compras = todosMovimientos.filter(
        (m: any) => m.tipoMovimientoId === entradaCompra.id
      );

      setMovimientos(compras);
    } catch (error) {
      console.error("Error al cargar historial:", error);
      toast.error("Error al cargar el historial de compras");
    } finally {
      setLoading(false);
    }
  };

  const movimientosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return movimientos;

    return movimientos.filter((m) => {
      const producto = m.inventario?.nombre?.toLowerCase() || "";
      const numeroParte = m.inventario?.numeroParte?.toLowerCase() || "";
      const marca = m.inventario?.marca?.nombre?.toLowerCase() || "";
      const observacion = m.observacion?.toLowerCase() || "";
      const id = m.id.toString();

      return (
        producto.includes(q) ||
        numeroParte.includes(q) ||
        marca.includes(q) ||
        observacion.includes(q) ||
        id.includes(q)
      );
    });
  }, [movimientos, busqueda]);

  // Agrupar por observación (cada compra)
  const comprasAgrupadas = useMemo(() => {
    const grupos = new Map<string, MovimientoCompra[]>();

    movimientosFiltrados.forEach((m) => {
      const key = `${m.observacion || "Sin observación"}_${m.createdAt}`;
      if (!grupos.has(key)) {
        grupos.set(key, []);
      }
      grupos.get(key)!.push(m);
    });

    return Array.from(grupos.entries()).map(([key, items]) => ({
      key,
      observacion: items[0].observacion || "Sin observación",
      fecha: items[0].createdAt,
      items,
      totalUsd: items.reduce(
        (acc, i) => acc + Number(i.cantidad || 0) * Number(i.costoUnitarioDolar || 0),
        0
      ),
      totalCordoba: items.reduce(
        (acc, i) => acc + Number(i.cantidad || 0) * Number(i.costoUnitarioCordoba || 0),
        0
      ),
      cantidadProductos: items.length,
    }));
  }, [movimientosFiltrados]);

  const totales = useMemo(() => {
    return movimientosFiltrados.reduce(
      (acc, m) => {
        acc.totalUsd += Number(m.cantidad || 0) * Number(m.costoUnitarioDolar || 0);
        acc.totalCordoba += Number(m.cantidad || 0) * Number(m.costoUnitarioCordoba || 0);
        acc.cantidadItems += 1;
        return acc;
      },
      { totalUsd: 0, totalCordoba: 0, cantidadItems: 0 }
    );
  }, [movimientosFiltrados]);

  const columnas = [
    {
      name: "Producto",
      selector: (r: MovimientoCompra) => r.inventario?.nombre || "-",
      sortable: true,
      width: "40%",
      cell: (r: MovimientoCompra) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.inventario?.nombre || "-"}</div>
          <div style={{ fontSize: "0.8rem", color: "#718096" }}>
            {r.inventario?.numeroParte || "-"}
          </div>
        </div>
      ),
    },
    {
      name: "Cant.",
      selector: (r: MovimientoCompra) => Number(r.cantidad || 0),
      sortable: true,
      right: true,
      width: "10%",
      cell: (r: MovimientoCompra) => <span style={{ textAlign: "right", display: "block" }}>{Number(r.cantidad || 0)}</span>,
    },
    {
      name: "Costo",
      selector: (r: MovimientoCompra) => Number(r.costoUnitarioDolar || 0),
      sortable: true,
      right: true,
      width: "15%",
      cell: (r: MovimientoCompra) => (
        <span style={{ textAlign: "right", display: "block" }}>
          $ {Number(r.costoUnitarioDolar || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Total",
      selector: (r: MovimientoCompra) =>
        Number(r.cantidad || 0) * Number(r.costoUnitarioDolar || 0),
      sortable: true,
      right: true,
      width: "15%",
      cell: (r: MovimientoCompra) => (
        <span style={{ textAlign: "right", display: "block", fontWeight: 600 }}>
          $ {(Number(r.cantidad || 0) * Number(r.costoUnitarioDolar || 0)).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Fecha",
      selector: (r: MovimientoCompra) => r.createdAt || "",
      sortable: true,
      width: "12%",
      cell: (r: MovimientoCompra) => {
        const fecha = new Date(r.createdAt || "");
        return (
          <span style={{ fontSize: "0.85rem" }}>
            {fecha.toLocaleDateString("es-NI", { day: "2-digit", month: "2-digit", year: "2-digit" })}
          </span>
        );
      },
    },
    {
      name: "",
      cell: (r: MovimientoCompra) => (
        <button
          className="btn-ver"
          onClick={() => setDetalleSeleccionado(r)}
          title="Ver detalles"
        >
          <FaEye />
        </button>
      ),
      ignoreRowClick: true,
      width: "8%",
    },
  ];

  return (
    <div className="historial-compras-container">
      <ToastContainer />

      <header className="hc-header">
        <button className="btn-home" onClick={() => navigate("/home")} title="Volver al inicio">
          <FaHome /> Inicio
        </button>
        <div className="header-title">
          <FaHistory className="icon" />
          <h1>Historial de Compras</h1>
        </div>
        <button
          className="btn-nueva-compra"
          onClick={() => navigate("/entrada-compra")}
          title="Nueva compra"
        >
          Nueva Compra
        </button>
      </header>

      <div className="hc-content">
        <div className="card">
          <div className="toolbar">
            <div className="buscador">
              <FaSearch className="icono-buscar" />
              <input
                type="text"
                placeholder="Buscar por producto, número de parte, marca u observación..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            <button className="btn-limpiar" onClick={() => setBusqueda("")} title="Limpiar búsqueda">
              <FaTimes /> Limpiar
            </button>
          </div>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Registros</div>
              <div className="stat-value">{totales.cantidadItems}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total USD</div>
              <div className="stat-value">$ {totales.totalUsd.toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Compras</div>
              <div className="stat-value">{comprasAgrupadas.length}</div>
            </div>
          </div>

          {loading ? (
            <div className="loading">Cargando historial...</div>
          ) : (
            <div className="tabla-wrapper">
              <DataTable
                columns={columnas}
                data={movimientosFiltrados}
                pagination
                highlightOnHover
                pointerOnHover
                dense
                noDataComponent="No hay registros de compras"
                paginationRowsPerPageOptions={[10, 20, 50, 100]}
                defaultSortFieldId={11}
                defaultSortAsc={false}
              />
            </div>
          )}
        </div>

        {/* Resumen por compra */}
        {comprasAgrupadas.length > 0 && (
          <div className="card">
            <h2>Resumen por Compra</h2>
            <div className="compras-agrupadas">
              {comprasAgrupadas.map((compra, idx) => (
                <div key={compra.key} className="compra-grupo">
                  <div className="compra-header">
                    <div className="compra-info">
                      <span className="compra-numero">Compra #{idx + 1}</span>
                      <span className="compra-fecha">{fmtDateTime(compra.fecha)}</span>
                    </div>
                    <div className="compra-totales">
                      <span className="total-usd">$ {compra.totalUsd.toFixed(2)}</span>
                      <span className="total-cordoba">C$ {compra.totalCordoba.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="compra-observacion">{compra.observacion}</div>
                  <div className="compra-productos">
                    {compra.cantidadProductos} producto(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {detalleSeleccionado && (
        <div className="modal-overlay" onClick={() => setDetalleSeleccionado(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detalle del Movimiento #{detalleSeleccionado.id}</h3>
              <button
                className="modal-close"
                onClick={() => setDetalleSeleccionado(null)}
                title="Cerrar"
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-body">
              <div className="detalle-row">
                <span className="detalle-label">Producto:</span>
                <span className="detalle-value">
                  {detalleSeleccionado.inventario?.nombre || "-"}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">No. Parte:</span>
                <span className="detalle-value">
                  {detalleSeleccionado.inventario?.numeroParte || "-"}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Marca:</span>
                <span className="detalle-value">
                  {detalleSeleccionado.inventario?.marca?.nombre || "-"}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Cantidad:</span>
                <span className="detalle-value">{detalleSeleccionado.cantidad || 0}</span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Costo Unitario USD:</span>
                <span className="detalle-value">
                  $ {(detalleSeleccionado.costoUnitarioDolar || 0).toFixed(2)}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Costo Unitario C$:</span>
                <span className="detalle-value">
                  C$ {(detalleSeleccionado.costoUnitarioCordoba || 0).toFixed(2)}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Tipo de Cambio:</span>
                <span className="detalle-value">
                  {(detalleSeleccionado.tipoCambioValor || 0).toFixed(4)}
                </span>
              </div>
              <div className="detalle-row">
                <span className="detalle-label">Fecha:</span>
                <span className="detalle-value">{fmtDateTime(detalleSeleccionado.createdAt)}</span>
              </div>
              <div className="detalle-row full-width">
                <span className="detalle-label">Observación:</span>
                <span className="detalle-value observacion-text">
                  {detalleSeleccionado.observacion || "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialCompras;
