// src/pages/Facturacion.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCashRegister, FaPlus, FaTrash, FaSave, FaSearch, FaTimes,
  FaFileInvoiceDollar, FaClipboardList, FaHistory, FaUndo,
} from "react-icons/fa";
import DataTable from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Facturacion.css";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../api/constants";

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
  return `${symbol} ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ===== Types ===== */
type LineItem = {
  id: string;
  producto: string;
  cantidad: number;
  precio: number;
  precioBaseNIO?: number;
  esRemision?: boolean;
  remisionDetalleId?: number | null;
  inventarioId?: number | null;
  codigoFacturar?: string | null;
};
type Moneda = "NIO" | "USD";
type Product = {
  id: number;
  nombre?: string;
  numeroParte?: string;
  descripcion?: string;
  stockActual?: number | string;
  codigoSustituto?: string | null;
  precioVentaSugeridoCordoba?: number | string;
  precioVentaSugeridoDolar?: number | string;
  precioVentaPromedioCordoba?: number | string;
  precioVentaPromedioDolar?: number | string;
  marca?: { id: number; nombre: string };
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

const API_PRODUCTOS = buildApiUrl("/inventario");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");
const API_REMISIONES = buildApiUrl("/remision/pendientes");
const API_VENTAS = buildApiUrl("/ventas");
const API_CLIENTES = buildApiUrl("/clientes");
const API_COTIZACIONES = buildApiUrl("/cotizaciones/recientes");

/* ===== Toast helper ===== */
const notify = {
  ok: (m: string) => toast.success(m, { position: "top-right" }),
  warn: (m: string) => toast.warn(m, { position: "top-right" }),
  err: (m: string) => toast.error(m, { position: "top-right" }),
};

/* ===== Component ===== */
const Facturacion: React.FC = () => {
  const navigate = useNavigate();

  const [cliente, setCliente] = useState<number | "">("");
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [fecha, setFecha] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

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
  const [productosRecientes, setProductosRecientes] = useState<Map<number, { clienteNombre: string; clienteEmpresa: string; fecha: string }>>(new Map());

  const [pickerClienteAbierto, setPickerClienteAbierto] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");

  // Evita scroll de fondo cuando los modales est??n abiertos
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prevOverflow = document.body.style.overflow;
    const modalAbierto = pickerAbierto || pickerRemisionAbierto;
    document.body.style.overflow = modalAbierto ? "hidden" : "";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [pickerAbierto, pickerRemisionAbierto]);

  const [items, setItems] = useState<LineItem[]>([
    { id: cryptoId(), producto: "", cantidad: 1, precio: 0, precioBaseNIO: 0, codigoFacturar: null },
  ]);
  const [actualizandoPrecioId, setActualizandoPrecioId] = useState<string | null>(null);
  const [confirmPrecio, setConfirmPrecio] = useState<{ lineId: string; precioNio: number } | null>(null);
  const [pickerSustituto, setPickerSustituto] = useState<{ product: Product; lineId: string } | null>(null);

  const [tipoPago, setTipoPago] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [plazoDias, setPlazoDias] = useState<number>(0);
  const [pio, setPio] = useState("");
  const [numeroFacturaSugerido, setNumeroFacturaSugerido] = useState<string>("");

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
  
  // Obtener el siguiente número de factura sugerido
  useEffect(() => {
    fetch(buildApiUrl('/configuracion/siguiente-numero-factura'), {
      headers: { Authorization: `Bearer ${getCookie("token")}` }
    })
      .then((r) => r.json())
      .then((data) => {
        const siguienteNumero = data.siguienteNumero || 1;
        setNumeroFacturaSugerido(siguienteNumero.toString().padStart(6, '0'));
      })
      .catch(() => setNumeroFacturaSugerido('000001'));
  }, []);

  // Prefill desde proforma (localStorage: facturacionPrefill)
  useEffect(() => {
    const raw = localStorage.getItem("facturacionPrefill");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.clienteId != null && data.clienteId !== "") setCliente(Number(data.clienteId));
      if (typeof data.pio === "string") setPio(data.pio);
      if (data.tipoCambioValor) setTipoCambio(Number(data.tipoCambioValor));
      setMoneda("NIO");
      if (Array.isArray(data.items) && data.items.length) {
        const mapped = data.items.map((it: any) => {
          const labelParte = it.numeroParte ? `${it.numeroParte}` : "";
          const labelNombre = it.nombre ? `${it.nombre}` : "";
          const productoLabel = `${labelParte}${labelParte && labelNombre ? " — " : ""}${labelNombre}`.trim() || (labelParte || labelNombre);
          const precio = Number(it.precioCordoba || 0);
          return {
            id: cryptoId(),
            producto: productoLabel,
            cantidad: Number(it.cantidad || 0),
            precio,
            precioBaseNIO: precio,
            inventarioId: typeof it.inventarioId === "number" ? Number(it.inventarioId) : null,
          } as LineItem;
        });
        if (mapped.length) setItems(mapped);
      }
    } catch {}
    localStorage.removeItem("facturacionPrefill");
  }, []);

  // Cargar productos cotizados recientemente (global)
  useEffect(() => {
    const token = getCookie("token");
    
    fetch(API_COTIZACIONES, {
      headers: { Authorization: token ? `Bearer ${token}` : "" },
    })
      .then((r) => r.json())
      .then((body) => {
        const recientes = Array.isArray(body?.recientes) ? body.recientes : [];
        const mapa = new Map<number, { clienteNombre: string; clienteEmpresa: string; fecha: string }>();
        const ahora = Date.now();
        const limiteMs = 14 * 24 * 60 * 60 * 1000;
        
        for (const entry of recientes) {
          const invId = Number(entry.inventarioId);
          if (!Number.isFinite(invId)) continue;
          const fechaStr = entry.fecha || "";
          const fechaMs = fechaStr ? new Date(fechaStr).getTime() : NaN;
          if (!Number.isFinite(fechaMs)) continue;
          if (ahora - fechaMs > limiteMs) continue; // más de 14 días, omitir
          
          // Solo guardar la primera (más reciente) cotización de cada producto
          if (!mapa.has(invId)) {
            mapa.set(invId, {
              clienteNombre: entry.cliente?.nombre || "Cliente desconocido",
              clienteEmpresa: entry.cliente?.empresa || "",
              fecha: fechaStr,
            });
          }
        }
        
        setProductosRecientes(mapa);
      })
      .catch(() => setProductosRecientes(new Map()));
  }, []);

  const getPrecioProducto = (p: Product, m: Moneda) => {
    const raw =
      m === "USD"
        ? p.precioVentaSugeridoDolar ?? p.precioVentaPromedioDolar ?? 0
        : p.precioVentaSugeridoCordoba ?? p.precioVentaPromedioCordoba ?? 0;
    return Number(raw) || 0;
  };

  const getStock = (inventarioId?: number | null) => {
    if (!inventarioId && inventarioId !== 0) return Infinity;
    const p = productos.find((x) => Number(x.id) === Number(inventarioId));
    return Number(p?.stockActual ?? 0) || 0;
  };

  const getCantidadUsada = (inventarioId?: number | null, excludeLineId?: string) => {
    if (!inventarioId && inventarioId !== 0) return 0;
    return items
      .filter(
        (it) =>
          it.inventarioId === inventarioId &&
          it.id !== excludeLineId &&
          !it.esRemision // Las líneas de remisión ya salieron de inventario
      )
      .reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  };

  const getPrecioBaseNIO = (line: LineItem) => {
    if (typeof line.precioBaseNIO === "number" && Number.isFinite(line.precioBaseNIO)) {
      return Number(line.precioBaseNIO) || 0;
    }
    const precioNum = Number(line.precio) || 0;
    if (moneda === "USD") {
      if (!tipoCambio || tipoCambio <= 0) return 0;
      return Number((precioNum * tipoCambio).toFixed(4));
    }
    return Number(precioNum.toFixed(4));
  };

  const parseSustitutos = (codigoSustituto?: string | null) =>
    (codigoSustituto || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

  const asignarProductoALinea = (p: Product, targetId: string, codigoOverride?: string) => {
    const stock = Number(p.stockActual ?? 0) || 0;
    if (stock <= 0) {
      notify.warn("Este producto no tiene stock disponible.");
      return;
    }
    const marcaNombre = p.marca?.nombre ? ` · ${p.marca.nombre}` : "";
    const codigoLabel = codigoOverride ?? p.numeroParte ?? "";
    const baseNIO = getPrecioProducto(p, "NIO");
    const precioSel =
      moneda === "USD" ? (tipoCambio ? Number((baseNIO / tipoCambio).toFixed(4)) : 0) : Number(baseNIO.toFixed(4));
    const cantInicial = Math.min(1, stock);
    setItems((prev) =>
      prev.map((it) =>
        it.id === targetId
          ? {
              ...it,
              producto: `${codigoLabel ? `${codigoLabel} — ` : ""}${p.nombre ?? ""}${marcaNombre}`.trim(),
              precio: precioSel,
              precioBaseNIO: Number(baseNIO.toFixed(4)),
              inventarioId: Number(p.id),
              esRemision: false,
              remisionDetalleId: null,
              cantidad: cantInicial,
              codigoFacturar: codigoLabel || p.numeroParte || null,
            }
          : it
      )
    );
    setPickerAbierto(false);
    setBusqueda("");
    setPickerSustituto(null);
    notify.ok("Producto agregado");
  };

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter((p) =>
      [p.nombre, p.numeroParte, p.descripcion, p.codigoSustituto]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q) || parseSustitutos(String(v)).some((c) => c.toLowerCase().includes(q)))
    );
  }, [busqueda, productos]);

  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return clientesList;
    return clientesList.filter((c) =>
      [c.nombre, c.empresa, c.telefono, c.correo].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [busquedaCliente, clientesList]);

  const clienteSeleccionado = useMemo(() => {
    if (cliente === "") return null;
    return clientesList.find((c) => c.id === cliente) || null;
  }, [cliente, clientesList]);

  const total = useMemo(
    () => items.reduce((acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0),
    [items]
  );

  // Totales base en C$ y su equivalente en USD
  const totalCordoba = useMemo(
    () =>
      items.reduce(
        (acc, it) => acc + (Number(it.cantidad) || 0) * (getPrecioBaseNIO(it) || 0),
        0
      ),
    [items, moneda, tipoCambio]
  );

  const totalDolar = useMemo(() => {
    if (!tipoCambio || tipoCambio <= 0) return null;
    return totalCordoba / tipoCambio;
  }, [totalCordoba, tipoCambio]);

  useEffect(() => {
    // Derivar precio mostrado desde base en C$ para evitar acumulación por toggles
    setItems((curr) =>
      curr.map((it) => {
        const base = Number(it.precioBaseNIO ?? it.precio ?? 0) || 0;
        if (moneda === "USD") {
          if (!tipoCambio || tipoCambio <= 0) return it; // select USD está deshabilitado cuando no hay TC
          const shown = Number((base / tipoCambio).toFixed(4));
          return { ...it, precio: shown };
        } else {
          return { ...it, precio: Number(base.toFixed(4)) };
        }
      })
    );
    prevMoneda.current = moneda;
  }, [moneda, tipoCambio]);

  function addRow() {
    setItems((s) => [...s, { id: cryptoId(), producto: "", cantidad: 1, precio: 0, precioBaseNIO: 0 }]);
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((arr) =>
      arr.map((it) => {
        if (it.id !== id) return it;

        let next: LineItem = { ...it, ...patch };
        // Normalizar precio y mantener base en C$
        if (patch.hasOwnProperty("precio")) {
          const precioNum = Math.max(0, Number(next.precio) || 0);
          next.precio = precioNum;
          if (moneda === "USD") {
            if (tipoCambio && tipoCambio > 0) {
              next.precioBaseNIO = Number((precioNum * tipoCambio).toFixed(4));
            }
          } else {
            next.precioBaseNIO = Number(precioNum.toFixed(4));
          }
        }

        if (typeof next.inventarioId === "number" && !next.esRemision) {
          const solicitada = Number(patch.cantidad ?? next.cantidad ?? 0);
          const stock = getStock(next.inventarioId);
          const usadasOtras = getCantidadUsada(next.inventarioId, id);
          const disponibleParaEsta = Math.max(0, stock - usadasOtras);
          const ajustada = Math.min(Math.max(0, solicitada || 0), disponibleParaEsta);

          if (solicitada > ajustada) {
            notify.warn(`Cantidad ajustada a disponible: ${ajustada} (stock: ${stock}, usadas: ${usadasOtras}).`);
          }
          next.cantidad = ajustada;
        } else {
          next.cantidad = Math.max(0, Number(next.cantidad) || 0);
        }
        return next;
      })
    );
  }

  function removeRow(id: string) {
    setItems((arr) => {
      const next = arr.filter((it) => it.id !== id);
      return next.length ? next : [{ id: cryptoId(), producto: "", cantidad: 1, precio: 0, precioBaseNIO: 0 }];
    });
    notify.ok("Línea eliminada");
  }

  async function actualizarPrecioProducto(lineId: string) {
    const linea = items.find((it) => it.id === lineId);
    if (!linea) return;
    if (linea.esRemision) return notify.warn("Las líneas de remisión no permiten actualizar el precio.");
    if (typeof linea.inventarioId !== "number") {
      return notify.warn("Seleccione un producto antes de actualizar su precio en inventario.");
    }
    const baseNio = getPrecioBaseNIO(linea);
    if (!(baseNio > 0)) return notify.warn("Ingrese un precio válido para actualizar.");

    const token = getCookie("token");
    if (!token) return notify.err("Sesión inválida, inicie sesión nuevamente.");

    setActualizandoPrecioId(lineId);
    const precioRedondeado = Number(baseNio.toFixed(4));
    try {
      const res = await fetch(`${API_PRODUCTOS}/${linea.inventarioId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          precioVentaSugeridoCordoba: precioRedondeado,
          precioVentaPromedioCordoba: precioRedondeado,
        }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "No se pudo actualizar el precio");
      }

      const precioUsd = tipoCambio && tipoCambio > 0 ? Number((precioRedondeado / tipoCambio).toFixed(4)) : null;

      setProductos((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(linea.inventarioId)
            ? {
                ...p,
                precioVentaSugeridoCordoba: precioRedondeado,
                precioVentaPromedioCordoba: precioRedondeado,
                precioVentaSugeridoDolar: precioUsd ?? p.precioVentaSugeridoDolar,
                precioVentaPromedioDolar: precioUsd ?? p.precioVentaPromedioDolar,
              }
            : p
        )
      );

      setItems((prev) =>
        prev.map((it) =>
          it.id === lineId
            ? {
                ...it,
                precioBaseNIO: precioRedondeado,
                precio: moneda === "USD" && precioUsd != null ? precioUsd : precioRedondeado,
              }
            : it
        )
      );

      notify.ok("Precio actualizado en inventario");
    } catch (error: any) {
      console.error("No se pudo actualizar precio de inventario", error);
      notify.err(error?.message || "No se pudo actualizar el precio");
    } finally {
      setActualizandoPrecioId(null);
    }
  }
  const solicitarConfirmacionPrecio = (lineId: string) => {
    const linea = items.find((it) => it.id === lineId);
    if (!linea) return;
    const precioNio = getPrecioBaseNIO(linea);
    if (!(precioNio > 0)) return notify.warn("Ingrese un precio válido para actualizar.");
    setConfirmPrecio({ lineId, precioNio });
  };

  async function guardar() {
    if (cliente === "") return void notify.warn("Seleccione un cliente.");
    if (!fecha) return void notify.warn("Seleccione una fecha.");
    const validLines = items.filter((i) => (i.inventarioId ?? null) !== null && (i.cantidad || 0) > 0);
    const token = getCookie("token");
    if (!validLines.length) return void notify.warn("Agregue al menos una línea válida.");
    if (!tipoCambio && moneda === "USD") return void notify.warn("No hay tipo de cambio para convertir a C$.");

    const errores: string[] = [];
    const porProducto = new Map<number, number>();
    for (const l of validLines) {
      if (typeof l.inventarioId !== "number") continue;
      // No validar contra stock las líneas provenientes de remisión
      if (l.remisionDetalleId) continue;
      porProducto.set(l.inventarioId, (porProducto.get(l.inventarioId) || 0) + Number(l.cantidad || 0));
    }
    for (const [invId, cant] of porProducto) {
      const stock = getStock(invId);
      if (cant > stock) {
        const p = productos.find((x) => Number(x.id) === Number(invId));
        const etiqueta = `${p?.numeroParte ?? ""} — ${p?.nombre ?? ""}`.trim() || `#${invId}`;
        errores.push(`${etiqueta}: solicitado ${cant}, stock ${stock}`);
      }
    }
    if (errores.length) {
      notify.err(`No puede facturar más que el stock:\n• ${errores.join("\n• ")}`);
      return;
    }

    const inventarioIds = Array.from(
      new Set(
        validLines
          .map((line) => Number(line.inventarioId))
          .filter((id) => Number.isFinite(id))
      )
    );
        if (inventarioIds.length) {
      try {
        const params = new URLSearchParams();
        params.set("inventarioIds", inventarioIds.join(","));
        params.set("clienteId", String(cliente));
        const resp = await fetch(`${API_COTIZACIONES}?${params.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const body = await resp.json();
          const recientes = Array.isArray(body?.recientes) ? body.recientes : [];
          if (recientes.length) {
            const newestByInventario = new Map<number, typeof recientes[number]>();
            for (const entry of recientes) {
              if (!newestByInventario.has(entry.inventarioId)) {
                newestByInventario.set(entry.inventarioId, entry);
              }
            }
            if (newestByInventario.size) {
              const listado = Array.from(newestByInventario.values())
                .slice(0, 5)
                .map((entry) => {
                  const etiqueta = entry.inventario?.numeroParte
                    ? `${entry.inventario.numeroParte} - ${entry.inventario?.nombre ?? ""}`.trim()
                    : entry.inventario?.nombre ?? `#${entry.inventarioId}`;
                  const fecha = new Date(entry.fecha);
                  const dias = Math.max(
                    0,
                    Math.floor((Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24))
                  );
                  const sufijo = Number.isNaN(dias) ? "" : ` (${dias} ${dias === 1 ? "dia" : "dias"})`;
                  return `${etiqueta}${sufijo}`;
                });
              notify.warn(`Producto(s) cotizado(s) en las ultimas 2 semanas:\n- ${listado.join("\n- ")}`);
            }
          }
        }
      } catch (error) {
        console.warn("No se pudo validar cotizaciones recientes", error);
      }
    }

    const precioCordoba = (precioActual: number, base?: number) => {
      if (typeof base === "number") return Number(base.toFixed(4));
      if (moneda === "NIO") return Number(precioActual.toFixed(4));
      if (!tipoCambio) return 0;
      return Number((precioActual * tipoCambio).toFixed(4));
    };

    const sanitizedPio = (pio || "").trim();
    const payload = {
      clienteId: Number(cliente),
      fecha,
      moneda,
      tipoPago,
      plazoDias,
      tipoCambioValor: tipoCambio,
      numeroFactura: numeroFacturaSugerido,
      detalles: validLines.map((i) => ({
        inventarioId: i.inventarioId,
        cantidad: i.cantidad,
        precioUnitarioCordoba: precioCordoba(i.precio, i.precioBaseNIO),
        remisionDetalleId: i.remisionDetalleId ?? null,
        codigoFacturar: i.codigoFacturar || null,
        numeroParte: i.codigoFacturar || null,
      })),
      pio: sanitizedPio ? sanitizedPio : null,

    };

    try {
      const res = await fetch(API_VENTAS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        notify.err(`Error al guardar venta: ${txt || "solicitud inválida"}`);
        return;
      }

      // Actualizar el consecutivo después de guardar exitosamente
      const numPaginas = Math.ceil(validLines.length / 15);
      const ultimoNumeroUsado = parseInt(numeroFacturaSugerido) + numPaginas - 1;
      
      try {
        await fetch(buildApiUrl('/configuracion/actualizar-numero-factura'), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ ultimoNumero: ultimoNumeroUsado }),
        });
      } catch (error) {
        console.error('Error al actualizar consecutivo:', error);
      }

      notify.ok("? Venta registrada con número de factura: " + numeroFacturaSugerido);
      setTimeout(() => window.location.reload(), 800);
    } catch {
      notify.err("Error de red al guardar venta");
    }
  }

  const usedRemisionIds = useMemo(() => {
    const s = new Set<number>();
    for (const it of items) {
      if (typeof it.remisionDetalleId === "number") s.add(it.remisionDetalleId);
    }
    return s;
  }, [items]);

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
          type="button"
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
              codigoFacturar: r.numeroParte || null,
            });
            setPickerRemisionAbierto(false);
            notify.ok("Línea de remisión agregada");
          }}
          title={r.yaAgregado ? "Ya agregado" : `Usar #${r.remisionId}`}
        >
          <FaPlus />
        </button>
      ),
      ignoreRowClick: true,
      button: true,
      width: "130px",
    },
  ];

  /* ===== UI ===== */
  return (
    <div className="view-container">
      <div className="fact-page facturacion-page">
      <header className="fact-header">
        <button className="back-btn" title="Volver" onClick={() => navigate("/home")}>Volver</button>
        <FaCashRegister className="icon" />
        <div><h1>Facturacion</h1></div>
      </header>

      <div className="nav-buttons" style={{ display: "flex", gap: "10px" }}>
        <button className="ghost" onClick={() => navigate("/proforma")}><FaFileInvoiceDollar /> Proforma</button>
        <button className="ghost" onClick={() => navigate("/remisiones")}><FaClipboardList /> Remisiones</button>
        <div className="top-actions">
          <button className="ghost" onClick={() => navigate("/ventas")}><FaHistory /> Historial ventas</button>
          <button className="ghost" onClick={() => navigate("/devoluciones")}><FaUndo /> Devoluciones</button>
          <button className="ghost" onClick={() => navigate("/devoluciones/historico")}><FaHistory /> Historial devoluciones</button>
        </div>
      </div>
      <div className="fact-content">
        <div className="card">
          <div className="grid-3">
            <label>
              Cliente
              <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setPickerClienteAbierto(true)}
                  style={{
                    flex: 1,
                    padding: ".5rem .75rem",
                    borderRadius: ".5rem",
                    border: "1px solid #6b7a99",
                    background: "#fff",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: ".9rem",
                    color: clienteSeleccionado ? "#001a33" : "#6b7a99",
                  }}
                >
                  {clienteSeleccionado 
                    ? `${clienteSeleccionado.nombre}${clienteSeleccionado.empresa ? ` - ${clienteSeleccionado.empresa}` : ''}`
                    : "Seleccione cliente..."}
                </button>
                {clienteSeleccionado && (
                  <button
                    type="button"
                    onClick={() => setCliente("")}
                    style={{
                      padding: ".5rem",
                      borderRadius: ".5rem",
                      border: "1px solid #dc2626",
                      background: "#fee",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: ".9rem",
                      fontWeight: 600,
                    }}
                    title="Limpiar cliente"
                  >
                    ?
                  </button>
                )}
              </div>
            </label>

            <label>
              Moneda
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                disabled={!tipoCambio}
              >
                <option value="NIO">Córdobas (NIO)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </label>

            <label>
              Fecha
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </label>
          </div>

          <div className="grid-3">
            <label>
              Tipo de pago
              <select 
                value={tipoPago} 
                onChange={(e) => {
                  const nuevoTipo = e.target.value as "CONTADO" | "CREDITO";
                  if (nuevoTipo === "CREDITO") {
                    const clienteSeleccionado = clientesList.find(c => c.id === cliente);
                    if (clienteSeleccionado && !clienteSeleccionado.creditoHabilitado) {
                      notify.warn("?? Este cliente no tiene habilitada una linea de credito. Solo puede realizar compras al contado.");
                      return;
                    }
                  }
                  setTipoPago(nuevoTipo);
                }}
              >
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
          <div className="grid-3">
            <label>
              PO
              <input
                type="text"
                value={pio}
                onChange={(e) => setPio(e.target.value)}
                placeholder="PO"
              />
            </label>
            <label>
              Número de Factura
              {(() => {
                const validLines = items.filter((it) => it.inventarioId && it.cantidad > 0);
                const numPaginas = Math.ceil(validLines.length / 15);
                const numeroInicial = parseInt(numeroFacturaSugerido) || 1;
                const numeroFinal = numeroInicial + numPaginas - 1;
                const rangoNumeros = numPaginas > 1 
                  ? `${numeroFacturaSugerido} - ${numeroFinal.toString().padStart(6, '0')}`
                  : numeroFacturaSugerido;
                
                return (
                  <>
                    <input
                      type="text"
                      value={rangoNumeros}
                      readOnly
                      style={{
                        background: numPaginas > 1 ? "#fef3c7" : "#dcfce7",
                        border: numPaginas > 1 ? "2px solid #fbbf24" : "2px solid #86efac",
                        color: numPaginas > 1 ? "#92400e" : "#166534",
                        fontWeight: 600,
                        fontSize: "1.1rem",
                        textAlign: "center",
                        cursor: "not-allowed"
                      }}
                      title={numPaginas > 1 
                        ? `Esta factura usará ${numPaginas} números consecutivos (${numPaginas} páginas)`
                        : "Este número se asignará automáticamente al guardar"}
                    />
                    {numPaginas > 1 && (
                      <small style={{ 
                        display: "block", 
                        marginTop: "0.25rem", 
                        color: "#92400e", 
                        fontWeight: 600,
                        fontSize: "0.85rem"
                      }}>
                        ?? {numPaginas} páginas = {numPaginas} números consecutivos
                      </small>
                    )}
                  </>
                );
              })()}
            </label>
          </div>

          <div className="items-container">
            
            {/* ? SUBTOTAL HEADER */}
            <div className="items-header">
              <span>Producto</span>
              <span>Cant</span>
              <span>Precio</span>
              <span>Actualizar</span>
              <span>Subtotal</span> {/* ? */}
              <span>Subtotal US$</span>
              <span>Rem.</span>
              <span>-</span>
            </div>

            {items.map((it) => {
              const precioNioLinea = getPrecioBaseNIO(it);
              const puedeActualizarPrecio = typeof it.inventarioId === "number" && !it.esRemision && precioNioLinea > 0;
              const subtotalCordoba = (Number(it.cantidad) || 0) * (getPrecioBaseNIO(it) || 0);
              const subtotalUsd = tipoCambio && tipoCambio > 0 ? subtotalCordoba / tipoCambio : null;
              return (
                <div className="item-row" key={it.id}>
                  <div style={{ display: "flex", gap: ".3rem",color:"black",backgroundColor:"white", alignItems: "center" }}>
                    <input
                      className="product-input"
                      type="text"
                      value={it.producto}
                      disabled={it.esRemision}
                      placeholder="Buscar..."
                      onChange={(e) => updateItem(it.id, { producto: e.target.value })}
                    />
                    <button
                      type="button"
                      style={{marginLeft:"15px",width:"75px",border:"2px solid black"}}
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
                      Buscar
                    </button>
                    {typeof it.inventarioId === "number" && productosRecientes.has(Number(it.inventarioId)) && (
                      <span style={{ color: "#b91c1c", fontWeight: 700, fontSize: "0.8rem" }}>
                        Cotizado recientemente
                      </span>
                    )}
                  </div>

                  <input
                    className="qty-input"
                    type="number"
                    min={0}
                    disabled={it.esRemision}
                    value={it.cantidad}
                    onChange={(e) => updateItem(it.id, { cantidad: Number(e.target.value) })}
                  />

                  <div className="price-cell">
                    <input
                      className="price-input"
                      type="number"
                      min={0}
                      step={0.01}
                      disabled={it.esRemision}
                      value={it.precio}
                      onChange={(e) => updateItem(it.id, { precio: Number(e.target.value) })}
                    />
                  </div>

                  <div className="update-cell">
                    <button
                      type="button"
                      className="price-sync-btn"
                      disabled={!puedeActualizarPrecio || actualizandoPrecioId === it.id}
                      onClick={() => solicitarConfirmacionPrecio(it.id)}
                      title="Guardar este monto como precio sugerido en inventario"
                    >
                      {actualizandoPrecioId === it.id ? "Guardando..." : "Actualizar"}
                    </button>
                  </div>

                {/* ? SUBTOTAL CELL */}
                <span
                  style={{
                    padding: "4px 8px",
                    fontWeight: "600",
                    minWidth: "80px",
                    textAlign: "right"
                  }}
                >
                  {formatMoney((Number(it.cantidad) || 0) * (Number(it.precio) || 0), moneda)}
                </span>
                <span
                  style={{
                    padding: "4px 8px",
                    fontWeight: "600",
                    minWidth: "92px",
                    textAlign: "right"
                  }}
                  title={subtotalUsd == null ? "Requiere tipo de cambio" : ""}
                >
                  {subtotalUsd != null ? formatMoney(subtotalUsd, "USD") : "-"}
                </span>

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

                <button
                  type="button"
                  className="danger delete-btn"
                  onClick={() => removeRow(it.id)}
                  title="Eliminar línea"
                  aria-label="Borrar línea"
                >
                  Borrar
                </button>
              </div>
            );
          })}

            <button type="button" onClick={addRow}><FaPlus /> Agregar línea</button>
          </div>
        </div>

        <div className="resumen-actions-container">
          <div className="resumen">
            <div className="right">
            <div className="row total">
              <span>Total</span>
              <b>{formatMoney(total, moneda)}</b>
            </div>
            {totalDolar != null && (
              <div className="row">
                <span>Total US$</span>
                <b>{formatMoney(totalDolar, "USD")}</b>
              </div>
            )}
          </div>
        </div>

          <div className="actions">
            <button type="button" className="primary" onClick={guardar}>
              <FaSave /> Guardar
            </button>
          </div>
        </div>

        {/* MODALES — Productos */}
        {pickerAbierto && (
          <div className="picker-overlay picker-overlay--productos" role="dialog" aria-modal="true">
            <div className="picker-card picker-card--productos">
              <div className="picker-top">
                <h3 className="picker-title"><FaSearch /> Productos</h3>
                <button type="button" className="picker-close" onClick={() => setPickerAbierto(false)}><FaTimes /></button>
              </div>

              <div className="picker-search-bar">
                <FaSearch className="picker-search-icon" />
                <input
                  className="picker-search"
                  placeholder="Buscar por parte, nombre o descripcion..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    className="picker-search-clear"
                    onClick={() => setBusqueda("")}
                    aria-label="Limpiar busqueda"
                  >
                    x
                  </button>
                )}
                <span className="picker-search-count">{productosFiltrados.length}</span>
              </div>

              <div className="picker-table">
                <DataTable
                  columns={[
                    { name: "Parte", selector: (r: Product) => r.numeroParte as any, width: "200px", minWidth: "180px" },
                    { 
                      name: "Marca", 
                      selector: (r: Product) => r.marca?.nombre as any,
                      cell: (r: Product) => <span>{r.marca?.nombre || "-"}</span>,
                      width: "220px",
                      minWidth: "200px"
                    },
                    { 
                      name: "Nombre", 
                      selector: (r: Product) => r.nombre as any, 
                      grow: 2,
                      minWidth: "260px",
                      style: { whiteSpace: "nowrap" },
                      cell: (r: Product) => {
                        const cotizacionInfo = productosRecientes.get(Number(r.id));
                        const esCotizado = !!cotizacionInfo;
                        const marca = r.marca?.nombre ? " - " + r.marca.nombre : "";

                        return (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.25rem", width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                              <span>{r.nombre}{marca}</span>
                              {esCotizado && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "12px",
                                    background: "#fef3c7",
                                    border: "1px solid #fbbf24",
                                    color: "#92400e",
                                    fontWeight: 600,
                                    whiteSpace: "nowrap",
                                  }}
                                  title={"Cotizado por " + cotizacionInfo.clienteNombre + (cotizacionInfo.clienteEmpresa ? " - " + cotizacionInfo.clienteEmpresa : "")}
                                >
                                  Cotizado Recientemente
                                </span>
                              )}
                            </div>
                            {esCotizado && (
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#78716c",
                                  fontStyle: "italic",
                                  paddingLeft: "0.25rem",
                                }}
                              >
                                Por: {cotizacionInfo.clienteNombre}
                                {cotizacionInfo.clienteEmpresa && " - " + cotizacionInfo.clienteEmpresa}
                              </span>
                            )}
                          </div>
                        );
                      }
                    },
                  {
                    name: "Precio",
                    selector: (r: Product) => getPrecioProducto(r, moneda) as any,
                    cell: (r: Product) => formatMoney(getPrecioProducto(r, moneda), moneda),
                    width: "190px",
                    minWidth: "170px"
                  },
                  {
                    name: "Sustituto",
                    selector: (r: Product) => r.codigoSustituto as any,
                    width: "280px",
                    minWidth: "260px",
                    cell: (r: Product) => (r.codigoSustituto ? r.codigoSustituto : "—"),
                  },
                  { name: "Stock", selector: (r: Product) => r.stockActual as any, width: "150px", minWidth: "140px" },
                  {
                    name: "Seleccionar",
                    cell: (p: Product) => (
                      <button
                        type="button"
                        className="sel-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!pickerTargetId) return;
                          const sustitutos = parseSustitutos(p.codigoSustituto);
                          if (sustitutos.length) {
                            setPickerSustituto({ product: p, lineId: pickerTargetId });
                            setPickerAbierto(false);
                            setBusqueda("");
                            return;
                          }
                          asignarProductoALinea(p, pickerTargetId);
                        }}
                        title="Seleccionar producto"
                      >
                        ?
                      </button>
                    ),
                    ignoreRowClick: true,
                    button: true,
                    width: "170px",
                  },
                ] as unknown as TableColumn<Product>[]}
                  data={productosFiltrados}
                  pagination
                  paginationPerPage={5}
                  paginationRowsPerPageOptions={[5, 10, 15]}
                  highlightOnHover
                  pointerOnHover
                  customStyles={{
                    table: { style: { minWidth: "1500px" } },
                    headCells: { style: { justifyContent: "center", textAlign: "center" } },
                    cells: { style: { justifyContent: "center", textAlign: "center" } },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL Remisiones */}
        {pickerRemisionAbierto && (
          <div className="picker-overlay" role="dialog" aria-modal="true">
            <div className="picker-card picker-card--rem">
              <div className="picker-top">
                <h3 className="picker-title"><FaSearch /> Seleccionar Remisión</h3>
                <button type="button" className="picker-close" onClick={() => setPickerRemisionAbierto(false)}>
                  <FaTimes />
                </button>
              </div>

              <div style={{ marginBottom: ".6rem", display: "flex", justifyContent: "center" }}>
                <input
                  className="remision-search"
                  placeholder="Buscar por remisión, cliente, parte o producto..."
                  value={remisionSearch}
                  onChange={(e) => setRemisionSearch(e.target.value)}
                />
              </div>

              <div className="picker-table">
                <DataTable
                  columns={remisionColumns as any}
                  data={remisionRows}
                  pagination
                  highlightOnHover
                  pointerOnHover
                  dense
                  noDataComponent="No hay lineas de remision pendientes para este cliente."
                  customStyles={{
                    headCells: { style: { justifyContent: "center", textAlign: "center" } },
                    cells: { style: { justifyContent: "center", textAlign: "center" } },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL Clientes */}
        {pickerClienteAbierto && (
          <div className="picker-overlay" role="dialog" aria-modal="true">
            <div className="picker-card">
              <div className="picker-top">
                <h3 className="picker-title"><FaSearch /> Seleccionar Cliente</h3>
                <button type="button" className="picker-close" onClick={() => setPickerClienteAbierto(false)}>
                  <FaTimes />
                </button>
              </div>

              <input 
                placeholder="Buscar por nombre, empresa, teléfono o correo..." 
                value={busquedaCliente} 
                onChange={(e) => setBusquedaCliente(e.target.value)} 
              />

              <div className="picker-table">
                <DataTable
                  columns={[
                    { name: "Nombre", selector: (r: any) => r.nombre, sortable: true, grow: 2 },
                    { name: "Empresa", selector: (r: any) => r.empresa || "-", sortable: true, grow: 2 },
                    { name: "Telefono", selector: (r: any) => r.telefono || "-", width: "140px" },
                    { name: "Correo", selector: (r: any) => r.correo || "-", grow: 2 },
                  ] as any}
                  data={clientesFiltrados}
                  pagination
                  highlightOnHover
                  pointerOnHover
                  customStyles={{
                    headCells: { style: { justifyContent: "center", textAlign: "center" } },
                    cells: { style: { justifyContent: "center", textAlign: "center" } },
                  }}
                  onRowClicked={(c: any) => {
                    setCliente(Number(c.id));
                    setPickerClienteAbierto(false);
                    setBusquedaCliente("");
                    notify.ok(`Cliente seleccionado: ${c.nombre}`);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal confirmación de precio */}
        {confirmPrecio && (
          <div className="confirm-overlay" role="dialog" aria-modal="true">
            <div className="confirm-card">
              <h3>Confirmar actualización de precio</h3>
              <p>
                ¿Actualizar el precio sugerido de inventario a{" "}
                <strong>{formatMoney(confirmPrecio.precioNio, "NIO")}</strong>?
              </p>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setConfirmPrecio(null)}
                  disabled={actualizandoPrecioId === confirmPrecio.lineId}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={async () => {
                    await actualizarPrecioProducto(confirmPrecio.lineId);
                    setConfirmPrecio(null);
                  }}
                  disabled={actualizandoPrecioId === confirmPrecio.lineId}
                >
                  {actualizandoPrecioId === confirmPrecio.lineId ? "Guardando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal selección de código sustituto */}
        {pickerSustituto && (
          <div className="confirm-overlay" role="dialog" aria-modal="true">
            <div className="confirm-card">
              <h3>Elegir código para facturar</h3>
              <p>Este producto tiene códigos sustitutos. Elige cuál usar en la factura:</p>
              <div className="sustituto-list">
                <button
                  type="button"
                  onClick={() => asignarProductoALinea(pickerSustituto.product, pickerSustituto.lineId, pickerSustituto.product.numeroParte || undefined)}
                >
                  Principal: {pickerSustituto.product.numeroParte || "—"}
                </button>
                {parseSustitutos(pickerSustituto.product.codigoSustituto).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => asignarProductoALinea(pickerSustituto.product, pickerSustituto.lineId, code)}
                  >
                    Sustituto: {code}
                  </button>
                ))}
              </div>
              <div className="confirm-actions">
                <button type="button" className="ghost" onClick={() => setPickerSustituto(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <ToastContainer newestOnTop closeOnClick pauseOnHover draggable />
    </div>
    </div>
  );
};

export default Facturacion;
