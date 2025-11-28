import React, { useEffect, useMemo, useState } from "react";
import { FaExchangeAlt, FaPlus, FaSearch, FaTrash, FaHome } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Movimientos.css";
import { fmtDateTime } from "../utils/dates";
import { buildApiUrl } from "../api/constants";
import { useNavigate } from "react-router-dom";

const API_MOVIMIENTOS = buildApiUrl("/MovimientoInventario");
const API_TIPOS = buildApiUrl("/tipos-movimiento");
const API_PRODUCTOS = buildApiUrl("/inventario");
const TC_DEFAULT = 36.62;

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type ItemSel = { id: number; nombre: string; cantidad: number; costoUsd?: number };

type TipoMov = { id: number; nombre: string; afectaStock?: boolean; esEntrada?: boolean };

type MovimientoRow = any;

type Producto = { id: number; nombre: string; numeroParte?: string; descripcion?: string; stockActual?: number; marca?: { nombre?: string } };

const MovimientosView = () => {
  const navigate = useNavigate();
  const [movimientos, setMovimientos] = useState<MovimientoRow[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tipos, setTipos] = useState<TipoMov[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [itemsSeleccionados, setItemsSeleccionados] = useState<ItemSel[]>([]);
  const [form, setForm] = useState({ tipoMovimientoId: "", observacion: "", tipoCambioValor: TC_DEFAULT });
  const [detalle, setDetalle] = useState<any | null>(null);

  // Cargar datos
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

  const selectedTipo = useMemo(() => tipos.find((t) => t.id === Number(form.tipoMovimientoId)), [tipos, form.tipoMovimientoId]);
  const esEntradaCompra = useMemo(
    () => (selectedTipo?.nombre || "").toLowerCase().includes("entrada compra"),
    [selectedTipo]
  );

  const productosFiltrados = useMemo(
    () =>
      productos.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.numeroParte?.toLowerCase().includes(busqueda.toLowerCase()) ||
          p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
      ),
    [productos, busqueda]
  );

  const agregarItem = (producto: Producto) => {
    if (itemsSeleccionados.some((i) => i.id === producto.id)) {
      return toast.warn("Este producto ya fue agregado");
    }
    setItemsSeleccionados((prev) => [...prev, { id: producto.id, nombre: producto.nombre, cantidad: 1, costoUsd: esEntradaCompra ? 0 : undefined }]);
  };

  const actualizarCantidad = (id: number, cantidad: number) => {
    setItemsSeleccionados((prev) => prev.map((i) => (i.id === id ? { ...i, cantidad } : i)));
  };

  const actualizarCostoUsd = (id: number, costoUsd: number) => {
    setItemsSeleccionados((prev) => prev.map((i) => (i.id === id ? { ...i, costoUsd } : i)));
  };

  const eliminarItem = (id: number) => setItemsSeleccionados((prev) => prev.filter((i) => i.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipoMovimientoId || itemsSeleccionados.length === 0) {
      return toast.warn("Selecciona un tipo y al menos un producto");
    }
    if (esEntradaCompra) {
      const faltanCostos = itemsSeleccionados.some((i) => i.costoUsd == null || isNaN(Number(i.costoUsd)));
      if (faltanCostos) return toast.warn("Ingresa costo USD para cada producto (Entrada Compra)");
    }

    const body = {
      tipoMovimientoId: Number(form.tipoMovimientoId),
      observacion: form.observacion,
      usuario: "seed-user",
      tipoCambioValor: form.tipoCambioValor,
      detalles: itemsSeleccionados.map((i) => ({
        inventarioId: i.id,
        cantidad: i.cantidad,
        costoUnitarioDolar: esEntradaCompra ? Number(i.costoUsd || 0) : undefined,
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
      toast.success("Movimiento registrado correctamente");

      setItemsSeleccionados([]);
      setForm({ tipoMovimientoId: "", observacion: "", tipoCambioValor: TC_DEFAULT });

      const headers = { Authorization: `Bearer ${getCookie("token")}` };
      const [nuevosMovimientos, inventarioActualizado] = await Promise.all([
        fetch(API_MOVIMIENTOS, { headers }).then((r) => r.json()),
        fetch(API_PRODUCTOS, { headers }).then((r) => r.json()),
      ]);
      setMovimientos(nuevosMovimientos);
      setProductos(inventarioActualizado.items || inventarioActualizado);
    } catch (err) {
      console.error(err);
      toast.error("Error al registrar movimiento");
    }
  };

  const columnasProductos = [
    { name: "Nombre", selector: (r: Producto) => r.nombre, sortable: true },
    { name: "No. Parte", selector: (r: Producto) => r.numeroParte || "-", sortable: true },
    { name: "Descripción", selector: (r: Producto) => r.descripcion || "-", sortable: true },
    { name: "Stock", selector: (r: Producto) => r.stockActual ?? "-", sortable: true },
    {
      name: "Acción",
      cell: (row: Producto) => (
        <button type="button" className="btn-agregar" onClick={() => agregarItem(row)}>
          <FaPlus /> Agregar
        </button>
      ),
    },
  ];

  const columnasMovimientos = [
    { name: "ID", selector: (r: any) => r.id, sortable: true, width: "70px" },
    { name: "Producto", selector: (r: any) => r.inventario?.nombre || "-" },
    { name: "No. Parte", selector: (r: any) => r.inventario?.numeroParte || "-", sortable: true },
    {
      name: "Marca",
      selector: (r: any) => {
        const prod = productos.find((p: any) => p.id === (r.inventario?.id ?? r.inventarioId));
        return prod?.marca?.nombre || "-";
      },
    },
    { name: "Tipo", selector: (r: any) => r.tipoMovimiento?.nombre || "-" },
    { name: "Cantidad", selector: (r: any) => r.cantidad, right: true },
    {
      name: "Costo $",
      selector: (r: any) => r.costoUnitarioDolar ?? r.precioVentaUnitarioDolar ?? null,
      right: true,
      cell: (r: any) => (r.costoUnitarioDolar != null ? `$ ${Number(r.costoUnitarioDolar).toFixed(2)}` : "-"),
    },
    {
      name: "Costo C$",
      selector: (r: any) => r.costoUnitarioCordoba ?? r.precioVentaUnitarioCordoba ?? null,
      right: true,
      cell: (r: any) => (r.costoUnitarioCordoba != null ? `C$ ${Number(r.costoUnitarioCordoba).toFixed(2)}` : "-"),
    },
    {
      name: "TC",
      selector: (r: any) => r.tipoCambioValor ?? null,
      right: true,
      cell: (r: any) => (r.tipoCambioValor ? Number(r.tipoCambioValor).toFixed(4) : "-"),
    },
    { name: "Observación", selector: (r: any) => r.observacion || "-" },
    {
      name: "Fecha",
      selector: (r: any) => r.createdAt,
      sortable: true,
      cell: (r: any) => <span>{fmtDateTime(r.createdAt)}</span>,
    },
    {
      name: "Acciones",
      cell: (r: any) => (
        <button type="button" className="btn-agregar" onClick={() => setDetalle(r)} title="Ver detalle">
          Ver
        </button>
      ),
      right: true,
    },
  ];

  return (
    <div className="movimientos-container">
      <ToastContainer />
      <button
        type="button"
        onClick={() => navigate('/home')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '1rem',
          fontSize: '0.9rem'
        }}
      >
        <FaHome /> Regresar a Home
      </button>
      <h1>
        <FaExchangeAlt /> Movimientos de Inventario
      </h1>

      <form onSubmit={handleSubmit} className="movimiento-form">
        <div className="form-group">
          <label>Tipo de movimiento:</label>
          <select
            value={form.tipoMovimientoId}
            onChange={(e) => setForm({ ...form, tipoMovimientoId: e.target.value })}
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

        <div className="form-group">
          <label>Tipo de cambio (USD a C$):</label>
          <input
            type="number"
            step="0.0001"
            value={form.tipoCambioValor}
            onChange={(e) => setForm({ ...form, tipoCambioValor: Number(e.target.value) })}
            readOnly
            disabled
            style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
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
          title="Productos disponibles"
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
                  {esEntradaCompra && <th>Costo USD</th>}
                  {esEntradaCompra && <th>Costo C$ (tc)</th>}
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {itemsSeleccionados.map((i) => {
                  const costoCordoba = esEntradaCompra && i.costoUsd != null
                    ? Number(i.costoUsd) * Number(form.tipoCambioValor || TC_DEFAULT)
                    : null;
                  return (
                    <tr key={i.id}>
                      <td>{i.nombre}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={i.cantidad}
                          onChange={(e) => {
                            const valor = parseInt(e.target.value, 10);
                            if (!isNaN(valor) && valor >= 1) actualizarCantidad(i.id, valor);
                          }}
                        />
                      </td>
                      {esEntradaCompra && (
                        <>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={i.costoUsd ?? 0}
                              onChange={(e) => actualizarCostoUsd(i.id, Number(e.target.value))}
                              placeholder="USD"
                            />
                          </td>
                          <td>{costoCordoba != null ? `C$ ${costoCordoba.toFixed(2)}` : "-"}</td>
                        </>
                      )}
                      <td>
                        <button type="button" className="btn-eliminar" onClick={() => eliminarItem(i.id)}>
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <button type="submit" className="btn-registrar">
          <FaPlus /> Registrar Movimiento
        </button>
      </form>

      <h2>Historial de Movimientos</h2>
      <DataTable columns={columnasMovimientos} data={movimientos} pagination highlightOnHover dense />

      {detalle && (
        <div className="mov-modal-overlay" onClick={() => setDetalle(null)}>
          <div className="mov-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Observación del Movimiento #{detalle.id}</h3>
              <button className="modal-close" onClick={() => setDetalle(null)}>×</button>
            </header>
            <div className="modal-body">
              <div style={{ whiteSpace: 'pre-wrap' }}>{detalle.observacion || '-'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovimientosView;
