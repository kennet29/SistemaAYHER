import React, { useEffect, useState } from "react";
import { FaTruck, FaPlus, FaSave, FaHistory } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { toast } from "react-toastify";
import "./Remisiones.css";

const API_REMISION = "http://localhost:4000/api/remision";
const API_PRODUCTOS = "http://localhost:4000/api/inventario";
const API_CLIENTES = "http://localhost:4000/api/clientes";

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

interface Producto {
  id: number;
  numeroParte?: string;
  nombre?: string;
  stockActual: number;
}

interface DetalleItem {
  inventarioId: number;
  cantidad: number;
  stock: number;
}

export default function Remisiones() {
  const [clienteId, setClienteId] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().substring(0, 10));
  const [observacion, setObservacion] = useState("");
  const [remisionesPendientes, setRemisionesPendientes] = useState<any[]>([]);
  const [remisionesHistorico, setRemisionesHistorico] = useState<any[]>([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [items, setItems] = useState<DetalleItem[]>([{ inventarioId: 0, cantidad: 1, stock: 0 }]);
  const [remisionSeleccionada, setRemisionSeleccionada] = useState<any>(null);

  const token = getCookie("token");

  const getClienteNombre = (id: number) => {
    const cliente = clientes.find((c) => (c._id || c.id) === id);
    return cliente ? cliente.nombre || cliente.razonSocial || cliente.empresa : "Cliente no encontrado";
  };

  const imprimirExcel = (id: number) => {
    window.open(`${API_REMISION}/print/excel/${id}`, "_blank");
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

  const loadPendientes = async () => {
    const res = await fetch(`${API_REMISION}/pendientes`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRemisionesPendientes(data);
  };
  useEffect(() => { loadPendientes(); }, []);

  const loadHistorico = async () => {
    const res = await fetch(`${API_REMISION}/`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setRemisionesHistorico(data);
  };

  const guardarRemision = async () => {
    for (const i of items) {
      if (i.cantidad > i.stock) return toast.error("Cantidad supera stock");
    }

    const detalles = items.filter((i) => i.inventarioId !== 0);
    if (!clienteId) return toast.error("Seleccione cliente");
    if (!detalles.length) return toast.error("Seleccione productos");

    const res = await fetch(`${API_REMISION}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ clienteId, observacion, fecha, items: detalles })
    });

    if (!res.ok) return toast.error("Error guardando");

    toast.success("✅ Remisión guardada");
    setItems([{ inventarioId: 0, cantidad: 1, stock: 0 }]);
    setClienteId("");
    setObservacion("");
    loadPendientes();
  };

  const verDetalle = (row: any) => setRemisionSeleccionada(row);

  const facturarRemision = async (id: number) => {
    const res = await fetch(`${API_REMISION}/${id}/facturar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return toast.error("Error al facturar");

    toast.success("✅ Remisión facturada");
    setRemisionSeleccionada(null);
    loadPendientes();
    if (mostrarHistorico) loadHistorico();
  };

  const columns = [
    { name: "ID", selector: (row: any) => row.id, width: "70px" },
    { name: "Fecha", selector: (row: any) => row.fecha.split("T")[0], width: "110px" },
    { name: "Cliente", selector: (row: any) => getClienteNombre(row.clienteId), width: "200px" },
    { name: "Estado", selector: (row: any) => (row.facturada ? "Facturada" : "Pendiente"), width: "120px" },

    {
      name: "Acciones",
      width: "360px",
      cell: (row: any) => (
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="rem-table-btn rem-view-btn" onClick={() => verDetalle(row)}>Ver</button>

          {!row.facturada && (
            <button className="rem-table-btn rem-complete-btn"
              onClick={() => facturarRemision(row.id)}>
              Facturar
            </button>
          )}

          <button className="rem-table-btn rem-excel-btn" onClick={() => imprimirExcel(row.id)}>
            Excel
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="rem-container">
      <h2 className="rem-title"><FaTruck /> Remisiones</h2>

      <button
        className="rem-history-btn"
        onClick={() => {
          if (!mostrarHistorico) loadHistorico();
          setMostrarHistorico(!mostrarHistorico);
        }}
      >
        <FaHistory /> {mostrarHistorico ? "Ver Pendientes" : "Histórico"}
      </button>

      {!mostrarHistorico && (
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

          <label>Observación</label>
          <textarea className="rem-textarea" value={observacion} onChange={(e) => setObservacion(e.target.value)} />

          <h4>Productos</h4>
          <div className="rem-head">
            <span>Producto</span>
            <span>Cantidad</span>
            <span>Acciones</span>
          </div>

          {items.map((item, index) => (
            <div key={index} className="rem-row">
              <div>
                <select
                  className="rem-product-input"
                  value={item.inventarioId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const prod = productos.find((p) => p.id === id);

                    setItems(items.map((i, idx) =>
                      idx === index ? { ...i, inventarioId: id, cantidad: 1, stock: prod?.stockActual ?? 0 } : i
                    ));
                  }}
                >
                  <option value={0}>Seleccione producto</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.numeroParte ? `${p.numeroParte} - ${p.nombre}` : p.nombre}
                    </option>
                  ))}
                </select>

                {item.inventarioId !== 0 && (
                  <small style={{ fontSize: "0.75rem", color: "#0052cc" }}>
                    Stock: <strong>{item.stock}</strong>
                  </small>
                )}
              </div>

              <input
                type="number"
                className="rem-qty-input"
                value={item.cantidad}
                min={1}
                max={item.stock}
                onChange={(e) => {
                  const qty = Number(e.target.value);
                  if (qty > item.stock) return toast.error(`Máximo ${item.stock}`);
                  setItems(items.map((i, idx) => (idx === index ? { ...i, cantidad: qty } : i)));
                }}
              />

              <button className="rem-delete-btn" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                Eliminar
              </button>
            </div>
          ))}

          <button className="rem-add-btn" onClick={() => setItems([...items, { inventarioId: 0, cantidad: 1, stock: 0 }])}>
            <FaPlus /> Agregar
          </button>

          <button className="rem-save-btn" onClick={guardarRemision}>
            <FaSave /> Guardar Remisión
          </button>
        </div>
      )}

      <h3>{mostrarHistorico ? "Histórico de Remisiones" : "Remisiones Pendientes"}</h3>

      <DataTable columns={columns} data={mostrarHistorico ? remisionesHistorico : remisionesPendientes} pagination />

      {remisionSeleccionada && (
        <div className="rem-modal">
          <div className="rem-modal-content">

            <h3>Remisión #{remisionSeleccionada.numero}</h3>
            <p><strong>Cliente:</strong> {getClienteNombre(remisionSeleccionada.clienteId)}</p>
            <p><strong>Fecha:</strong> {remisionSeleccionada.fecha.split("T")[0]}</p>
            <p><strong>Obs:</strong> {remisionSeleccionada.observacion || "N/A"}</p>

            <h4>Productos</h4>
            <ul>
              {remisionSeleccionada.detalles?.map((d: any, i: number) => (
                <li key={i}>{d.inventario.nombre} — {d.cantidad}</li>
              ))}
            </ul>

            {!remisionSeleccionada.facturada && (
              <button className="rem-save-btn" style={{ background: "#28a745", marginRight: "8px" }}
                onClick={() => facturarRemision(remisionSeleccionada.id)}>
                Facturar
              </button>
            )}

            <button className="rem-excel-btn" onClick={() => imprimirExcel(remisionSeleccionada.id)}>
              Excel
            </button>

            <button className="rem-close-btn" onClick={() => setRemisionSeleccionada(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
