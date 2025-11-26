// src/Views/ProformasHistorico.tsx - Historial de Proformas
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { FaArrowLeft, FaClipboardList } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Ventas.css";
import { fmtDate } from "../utils/dates";
import { buildApiUrl } from "../api/constants";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const API_PROFORMAS = buildApiUrl("/ventas/proformas");
const API_PROFORMA_PDF = buildApiUrl("/ventas/proforma/pdf");

type ProformaRow = {
  id: number;
  fecha?: string;
  cliente?: {
    id?: number | null;
    nombre?: string | null;
    empresa?: string | null;
    razonSocial?: string | null;
  } | null;
  totalCordoba?: number | null;
  totalDolar?: number | null;
  tipoCambioValor?: number | null;
  pio?: string | null;
  incoterm?: string | null;
  plazoEntrega?: string | null;
  condicionPago?: string | null;
};

type ProformaDetalle = ProformaRow & {
  clienteId?: number | null;
  detallesJson: string;
};

const ProformasHistorico: React.FC = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<ProformaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState<"NIO" | "USD">("NIO");
  const [showMonedaModal, setShowMonedaModal] = useState(false);
  const [accionPendiente, setAccionPendiente] = useState<{ tipo: "pdf" | "excel"; row: ProformaRow } | null>(null);

  useEffect(() => {
    const token = getCookie("token");
    fetch(API_PROFORMAS, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then((r) => r.json())
      .then((j) => setProformas(j.proformas ?? j.data ?? []))
      .catch(() => setProformas([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return proformas;
    return proformas.filter((p) => {
      const idStr = (p.id ?? "").toString();
      const nombre =
        p.cliente?.nombre ||
        p.cliente?.razonSocial ||
        p.cliente?.empresa ||
        "";
      return (
        idStr.includes(query) ||
        nombre.toLowerCase().includes(query)
      );
    });
  }, [q, proformas]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, p) => {
          acc.c += Number(p.totalCordoba || 0);
          acc.d += Number(p.totalDolar || 0);
          return acc;
        },
        { c: 0, d: 0 }
      ),
    [rows]
  );

  const stats = useMemo(() => {
    const count = rows.length;
    const last = rows[0]?.fecha ? fmtDate(rows[0].fecha as any) : "-";
    return { count, last };
  }, [rows]);

  async function fetchDetalle(id: number): Promise<ProformaDetalle | null> {
    try {
      const token = getCookie("token");
      const resp = await fetch(buildApiUrl(`/ventas/proformas/${id}`), {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!resp.ok) {
        toast.error("No se pudo cargar la proforma seleccionada");
        return null;
      }
      const body = await resp.json();
      return (body.proforma ?? body.data ?? null) as ProformaDetalle | null;
    } catch {
      toast.error("Error de red al cargar la proforma");
      return null;
    }
  }

  function solicitarMoneda(tipo: "pdf" | "excel", row: ProformaRow) {
    setAccionPendiente({ tipo, row });
    setShowMonedaModal(true);
  }

  function confirmarMoneda() {
    if (!accionPendiente) return;
    setShowMonedaModal(false);
    if (accionPendiente.tipo === "pdf") {
      ejecutarPdf(accionPendiente.row, monedaSeleccionada);
    } else {
      ejecutarExcel(accionPendiente.row, monedaSeleccionada);
    }
    setAccionPendiente(null);
  }

  async function ejecutarPdf(row: ProformaRow, moneda: "NIO" | "USD") {
    setDownloadingId(row.id);
    try {
      const detalle = await fetchDetalle(row.id);
      if (!detalle) return;
      let items: any[] = [];
      try {
        const parsed = JSON.parse(detalle.detallesJson || "[]");
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [];
      }
      if (!items.length) {
        toast.warn("La proforma no tiene detalles para generar PDF");
        return;
      }
      const dets = items
        .map((it) => ({
          numeroParte: it.numeroParte ?? "",
          nombre: it.nombre ?? "",
          cantidad: Number(it.cantidad || 0),
          precio: Number(it.precioCordoba || 0),
          inventarioId:
            typeof it.inventarioId === "number" ? Number(it.inventarioId) : null,
        }))
        .filter((d) => d.cantidad > 0);
      if (!dets.length) {
        toast.warn("La proforma no tiene cantidades v��lidas");
        return;
      }
      const clienteId =
        (detalle.clienteId as number | null | undefined) ??
        (detalle.cliente?.id as number | null | undefined) ??
        null;
      const payload: any = {
        cliente: detalle.cliente
          ? {
              id: clienteId ?? undefined,
              nombre:
                detalle.cliente.nombre ||
                detalle.cliente.razonSocial ||
                detalle.cliente.empresa ||
                "",
            }
          : { nombre: "" },
        clienteId,
        detalles: dets,
        tipoCambioValor: Number(detalle.tipoCambioValor || 0) || null,
        pio: detalle.pio ?? null,
        incoterm: detalle.incoterm ?? null,
        plazoEntrega: detalle.plazoEntrega ?? null,
        condicionPago: detalle.condicionPago ?? null,
        guardarHistorial: false,
        moneda: moneda,
      };
      const token = getCookie("token");
      const resp = await fetch(API_PROFORMA_PDF, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        toast.error("No se pudo generar el PDF de la proforma");
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proforma_${row.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF generado");
    } finally {
      setDownloadingId(null);
    }
  }

  async function ejecutarExcel(row: ProformaRow, moneda: "NIO" | "USD") {
    setDownloadingId(row.id);
    try {
      const token = getCookie("token");
      const resp = await fetch(buildApiUrl(`/ventas/proformas/${row.id}/excel?moneda=${moneda}`), {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      
      if (!resp.ok) {
        toast.error("No se pudo generar el Excel de la proforma");
        return;
      }
      
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proforma_${row.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel generado");
    } catch (error) {
      toast.error("Error al generar Excel");
    } finally {
      setDownloadingId(null);
    }
  }

  const columns: any = [
    { name: "ID", selector: (r: ProformaRow) => r.id, width: "80px" },
    {
      name: "Fecha",
      selector: (r: ProformaRow) => r.fecha as any,
      width: "120px",
      cell: (r: ProformaRow) => <span>{fmtDate(r.fecha as any)}</span>,
    },
    {
      name: "Cliente",
      selector: (r: ProformaRow) =>
        r.cliente?.nombre ||
        r.cliente?.razonSocial ||
        r.cliente?.empresa ||
        "-",
      grow: 2,
      sortable: true,
    },
    {
      name: "Total C$",
      selector: (r: ProformaRow) => Number(r.totalCordoba || 0),
      right: true,
      width: "160px",
      cell: (r: ProformaRow) => (
        <span className="num-right">
          C$ {(Number(r.totalCordoba) || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "Total $",
      selector: (r: ProformaRow) => Number(r.totalDolar || 0),
      right: true,
      width: "140px",
      cell: (r: ProformaRow) => (
        <span className="num-right">
          $ {(Number(r.totalDolar) || 0).toFixed(2)}
        </span>
      ),
    },
    {
      name: "TC",
      selector: (r: ProformaRow) => Number(r.tipoCambioValor || 0),
      right: true,
      width: "110px",
      cell: (r: ProformaRow) => (
        <span className="num-right">
          {r.tipoCambioValor ? Number(r.tipoCambioValor).toFixed(4) : "-"}
        </span>
      ),
    },
    {
      name: "Acciones",
      button: true,
      width: "200px",
      cell: (r: ProformaRow) => (
        <div style={{ display: "flex", gap: ".4rem", justifyContent: "center" }}>
          <button
            type="button"
            onClick={() => solicitarMoneda("pdf", r)}
            disabled={downloadingId === r.id}
            className="icon-btn"
            style={{ minWidth: 84 }}
          >
            PDF
          </button>
          <button
            type="button"
            onClick={() => solicitarMoneda("excel", r)}
            disabled={downloadingId === r.id}
            className="icon-btn"
            style={{ minWidth: 92, background: "#f1fff0", color: "#14532d" }}
          >
            Excel
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="fact-page ventas-page">
      <header className="fact-header">
        <button
          className="back-btn"
          title="Volver a Proforma"
          onClick={() => navigate("/proforma")}
        >
          <FaArrowLeft /> Volver
        </button>
        <div>
          <h1>Historial de Proformas</h1>
        </div>
      </header>

      <div className="fact-content" style={{ width: "100%" }}>
        <div className="card proformas-hero">
          <div className="hero-icon">
            <FaClipboardList />
          </div>
          <div className="hero-text">
            <p className="hero-kicker">Seguimiento de proformas</p>
            <h2>Consulta, busca y reimprime</h2>
            <p className="hero-sub">
              Descarga cada proforma en PDF o Excel, revisa totales y el cliente asociado.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-label">Proformas</span>
              <strong className="stat-value">{stats.count}</strong>
            </div>
            <div className="stat">
              <span className="stat-label">Última</span>
              <strong className="stat-value">{stats.last}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="ventas-center">
            <div className="toolbar">
              <label>
                Buscar
                <input
                  placeholder="por ID o cliente"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ width: "260px" }}
                />
              </label>
              <button
                className="icon-btn"
                title="Limpiar"
                onClick={() => setQ("")}
              >
                ×
              </button>
              <div className="flex-spacer" />
              <div className="metrics">
                <span className="chip">Proformas: {rows.length}</span>
                <span className="chip">Total C$ {totals.c.toFixed(2)}</span>
                <span className="chip">Total $ {totals.d.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="ventas-table-wrap proformas-table-wrap" style={{ display: "flex", justifyContent: "center" }}>
            <div className="ventas-table proformas-table" style={{ width: "100%", maxWidth: "1400px" }}>
              <DataTable
                columns={columns}
                data={rows}
                progressPending={loading}
                pagination
                fixedHeader
                fixedHeaderScrollHeight="360px"
                highlightOnHover
                dense
                customStyles={{
                  table: { style: { minWidth: "900px", margin: "0 auto" } },
                  headCells: {
                    style: { justifyContent: "center", textAlign: "center" },
                  },
                  cells: {
                    style: { justifyContent: "center", textAlign: "center" },
                  },
                }}
                noDataComponent={
                  <div className="empty-state">
                    <div className="empty-title">Aún no hay proformas registradas</div>
                    <div className="empty-desc">
                      Guarda una proforma desde la pantalla principal y aparecerá aquí para reimprimirla.
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de selección de moneda */}
      {showMonedaModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
            minWidth: "400px",
          }}>
            <h3 style={{ marginTop: 0, color: "#003399" }}>Seleccionar Moneda</h3>
            <p style={{ marginBottom: "1.5rem", color: "#475569" }}>
              ¿En qué moneda deseas generar la proforma?
            </p>
            
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <label style={{
                flex: 1,
                padding: "1rem",
                border: monedaSeleccionada === "NIO" ? "2px solid #003399" : "2px solid #e3e9f5",
                borderRadius: "8px",
                cursor: "pointer",
                background: monedaSeleccionada === "NIO" ? "#eef3ff" : "#fff",
                transition: "all 0.2s",
              }}>
                <input
                  type="radio"
                  name="moneda"
                  value="NIO"
                  checked={monedaSeleccionada === "NIO"}
                  onChange={(e) => setMonedaSeleccionada(e.target.value as "NIO" | "USD")}
                  style={{ marginRight: "0.5rem" }}
                />
                <strong>Córdobas (C$)</strong>
              </label>
              
              <label style={{
                flex: 1,
                padding: "1rem",
                border: monedaSeleccionada === "USD" ? "2px solid #003399" : "2px solid #e3e9f5",
                borderRadius: "8px",
                cursor: "pointer",
                background: monedaSeleccionada === "USD" ? "#eef3ff" : "#fff",
                transition: "all 0.2s",
              }}>
                <input
                  type="radio"
                  name="moneda"
                  value="USD"
                  checked={monedaSeleccionada === "USD"}
                  onChange={(e) => setMonedaSeleccionada(e.target.value as "NIO" | "USD")}
                  style={{ marginRight: "0.5rem" }}
                />
                <strong>Dólares ($)</strong>
              </label>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowMonedaModal(false);
                  setAccionPendiente(null);
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarMoneda}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#003399",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Generar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default ProformasHistorico;
