import React, { useEffect, useState } from "react";
import { FaTruck, FaPlus, FaSave, FaHistory, FaHome, FaTrash } from "react-icons/fa";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Remisiones.css";
import ConfirmModal from "./ConfirmModal";
import { buildApiUrl } from "../api/constants";

const API_REMISION = buildApiUrl("/remision");
const API_PRODUCTOS = buildApiUrl("/inventario");
const API_CLIENTES = buildApiUrl("/clientes");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");
const LOW_STOCK_THRESHOLD = 3;

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

interface Producto {
  id: number;
  numeroParte?: string;
  nombre?: string;
  stockActual: number;
  precioVentaSugeridoCordoba?: number | string;
  precioVentaPromedioCordoba?: number | string;
  precioVentaSugeridoDolar?: number | string;
  precioVentaPromedioDolar?: number | string;
  marca?: any;
  categoria?: any;
  marcaNombre?: string;
  categoriaNombre?: string;
}

interface DetalleItem {
  id: string;
  inventarioId: number;
  cantidad: number;
  stock: number;
  query?: string;
}

export default function Remisiones() {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [fecha, setFecha] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [observacion, setObservacion] = useState("");
  const [entregadoA, setEntregadoA] = useState("");
  const [items, setItems] = useState<DetalleItem[]>([{ id: crypto.randomUUID(), inventarioId: 0, cantidad: 1, stock: 0, query: "" }]);
  const [tipoCambio, setTipoCambio] = useState<number | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalRowIndex, setModalRowIndex] = useState<number | null>(null);
  const [modalQuery, setModalQuery] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState<{
    title?: string;
    message: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  const token = getCookie("token");

  const precioNIO = (p?: Producto | null) => {
    if (!p) return 0;
    const nio = Number(p.precioVentaSugeridoCordoba ?? p.precioVentaPromedioCordoba ?? 0) || 0;
    if (nio > 0) return nio;
    const usd = Number(p.precioVentaSugeridoDolar ?? p.precioVentaPromedioDolar ?? 0) || 0;
    if (usd > 0 && tipoCambio && tipoCambio > 0) return Number((usd * tipoCambio).toFixed(4));
    return 0;
  };

  useEffect(() => {
    fetch(API_CLIENTES, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then(setClientes)
      .catch(() => toast.error("Error cargando clientes"));
  }, []);

  useEffect(() => {
    fetch(API_PRODUCTOS, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProductos(data.items || data))
      .catch(() => toast.error("Error cargando productos"));
  }, []);

  useEffect(() => {
    fetch(API_TIPO_CAMBIO, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((j) => setTipoCambio(j.tipoCambio?.valor ?? j.valor ?? null))
      .catch(() => setTipoCambio(null));
  }, []);

  const guardarRemision = async () => {
    for (const i of items) {
      if (i.cantidad > i.stock) return toast.error("Cantidad supera stock");
    }

    const detalles = items.filter((i) => i.inventarioId !== 0);
    const seen = new Set<number>();
    for (const d of detalles) {
      if (seen.has(d.inventarioId)) {
        return toast.error("Producto repetido: ya fue agregado");
      }
      seen.add(d.inventarioId);
    }
    if (!clienteId) return toast.error("Seleccione cliente");
    if (!detalles.length) return toast.error("Seleccione productos");

    const performGuardar = async () => {
      const res = await fetch(`${API_REMISION}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clienteId,
          observacion,
          fecha,
          items: detalles,
          entregadoA: entregadoA.trim() || null,
        }),
      });

      if (!res.ok) return toast.error("Error guardando");

      toast.success("Listo. Remision guardada");
      setItems([{ id: crypto.randomUUID(), inventarioId: 0, cantidad: 1, stock: 0, query: "" }]);
      setClienteId("");
      setObservacion("");
      setEntregadoA("");
    };

    setConfirmCfg({
      title: "Confirmacion",
      message: "Desea guardar la remision?",
      onConfirm: () => {
        setConfirmOpen(false);
        performGuardar();
      },
    });
    setConfirmOpen(true);
  };

  const openProductModal = (rowIdx: number) => {
    setModalRowIndex(rowIdx);
    const current = items[rowIdx];
    setModalQuery(current?.query || "");
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setModalRowIndex(null);
    setModalQuery("");
  };

  const selectProductForRow = (p: Producto) => {
    if (modalRowIndex === null) return;
    const existsIdx = items.findIndex((it, i) => it.inventarioId === p.id && i !== modalRowIndex);
    if (existsIdx !== -1) {
      toast.warn("Producto ya agregado");
      return;
    }
    const label = p.numeroParte ? `${p.numeroParte} - ${p.nombre}` : p.nombre || String(p.id);
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === modalRowIndex
          ? { ...it, inventarioId: p.id, cantidad: 1, stock: p.stockActual ?? 0, query: label }
          : it
      )
    );
    closeProductModal();
  };

  return (
    <div className="rem-container">
      <ToastContainer position="top-right" autoClose={2500} />
      <ConfirmModal
        open={confirmOpen}
        title={confirmCfg?.title}
        message={confirmCfg?.message || ""}
        onConfirm={() => {
          confirmCfg?.onConfirm?.();
        }}
        onCancel={() => {
          setConfirmOpen(false);
          toast.info("Accion cancelada");
        }}
      />
      <h2 className="rem-title">
        <FaTruck /> Remisiones
      </h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/facturacion" className="rem-history-btn">
          <FaHome /> Volver a Facturacion
        </Link>
        <Link to="/remisiones/historico" className="rem-history-btn">
          <FaHistory /> Historico
        </Link>
        <Link to="/remisiones/pendientes" className="rem-history-btn">
          <FaHistory /> Pendientes
        </Link>
      </div>

      <div className="rem-card">
        <div className="rem-grid-2">
          <div>
            <label>Cliente</label>
            <select className="rem-input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Seleccione un cliente</option>
              {clientes.map((c) => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.nombre || c.razonSocial || c.empresa}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Fecha</label>
            <input type="date" className="rem-input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <label>Observacion</label>
        <textarea className="rem-textarea" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
        <label>Entregado a</label>
        <input
          className="rem-input"
          type="text"
          value={entregadoA}
          placeholder="Nombre de la persona que recibe"
          onChange={(e) => setEntregadoA(e.target.value)}
        />

        <div style={{ overflowX: "auto" }}>
          <table className="display" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Producto</th>
                <th style={{ textAlign: "center" }}>Cantidad</th>
                <th style={{ textAlign: "right" }}>Precio</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
                <th style={{ textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td>
                    {(() => {
                      const selected = productos.find((p) => p.id === item.inventarioId);
                      const selectedLabel = selected
                        ? (selected.numeroParte ? `${selected.numeroParte} - ${selected.nombre}` : selected.nombre) || ""
                        : "";
                      const value = typeof item.query === "string" && item.query.length > 0 ? item.query : selectedLabel;
                      return (
                        <div className="rem-typeahead">
                          <input
                            type="text"
                            className="rem-product-input"
                            placeholder="Buscar por parte o nombre"
                            value={value}
                            readOnly
                            onClick={() => openProductModal(index)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") openProductModal(index);
                            }}
                          />
                          {item.inventarioId !== 0 && (
                            <small
                              style={{
                                fontSize: "0.75rem",
                                color: item.stock <= 0 || item.stock <= LOW_STOCK_THRESHOLD ? "#c30000" : "#0052cc",
                                fontWeight: item.stock <= 0 || item.stock <= LOW_STOCK_THRESHOLD ? (700 as any) : 400,
                              }}
                            >
                              Stock: <strong>{item.stock}</strong>
                            </small>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="number"
                      className="rem-qty-input"
                      value={item.cantidad}
                      min={1}
                      max={item.stock}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        if (qty > item.stock) return toast.error(`Maximo ${item.stock}`);
                        setItems((prev) => prev.map((i, idx) => (idx === index ? { ...i, cantidad: qty } : i)));
                      }}
                    />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {(() => {
                      const p = productos.find((x) => x.id === item.inventarioId);
                      const nio = precioNIO(p);
                      return <span>C$ {nio.toFixed(2)}</span>;
                    })()}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {(() => {
                      const p = productos.find((x) => x.id === item.inventarioId);
                      const nio = precioNIO(p);
                      const sub = (Number(item.cantidad) || 0) * nio;
                      return <span>C$ {sub.toFixed(2)}</span>;
                    })()}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      className="rem-delete-btn"
                      onClick={() => {
                        if (window.confirm("Eliminar esta fila?")) {
                          setItems((prev) => prev.filter((it) => it.id !== item.id));
                          toast.info("Fila eliminada");
                        }
                      }}
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          className="rem-add-btn"
          onClick={() => {
            setItems((prev) => [...prev, { id: crypto.randomUUID(), inventarioId: 0, cantidad: 1, stock: 0, query: "" }]);
            toast.info("Fila agregada");
          }}
        >
          <FaPlus /> Agregar
        </button>

        <button className="rem-save-btn" onClick={guardarRemision}>
          <FaSave /> Guardar Remision
        </button>
      </div>

      {showProductModal && (
        <div
          className="rem-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeProductModal();
          }}
        >
          <div className="rem-modal-content">
            <h3 style={{ marginTop: 0 }}>Buscar producto</h3>
            <input
              type="text"
              className="rem-product-input"
              placeholder="Buscar por parte o nombre"
              value={modalQuery}
              autoFocus
              onChange={(e) => setModalQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeProductModal();
              }}
            />
            <div style={{ overflowX: "auto", maxHeight: 360, marginTop: 8 }}>
              <table className="rem-table rem-modal-products" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Parte</th>
                    <th style={{ textAlign: "left" }}>Producto</th>
                    <th style={{ textAlign: "left" }}>Marca</th>
                    <th style={{ textAlign: "center" }}>Categoria</th>
                    <th style={{ textAlign: "center" }}>Stock</th>
                    <th style={{ textAlign: "center" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(modalQuery
                    ? productos.filter((p) => {
                        const brand = (p as any).marcaNombre ?? (p as any).marca?.nombre ?? (p as any).marca ?? "";
                        const cat = (p as any).categoriaNombre ?? (p as any).categoria?.nombre ?? (p as any).categoria ?? "";
                        const haystack = `${p.numeroParte ?? ""} ${p.nombre ?? ""} ${brand ?? ""} ${cat ?? ""}`.toLowerCase();
                        return haystack.includes(modalQuery.toLowerCase().trim());
                      })
                    : productos
                  )
                    .slice(0, 100)
                    .map((p) => {
                      const brand = (p as any).marcaNombre ?? (p as any).marca?.nombre ?? (p as any).marca ?? "";
                      const cat = (p as any).categoriaNombre ?? (p as any).categoria?.nombre ?? (p as any).categoria ?? "";
                      const stockVal = p.stockActual ?? 0;
                      const inStock = stockVal > 0;
                      const isLow = stockVal > 0 && stockVal <= LOW_STOCK_THRESHOLD;
                      return (
                        <tr key={p.id}>
                          <td>{p.numeroParte ?? "N/D"}</td>
                          <td>{p.nombre ?? "N/D"}</td>
                          <td>{brand || "N/D"}</td>
                          <td style={{ textAlign: "center" }}>{cat || "N/D"}</td>
                          <td style={{ textAlign: "center" }} className={isLow || !inStock ? "rem-stock-low" : ""}>
                            {stockVal}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="rem-table-btn rem-view-btn"
                              disabled={!inStock}
                              title={!inStock ? "Sin stock" : "Seleccionar"}
                              onClick={() => {
                                if (!inStock) {
                                  toast.warn("Sin stock disponible");
                                  return;
                                }
                                selectProductForRow(p);
                              }}
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="rem-close-btn" onClick={closeProductModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
