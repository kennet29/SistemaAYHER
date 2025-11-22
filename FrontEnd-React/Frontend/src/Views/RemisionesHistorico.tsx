import React, { useEffect, useState } from "react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaHistory } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Remisiones.css";
import { fmtDate } from "../utils/dates";
import ConfirmModal from "./ConfirmModal";
import { buildApiUrl } from "../api/constants";

const API_REMISION = buildApiUrl("/remision");
const API_CLIENTES = buildApiUrl("/clientes");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function RemisionesHistorico() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [remisiones, setRemisiones] = useState<any[]>([]);
  const [remisionSeleccionada, setRemisionSeleccionada] = useState<any>(null);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState<{
    title?: string;
    message: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  const token = getCookie("token");

  const getClienteNombre = (id: number) => {
    const cliente = clientes.find((c) => (c._id || c.id) === id);
    return cliente ? cliente.nombre || cliente.razonSocial || cliente.empresa : "Cliente no encontrado";
  };

  const imprimirPDF = (id: number) => {
    setConfirmCfg({
      title: "Confirmación",
      message: `¿Generar PDF de la remisión #${id}?`,
      onConfirm: () => { setConfirmOpen(false); toast.info("Generando PDF..."); window.open(`${API_REMISION}/print/pdf/${id}`, "_blank"); },
    });
    setConfirmOpen(true);
  };

  const imprimirExcel = (id: number) => {
    setConfirmCfg({
      title: "Confirmación",
      message: `¿Generar Excel de la remisión #${id}?`,
      onConfirm: () => { setConfirmOpen(false); toast.info("Generando Excel..."); window.open(`${API_REMISION}/print/excel/${id}`, "_blank"); },
    });
    setConfirmOpen(true);
  };

  useEffect(() => {
    fetch(API_CLIENTES, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setClientes)
      .catch(() => toast.error("Error cargando clientes"));
  }, []);

  useEffect(() => {
    fetch(API_TIPO_CAMBIO, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setTipoCambio(j.tipoCambio?.valor ?? j.valor ?? null))
      .catch(() => setTipoCambio(null));
  }, []);

  useEffect(() => {
    fetch(`${API_REMISION}/?ts=${Date.now()}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' as RequestCache })
      .then(async (r) => {
        if (r.status === 304) return;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRemisiones(Array.isArray(data) ? data : (data?.items || []));
      })
      .catch(() => toast.error("Error cargando histórico"));
  }, []);

  // Cargar DataTables.net y poblar desde estado (no confiar en DOM rows)
  useEffect(() => {
    if (!remisiones || remisiones.length === 0) return;
    const ensureCss = (href: string) => new Promise<void>((resolve) => {
      if (document.querySelector(`link[href='${href}']`)) return resolve();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = () => resolve();
      document.head.appendChild(link);
    });
    const ensureScript = (src: string) => new Promise<void>((resolve) => {
      const existing = document.querySelector(`script[src='${src}']`) as HTMLScriptElement | null;
      if (existing && (existing as any)._loaded) return resolve();
      if (existing) {
        existing.addEventListener("load", () => resolve());
        return;
      }
      const s = document.createElement("script");
      (s as any)._loaded = false;
      s.src = src;
      s.async = true;
      s.onload = () => { (s as any)._loaded = true; resolve(); };
      document.body.appendChild(s);
    });

    let dtInstance: any;
    let cancelled = false;

    const init = async () => {
      await ensureCss("https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css");
      await ensureScript("https://code.jquery.com/jquery-3.6.0.min.js");
      await ensureScript("https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js");
      const w = window as any;
      const $ = w.jQuery || w.$;
      const el = tableRef.current;
      if (cancelled) return;
      if ($ && el && el.isConnected && el.parentNode && $.fn && $.fn.dataTable) {
        requestAnimationFrame(() => {
          if (cancelled) return;
          if (!el.isConnected || !el.parentNode) return;
          if ($.fn.dataTable.isDataTable(el)) {
            dtInstance = $(el).DataTable();
            dtInstance.clear();
          } else {
            dtInstance = $(el).DataTable({
              paging: true,
              searching: true,
              info: true,
              order: [[0, 'desc']],
              language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json' },
              columns: [
                { title: 'ID', data: 'id' },
                { title: 'Fecha', data: 'fecha' },
                { title: 'Cliente', data: 'cliente' },
                { title: 'Estado', data: 'estado' },
                { title: 'Acciones', data: 'acciones', orderable: false, searchable: false },
              ]
            });
            // Delegated events
            $(el).on('click', '.btn-ver', (ev: any) => {
              const id = Number(ev.currentTarget.getAttribute('data-id'));
              const row = remisiones.find((p) => p.id === id);
              if (row) setRemisionSeleccionada(row);
            });
            $(el).on('click', '.btn-pdf', (ev: any) => {
              const id = Number(ev.currentTarget.getAttribute('data-id'));
              imprimirPDF(id);
            });
            $(el).on('click', '.btn-excel', (ev: any) => {
              const id = Number(ev.currentTarget.getAttribute('data-id'));
              imprimirExcel(id);
            });
          }
          const rows = (remisiones || []).map((row: any) => ({
            id: row.id,
            fecha: String(row.fecha).split('T')[0],
            cliente: getClienteNombre(row.clienteId),
            estado: row.facturada ? 'Facturada' : 'Pendiente',
            acciones: `<div style="display:flex;gap:10px;justify-content:center">
              <button class="rem-table-btn rem-view-btn btn-ver" data-id="${row.id}">Ver</button>
              <button class="rem-table-btn rem-pdf-btn btn-pdf" data-id="${row.id}">PDF</button>
            </div>`
          }));
          dtInstance.clear();
          dtInstance.rows.add(rows);
          dtInstance.draw();
        });
      }
    };

    init();

    return () => {
      const w = window as any;
      const $ = w.jQuery || w.$;
      cancelled = true;
      const el = tableRef.current;
      if ($ && el && $.fn && $.fn.dataTable && $.fn.dataTable.isDataTable(el)) {
        $(el).off('click', '.btn-ver');
        $(el).off('click', '.btn-excel');
        $(el).off('click', '.btn-pdf');
        $(el).DataTable().destroy();
      }
      if (dtInstance) dtInstance = null;
    };
  }, [remisiones, clientes]);

  function renderDetalleRemision() {
    if (!remisionSeleccionada) return null;
    return (
      <div className="rem-card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Remisión #{remisionSeleccionada.numero ?? remisionSeleccionada.id}</h3>
          <button className="rem-close-btn" onClick={() => setRemisionSeleccionada(null)}>Cerrar</button>
        </div>
        <p><strong>Cliente:</strong> {getClienteNombre(remisionSeleccionada.clienteId)}</p>
        <p><strong>Fecha:</strong> {String(remisionSeleccionada.fecha).split("T")[0]}</p>
        <p><strong>Obs:</strong> {remisionSeleccionada.observacion || "N/A"}</p>
        <p><strong>PIO:</strong> {remisionSeleccionada.pio || "N/A"}</p>

        <h4>Productos</h4>
        <div style={{ overflowX: "auto" }}>
          <table className="rem-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Parte</th>
                <th style={{ textAlign: "left" }}>Producto</th>
                <th>Cant.</th>
                <th>Precio C$</th>
                <th>Precio $</th>
                <th>Subtotal C$</th>
                <th>Subtotal $</th>
              </tr>
            </thead>
            <tbody>
              {remisionSeleccionada.detalles?.map((d: any, i: number) => {
                const inv = d.inventario || {};
                const cant = Number(d.cantidad) || 0;
                const pNIOraw = Number(inv.precioVentaSugeridoCordoba ?? inv.precioVentaPromedioCordoba ?? 0) || 0;
                const pUSDraw = Number(inv.precioVentaSugeridoDolar ?? inv.precioVentaPromedioDolar ?? 0) || 0;
                const pNIO = pNIOraw || (pUSDraw && tipoCambio ? pUSDraw * tipoCambio : 0);
                const pUSD = pUSDraw || (pNIOraw && tipoCambio ? pNIOraw / tipoCambio : 0);
                const subNIO = cant * pNIO;
                const subUSD = cant * pUSD;
                return (
                  <tr key={i}>
                    <td>{inv.numeroParte ?? "—"}</td>
                    <td>{inv.nombre ?? inv.descripcion ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{cant}</td>
                    <td style={{ textAlign: "right" }}>C$ {pNIO.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>$ {pUSD.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>C$ {subNIO.toFixed(2)}</td>
                    <td style={{ textAlign: "right" }}>$ {subUSD.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          {(() => {
            const acc = (remisionSeleccionada.detalles || []).reduce(
              (tot: any, d: any) => {
                const inv = d.inventario || {};
                const cant = Number(d.cantidad) || 0;
                const pNIOraw = Number(inv.precioVentaSugeridoCordoba ?? inv.precioVentaPromedioCordoba ?? 0) || 0;
                const pUSDraw = Number(inv.precioVentaSugeridoDolar ?? inv.precioVentaPromedioDolar ?? 0) || 0;
                const pNIO = pNIOraw || (pUSDraw && tipoCambio ? pUSDraw * tipoCambio : 0);
                const pUSD = pUSDraw || (pNIOraw && tipoCambio ? pNIOraw / tipoCambio : 0);
                return { nio: tot.nio + cant * pNIO, usd: tot.usd + cant * pUSD };
              },
              { nio: 0, usd: 0 }
            );
            return (
              <div className="rem-card" style={{ width: "min(360px, 90%)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <b>Total C$</b>
                  <span>C$ {acc.nio.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <b>Total $</b>
                  <span>$ {acc.usd.toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  return (
    <div className="rem-container">
      <ToastContainer position="top-right" autoClose={2500} />
      <ConfirmModal
        open={confirmOpen}
        title={confirmCfg?.title}
        message={confirmCfg?.message || ""}
        onConfirm={() => { confirmCfg?.onConfirm?.(); }}
        onCancel={() => { setConfirmOpen(false); toast.info("Acción cancelada"); }}
      />
      <h2 className="rem-title"><FaHistory /> Histórico de Remisiones</h2>
      <div style={{ marginBottom: 12 }}>
        <button className="rem-close-btn" onClick={() => navigate(-1)}>← Regresar</button>
      </div>

      {remisionSeleccionada && renderDetalleRemision()}

      <div className="rem-card" style={{ overflowX: "auto" }}>
        {(!remisiones || remisiones.length === 0) && (
          <div style={{ padding: 8, color: '#6b7280' }}>No hay remisiones en el histórico.</div>
        )}
        <div style={{ marginBottom: 6, color: '#374151' }}>Total: {remisiones.length}</div>
        <table ref={tableRef} className="rem-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {remisiones.map((row: any, idx: number) => (
              <tr key={idx}>
                <td>{row.id}</td>
                <td>{fmtDate(row.fecha)}</td>
                <td>{getClienteNombre(row.clienteId)}</td>
                <td>{row.facturada ? "Facturada" : "Pendiente"}</td>
                <td>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button className="rem-table-btn rem-view-btn" onClick={() => { setRemisionSeleccionada(row); toast.info("Mostrando detalle"); }}>Ver</button>
                    <button className="rem-table-btn rem-pdf-btn" onClick={() => imprimirPDF(row.id)}>PDF</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
