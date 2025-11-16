import React, { useEffect, useState } from "react";
import { FaTruck } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import "./Remisiones.css";
import { fmtDate } from "../utils/dates";
import ConfirmModal from "./ConfirmModal";
import { ensureArray } from "../utils/ensureArray";
import { buildApiUrl } from "../api/constants";

const API_REMISION = buildApiUrl("/remision");
const API_CLIENTES = buildApiUrl("/clientes");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function RemisionesPendientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [remisionSeleccionada, setRemisionSeleccionada] = useState<any>(null);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const token = getCookie("token");
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState<{
    title?: string;
    message: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  const getClienteNombre = (id: number) => {
    const list = Array.isArray(clientes) ? clientes : [];
    const c = list.find((x) => (x._id || x.id) === id);
    return c ? c.nombre || c.razonSocial || c.empresa : "Cliente no encontrado";
  };
  const imprimirExcel = (id: number) => window.open(`${API_REMISION}/print/excel/${id}`, "_blank");
  const imprimirExcelNotificado = (id: number) => {
    setConfirmCfg({
      title: "Confirmación",
      message: `¿Abrir Excel de la remisión #${id}?`,
      onConfirm: () => { setConfirmOpen(false); toast.info("Abriendo Excel..."); imprimirExcel(id); },
    });
    setConfirmOpen(true);
  };

  useEffect(() => {
    let cancelled = false;
    const loadClientes = async () => {
      try {
        const res = await fetch(API_CLIENTES, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store" as RequestCache,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (!cancelled) setClientes(ensureArray(payload));
      } catch (err) {
        console.error(err);
        if (!cancelled) setClientes([]);
        toast.error("Error cargando clientes");
      }
    };
    loadClientes();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    fetch(API_TIPO_CAMBIO, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setTipoCambio(j.tipoCambio?.valor ?? j.valor ?? null))
      .catch(() => setTipoCambio(null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadPendientes = async () => {
      try {
        const r = await fetch(`${API_REMISION}/pendientes?ts=${Date.now()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store" as RequestCache,
        });
        if (r.status === 304) return;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!cancelled) setPendientes(ensureArray(data));
      } catch (e) {
        console.error(e);
        if (!cancelled) setPendientes([]);
        toast.error("Error cargando pendientes");
      }
    };
    loadPendientes();
    return () => {
      cancelled = true;
    };
  }, [token]);


  function renderDetalleRemision() {
    if (!remisionSeleccionada) return null;
    return (
      <div className="rem-card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Remisión #{remisionSeleccionada.numero ?? remisionSeleccionada.id}</h3>
          <button className="rem-close-btn" onClick={() => setRemisionSeleccionada(null)}>Cerrar</button>
        </div>
        <p><strong>Cliente:</strong> {getClienteNombre(remisionSeleccionada.clienteId)}</p>
        <p><strong>Fecha:</strong> {String(remisionSeleccionada.fecha).split('T')[0]}</p>
        <p><strong>Obs:</strong> {remisionSeleccionada.observacion || 'N/A'}</p>
        <h4>Productos</h4>
        <div style={{ overflowX: 'auto' }}>
          <table className="rem-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Parte</th>
                <th style={{ textAlign: 'left' }}>Producto</th>
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
                    <td>{inv.numeroParte ?? '—'}</td>
                    <td>{inv.nombre ?? inv.descripcion ?? '—'}</td>
                    <td style={{ textAlign: 'center' }}>{cant}</td>
                    <td style={{ textAlign: 'right' }}>C$ {pNIO.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>$ {pUSD.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>C$ {subNIO.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>$ {subUSD.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="rem-excel-btn" onClick={() => imprimirExcel(remisionSeleccionada.id)}>Excel</button>
          <button className="rem-close-btn" onClick={() => setRemisionSeleccionada(null)}>Cerrar detalle</button>
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
      <h2 className="rem-title"><FaTruck /> Remisiones Pendientes</h2>
      <div style={{ marginBottom: 12 }}>
        <button className="rem-close-btn" onClick={() => navigate(-1)}>← Regresar</button>
      </div>

      {remisionSeleccionada && renderDetalleRemision()}

      <div className="rem-card" style={{ overflowX: 'auto' }}>
        <div style={{ marginBottom: 6, color: '#374151' }}>Total: {pendientes.length}</div>
        {pendientes.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No hay remisiones pendientes.</div>
        ) : (
          <table className="rem-table" style={{ width: '100%' }}>
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
              {pendientes.map((row: any, idx: number) => (
                <tr key={idx}>
                  <td>{row.id}</td>
                  <td>{fmtDate(row.fecha)}</td>
                  <td>{getClienteNombre(row.clienteId)}</td>
                  <td>{row.facturada ? 'Facturada' : 'Pendiente'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <button className="rem-table-btn rem-view-btn" onClick={() => { setRemisionSeleccionada(row); toast.info("Mostrando detalle"); }}>Ver</button>
                      <button className="rem-table-btn rem-excel-btn" onClick={() => imprimirExcelNotificado(row.id)}>Excel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
