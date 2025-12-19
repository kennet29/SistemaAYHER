import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaFileAlt,
  FaCheckCircle,
  FaDownload,
  FaUndo,
  FaSearch,
  FaTimes,
  FaHistory,
} from "react-icons/fa";
import "./Devoluciones.css";
import { buildApiUrl } from "../api/constants";

const API_DEVOLUCIONES = buildApiUrl("/devoluciones/venta");
const DEFAULT_CONCEPTO = "Se procedio a la devolucion de item";
const API_CLIENTES = buildApiUrl("/clientes");
const API_VENTAS = buildApiUrl("/ventas");
const ITEMS_PER_PAGE = 14;

type Cliente = {
  id: number;
  nombre?: string;
  empresa?: string;
};

type Venta = {
  id: number;
  numeroFactura?: string | null;
  cliente?: { nombre?: string | null; empresa?: string | null } | null;
  detalles?: any[];
};

type DevolucionDetalle = {
  inventarioId: number;
  cantidad: number;
  precioUnitarioCordoba: number;
  nombre?: string;
  marca?: string;
};

type NotaCredito = {
  numero: string;
  fecha: string;
  cliente: string;
  ventaId: number;
  observacion?: string;
  total: number;
  detalles: DevolucionDetalle[];
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const stripAccents = (text: string) =>
  (text || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export default function Devoluciones() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busquedaModal, setBusquedaModal] = useState("");
  const [form, setForm] = useState({ ventaId: "", cliente: "", concepto: DEFAULT_CONCEPTO, observaciones: "" });
  const [detalles, setDetalles] = useState<DevolucionDetalle[]>([]);
  const [detalleDraft, setDetalleDraft] = useState({
    inventarioId: "",
    cantidad: 1,
    precioUnitarioCordoba: 0,
  });
  const [notaCredito, setNotaCredito] = useState<NotaCredito | null>(null);
  const [lastDevId, setLastDevId] = useState<number | null>(null);
  const [mostrarModalBusqueda, setMostrarModalBusqueda] = useState(false);

  const getConsecutivoInfo = (venta?: Venta | null) => {
    if (!venta) {
      return { label: "Sin factura", paginas: 1, numeroFinal: null as string | null };
    }
    const numeroFactura = venta.numeroFactura?.toString().trim();
    const paginas = Math.max(
      1,
      Math.ceil((venta.detalles?.length ?? 0) / ITEMS_PER_PAGE)
    );
    const numeroInicial = numeroFactura ? parseInt(numeroFactura, 10) : NaN;
    const numeroFinal =
      numeroFactura && !Number.isNaN(numeroInicial) && paginas > 1
        ? (numeroInicial + paginas - 1).toString().padStart(numeroFactura.length, "0")
        : null;
    const label = numeroFactura
      ? numeroFinal
        ? `${numeroFactura} - ${numeroFinal}`
        : numeroFactura
      : "Sin factura";
    return { label, paginas, numeroFinal };
  };

  const selectedVenta = useMemo(
    () => ventas.find((v) => v.id === Number(form.ventaId)),
    [ventas, form.ventaId]
  );

  const ventaItems = useMemo(() => {
    if (!selectedVenta?.detalles?.length) return [];
    const map = new Map<
      number,
      { inventarioId: number; nombre: string; precio: number; marca?: string; cantidad: number }
    >();
    for (const d of selectedVenta.detalles) {
      const invId = d?.inventarioId || d?.inventario?.id;
      if (!invId) continue;
      const nombre =
        d?.inventario?.nombre ||
        d?.producto?.nombre ||
        d?.inventario?.numeroParte ||
        `Articulo ${invId}`;
      const marca =
        d?.inventario?.marca?.nombre ||
        d?.inventario?.marcaNombre ||
        (d?.inventario?.marcaId ? `Marca ${d?.inventario?.marcaId}` : undefined);
      const precio =
        Number(d?.precioUnitarioCordoba ?? d?.precioUnitario ?? d?.precio ?? 0) >= 0
          ? Number(d?.precioUnitarioCordoba ?? d?.precioUnitario ?? d?.precio ?? 0)
          : 0;
      const cantidad = Number(d?.cantidad ?? d?.cant ?? d?.unidades ?? 0);
      const existing = map.get(invId);
      if (existing) {
        map.set(invId, {
          ...existing,
          cantidad: existing.cantidad + cantidad,
          precio: existing.precio || precio,
          marca: existing.marca || marca,
        });
      } else {
        map.set(invId, { inventarioId: Number(invId), nombre, precio, marca, cantidad });
      }
    }
    return Array.from(map.values());
  }, [selectedVenta]);

  const ventasFiltradas = useMemo(() => {
    const q = busquedaModal.trim().toLowerCase();
    return ventas.filter((v) => {
      const clienteNombre =
        (v.cliente as any)?.empresa ||
        v.cliente?.nombre ||
        (v.cliente as any)?.nombreContacto ||
        "";
      const consecutivo = getConsecutivoInfo(v);
      if (!q) return true;
      return (
        v.id.toString().includes(q) ||
        (v.numeroFactura ?? "").toLowerCase().includes(q) ||
        (consecutivo.numeroFinal ?? "").toLowerCase().includes(q) ||
        clienteNombre.toLowerCase().includes(q)
      );
    });
  }, [ventas, busquedaModal]);

  const ventaOptions = useMemo(() => {
    if (selectedVenta && !ventasFiltradas.some((v) => v.id === selectedVenta.id)) {
      return [selectedVenta, ...ventasFiltradas];
    }
    return ventasFiltradas;
  }, [ventasFiltradas, selectedVenta]);

  const totalCredito = useMemo(
    () =>
      detalles.reduce(
        (sum, d) => sum + Number(d.cantidad || 0) * Number(d.precioUnitarioCordoba || 0),
        0
      ),
    [detalles]
  );

  useEffect(() => {
    const token = getCookie("token") || localStorage.getItem("token") || "";
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    setLoading(true);

    Promise.all([
      fetch(API_CLIENTES, { headers }).then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch(API_VENTAS, { headers }).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([cli, ven]) => {
        setClientes(cli?.clientes ?? cli?.data ?? cli ?? []);
        setVentas(ven?.ventas ?? ven?.data ?? ven ?? []);
      })
      .catch(() => {
        toast.error("No se pudieron cargar los datos base");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedVenta) return;
    const nombreCliente =
      (selectedVenta.cliente as any)?.empresa ||
      selectedVenta.cliente?.nombre ||
      (selectedVenta.cliente as any)?.nombreContacto ||
      "";

    if (!form.cliente && nombreCliente) {
      setForm((prev) => ({ ...prev, cliente: nombreCliente }));
    }

    setDetalles([]);
    setDetalleDraft({ inventarioId: "", cantidad: 1, precioUnitarioCordoba: 0 });
  }, [selectedVenta]);

  const findInventarioName = (id: number) => {
    const ventaItem = ventaItems.find((i) => i.inventarioId === id);
    if (ventaItem) return ventaItem.nombre;
    return `Articulo ${id}`;
  };

  const getDisponible = (id: number) => {
    const ventaItem = ventaItems.find((i) => i.inventarioId === id);
    if (!ventaItem) return 0;
    const yaCargado = detalles.find((d) => d.inventarioId === id)?.cantidad ?? 0;
    const disponible = Number(ventaItem.cantidad || 0) - Number(yaCargado || 0);
    return disponible;
  };

  const handleSelectInventario = (value: string) => {
    const invId = Number(value);
    const item = ventaItems.find((i) => i.inventarioId === invId);
    const precioSugerido = item?.precio ?? 0;

    setDetalleDraft((prev) => ({
      ...prev,
      inventarioId: value,
      cantidad: 1,
      precioUnitarioCordoba: precioSugerido,
    }));
  };

  const addDetalle = () => {
    const invId = Number(detalleDraft.inventarioId);
    const cantidad = Number(detalleDraft.cantidad);
    const precio = Number(detalleDraft.precioUnitarioCordoba);

    if (!selectedVenta) return toast.error("Primero selecciona la venta original");
    if (!invId) return toast.error("Selecciona el articulo devuelto");
    const ventaItem = ventaItems.find((i) => i.inventarioId === invId);
    if (!ventaItem) return toast.error("Solo puedes devolver articulos de la factura seleccionada");
    if (cantidad <= 0) return toast.error("La cantidad debe ser mayor a cero");
    if (precio < 0) return toast.error("El precio no puede ser negativo");

    const maxDisponible = getDisponible(invId);
    if (maxDisponible <= 0) {
      return toast.error("Ya devolviste el maximo permitido de este articulo");
    }
    if (cantidad > maxDisponible) {
      return toast.error(`Solo puedes devolver ${maxDisponible} unidades de este articulo`);
    }

    const nombre = ventaItem.nombre || findInventarioName(invId);
    const precioUnitario = precio > 0 ? precio : ventaItem.precio;
    const marca = ventaItem.marca;

    setDetalles((prev) => {
      const existing = prev.find((d) => d.inventarioId === invId);
      if (existing) {
        return prev.map((d) =>
          d.inventarioId === invId
            ? {
                ...d,
                cantidad: d.cantidad + cantidad,
                precioUnitarioCordoba: precioUnitario,
                marca: marca ?? d.marca,
              }
            : d
        );
      }
      return [
        ...prev,
        {
          inventarioId: invId,
          cantidad,
          precioUnitarioCordoba: precioUnitario,
          nombre,
          marca,
        },
      ];
    });

    setDetalleDraft({ inventarioId: "", cantidad: 1, precioUnitarioCordoba: 0 });
  };

  const removeDetalle = (id: number) => {
    setDetalles((prev) => prev.filter((d) => d.inventarioId !== id));
  };

  const imprimirNotaDesdeBackend = async (id: number) => {
    try {
      const headers = { Authorization: `Bearer ${getCookie("token") || localStorage.getItem("token") || ""}` };
      const resp = await fetch(buildApiUrl(`/devoluciones/venta/${id}/pdf`), { headers });
      if (!resp.ok) throw new Error("No se pudo generar la nota");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Error al descargar la nota de crÃ©dito");
    }
  };

  const handleSubmit = async () => {
    if (!form.ventaId) return toast.error("Selecciona la venta original");
    if (detalles.length === 0) return toast.error("Agrega al menos un articulo devuelto");

    const clienteNombreForm =
      form.cliente ||
      (selectedVenta?.cliente as any)?.empresa ||
      selectedVenta?.cliente?.nombre ||
      (selectedVenta?.cliente as any)?.nombreContacto ||
      "";

    const payload = {
      ventaId: Number(form.ventaId),
      cliente: clienteNombreForm || undefined,
      concepto: stripAccents((form.concepto || DEFAULT_CONCEPTO).trim()) || DEFAULT_CONCEPTO,
      observaciones: form.observaciones?.trim() || undefined,
      usuario: getCookie("user") || undefined,
      detalles: detalles.map((d) => ({
        inventarioId: Number(d.inventarioId),
        cantidad: Number(d.cantidad),
        precioUnitarioCordoba: Number(d.precioUnitarioCordoba),
      })),
    };

    const invalid = payload.detalles.some(
      (d) => !d.inventarioId || d.cantidad <= 0 || d.precioUnitarioCordoba < 0
    );
    if (invalid) {
      return toast.error("Revisa cantidades y precios antes de guardar");
    }

    const idsVenta = new Set(ventaItems.map((i) => i.inventarioId));
    const fueraDeVenta = payload.detalles.find((d) => !idsVenta.has(d.inventarioId));
    if (fueraDeVenta) {
      return toast.error("Solo puedes devolver articulos que vienen en la factura seleccionada");
    }
    const mapVentaCant = new Map<number, number>();
    ventaItems.forEach((i) => mapVentaCant.set(i.inventarioId, Number(i.cantidad || 0)));
    const excedido = payload.detalles.find((d) => {
      const max = mapVentaCant.get(d.inventarioId) ?? 0;
      return d.cantidad > max;
    });
    if (excedido) {
      return toast.error("No puedes devolver mÃ¡s cantidad de la que se vendiÃ³ en la factura");
    }

    setSaving(true);
    try {
      const res = await fetch(API_DEVOLUCIONES, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token") || localStorage.getItem("token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No se pudo registrar la devolucion");
      }

      const data = await res.json().catch(() => ({}));
      const devId = data?.devolucionVenta?.id;
      const clienteNombre = clienteNombreForm || "Cliente";
      const nota: NotaCredito = {
        numero: devId ? `NC-${String(devId).padStart(6, "0")}` : `NC-${Date.now()}`,
        fecha: new Date().toISOString(),
        cliente: clienteNombre,
        ventaId: payload.ventaId,
        observacion: payload.concepto,
        total: totalCredito,
        detalles: detalles.map((d) => ({ ...d })),
      };

      setNotaCredito(nota);
      setLastDevId(devId ?? null);
      toast.success("Devolucion registrada y nota de credito generada");
      if (devId) {
        imprimirNotaDesdeBackend(devId);
      }
      setForm({ ventaId: "", cliente: "", concepto: DEFAULT_CONCEPTO, observaciones: "" });
      setDetalles([]);
      setDetalleDraft({ inventarioId: "", cantidad: 1, precioUnitarioCordoba: 0 });
    } catch (error: any) {
      toast.error(error?.message || "Error al guardar la devolucion");
    } finally {
      setSaving(false);
    }
  };

    const imprimirNota = () => {
    if (lastDevId) {
      imprimirNotaDesdeBackend(lastDevId);
      return;
    }
    toast.error("No se encontró la devolución para imprimir el PDF");
  };

  const ventaLabel = (venta: Venta) => {
    const clienteNombre =
      (venta.cliente as any)?.empresa ||
      venta.cliente?.nombre ||
      (venta.cliente as any)?.nombreContacto ||
      "Cliente";
    const consecutivo = getConsecutivoInfo(venta);
    const factura = venta.numeroFactura ? `Factura ${consecutivo.label}` : "Sin factura";
    const extras =
      venta.numeroFactura && consecutivo.paginas > 1
        ? ` (${consecutivo.paginas} consecutivos)`
        : "";
    return `#${venta.id} - ${factura}${extras} - ${clienteNombre}`;
  };

  return (
      <div className="devoluciones-page">
       <ToastContainer position="top-center" autoClose={2200} />

       {mostrarModalBusqueda && (
         <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setMostrarModalBusqueda(false)}>
           <div className="modal-card wide">
             <div className="modal-head">
               <div>
                 <p className="eyebrow">Buscar venta</p>
                 <h3>Selecciona una venta</h3>
               </div>
               <button className="ghost-btn" onClick={() => setMostrarModalBusqueda(false)}>
                 <FaTimes />
               </button>
             </div>

             <div className="modal-body">
               <label className="field">
                 <span>Filtrar</span>
                 <input
                   placeholder="ID, factura o cliente"
                   value={busquedaModal}
                   onChange={(e) => setBusquedaModal(e.target.value)}
                 />
               </label>
               <div className="tabla-wrapper" style={{ maxHeight: "50vh", overflow: "auto" }}>
                 <table className="detalles-table">
                   <thead>
                     <tr>
                       <th>ID</th>
                       <th>Factura / Consecutivo</th>
                       <th>Cliente</th>
                       <th></th>
                     </tr>
                   </thead>
                   <tbody>
                     {ventasFiltradas.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="empty">No hay ventas</td>
                       </tr>
                     ) : (
                       ventasFiltradas.map((v) => {
                         const clienteNombre =
                           (v.cliente as any)?.empresa ||
                           v.cliente?.nombre ||
                           (v.cliente as any)?.nombreContacto ||
                           "Cliente";
                         const consecutivo = getConsecutivoInfo(v);
                         return (
                           <tr key={v.id}>
                             <td>#{v.id}</td>
                             <td>
                               <div className="consecutivo-cell">
                                 <span>{consecutivo.label}</span>
                                 {consecutivo.paginas > 1 && (
                                   <span className="consecutivo-pill">
                                     {consecutivo.paginas} consecutivos
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td>{clienteNombre}</td>
                             <td>
                               <button
                                 className="primary-btn"
                                 onClick={() => {
                                   setForm((prev) => ({ ...prev, ventaId: String(v.id) }));
                                   setBusquedaModal("");
                                   setMostrarModalBusqueda(false);
                                 }}
                               >
                                 Seleccionar
                               </button>
                             </td>
                           </tr>
                         );
                       })
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           </div>
         </div>
       )}

      <div className="top-bar">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <FaArrowLeft /> Volver
        </button>
        <div className="title">
          <div className="title-icon">
            <FaUndo />
          </div>
          <div>
            <h1>Devoluciones de clientes</h1>
            <p>Registra devoluciones, genera la nota de credito y repone el inventario.</p>
          </div>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate("/devoluciones/historico")}
          title="Ir al historico de devoluciones"
        >
          <FaHistory /> Historico de devoluciones
        </button>
        <div className="mini-metrics">
          <span>{clientes.length} clientes</span>
          <span>{ventas.length} ventas</span>
          <span>{ventaItems.length} items de la venta</span>
        </div>
      </div>

      <div className="content-grid">
        <section className="panel form-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Paso 1</p>
              <h2>Datos de la devolucion</h2>
            </div>
            <span className="pill">{loading ? "Cargando..." : "Listo"}</span>
          </header>

          <div className="form-grid">
            <label className="field">
              <span>Seleccionar venta</span>
              <div className="search-row">
                <input
                  placeholder="Haz clic en buscar para elegir la venta"
                  value={form.ventaId ? ventaLabel(selectedVenta as any) : ""}
                  readOnly
                />
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setMostrarModalBusqueda(true)}
                >
                  <FaSearch /> Buscar
                </button>
              </div>
            </label>

            <label className="field">
              <span>Venta original</span>
              <select
                value={form.ventaId}
                onChange={(e) => setForm((prev) => ({ ...prev, ventaId: e.target.value }))}
              >
                <option value="">Selecciona venta</option>
                {ventaOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {ventaLabel(v)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Cliente</span>
              <select
                value={form.cliente}
                disabled={!!form.ventaId}
                onChange={(e) => setForm((prev) => ({ ...prev, cliente: e.target.value }))}
              >
                <option value="">Selecciona cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.nombre || c.empresa || ""}>
                    {c.nombre || c.empresa || `Cliente ${c.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="field full">
              <span>Concepto</span>
              <textarea
                rows={2}
                placeholder="Ej: Se procedio a la devolucion de item"
                value={form.concepto}
                onChange={(e) => setForm((prev) => ({ ...prev, concepto: stripAccents(e.target.value) }))}
              />
            </label>
            <label className="field full">
              <span>Observaciones</span>
              <textarea
                rows={2}
                placeholder="Observaciones adicionales"
                value={form.observaciones}
                onChange={(e) => setForm((prev) => ({ ...prev, observaciones: e.target.value }))}
              />
            </label>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Paso 2</p>
              <h2>Articulos devueltos</h2>
            </div>
            <span className="pill pill-neutral">{detalles.length} agregados</span>
          </header>

          <div className="detalle-form">
            <label className="field">
              <span>Articulo</span>
              <select
                value={detalleDraft.inventarioId}
                onChange={(e) => handleSelectInventario(e.target.value)}
              >
                <option value="">Selecciona articulo de la venta</option>
                {ventaItems.map((i) => (
                  <option key={i.inventarioId} value={i.inventarioId}>
                    {i.nombre} {i.marca ? `(${i.marca})` : ""} - C$ {Number(i.precio).toFixed(2)}
                    {i.cantidad ? ` | Vendidos: ${i.cantidad}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Cantidad</span>
              <input
                type="number"
                min={1}
                max={
                  detalleDraft.inventarioId
                    ? Math.max(0, getDisponible(Number(detalleDraft.inventarioId)))
                    : undefined
                }
                value={detalleDraft.cantidad}
                onChange={(e) =>
                  setDetalleDraft((prev) => ({ ...prev, cantidad: Number(e.target.value) }))
                }
              />
            </label>

            <label className="field">
              <span>Precio unitario (C$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={detalleDraft.precioUnitarioCordoba}
                onChange={(e) =>
                  setDetalleDraft((prev) => ({
                    ...prev,
                    precioUnitarioCordoba: Number(e.target.value),
                  }))
                }
              />
            </label>

            <button className="add-btn" type="button" onClick={addDetalle}>
              <FaPlus /> Agregar
            </button>
          </div>

          <div className="tabla-wrapper">
            <table className="detalles-table">
              <thead>
                <tr>
                  <th>Articulo devuelto</th>
                  <th>Marca</th>
                  <th>Cantidad</th>
                  <th>Precio (C$)</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {detalles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No hay articulos agregados
                    </td>
                  </tr>
                ) : (
                  detalles.map((d) => (
                    <tr key={d.inventarioId}>
                      <td>{d.nombre || findInventarioName(d.inventarioId)}</td>
                      <td>{d.marca || "-"}</td>
                      <td>{d.cantidad}</td>
                      <td>C$ {Number(d.precioUnitarioCordoba).toFixed(2)}</td>
                      <td>C$ {(Number(d.precioUnitarioCordoba) * Number(d.cantidad)).toFixed(2)}</td>
                      <td>
                        <button className="ghost-btn" onClick={() => removeDetalle(d.inventarioId)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="totals">
            <div>
              <p>Total credito</p>
              <strong>C$ {totalCredito.toFixed(2)}</strong>
            </div>
            <button className="primary-btn" disabled={saving} onClick={handleSubmit}>
              {saving ? "Guardando..." : "Guardar devolucion"}
            </button>
          </div>
        </section>

        <section className="panel nota-panel">
          <header className="panel-header">
            <div>
              <p className="eyebrow">Paso 3</p>
              <h2>Nota de credito</h2>
            </div>
            <FaFileAlt />
          </header>

          {notaCredito ? (
            <div className="nota-card">
              <div className="nota-head">
                <div>
                  <p className="eyebrow">Generada</p>
                  <h3>{notaCredito.numero}</h3>
                </div>
                <FaCheckCircle color="#16a34a" />
              </div>
              <div className="nota-body">
                <div className="nota-row">
                  <span>Cliente</span>
                  <strong>{notaCredito.cliente}</strong>
                </div>
                <div className="nota-row">
                  <span>Venta original</span>
                  <strong>#{notaCredito.ventaId}</strong>
                </div>
                <div className="nota-row">
                  <span>Observacion</span>
                  <strong>{notaCredito.observacion || "-"}</strong>
                </div>
                <div className="nota-row">
                  <span>Fecha</span>
                  <strong>{new Date(notaCredito.fecha).toLocaleString()}</strong>
                </div>
              <div className="nota-row total">
                <span>Total credito</span>
                <strong>C$ {notaCredito.total.toFixed(2)}</strong>
              </div>
            </div>
            <button className="primary-btn ghost" onClick={imprimirNota}>
              <FaDownload /> Imprimir nota (PDF)
            </button>
          </div>
        ) : (
          <div className="nota-empty">
              <FaFileAlt />
              <p>Guarda la devolucion para generar la nota de credito.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
