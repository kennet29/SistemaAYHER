// src/pages/Proforma.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCashRegister, FaPlus, FaPrint, FaFileExcel, FaSearch, FaTimes, FaArrowLeft
} from "react-icons/fa";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Facturacion.css";
import "./Proforma.css";
import logo from "../img/logo.png";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api/constants";

// ================= Utils =================
function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}
function cryptoId() {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  return "id-" + Math.random().toString(36).slice(2, 10);
}
function formatMoney(val: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "C$";
  return `${symbol} ${Number(val || 0).toFixed(2)}`;
}

// ================= Types =================
type LineItem = {
  id: string;
  producto: string;
  cantidad: number;
  precio: number;
  esRemision?: boolean;
  remisionDetalleId?: number | null;
  inventarioId?: number | null;
};
type Moneda = "NIO" | "USD";
type Product = {
  id: number;
  nombre?: string;
  numeroParte?: string;
  descripcion?: string;
  stockActual?: number | string;
  precioVentaSugeridoCordoba?: number | string;
  precioVentaSugeridoDolar?: number | string;
  precioVentaPromedioCordoba?: number | string;
  precioVentaPromedioDolar?: number | string;
};
type RemisionDetalle = {
  id: number;
  cantidad: number;
  facturado: boolean;
  inventario: {
    id: number;
    nombre?: string;
    numeroParte?: string;
    precioVentaSugeridoCordoba?: number | string;
    precioVentaSugeridoDolar?: number | string;
  };
};
type Remision = { id: number; clienteId: number; fecha: string; detalles: RemisionDetalle[] };

// ================= API =================
const API_PRODUCTOS = buildApiUrl("/inventario");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");
const API_REMISIONES = buildApiUrl("/remision/pendientes");
const API_CLIENTES = buildApiUrl("/clientes");
const API_VENTAS = buildApiUrl("/ventas");

// ================= Alerts =================
const notify = {
  ok: (m: string) => toast.success(m),
  warn: (m: string) => toast.warn(m),
  err: (m: string) => toast.error(m),
};

const Proforma: React.FC = () => {
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<number | "">("");
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [fecha] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [moneda, setMoneda] = useState<Moneda>("NIO");
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const prevMoneda = useRef<Moneda>("NIO");

  const [productos, setProductos] = useState<Product[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [ocultarSinStock, setOcultarSinStock] = useState(false);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);

  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [pickerRemisionAbierto, setPickerRemisionAbierto] = useState(false);
  const [filaSeleccionRemision, setFilaSeleccionRemision] = useState<string | null>(null);
  const [remisionSearch, setRemisionSearch] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    { id: cryptoId(), producto: "", cantidad: 1, precio: 0 },
  ]);

  // Fetch
  useEffect(() => {
    fetch(API_CLIENTES, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then(r => r.json())
      .then(j => setClientesList(Array.isArray(j) ? j : j.data || []));
  }, []);
  useEffect(() => {
    fetch(API_PRODUCTOS, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then(r => r.json())
      .then(j => setProductos(j.items ?? j.data ?? j ?? []));
  }, []);
  useEffect(() => {
    fetch(API_TIPO_CAMBIO, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then(r => r.json())
      .then(j => setTipoCambio(j.tipoCambio?.valor ?? j.valor ?? null));
  }, []);
  useEffect(() => {
    fetch(API_REMISIONES, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then(r => r.json())
      .then(j => setRemisiones(j.remisiones ?? j.data ?? j ?? []));
  }, []);

  // Helpers stock & price
  const getPrecioProducto = (p: Product, m: Moneda) =>
    Number(
      m === "USD"
        ? p.precioVentaSugeridoDolar ?? p.precioVentaPromedioDolar ?? 0
        : p.precioVentaSugeridoCordoba ?? p.precioVentaPromedioCordoba ?? 0
    ) || 0;

  const getStock = (id?: number | null) =>
    id == null ? Infinity : Number(productos.find(p => Number(p.id) === id)?.stockActual ?? 0);

  const getCantidadUsada = (id?: number | null, excl?: string) =>
    id == null ? 0 : items.filter(it => it.inventarioId === id && it.id !== excl)
      .reduce((a, it) => a + (it.cantidad || 0), 0);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    let list = productos;
    if (q) {
      list = list.filter(p =>
        [p.nombre, p.numeroParte, p.descripcion].filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    if (ocultarSinStock) {
      list = list.filter(p => (Number(p.stockActual) || 0) > 0);
    }
    return list;
  }, [busqueda, productos, ocultarSinStock]);

  // Evitar seleccionar dos veces el mismo artículo
  const selectedIds = useMemo(() => {
    const ids = items
      .map((i) => (typeof i.inventarioId === "number" ? Number(i.inventarioId) : NaN))
      .filter((n) => !Number.isNaN(n));
    return new Set(ids);
  }, [items]);

  useEffect(() => {
    if (prevMoneda.current === moneda) return;
    if (!tipoCambio || tipoCambio <= 0) return;
    setItems(curr => curr.map(it => {
      if (it.esRemision) return it;
      const rate = prevMoneda.current === "NIO" && moneda === "USD"
        ? it.precio / tipoCambio
        : it.precio * tipoCambio;
      return { ...it, precio: Number(rate.toFixed(4)) };
    }));
    prevMoneda.current = moneda;
  }, [moneda, tipoCambio]);

  // Update rows
  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems(arr => arr.map(it => {
      if (it.id !== id) return it;
      let next = { ...it, ...patch };
      next.precio = Math.max(0, Number(next.precio) || 0);
      if (next.inventarioId && !next.esRemision) {
        const solicitada = Number(patch.cantidad ?? next.cantidad);
        const stock = getStock(next.inventarioId);
        const usada = getCantidadUsada(next.inventarioId, id);
        next.cantidad = Math.min(Math.max(0, solicitada), Math.max(0, stock - usada));
      }
      return next;
    }));
  }

  const addRow = () =>
    setItems(s => [...s, { id: cryptoId(), producto: "", cantidad: 1, precio: 0 }]);

  const removeRow = (id: string) => {
    setItems(arr => {
      const next = arr.filter(it => it.id !== id);
      return next.length ? next : [{ id: cryptoId(), producto: "", cantidad: 1, precio: 0 }];
    });
    notify.ok("Línea eliminada");
  };

  // Totales
  const total = useMemo(
    () => items.reduce((a, it) => a + it.cantidad * it.precio, 0),
    [items]
  );
  const totalsBoth = useMemo(() => {
    const t = Number(total || 0);
    const tc = Number(tipoCambio || 0);
    let totalNIO: number | null = null;
    let totalUSD: number | null = null;
    if (moneda === "USD") {
      totalUSD = t;
      totalNIO = tc > 0 ? t * tc : null;
    } else {
      totalNIO = t;
      totalUSD = tc > 0 ? t / tc : null;
    }
    return { totalNIO, totalUSD, tc };
  }, [total, moneda, tipoCambio]);

  // ================= Print helpers (A4) =================
  const clienteObj = useMemo(() => {
    const id = typeof cliente === "number" ? cliente : null;
    return id != null ? clientesList.find((c) => Number(c.id) === Number(id)) : null;
  }, [cliente, clientesList]);

  const printRows = useMemo(() => (
    items.map((it) => {
      const prod = typeof it.inventarioId === "number"
        ? productos.find((p) => Number(p.id) === Number(it.inventarioId))
        : undefined;
      let numeroParte = (prod as any)?.numeroParte ?? "";
      let nombre = (prod as any)?.nombre ?? "";
      if (!numeroParte || !nombre) {
        const split = String(it.producto || "").split("â€”");
        if (!numeroParte && split[0]) numeroParte = split[0].trim();
        if (!nombre && split[1]) nombre = split[1].trim();
      }
      const cantidad = Number(it.cantidad || 0);
      const precio = Number(it.precio || 0);
      const subtotal = cantidad * precio;
      return { numeroParte, nombre, cantidad, precio, subtotal };
    })
  ), [items, productos]);

  const totalPrint = useMemo(() => printRows.reduce((a, r) => a + r.subtotal, 0), [printRows]);

  // ======== Export PDF ========
  async function generarPDF() {
    try {
      const token = getCookie("token");
      const tc = Number(tipoCambio || 0);
      if (moneda === "USD" && !(tc > 0)) {
        notify.warn("Tipo de cambio no disponible para calcular C$");
        return;
      }
      const dets = items
        .filter((it) => (it.producto?.trim() || "") !== "" && Number(it.cantidad) > 0)
        .map((it) => {
          const prod = typeof it.inventarioId === "number"
            ? productos.find((p) => Number(p.id) === Number(it.inventarioId))
            : undefined;
          let numeroParte = (prod as any)?.numeroParte ?? "";
          let nombre = (prod as any)?.nombre ?? "";
          if (!numeroParte || !nombre) {
            const split = String(it.producto || "").split("â€”");
            if (!numeroParte && split[0]) numeroParte = split[0].trim();
            if (!nombre && split[1]) nombre = split[1].trim();
          }
          const cantidad = Math.max(0, Number(it.cantidad) || 0);
          const precioShown = Math.max(0, Number(it.precio) || 0);
          const precioCordoba = moneda === "USD" ? precioShown * tc : precioShown;
          return { numeroParte, nombre, cantidad, precio: Number(precioCordoba.toFixed(4)) };
        });

      if (!dets.length) {
        notify.warn("No hay ítems para generar PDF");
        return;
      }
      const payload: any = {
        cliente: clienteObj ? { nombre: clienteObj.nombre } : { nombre: "" },
        detalles: dets,
        tipoCambioValor: tc || null,
      };

      const resp = await fetch(`${API_VENTAS}/proforma/pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        notify.err("No se pudo generar el PDF");
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proforma_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify.ok("PDF generado");
    } catch {
      notify.err("Error generando PDF");
    }
  }

  // ======== Export Excel ========
  function generarExcel() {
    const rows = items.map(i => ({
      Producto: i.producto,
      Cantidad: i.cantidad,
      Precio: i.precio,
      Subtotal: (i.cantidad * i.precio).toFixed(2)
    }));
    const csv = [
      "Producto,Cantidad,Precio,Subtotal",
      ...rows.map(r => `${r.Producto},${r.Cantidad},${r.Precio},${r.Subtotal}`)
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proforma_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ========= Remisiones table =========
  const usedRems = useMemo(() => new Set(items.map(i => i.remisionDetalleId)), [items]);

  const remRows = useMemo(() => {
    const cliId = typeof cliente === "number" ? cliente : -1;
    const list = remisiones
      .filter(r => r.clienteId === cliId)
      .flatMap(r => {
        const c = clientesList.find(cl => cl.id === r.clienteId);
        return r.detalles.filter(d => !d.facturado).map(d => ({
          remisionId: r.id,
          fecha: new Date(r.fecha).toLocaleDateString(),
          cliente: c?.nombre ?? "",
          detalleId: d.id,
          producto: `${d.inventario.numeroParte ?? ""} — ${d.inventario.nombre ?? ""}`,
          cantidad: d.cantidad,
          precio: moneda === "USD"
            ? Number(d.inventario.precioVentaSugeridoDolar ?? 0)
            : Number(d.inventario.precioVentaSugeridoCordoba ?? 0),
          inventarioId: d.inventario.id,
          numeroParte: d.inventario.numeroParte,
          yaAgregado: usedRems.has(d.id)
        }));
      });

    const q = remisionSearch.toLowerCase();
    return list.filter(r =>
      r.cliente.toLowerCase().includes(q) ||
      r.producto.toLowerCase().includes(q) ||
      r.remisionId.toString().includes(q)
    );
  }, [remisiones, clientesList, cliente, moneda, remisionSearch, usedRems]);

  const remCols: TableColumn<any>[] = [
    { name: "Rem", selector: r => r.remisionId, width: "80px" },
    { name: "Producto", selector: r => r.producto, grow: 2 },
    { name: "Cant", selector: r => r.cantidad, width: "80px" },
    { name: "Precio", selector: r => r.precio, width: "120px",
      cell: r => formatMoney(r.precio, moneda)
    },
    {
      name: "✔",
      width: "100px",
      cell: r => (
        <button
          disabled={r.yaAgregado}
          className={`sel-btn${r.yaAgregado ? " disabled" : ""}`}
          onClick={() => {
            if (!filaSeleccionRemision) return;
            if (r.yaAgregado) return notify.warn("Ya agregado");

            updateItem(filaSeleccionRemision, {
              producto: r.producto,
              cantidad: r.cantidad,
              precio: r.precio,
              inventarioId: r.inventarioId,
              remisionDetalleId: r.detalleId,
              esRemision: true,
            });
            setPickerRemisionAbierto(false);
            notify.ok("Agregado desde remisión");
          }}
        >
          ✅
        </button>
      )
    }
  ];

  return (
    <>
      {/* ======= Print styles (A4) ======= */}
      <style>{`
        @page { size: A4; margin: 30mm 12mm 12mm 12mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .screen-only { display: none !important; }
          .print-proforma { display: block !important; }
        }
        .print-proforma { display: none; color: #000; font-family: 'Inter','Poppins', Arial, Helvetica, sans-serif; }
        .print-proforma .pf-header { text-align: center; margin-bottom: 8mm; position: relative; }
        .print-proforma .pf-title { font-size: 18px; font-weight: 800; margin: 0; }
        .print-proforma .pf-meta { margin-bottom: 6mm; border: 1px solid #000; padding: 6px 8px; font-size: 12px; display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:6px; }
        .print-proforma table { width: 100%; border-collapse: collapse; }
        .print-proforma th, .print-proforma td { border: 1px solid #000; padding: 6px 8px; font-size: 12px; }
        .print-proforma th { background: #f0f0f0; text-align: center; }
        .print-proforma td.right, .print-proforma th.right { text-align: right; }
        .print-proforma .pf-total { margin-top: 6mm; display: flex; justify-content: flex-end; }
        .print-proforma .pf-total .box { border: 1px solid #000; padding: 8px 12px; min-width: 70mm; font-weight: 700; }
        .print-proforma .pf-logo { position: absolute; left: 0; top: 0; width: 110px; height: auto; }
      `}</style>

      {/* ======= Screen content ======= */}
      <div className="screen-only">
        <div className="fact-page proforma-page">
          <header className="fact-header">
            <FaCashRegister className="icon" />
            <div><h1>Proforma</h1></div>
          </header>

      {/* Navegación */}
      <div className="nav-buttons" style={{ display: "flex", gap: "10px", margin: "10px 20px" }}>
        <button className="ghost" onClick={() => navigate("/facturacion")}>
          <FaArrowLeft /> Volver a Facturación
        </button>
      </div>

      {/* ======= FORM ======= */}
      <div className="fact-content">
        <div className="card">
          <div className="grid-3">
            <label>
              Cliente
              <select value={cliente} onChange={e => setCliente(e.target.value === "" ? "" : Number(e.target.value))}>
                <option value="">Seleccione cliente...</option>
                {clientesList.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </label>
            <label>
              Moneda
              <select value={moneda} onChange={e => setMoneda(e.target.value as Moneda)}>
                <option value="NIO">Córdobas</option>
                <option value="USD">Dólares</option>
              </select>
            </label>
            <label>
              Fecha
              <input type="date" value={fecha} readOnly />
            </label>
          </div>

          {/* Items */}
          <div className="items-container">
            <div className="items-header">
              <span>Producto</span>
              <span>Cant</span>
              <span>Precio</span>
              <span>Subtotal</span>
              <span></span>
              <span>-</span>
            </div>

            {items.map(it => (
              <div className="item-row" key={it.id}>

                <div style={{ display: "flex", gap: ".3rem", background:"white" }}>
                  <input
                    type="text"
                    disabled={it.esRemision}
                    value={it.producto}
                    placeholder="Buscar..."
                    onChange={e => updateItem(it.id, { producto: e.target.value })}
                  />
                  <button
                    className="icon-btn"
                    style={{ marginLeft:"15px", width:"75px", border:"2px solid black" }}
                    onClick={() => {
                      if (!cliente) return notify.warn("Seleccione cliente");
                      setPickerTargetId(it.id);
                      setPickerAbierto(true);
                    }}
                  >Buscar</button>
                </div>

                <input
                  className="qty-input"
                  type="number"
                  min={0}
                  disabled={it.esRemision}
                  value={it.cantidad}
                  onChange={e => updateItem(it.id, { cantidad: Number(e.target.value) })}
                />

                <input
                  className="price-input"
                  type="number"
                  min={0}
                  step={0.01}
                  disabled={it.esRemision}
                  value={it.precio}
                  onChange={e => updateItem(it.id, { precio: Number(e.target.value) })}
                />

                {/* Subtotal por artículo */}
                <span className="num-right">
                  {formatMoney((Number(it.cantidad) || 0) * (Number(it.precio) || 0), moneda)}
                </span>

                {/* Placeholder para columna 'Rem.' (no usada en Proforma) */}
                <div className="center"></div>

                {/* Botón eliminar en columna de acciones (más ancha) */}
                <button className="danger delete-btn" onClick={() => removeRow(it.id)}>
                  Eliminar
                </button>
              </div>
            ))}

            <button type="button" onClick={addRow}><FaPlus /> Agregar Línea</button>
          </div>
        </div>

        {/* Totales */}
        <div className="resumen">
          <div></div>
          <div className="right">
            <div className="row" style={{ padding: '.1rem 0', color:'#475569' }}>
              <span>Tipo de cambio</span>
              <b>{Number(totalsBoth.tc||0) > 0 ? Number(totalsBoth.tc).toFixed(4) : '-'}</b>
            </div>
            <div className="row" style={{ padding: '.1rem 0' }}>
              <span>Total C$</span>
              <b>{totalsBoth.totalNIO != null ? `C$ ${totalsBoth.totalNIO.toFixed(2)}` : '-'}</b>
            </div>
            <div className="row total">
              <span>Total $</span>
              <b>{totalsBoth.totalUSD != null ? `$ ${totalsBoth.totalUSD.toFixed(2)}` : '-'}</b>
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={generarPDF}><FaPrint /> PDF</button>
          <button className="ghost" onClick={generarExcel}><FaFileExcel /> Excel</button>
        </div>

        {pickerAbierto && (
          <div className="picker-overlay">
            <div className="picker-card">
              <div className="picker-top">
                <h3><FaSearch /> Productos</h3>
                <button className="picker-close" onClick={() => setPickerAbierto(false)}><FaTimes /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".9rem" }}>
                  <input
                    type="checkbox"
                    checked={ocultarSinStock}
                    onChange={(e) => setOcultarSinStock(e.target.checked)}
                  />
                  Ocultar sin stock
                </label>
              </div>
              <DataTable
                columns={[
                  { name:"Parte", selector:(r:Product)=> (r.numeroParte ?? ''), sortable:true },
                  { name:"Nombre", selector:(r:Product)=> (r.nombre ?? ''), grow:2, sortable:true },
                  { name:"Precio", selector:(r:Product)=>getPrecioProducto(r,moneda), sortable:true,
                    cell:r=>formatMoney(getPrecioProducto(r,moneda),moneda)
                  },
                  { name:"Stock", selector:(r:Product)=> Number(r.stockActual ?? 0), sortable:true }
                ]}
                data={productosFiltrados}
                pagination
                conditionalRowStyles={[
                  {
                    when: (r: any) => (Number(r.stockActual) || 0) <= 0,
                    style: { backgroundColor: "#fff2f2", color: "#c30000" }
                  },
                  {
                    when: (r: any) => selectedIds.has(Number(r.id)),
                    style: { opacity: 0.5, pointerEvents: "none" as any }
                  }
                ]}
                onRowClicked={(p:Product) => {
                  if (!pickerTargetId) return;
                  if (selectedIds.has(Number(p.id))) { notify.warn("Producto ya agregado"); return; }
                  if ((Number(p.stockActual)||0) <= 0) return notify.warn("Sin stock");
                  setItems(prev => prev.map(it =>
                    it.id === pickerTargetId
                      ? {
                          ...it,
                          producto:`${p.numeroParte ?? ""} — ${p.nombre ?? ""}`,
                          precio:getPrecioProducto(p, moneda),
                          inventarioId:Number(p.id),
                          esRemision:false,
                          remisionDetalleId:null,
                          cantidad:1
                        }
                      : it
                  ));
                  setPickerAbierto(false);
                  notify.ok("Producto agregado");
                }}
              />
            </div>
          </div>
        )}

        {false && pickerRemisionAbierto && (
          <div className="picker-overlay">
            <div className="picker-card picker-card--rem">
              <div className="picker-top">
                <h3><FaSearch /> Remisiones</h3>
                <button className="picker-close" onClick={() => setPickerRemisionAbierto(false)}><FaTimes /></button>
              </div>
              <input placeholder="Buscar..." value={remisionSearch} onChange={(e)=>setRemisionSearch(e.target.value)} />
              <DataTable columns={remCols} data={remRows} pagination dense highlightOnHover />
            </div>
          </div>
        )}

      </div>

          <ToastContainer />
        </div>
      </div>

      <div className="print-proforma">
        <div className="pf-header">
          <img src={logo} alt="Logo" className="pf-logo" />
          <h2 className="pf-title">Proforma</h2>
        </div>
        <div className="pf-meta">
          <div><strong>Cliente:</strong> {clienteObj?.nombre ?? ""}</div>
          <div><strong>Fecha:</strong> {fecha}</div>
          <div><strong>Moneda:</strong> {moneda === "USD" ? "Dólares (USD)" : "Córdobas (NIO)"}</div>
          <div><strong>Tipo de cambio:</strong> {Number(tipoCambio || 0) > 0 ? Number(tipoCambio).toFixed(4) : "-"}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Numero de parte</th>
              <th>Nombre</th>
              <th className="right">Cantidad</th>
              <th className="right">Precio</th>
              <th className="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {printRows.map((r, i) => (
              <tr key={i}>
                <td>{r.numeroParte}</td>
                <td>{r.nombre}</td>
                <td className="right">{r.cantidad}</td>
                <td className="right">{formatMoney(r.precio, moneda)}</td>
                <td className="right">{formatMoney(r.subtotal, moneda)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pf-total">
          {(() => {
            const tc = Number(tipoCambio || 0);
            const t = Number(totalPrint || 0);
            const totalC = moneda === 'USD' ? (tc>0 ? t*tc : null) : t;
            const totalD = moneda === 'USD' ? t : (tc>0 ? t/tc : null);
            return (
              <div className="box">
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <span>Total C$</span>
                  <strong>{totalC != null ? `C$ ${totalC.toFixed(2)}` : '-'}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                  <span>Total $</span>
                  <strong>{totalD != null ? `$ ${totalD.toFixed(2)}` : '-'}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
};

export default Proforma;
