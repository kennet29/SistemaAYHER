import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaArrowLeft, FaHome, FaSearch, FaHistory, FaSyncAlt, FaChevronDown, FaChevronUp, FaEdit, FaTrash, FaCheck, FaFileAlt } from "react-icons/fa";
import "./DevolucionesHistorico.css";
import { buildApiUrl } from "../api/constants";

const API_DEVOLUCIONES = buildApiUrl("/devoluciones/venta");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type DevDetalle = {
  id: number;
  inventarioId: number;
  cantidad: number;
  precioUnitarioCordoba: number;
  inventario?: {
    nombre?: string | null;
    numeroParte?: string | null;
    marca?: { nombre?: string | null } | null;
  } | null;
};

type DevVenta = {
  id: number;
  ventaId: number;
  fecha?: string | null;
  cliente?: string | null;
  motivo?: string | null;
  usuario?: string | null;
  createdAt?: string | null;
  tipoCambioValor?: number | null;
  cobrada?: boolean | null;
  venta?: {
    numeroFactura?: string | null;
    cliente?: { nombre?: string | null; empresa?: string | null } | null;
    tipoCambioValor?: number | null;
  } | null;
  detalles?: DevDetalle[];
};

const DevolucionesHistorico: React.FC = () => {
  const navigate = useNavigate();
  const [devoluciones, setDevoluciones] = useState<DevVenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [marcandoCobra, setMarcandoCobra] = useState<number | null>(null);
  const [confirmCobro, setConfirmCobro] = useState<DevVenta | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getCookie("token") || ""}` };
      const resp = await fetch(API_DEVOLUCIONES, { headers });
      if (!resp.ok) throw new Error("No se pudo cargar el historico");
      const data = await resp.json();
      setDevoluciones(data?.devoluciones ?? data ?? []);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al cargar historico");
    } finally {
      setLoading(false);
    }
  };

  const devolucionesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return devoluciones;
    return devoluciones.filter((d) => {
      const cliente = d.cliente || (d.venta?.cliente as any)?.empresa || d.venta?.cliente?.nombre || "";
      const factura = d.venta?.numeroFactura || "";
      const motivo = d.motivo || "";
      const usuario = d.usuario || "";
      const id = d.id.toString();
      const detallesTxt = (d.detalles || [])
        .map((det) => `${det.inventario?.nombre || ""} ${det.inventario?.numeroParte || ""} ${det.inventario?.marca?.nombre || ""}`)
        .join(" ")
        .toLowerCase();
      return (
        cliente.toLowerCase().includes(q) ||
        factura.toLowerCase().includes(q) ||
        motivo.toLowerCase().includes(q) ||
        usuario.toLowerCase().includes(q) ||
        id.includes(q) ||
        detallesTxt.includes(q)
      );
    });
  }, [devoluciones, busqueda]);

  const formatDate = (v?: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString();
  };

  const toggleSelected = (id: number) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const imprimirNotaCredito = async (id: number) => {
    try {
      const headers = { Authorization: `Bearer ${getCookie("token") || ""}` };
      const resp = await fetch(buildApiUrl(`/devoluciones/venta/${id}/pdf`), { headers });
      if (!resp.ok) throw new Error("No se pudo generar la nota de credito");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al generar la nota de credito");
    }
  };

  const handleEditar = (id: number) => {
    navigate(`/devoluciones?edit=${id}`);
  };

  const eliminarDevolucion = async (id: number) => {
    const confirmar = window.confirm("Eliminar esta devolucion de forma permanente?");
    if (!confirmar) return;
    try {
      const headers = { Authorization: `Bearer ${getCookie("token") || ""}` };
      const resp = await fetch(`${API_DEVOLUCIONES}/${id}`, { method: "DELETE", headers });
      if (!resp.ok) throw new Error("No se pudo eliminar la devolucion");
      setDevoluciones((prev) => prev.filter((d) => d.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Devolucion eliminada");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al eliminar la devolucion");
    }
  };

  const selectedDev = useMemo(
    () => devoluciones.find((d) => d.id === selectedId) || null,
    [selectedId, devoluciones]
  );

  const handleGenerarNotaCredito = () => {
    if (!selectedDev) return;
    const info = {
      devolucionId: selectedDev.id,
      ventaId: selectedDev.ventaId,
      consecutivo: selectedDev.venta?.numeroFactura || "Sin factura",
      cliente:
        selectedDev.cliente ||
        (selectedDev.venta?.cliente as any)?.empresa ||
        selectedDev.venta?.cliente?.nombre ||
        "-",
      motivo: selectedDev.motivo || "",
      fecha: formatDate(selectedDev.fecha || selectedDev.createdAt),
      detalles: selectedDev.detalles || [],
      tipoCambio: selectedDev.tipoCambioValor || selectedDev.venta?.tipoCambioValor || null,
    };

    console.info("Nota de credito pendiente de formatear:", info);
    toast.info("Generador de nota de credito: pendiente de formato (se registró en consola).");
  };

  const tipoCambio = useMemo(() => {
    const fromDev = Number((selectedDev as any)?.tipoCambioValor || 0);
    const fromVenta = Number((selectedDev?.venta as any)?.tipoCambioValor || 0);
    const fromStorage = Number(localStorage.getItem("tipoCambioValor") || localStorage.getItem("tipoCambio") || 0);
    const tc = fromDev || fromVenta || fromStorage;
    return tc > 0 ? tc : null;
  }, [selectedDev]);

  const calcularTotalesDev = (dev: DevVenta) => {
    const tc =
      Number(dev.tipoCambioValor || 0) ||
      Number((dev.venta as any)?.tipoCambioValor || 0) ||
      Number(localStorage.getItem("tipoCambioValor") || localStorage.getItem("tipoCambio") || 0);
    const totalCordoba = (dev.detalles || []).reduce(
      (sum, det) => sum + Number(det.cantidad || 0) * Number(det.precioUnitarioCordoba || 0),
      0
    );
    const totalUsd = tc > 0 ? totalCordoba / tc : null;
    return { totalCordoba, totalUsd };
  };

  const totalesFiltrados = useMemo(() => {
    return devolucionesFiltradas.reduce(
      (acc, dev) => {
        const { totalCordoba, totalUsd } = calcularTotalesDev(dev);
        acc.totalCordoba += totalCordoba;
        acc.totalUsd += totalUsd || 0;
        return acc;
      },
      { totalCordoba: 0, totalUsd: 0 }
    );
  }, [devolucionesFiltradas]);

  const toggleCobrar = async (dev: DevVenta) => {
    if (!dev?.id) return;
    setMarcandoCobra(dev.id);
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getCookie("token") || ""}`,
      };
      const resp = await fetch(buildApiUrl(`/devoluciones/venta/${dev.id}/cobrar`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ cobrada: !dev.cobrada }),
      });
      if (!resp.ok) throw new Error("No se pudo actualizar el estado de cobro");
      const data = await resp.json().catch(() => ({}));
      const updated = data?.devolucionVenta;
      setDevoluciones((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, cobrada: updated?.cobrada ?? !dev.cobrada } : d))
      );
      toast.success(!dev.cobrada ? "Marcada como cobrada" : "Marcada como pendiente");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Error al marcar cobrada");
    } finally {
      setMarcandoCobra(null);
      setConfirmCobro(null);
    }
  };

  return (
    <>
    <div className="dev-hist-page">
      <ToastContainer position="top-center" autoClose={2200} />

      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate("/devoluciones")}>
          <FaArrowLeft /> Volver
        </button>
        <div className="title">
          <div className="title-icon">
            <FaHistory />
          </div>
          <div>
            <h1>Historico de Devoluciones</h1>
            <p>Consulta las devoluciones registradas y sus detalles.</p>
          </div>
        </div>
        <div className="top-actions">
          <button className="secondary-btn" onClick={() => navigate("/home")}>
            <FaHome /> Home
          </button>
          <button className="secondary-btn" onClick={cargar}>
            <FaSyncAlt /> Recargar
          </button>
        </div>
      </div>

      <section className="panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Filtro</p>
            <h2>Buscar</h2>
          </div>
          <div className="header-metrics">
            <span className="pill pill-neutral">
              {loading ? "Cargando..." : `${devolucionesFiltradas.length} registros`}
            </span>
            <span className="pill pill-total">
              Total C$: {totalesFiltrados.totalCordoba.toFixed(2)}
            </span>
            <span className="pill pill-total alt">
              Total US$: {totalesFiltrados.totalUsd.toFixed(2)}
            </span>
          </div>
        </header>

        <div className="filters">
          <label className="field">
            <span>
              <FaSearch /> Buscar por cliente, consecutivo o articulo
            </span>
            <input
              placeholder="Ej: cliente, consecutivos, motivo o producto"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>
        </div>

        <div className="tabla-wrapper">
          <table className="dev-hist-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Venta</th>
                <th>Consecutivos</th>
                <th className="col-cliente">Cliente</th>
                <th>Fecha</th>
                <th>Total C$</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="empty">
                    Cargando...
                  </td>
                </tr>
              ) : devolucionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No hay devoluciones
                  </td>
                </tr>
              ) : (
                devolucionesFiltradas.map((d) => {
                  const cliente =
                    d.cliente ||
                    (d.venta?.cliente as any)?.empresa ||
                    d.venta?.cliente?.nombre ||
                    "Cliente";
                  const factura = d.venta?.numeroFactura || "Sin factura";
                  const { totalCordoba, totalUsd } = calcularTotalesDev(d);
                  return (
                    <tr key={d.id} className={selectedId === d.id ? "row-selected" : ""}>
                      <td className="col-id">#{d.id}</td>
                      <td>#{d.ventaId}</td>
                      <td>{factura}</td>
                      <td>{cliente}</td>
                      <td>{formatDate(d.fecha || d.createdAt)}</td>
                      <td>
                        <div className="total-col">
                          <span>C$ {totalCordoba.toFixed(2)}</span>
                          <small>{totalUsd ? `US$ ${totalUsd.toFixed(2)}` : "-"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="acciones">
                          <button className="secondary-btn small" onClick={() => toggleSelected(d.id)}>
                            {selectedId === d.id ? <FaChevronUp /> : <FaChevronDown />} Detalles
                          </button>
                          <button
                            className="secondary-btn small icon-only"
                            title="Imprimir nota de credito"
                            onClick={() => imprimirNotaCredito(d.id)}
                          >
                            <FaFileAlt />
                          </button>
                          <button
                            className="secondary-btn small icon-only"
                            title="Editar devolucion"
                            onClick={() => handleEditar(d.id)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="secondary-btn small icon-only"
                            title="Eliminar devolucion"
                            onClick={() => eliminarDevolucion(d.id)}
                          >
                            <FaTrash />
                          </button>
                          <button
                            className={`secondary-btn small icon-only ${d.cobrada ? "success" : ""}`}
                            title={d.cobrada ? "Pagada" : "Marcar como pagada"}
                            disabled={marcandoCobra === d.id}
                            onClick={() => setConfirmCobro(d)}
                          >
                            <FaCheck />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel detalles-panel">
        <header className="panel-header">
          <div>
            <p className="eyebrow">Detalles</p>
            <h2>Devolucion seleccionada</h2>
          </div>
          <span className="pill pill-neutral">
            {selectedDev ? `ID #${selectedDev.id}` : "Sin seleccion"}
          </span>
        </header>

        {!selectedDev ? (
          <p className="empty">Selecciona una devolucion para ver sus articulos.</p>
        ) : (
          <>
            <div className="detalles-meta selected">
              <div>
                <span className="eyebrow">Cliente</span>
                <p>
                  {selectedDev.cliente ||
                    (selectedDev.venta?.cliente as any)?.empresa ||
                    selectedDev.venta?.cliente?.nombre ||
                    "-"}
                </p>
              </div>
              <div>
                <span className="eyebrow">Motivo</span>
                <p>{selectedDev.motivo || "-"}</p>
              </div>
              <div>
                <span className="eyebrow">Fecha</span>
                <p>{formatDate(selectedDev.fecha || selectedDev.createdAt)}</p>
              </div>
              <div>
                <span className="eyebrow">Consecutivo</span>
                <p>{selectedDev.venta?.numeroFactura || "Sin factura"}</p>
              </div>
              <div>
                <span className="eyebrow">Venta</span>
                <p>#{selectedDev.ventaId}</p>
              </div>
            </div>

            <div className="detalles-actions">
              <button className="secondary-btn" onClick={handleGenerarNotaCredito} disabled={!selectedDev}>
                Generar nota de credito
              </button>
            </div>

            <div className="tabla-wrapper inner">
              <table className="dev-hist-table inner">
                <thead>
                  <tr>
                    <th>Articulo</th>
                    <th>Marca</th>
                    <th>No. Parte</th>
                    <th>Cantidad</th>
                    <th>Precio C$</th>
                    <th>Precio US$</th>
                    <th>Subtotal C$</th>
                    <th>Subtotal US$</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDev.detalles || []).map((det) => {
                    const inv = det.inventario || {};
                    const marca = (inv.marca as any)?.nombre || (inv as any)?.marcaNombre || "-";
                    const subtotal = Number(det.cantidad || 0) * Number(det.precioUnitarioCordoba || 0);
                    const precioUsd = tipoCambio ? Number(det.precioUnitarioCordoba || 0) / tipoCambio : null;
                    const subtotalUsd = tipoCambio ? subtotal / tipoCambio : null;
                    return (
                      <tr key={det.id}>
                        <td>{inv.nombre || `Articulo ${det.inventarioId}`}</td>
                        <td>{marca || "-"}</td>
                        <td>{inv.numeroParte || "-"}</td>
                        <td>{det.cantidad}</td>
                        <td>C$ {Number(det.precioUnitarioCordoba || 0).toFixed(2)}</td>
                        <td>{precioUsd ? `US$ ${precioUsd.toFixed(2)}` : "-"}</td>
                        <td>C$ {subtotal.toFixed(2)}</td>
                        <td>{subtotalUsd ? `US$ ${subtotalUsd.toFixed(2)}` : "-"}</td>
                      </tr>
                    );
                  })}
                  {(selectedDev.detalles || []).length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty">
                        Sin articulos devueltos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>

    {confirmCobro && (
      <div className="confirm-overlay" role="dialog" aria-modal="true">
        <div className="confirm-card">
          <h3>{confirmCobro.cobrada ? "Quitar pago" : "Marcar como pagada"}</h3>
          <p>
            {confirmCobro.cobrada
              ? "¿Deseas marcar esta devolucion como pendiente de pago?"
              : "¿Confirmas marcar esta devolucion como pagada?"}
          </p>
          <div className="confirm-actions">
            <button
              className="ghost-btn"
              onClick={() => setConfirmCobro(null)}
              disabled={marcandoCobra === confirmCobro.id}
            >
              Cancelar
            </button>
            <button
              className="secondary-btn"
              onClick={() => toggleCobrar(confirmCobro)}
              disabled={marcandoCobra === confirmCobro.id}
            >
              {marcandoCobra === confirmCobro.id ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default DevolucionesHistorico;
