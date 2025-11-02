// src/pages/Facturacion.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCashRegister, FaPlus, FaTrash, FaPrint, FaSave, FaSearch, FaTimes,
} from "react-icons/fa";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Facturacion.css";

/* ===== Utils ===== */
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

/* ===== Types ===== */
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

/* ===== API URLs ===== */
const API_PRODUCTOS = "http://localhost:4000/api/inventario";
const API_TIPO_CAMBIO = "http://localhost:4000/api/tipo-cambio/latest";
const API_REMISIONES = "http://localhost:4000/api/remision/pendientes";
const API_VENTAS = "http://localhost:4000/api/ventas";
const API_CLIENTES = "http://localhost:4000/api/clientes";

/* ===== Toast helper ===== */
const notify = {
  ok: (m: string) => toast.success(m, { position: "top-right" }),
  warn: (m: string) => toast.warn(m, { position: "top-right" }),
  err: (m: string) => toast.error(m, { position: "top-right" }),
};

/* ===== Component ===== */
const Facturacion: React.FC = () => {
  const [cliente, setCliente] = useState<number | "">("");
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [fecha] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [moneda, setMoneda] = useState<Moneda>("NIO");
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const prevMoneda = useRef<Moneda>("NIO");

  const [productos, setProductos] = useState<Product[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);

  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [pickerRemisionAbierto, setPickerRemisionAbierto] = useState(false);
  const [filaSeleccionRemision, setFilaSeleccionRemision] = useState<string | null>(null);
  const [remisionSearch, setRemisionSearch] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    { id: cryptoId(), producto: "", cantidad: 1, precio: 0 },
  ]);

  const [tipoPago, setTipoPago] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [plazoDias, setPlazoDias] = useState<number>(0);

  /* ===== Fetch ===== */
  useEffect(() => {
    fetch(API_CLIENTES, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setClientesList(Array.isArray(j) ? j : j.data || []))
      .catch(() => setClientesList([]));
  }, []);
  useEffect(() => {
    fetch(API_PRODUCTOS, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setProductos(j.items ?? j.data ?? j ?? []))
      .catch(() => setProductos([]));
  }, []);
  useEffect(() => {
    fetch(API_TIPO_CAMBIO, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setTipoCambio(j.tipoCambio?.valor ?? j.valor ?? null))
      .catch(() => setTipoCambio(null));
  }, []);
  useEffect(() => {
    fetch(API_REMISIONES, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setRemisiones(j.remisiones ?? j.data ?? j ?? []))
      .catch(() => setRemisiones([]));
  }, []);

  /* ===== Helpers ===== */
  const getPrecioProducto = (p: Product, m: Moneda) => {
    const raw =
      m === "USD"
        ? p.precioVentaSugeridoDolar ?? p.precioVentaPromedioDolar ?? 0
        : p.precioVentaSugeridoCordoba ?? p.precioVentaPromedioCordoba ?? 0;
    return Number(raw) || 0;
  };

  /* ===== Product filter ===== */
  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      [p.nombre, p.numeroParte, p.descripcion].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [busqueda, productos]);

  /* ===== Product table columns ===== */
  const columnasProductos: TableColumn<Product>[] = [
    { name: "N° Parte", selector: (r) => r.numeroParte ?? "", sortable: true,
      cell: (r) => <span className="center-cell">{r.numeroParte ?? ""}</span> },
    { name: "Nombre", selector: (r) => r.nombre ?? "", sortable: true,
      cell: (r) => <span className="center-cell">{r.nombre ?? ""}</span> },
    {
      name: "Precio",
      selector: (r) => getPrecioProducto(r, moneda),
      sortable: true,
      cell: (r) => <span className="center-cell">{getPrecioProducto(r, moneda).toFixed(2)}</span>,
    },
    {
      name: "Stock",
      selector: (r) => Number(r.stockActual ?? 0),
      sortable: true,
      cell: (r) => <span className="center-cell">{Number(r.stockActual ?? 0)}</span>,
    },
  ];

  /* ===== Totals ===== */
  const total = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0),
    [items]
  );

  /* ===== Currency sync ===== */
  useEffect(() => {
    if (prevMoneda.current === moneda) return;
    if (!tipoCambio || tipoCambio <= 0) {
      prevMoneda.current = moneda;
      return;
    }
    setItems((curr) =>
      curr.map((it) => {
        if (it.esRemision) return it;
        const p = Number(it.precio) || 0;
        const converted =
          prevMoneda.current === "NIO" && moneda === "USD" ? p / tipoCambio : p * tipoCambio;
        return { ...it, precio: Number(converted.toFixed(4)) };
      })
    );
    prevMoneda.current = moneda;
  }, [moneda, tipoCambio]);

  /* ===== Actions ===== */
  function addRow() {
    setItems((s) => [...s, { id: cryptoId(), producto: "", cantidad: 1, precio: 0 }]);
  }
  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== id) return it;
        const next: LineItem = { ...it, ...patch };
        next.cantidad = Math.max(1, Number(next.cantidad) || 1);
        next.precio = Math.max(0, Number(next.precio) || 0);
        return next;
      })
    );
  }
  function removeRow(id: string) {
    setItems((arr) => (arr.length === 1 ? arr : arr.filter((it) => it.id !== id)));
    notify.ok("Línea eliminada");
  }

  async function guardar() {
    if (cliente === "") return void notify.warn("Seleccione un cliente.");
    const validLines = items.filter((i) => (i.inventarioId ?? null) !== null && (i.cantidad || 0) > 0);
    if (!validLines.length) return void notify.warn("Agregue al menos una línea válida.");
    if (!tipoCambio && moneda === "USD") return void notify.warn("No hay tipo de cambio para convertir a C$.");

    const precioCordoba = (precioActual: number) => {
      if (moneda === "NIO") return precioActual;
      if (!tipoCambio) return 0;
      return Number((precioActual * tipoCambio).toFixed(4));
    };

    const payload = {
      clienteId: Number(cliente),
      fecha,
      moneda,
      tipoPago,
      plazoDias,
      tipoCambioValor: tipoCambio,
      detalles: validLines.map((i) => ({
        inventarioId: i.inventarioId,
        cantidad: i.cantidad,
        precioUnitarioCordoba: precioCordoba(i.precio),
        remisionDetalleId: i.remisionDetalleId ?? null,
      })),
    };

    try {
      const res = await fetch(API_VENTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getCookie("token")}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        notify.err(`Error al guardar venta: ${txt || "solicitud inválida"}`);
        return;
      }

      notify.ok("✅ Venta registrada");
      setTimeout(() => window.location.reload(), 800);
    } catch {
      notify.err("Error de red al guardar venta");
    }
  }

  /* ===== Remisión DataTable ===== */
  type RemRow = {
    remisionId: number;
    fecha: string;
    cliente: string;
    detalleId: number;
    producto: string;
    cantidad: number;
    precio: number;
    inventarioId: number;
    numeroParte?: string;
    yaAgregado: boolean;
  };

  const usedRemisionIds = useMemo(() => {
    const s = new Set<number>();
    for (const it of items) {
      if (typeof it.remisionDetalleId === "number") s.add(it.remisionDetalleId);
    }
    return s;
  }, [items]);

  const remisionRows: RemRow[] = useMemo(() => {
    const clienteId = typeof cliente === "number" ? cliente : -1;
    const list = remisiones
      .filter((r) => r.clienteId === clienteId)
      .flatMap((r) => {
        const c = clientesList.find((cl) => cl.id === r.clienteId);
        return r.detalles
          .filter((d) => !d.facturado)
          .map<RemRow>((d) => {
            const precio =
              moneda === "USD"
                ? Number(d.inventario.precioVentaSugeridoDolar ?? 0) || 0
                : Number(d.inventario.precioVentaSugeridoCordoba ?? 0) || 0;
            return {
              remisionId: r.id,
              fecha: r.fecha ? new Date(r.fecha).toLocaleDateString() : "—",
              cliente: c?.nombre ?? "—",
              detalleId: d.id,
              producto: `${d.inventario.numeroParte ?? ""} — ${d.inventario.nombre ?? ""}`,
              cantidad: d.cantidad,
              precio,
              inventarioId: d.inventario.id,
              numeroParte: d.inventario.numeroParte,
              yaAgregado: usedRemisionIds.has(d.id),
            };
          });
      });

    const q = remisionSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (row) =>
        row.remisionId.toString().includes(q) ||
        row.cliente.toLowerCase().includes(q) ||
        (row.numeroParte ?? "").toLowerCase().includes(q) ||
        row.producto.toLowerCase().includes(q)
    );
  }, [remisiones, clientesList, cliente, moneda, remisionSearch, usedRemisionIds]);

  const remisionColumns: TableColumn<RemRow>[] = [
    { name: "Remisión", selector: (r) => r.remisionId, sortable: true,
      cell: (r) => <span style={{ fontWeight: 600 }}>#{r.remisionId}</span>, width: "120px" },
    { name: "Producto", selector: (r) => r.producto, sortable: true, grow: 2,
      cell: (r) => <span className="center-cell">{r.producto}</span> },
    { name: "Cant.", selector: (r) => r.cantidad, sortable: true,
      cell: (r) => <span className="center-cell">{r.cantidad}</span>, width: "100px" },
    { name: "Precio", selector: (r) => r.precio, sortable: true,
      cell: (r) => <span className="center-cell">{formatMoney(r.precio, moneda)}</span>, width: "140px" },
    {
      name: "Seleccionar",
      cell: (r) => (
        <button
          className={`sel-btn${r.yaAgregado ? " disabled" : ""}`}
          onClick={() => {
            if (!filaSeleccionRemision) return;
            if (r.yaAgregado) {
              notify.warn("Ese detalle de remisión ya fue agregado.");
              return;
            }
            updateItem(filaSeleccionRemision, {
              producto: r.producto,
              cantidad: r.cantidad,
              precio: r.precio,
              inventarioId: r.inventarioId,
              remisionDetalleId: r.detalleId,
              esRemision: true,
            });
            setPickerRemisionAbierto(false);
            notify.ok("Línea de remisión agregada");
          }}
          title={r.yaAgregado ? "Ya agregado" : `Usar #${r.remisionId}`}
        >
          ✅
        </button>
      ),
      ignoreRowClick: true,
      button: true,
      width: "130px",
    },
  ];

  /* ===== UI ===== */
  return (
    <div className="fact-page">
      <header className="fact-header">
        <FaCashRegister className="icon" />
        <div><h1>Facturación</h1></div>
      </header>

      <div className="fact-content">
        <div className="card">
          <div className="grid-3">
            <label>
              Cliente
              <select
                value={cliente}
                onChange={(e) => setCliente(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">Seleccione cliente...</option>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>

            <label>
              Moneda
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                disabled={!tipoCambio}
                title={!tipoCambio ? "Requiere tipo de cambio" : ""}
              >
                <option value="NIO">Córdobas (NIO)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </label>

            <label>
              Fecha
              <input type="date" value={fecha} readOnly />
            </label>
          </div>

          <div className="grid-3">
            <label>
              Tipo de pago
              <select value={tipoPago} onChange={(e) => setTipoPago(e.target.value as any)}>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </label>
            <label>
              Plazo (días)
              <input
                type="number"
                min={0}
                value={plazoDias}
                onChange={(e) => setPlazoDias(Math.max(0, Number(e.target.value) || 0))}
                disabled={tipoPago !== "CREDITO"}
              />
            </label>
            <label>
              Tipo de cambio
              <input type="number" value={tipoCambio ?? 0} readOnly />
            </label>
          </div>

          <div className="items-container">
            <div className="items-header">
              <span>Producto</span><span>Cant</span><span>Precio</span><span>Rem.</span><span>-</span>
            </div>

            {items.map((it) => (
              <div className="item-row" key={it.id}>
                <div style={{ display: "flex", gap: ".3rem" }}>
                  <input
                    type="text"
                    value={it.producto}
                    disabled={it.esRemision}
                    placeholder="Buscar..."
                    onChange={(e) => updateItem(it.id, { producto: e.target.value })}
                  />
                  <button
                    className="icon-btn"
                    onClick={() => {
                      if (cliente === "") {
                        notify.warn("Seleccione un cliente primero.");
                        return;
                      }
                      setPickerTargetId(it.id);
                      setPickerAbierto(true);
                    }}
                    title="Buscar producto"
                  >
                    <FaSearch />
                  </button>
                </div>

                <input
                  className="qty-input"
                  type="number"
                  min={1}
                  disabled={it.esRemision}
                  value={it.cantidad}
                  onChange={(e) => updateItem(it.id, { cantidad: Number(e.target.value) })}
                />

                <input
                  className="price-input"
                  type="number"
                  min={0}
                  step={0.01}
                  disabled={it.esRemision}
                  value={it.precio}
                  onChange={(e) => updateItem(it.id, { precio: Number(e.target.value) })}
                />

                <div className="center">
                  <input
                    type="checkbox"
                    checked={!!it.esRemision}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (cliente === "") {
                          notify.warn("Seleccione un cliente para ver remisiones.");
                          return;
                        }
                        setFilaSeleccionRemision(it.id);
                        setPickerRemisionAbierto(true);
                      } else {
                        updateItem(it.id, { esRemision: false, remisionDetalleId: null });
                        notify.ok("Línea convertida a producto libre");
                      }
                    }}
                  />
                </div>

                <button className="danger icon-btn" onClick={() => removeRow(it.id)} title="Eliminar línea">
                  <FaTrash />
                </button>
              </div>
            ))}

            <button onClick={addRow}><FaPlus /> Agregar línea</button>
          </div>
        </div>

        <div className="resumen">
          <div></div>
          <div className="right">
            <div className="row total">
              <span>Total</span>
              <b>{formatMoney(total, moneda)}</b>
            </div>
          </div>
        </div>

        <div className="actions">
          <button className="primary" onClick={guardar}><FaSave /> Guardar</button>
          <button className="ghost" onClick={() => window.print()}><FaPrint /> Imprimir</button>
        </div>

        {/* Modal Productos */}
        {pickerAbierto && (
          <div className="picker-overlay" role="dialog" aria-modal="true">
            <div className="picker-card">
              <div className="picker-top">
                <h3 className="picker-title"><FaSearch /> Productos</h3>
                <button className="picker-close" onClick={() => setPickerAbierto(false)}><FaTimes /></button>
              </div>

              <input placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />

              <DataTable
                columns={columnasProductos as any}
                data={productosFiltrados}
                pagination
                highlightOnHover
                pointerOnHover
                customStyles={{
                  headCells: { style: { justifyContent: "center", textAlign: "center" } },
                  cells: { style: { justifyContent: "center", textAlign: "center" } },
                }}
                onRowClicked={(p: Product) => {
                  if (!pickerTargetId) return;
                  const precioSel = getPrecioProducto(p, moneda);
                  updateItem(pickerTargetId, {
                    producto: `${p.numeroParte ?? ""} — ${p.nombre ?? ""}`.trim(),
                    precio: precioSel,
                    inventarioId: Number(p.id),
                    esRemision: false,
                    remisionDetalleId: null
                  });
                  setPickerAbierto(false);
                  setBusqueda("");
                  notify.ok("Producto agregado");
                }}
              />
            </div>
          </div>
        )}

        {/* Modal Remisiones */}
        {pickerRemisionAbierto && (
          <div className="picker-overlay" role="dialog" aria-modal="true">
            <div className="picker-card picker-card--rem">
              <div className="picker-top">
                <h3 className="picker-title"><FaSearch /> Seleccionar Remisión</h3>
                <button className="picker-close" onClick={() => setPickerRemisionAbierto(false)}>
                  <FaTimes />
                </button>
              </div>

              <div style={{ marginBottom: ".6rem" }}>
                <input
                  placeholder="Buscar por remisión, cliente, parte o producto..."
                  value={remisionSearch}
                  onChange={(e) => setRemisionSearch(e.target.value)}
                  style={{ width: "100%", padding: ".6rem .8rem", borderRadius: 8, border: "1px solid var(--input-border)" }}
                />
              </div>

              <DataTable
                columns={remisionColumns as any}
                data={remisionRows}
                pagination
                highlightOnHover
                pointerOnHover
                dense
                noDataComponent="No hay líneas de remisión pendientes para este cliente."
                customStyles={{
                  headCells: { style: { justifyContent: "center", textAlign: "center" } },
                  cells: { style: { justifyContent: "center", textAlign: "center" } },
                }}
              />
            </div>
          </div>
        )}
      </div>

      <ToastContainer newestOnTop closeOnClick pauseOnHover draggable />
    </div>
  );
};

export default Facturacion;
