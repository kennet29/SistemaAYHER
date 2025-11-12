import React, { useEffect, useState } from "react";
import { FaExchangeAlt, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Movimientos.css";
import { fmtDateTime } from "../utils/dates";

const API_MOVIMIENTOS = "http://localhost:4000/api/MovimientoInventario";
const API_TIPOS = "http://localhost:4000/api/tipos-movimiento";
const API_PRODUCTOS = "http://localhost:4000/api/inventario";

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const MovimientosView = () => {
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [itemsSeleccionados, setItemsSeleccionados] = useState<
    { id: number; nombre: string; cantidad: number }[]
  >([]);
  const [form, setForm] = useState({
    tipoMovimientoId: "",
    observacion: "",
  });
  const [detalle, setDetalle] = useState<any | null>(null);

  // 🔹 Cargar datos
  useEffect(() => {
    const headers = { Authorization: `Bearer ${getCookie("token")}` };
    fetch(API_TIPOS, { headers })
      .then((r) => r.json())
      .then(setTipos)
      .catch(() => toast.error("Error al cargar tipos de movimiento"));

    fetch(API_PRODUCTOS, { headers })
      .then((r) => r.json())
      .then((data) => setProductos(data.items || []))
      .catch(() => toast.error("Error al cargar inventario"));

    fetch(API_MOVIMIENTOS, { headers })
      .then((r) => r.json())
      .then(setMovimientos)
      .catch(() => toast.error("Error al cargar movimientos"));
  }, []);

  // 🔍 Filtrar productos
  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.numeroParte?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ➕ Agregar producto
  const agregarItem = (producto: any) => {
    if (itemsSeleccionados.some((i) => i.id === producto.id)) {
      return toast.warn("Este producto ya fue agregado");
    }
    setItemsSeleccionados([
      ...itemsSeleccionados,
      { id: producto.id, nombre: producto.nombre, cantidad: 1 },
    ]);
  };

  // 🔢 Cambiar cantidad
  const actualizarCantidad = (id: number, nuevaCantidad: number) => {
    setItemsSeleccionados((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad } : i))
    );
  };

  // ❌ Eliminar producto
  const eliminarItem = (id: number) => {
    setItemsSeleccionados((prev) => prev.filter((i) => i.id !== id));
  };

  // 💾 Enviar movimiento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipoMovimientoId || itemsSeleccionados.length === 0) {
      return toast.warn("Selecciona un tipo y al menos un producto");
    }

    const body = {
      tipoMovimientoId: Number(form.tipoMovimientoId),
      observacion: form.observacion,
      usuario: "Kenneth",
      detalles: itemsSeleccionados.map((i) => ({
        inventarioId: i.id,
        cantidad: i.cantidad,
      })),
    };

    try {
      const res = await fetch(API_MOVIMIENTOS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token")}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Error en la respuesta del servidor");
      toast.success("Movimiento registrado correctamente ✅");

      setItemsSeleccionados([]);
      setForm({ tipoMovimientoId: "", observacion: "" });

      const authHeaders = { Authorization: `Bearer ${getCookie("token")}` };
      const [nuevosMovimientos, inventarioActualizado] = await Promise.all([
        fetch(API_MOVIMIENTOS, { headers: authHeaders }).then((r) => r.json()),
        fetch(API_PRODUCTOS, { headers: authHeaders }).then((r) => r.json()),
      ]);
      setMovimientos(nuevosMovimientos);
      setProductos(inventarioActualizado.items || inventarioActualizado);
    } catch {
      toast.error("Error al registrar movimiento");
    }
  };

  // 🧾 Columnas para DataTable productos
  const columnasProductos = [
    { name: "Nombre", selector: (r: any) => r.nombre, sortable: true },
    { name: "N° Parte", selector: (r: any) => r.numeroParte || "—",sortable: true },
    { name: "Descripción", selector: (r: any) => r.descripcion || "—",sortable: true },
    { name: "Stock", selector:(r: any)=> r.stockActual ?? "—", sortable: true},
    {
      name: "Acción",
      cell: (row: any) => (
        <button type="button" className="btn-agregar" onClick={() => agregarItem(row)}>
          <FaPlus /> Agregar
        </button>
      ),
    },
  ];

  // 🧾 Columnas para DataTable historial
  const columnasMovimientos = [
    { name: "ID", selector: (r: any) => r.id, sortable: true, width: "70px" },
    { name: "Producto", selector: (r: any) => r.inventario?.nombre || "—" },
    { name: "N° Parte", selector: (r: any) => r.inventario?.numeroParte || "—", sortable: true },
    { name: "Marca", selector: (r: any) => {
        const prod = productos.find((p: any) => p.id === (r.inventario?.id ?? r.inventarioId));
        return prod?.marca?.nombre || "—";
      }
    },
    { name: "Tipo", selector: (r: any) => r.tipoMovimiento?.nombre || "—" },
    { name: "Cantidad", selector: (r: any) => r.cantidad },
    { name: "Observación", selector: (r: any) => r.observacion || "—" },
    {
      name: "Fecha",
      selector: (r: any) => r.createdAt,
      sortable:true,
      cell: (r: any) => <span>{fmtDateTime(r.createdAt)}</span>
    },
    {
      name: "Acciones",
      cell: (r: any) => (
        <button
          type="button"
          className="btn-agregar"
          onClick={() => setDetalle(r)}
          title="Ver detalle"
        >
          Ver
        </button>
      ),
      right: true,
    },
  ];

  return (
    <div className="movimientos-container">
      <ToastContainer />
      <h1>
        <FaExchangeAlt /> Movimientos de Inventario
      </h1>

      <form onSubmit={handleSubmit} className="movimiento-form">
        <div className="form-group">
          <label>Tipo de movimiento:</label>
          <select
            value={form.tipoMovimientoId}
            onChange={(e) =>
              setForm({ ...form, tipoMovimientoId: e.target.value })
            }
          >
            <option value="">Seleccionar...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Observación:</label>
          <input
            type="text"
            placeholder="Ej: Entrada por compra"
            value={form.observacion}
            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
          />
        </div>

        <div className="buscador">
          <FaSearch className="icono-buscar" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <DataTable
          title="📦 Productos disponibles"
          columns={columnasProductos}
          data={productosFiltrados}
          pagination
          highlightOnHover
          dense
        />

        {itemsSeleccionados.length > 0 && (
          <div className="tabla-items">
            <h3>Productos seleccionados</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {itemsSeleccionados.map((i) => (
                  <tr key={i.id}>
                    <td>{i.nombre}</td>
                    <td>
  <input
    type="number"
    min={1}
    step={1}
    value={i.cantidad}
    onChange={(e) => {
      const valor = parseInt(e.target.value);
      if (!isNaN(valor) && valor >= 1) {
        actualizarCantidad(i.id, valor);
      }
    }}
  />
</td>

                    <td>
                      <button
                        type="button"
                        className="btn-eliminar"
                        onClick={() => eliminarItem(i.id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button type="submit" className="btn-registrar">
          <FaPlus /> Registrar Movimiento
        </button>
      </form>

      <h2>📋 Historial de Movimientos</h2>
      <DataTable
        columns={columnasMovimientos}
        data={movimientos}
        pagination
        highlightOnHover
        dense
      />

      {detalle && (
        <div className="mov-modal-overlay" onClick={() => setDetalle(null)}>
          <div className="mov-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Observación del Movimiento #{detalle.id}</h3>
              <button className="modal-close" onClick={() => setDetalle(null)}>×</button>
            </header>
            <div className="modal-body">
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {detalle.observacion || '—'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosView;
