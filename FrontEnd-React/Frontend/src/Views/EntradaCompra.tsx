// src/Views/EntradaCompra.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaShoppingCart, FaPlus, FaTrash, FaSave, FaSearch, FaHome, FaEdit, FaTimes } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./EntradaCompra.css";
import { buildApiUrl } from "../api/constants";
import { fmtDateTime } from "../utils/dates";
import { useNavigate } from "react-router-dom";

const API_MOVIMIENTOS = buildApiUrl("/MovimientoInventario");
const API_TIPOS = buildApiUrl("/tipos-movimiento");
const API_PRODUCTOS = buildApiUrl("/inventario");
const API_TIPO_CAMBIO = buildApiUrl("/tipo-cambio/latest");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type ItemCompra = {
  id: number;
  nombre: string;
  numeroParte?: string;
  marca?: string;
  cantidad: number;
  costoUsd: number;
};

type Producto = {
  id: number;
  nombre: string;
  numeroParte?: string;
  descripcion?: string;
  stockActual?: number;
  marca?: { nombre?: string };
};

type MovimientoEntrada = {
  id: number;
  inventarioId: number;
  cantidad: number;
  costoUnitarioDolar?: number | null;
  costoUnitarioCordoba?: number | null;
  tipoCambioValor?: number | null;
  observacion?: string | null;
  createdAt?: string;
  inventario?: Producto & { marca?: { nombre?: string } };
  tipoMovimiento?: { nombre?: string; afectaStock?: boolean; esEntrada?: boolean };
};

const EntradaCompra: React.FC = () => {
  const navigate = useNavigate();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [itemsCompra, setItemsCompra] = useState<ItemCompra[]>([]);
  const [observacion, setObservacion] = useState("");
  const [tipoCambio, setTipoCambio] = useState<number>(36.62);
  const [tipoMovimientoId, setTipoMovimientoId] = useState<number | null>(null);
  const [proveedor, setProveedor] = useState("");
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<number>>(new Set());
  const [movimientos, setMovimientos] = useState<MovimientoEntrada[]>([]);
  const [loadingMovs, setLoadingMovs] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [movimientoEditando, setMovimientoEditando] = useState<MovimientoEntrada | null>(null);
  const [editCantidad, setEditCantidad] = useState<number>(1);
  const [editCostoUsd, setEditCostoUsd] = useState<number>(0);
  const [editObservacion, setEditObservacion] = useState<string>("");
  const [movimientoAEliminar, setMovimientoAEliminar] = useState<MovimientoEntrada | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const headers = { Authorization: `Bearer ${getCookie("token")}` };

    // Cargar productos
    fetch(API_PRODUCTOS, { headers })
      .then((r) => r.json())
      .then((data) => setProductos(data.items || data.data || []))
      .catch(() => toast.error("Error al cargar inventario"));

    // Cargar tipo de cambio
    fetch(API_TIPO_CAMBIO, { headers })
      .then((r) => r.json())
      .then((data) => setTipoCambio(data.tipoCambio?.valor ?? data.valor ?? 36.62))
      .catch(() => toast.warn("No se pudo cargar el tipo de cambio"));

    // Buscar el tipo de movimiento "Entrada Compra"
    fetch(API_TIPOS, { headers })
      .then((r) => r.json())
      .then((tipos) => {
        const entradaCompra = tipos.find((t: any) =>
          t.nombre?.toLowerCase().includes("entrada compra")
        );
        if (entradaCompra) {
          setTipoMovimientoId(entradaCompra.id);
        } else {
          toast.warn("No se encontró el tipo de movimiento 'Entrada Compra'");
        }
      })
      .catch(() => toast.error("Error al cargar tipos de movimiento"));
  }, []);

  const cargarMovimientos = async () => {
    if (!tipoMovimientoId) return;
    setLoadingMovs(true);
    try {
      const headers = { Authorization: `Bearer ${getCookie("token")}` };
      const res = await fetch(API_MOVIMIENTOS, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      const filtrados = lista.filter(
        (m: any) =>
          m.tipoMovimientoId === tipoMovimientoId ||
          (m.tipoMovimiento?.nombre || "").toLowerCase().includes("entrada compra")
      );
      setMovimientos(filtrados);
    } catch {
      toast.error("Error al cargar entradas registradas");
    } finally {
      setLoadingMovs(false);
    }
  };

  useEffect(() => {
    if (tipoMovimientoId) {
      cargarMovimientos();
    }
  }, [tipoMovimientoId]);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.numeroParte?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q) ||
        p.marca?.nombre?.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const movimientosFiltrados = useMemo(() => {
    const q = busquedaHistorial.trim().toLowerCase();
    if (!q) return movimientos;
    return movimientos.filter((m) => {
      const nombre = m.inventario?.nombre?.toLowerCase() || "";
      const parte = m.inventario?.numeroParte?.toLowerCase() || "";
      const marca = m.inventario?.marca?.nombre?.toLowerCase() || "";
      const obs = (m.observacion || "").toLowerCase();
      return (
        nombre.includes(q) ||
        parte.includes(q) ||
        marca.includes(q) ||
        obs.includes(q) ||
        m.id.toString().includes(q)
      );
    });
  }, [movimientos, busquedaHistorial]);

  const toggleSeleccion = (productoId: number) => {
    setProductosSeleccionados((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productoId)) {
        newSet.delete(productoId);
      } else {
        newSet.add(productoId);
      }
      return newSet;
    });
  };

  const agregarSeleccionados = () => {
    if (productosSeleccionados.size === 0) {
      return toast.warn("Selecciona al menos un producto");
    }

    const productosAAgregar = productos.filter((p) => productosSeleccionados.has(p.id));
    const nuevosItems: ItemCompra[] = [];
    let duplicados = 0;

    productosAAgregar.forEach((producto) => {
      if (itemsCompra.some((i) => i.id === producto.id)) {
        duplicados++;
      } else {
        nuevosItems.push({
          id: producto.id,
          nombre: producto.nombre,
          numeroParte: producto.numeroParte,
          marca: producto.marca?.nombre,
          cantidad: 1,
          costoUsd: 0,
        });
      }
    });

    if (nuevosItems.length > 0) {
      setItemsCompra((prev) => [...prev, ...nuevosItems]);
      toast.success(`${nuevosItems.length} producto(s) agregado(s)`);
    }

    if (duplicados > 0) {
      toast.warn(`${duplicados} producto(s) ya estaban agregados`);
    }

    setProductosSeleccionados(new Set());
  };

  const agregarItem = (producto: Producto) => {
    if (itemsCompra.some((i) => i.id === producto.id)) {
      return toast.warn("Este producto ya fue agregado");
    }
    setItemsCompra((prev) => [
      ...prev,
      {
        id: producto.id,
        nombre: producto.nombre,
        numeroParte: producto.numeroParte,
        marca: producto.marca?.nombre,
        cantidad: 1,
        costoUsd: 0,
      },
    ]);
    toast.success(`${producto.nombre} agregado`);
  };

  const actualizarCantidad = (id: number, cantidad: number) => {
    setItemsCompra((prev) =>
      prev.map((i) => (i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i))
    );
  };

  const actualizarCosto = (id: number, costoUsd: number) => {
    setItemsCompra((prev) =>
      prev.map((i) => (i.id === id ? { ...i, costoUsd: Math.max(0, costoUsd) } : i))
    );
  };

  const eliminarItem = (id: number) => {
    setItemsCompra((prev) => prev.filter((i) => i.id !== id));
    toast.info("Producto eliminado");
  };

  const totalUsd = useMemo(
    () => itemsCompra.reduce((acc, i) => acc + i.cantidad * i.costoUsd, 0),
    [itemsCompra]
  );

  const totalCordoba = useMemo(() => totalUsd * tipoCambio, [totalUsd, tipoCambio]);

  const abrirEdicion = (mov: MovimientoEntrada) => {
    setMovimientoEditando(mov);
    setEditCantidad(Number(mov.cantidad) || 1);
    const costoUsd = Number(
      mov.costoUnitarioDolar ??
        (mov.costoUnitarioCordoba && tipoCambio ? Number(mov.costoUnitarioCordoba) / tipoCambio : 0)
    );
    setEditCostoUsd(costoUsd);
    setEditObservacion(mov.observacion || "");
  };

  const guardarEdicion = async () => {
    if (!movimientoEditando) return;
    if (!(editCantidad > 0)) return toast.warn("La cantidad debe ser mayor a 0");
    if (!(editCostoUsd > 0)) return toast.warn("El costo debe ser mayor a 0");

    try {
      const res = await fetch(`${API_MOVIMIENTOS}/${movimientoEditando.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("token")}`,
        },
        body: JSON.stringify({
          cantidad: editCantidad,
          costoUnitarioDolar: editCostoUsd,
          observacion: editObservacion,
          tipoCambioValor: tipoCambio,
        }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "No se pudo actualizar el movimiento");
      }
      toast.success("Movimiento actualizado");
      setMovimientoEditando(null);
      cargarMovimientos();
    } catch (error) {
      toast.error((error as any)?.message || "Error al actualizar");
    }
  };

  const confirmarEliminar = async () => {
    if (!movimientoAEliminar) return;
    try {
      const res = await fetch(`${API_MOVIMIENTOS}/${movimientoAEliminar.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getCookie("token")}`,
        },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "No se pudo eliminar");
      }
      toast.success("Movimiento eliminado");
      setMovimientoAEliminar(null);
      cargarMovimientos();
    } catch (error) {
      toast.error((error as any)?.message || "Error al eliminar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoMovimientoId) {
      return toast.error("No se pudo identificar el tipo de movimiento");
    }

    if (itemsCompra.length === 0) {
      return toast.warn("Agrega al menos un producto");
    }

    const faltanCostos = itemsCompra.some((i) => i.costoUsd <= 0);
    if (faltanCostos) {
      return toast.warn("Todos los productos deben tener un costo mayor a 0");
    }

    const obs = proveedor
      ? `Entrada Compra - Proveedor: ${proveedor}${observacion ? ` - ${observacion}` : ""}`
      : observacion || "Entrada Compra";

    const body = {
      tipoMovimientoId,
      observacion: obs,
      usuario: "seed-user",
      tipoCambioValor: tipoCambio,
      detalles: itemsCompra.map((i) => ({
        inventarioId: i.id,
        cantidad: i.cantidad,
        costoUnitarioDolar: i.costoUsd,
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

      toast.success("✅ Entrada de compra registrada correctamente");

      // Limpiar formulario
      setItemsCompra([]);
      setObservacion("");
      setProveedor("");
      setProductosSeleccionados(new Set());
      cargarMovimientos();

      // Recargar inventario con un pequeño delay para asegurar que el backend actualizó
      setTimeout(() => {
        const headers = { Authorization: `Bearer ${getCookie("token")}` };
        fetch(API_PRODUCTOS, { headers })
          .then((r) => r.json())
          .then((data) => {
            setProductos(data.items || data.data || []);
            toast.info("📦 Inventario actualizado");
          })
          .catch(() => toast.error("Error al actualizar inventario"));
      }, 500);
    } catch (err) {
      console.error(err);
      toast.error("❌ Error al registrar la entrada de compra");
    }
  };

  const columnasProductos = [
    {
      name: (
        <input
          type="checkbox"
          onChange={(e) => {
            if (e.target.checked) {
              setProductosSeleccionados(new Set(productosFiltrados.map((p) => p.id)));
            } else {
              setProductosSeleccionados(new Set());
            }
          }}
          checked={
            productosFiltrados.length > 0 &&
            productosFiltrados.every((p) => productosSeleccionados.has(p.id))
          }
          title="Seleccionar todos"
        />
      ),
      cell: (row: Producto) => (
        <input
          type="checkbox"
          checked={productosSeleccionados.has(row.id)}
          onChange={() => toggleSeleccion(row.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: "5%",
      ignoreRowClick: true,
    },
    {
      name: "Producto",
      selector: (r: Producto) => r.nombre,
      sortable: true,
      width: "50%",
      cell: (r: Producto) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.nombre}</div>
          <div style={{ fontSize: "0.8rem", color: "#718096" }}>
            {r.numeroParte || "-"} • {r.marca?.nombre || "-"}
          </div>
        </div>
      ),
    },
    {
      name: "Stock",
      selector: (r: Producto) => r.stockActual ?? 0,
      sortable: true,
      right: true,
      width: "15%",
      cell: (r: Producto) => (
        <span style={{ textAlign: "right", display: "block" }}>
          {r.stockActual ?? 0}
        </span>
      ),
    },
    {
      name: "+",
      cell: (row: Producto) => (
        <button
          type="button"
          className="btn-agregar-individual"
          onClick={() => agregarItem(row)}
          title="Agregar solo este"
        >
          <FaPlus />
        </button>
      ),
      ignoreRowClick: true,
      width: "10%",
    },
  ];

  const columnasMovimientos = [
    { name: "ID", selector: (r: MovimientoEntrada) => r.id, width: "80px" },
    {
      name: "Fecha",
      selector: (r: MovimientoEntrada) => r.createdAt || "",
      width: "170px",
      cell: (r: MovimientoEntrada) => (r.createdAt ? fmtDateTime(r.createdAt) : "-"),
    },
    {
      name: "Producto",
      selector: (r: MovimientoEntrada) => r.inventario?.nombre || "-",
      grow: 2,
      cell: (r: MovimientoEntrada) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.inventario?.nombre || "-"}</div>
          <div style={{ fontSize: "0.8rem", color: "#718096" }}>
            {r.inventario?.numeroParte || "-"} �?� {r.inventario?.marca?.nombre || "-"}
          </div>
        </div>
      ),
    },
    {
      name: "Cant.",
      selector: (r: MovimientoEntrada) => r.cantidad,
      right: true,
      width: "90px",
    },
    {
      name: "Costo USD",
      selector: (r: MovimientoEntrada) => Number(r.costoUnitarioDolar || 0),
      right: true,
      width: "140px",
      cell: (r: MovimientoEntrada) => `$ ${(Number(r.costoUnitarioDolar || 0)).toFixed(2)}`,
    },
    {
      name: "Obs.",
      selector: (r: MovimientoEntrada) => r.observacion || "",
      grow: 1,
      wrap: true,
      width: "220px",
    },
    {
      name: "Acciones",
      button: true,
      width: "220px",
      cell: (r: MovimientoEntrada) => (
        <div style={{ display: "flex", gap: ".35rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-guardar"
            style={{ padding: ".35rem .6rem", display: "inline-flex", alignItems: "center", gap: ".35rem" }}
            onClick={() => abrirEdicion(r)}
            title="Editar entrada"
          >
            <FaEdit /> Editar
          </button>
          <button
            type="button"
            className="btn-eliminar"
            style={{ padding: ".35rem .6rem", display: "inline-flex", alignItems: "center", gap: ".35rem" }}
            onClick={() => setMovimientoAEliminar(r)}
            title="Eliminar entrada"
          >
            <FaTrash /> Eliminar
          </button>
        </div>
      ),
      ignoreRowClick: true,
    },
  ];

  return (
    <div className="entrada-compra-container">
      <ToastContainer />

      <header className="ec-header">
        <button className="btn-home" onClick={() => navigate("/home")} title="Volver al inicio">
          <FaHome /> Inicio
        </button>
        <div className="header-title">
          <FaShoppingCart className="icon" />
          <h1>Entrada de Compra</h1>
        </div>
        <button
          className="btn-historial"
          onClick={() => navigate("/historial-compras")}
          title="Ver historial de compras"
        >
          📋 Historial
        </button>
      </header>

      <div className="ec-content">
        {/* Tabla de productos en la compra - PRIMERO */}
        <div className="card">
          <h2>Productos en la Compra ({itemsCompra.length})</h2>
          
          {itemsCompra.length === 0 ? (
            <div className="tabla-vacia">
              <FaShoppingCart className="icono-vacio" />
              <p>No hay productos agregados</p>
              <p className="texto-ayuda">Busca y selecciona productos abajo para agregarlos</p>
            </div>
          ) : (
            <>
              <div className="tabla-compra">
                <table>
                  <thead>
                    <tr>
                      <th>No. Parte</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Costo USD</th>
                      <th>Costo C$</th>
                      <th>Subtotal USD</th>
                      <th>Subtotal C$</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsCompra.map((item) => {
                      const costoCordoba = item.costoUsd * tipoCambio;
                      const subtotalUsd = item.cantidad * item.costoUsd;
                      const subtotalCordoba = subtotalUsd * tipoCambio;
                      
                      // Obtener la marca del producto original si no está en el item
                      const productoOriginal = productos.find(p => p.id === item.id);
                      const marcaProducto = item.marca || productoOriginal?.marca?.nombre;

                      return (
                        <tr key={item.id}>
                          <td>{item.numeroParte || "-"}</td>
                          <td>{item.nombre}{marcaProducto ? ` || ${marcaProducto}` : ""}</td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={item.cantidad}
                              onChange={(e) => {
                                const valor = parseInt(e.target.value, 10);
                                if (!isNaN(valor) && valor >= 1) {
                                  actualizarCantidad(item.id, valor);
                                }
                              }}
                              className="input-cantidad"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.costoUsd}
                              onChange={(e) => actualizarCosto(item.id, Number(e.target.value))}
                              placeholder="0.00"
                              className="input-costo"
                            />
                          </td>
                          <td className="text-right">C$ {costoCordoba.toFixed(2)}</td>
                          <td className="text-right">$ {subtotalUsd.toFixed(2)}</td>
                          <td className="text-right">C$ {subtotalCordoba.toFixed(2)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-eliminar"
                              onClick={() => eliminarItem(item.id)}
                              title="Eliminar producto"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="total-row">
                      <td colSpan={5} className="text-right">
                        <strong>TOTAL:</strong>
                      </td>
                      <td className="text-right">
                        <strong>$ {totalUsd.toFixed(2)}</strong>
                      </td>
                      <td className="text-right">
                        <strong>C$ {totalCordoba.toFixed(2)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="form-grid" style={{ marginTop: "1rem" }}>
                <div className="form-group">
                  <label>Proveedor:</label>
                  <input
                    type="text"
                    placeholder="Nombre del proveedor"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Tipo de Cambio (USD → C$):</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={tipoCambio}
                    readOnly
                    disabled
                    className="input-disabled"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Observaciones:</label>
                  <input
                    type="text"
                    placeholder="Notas adicionales (opcional)"
                    value={observacion}
                    onChange={(e) => setObservacion(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions">
                <button type="button" className="btn-guardar" onClick={handleSubmit}>
                  <FaSave /> Registrar Entrada de Compra
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <h2>Buscar Productos</h2>
          <div className="buscador">
            <FaSearch className="icono-buscar" />
            <input
              type="text"
              placeholder="Buscar por nombre, número de parte, marca o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {productosSeleccionados.size > 0 && (
            <div className="seleccion-info">
              <span className="seleccion-count">
                {productosSeleccionados.size} producto(s) seleccionado(s)
              </span>
              <button
                type="button"
                className="btn-agregar-seleccionados"
                onClick={agregarSeleccionados}
              >
                <FaPlus /> Agregar Seleccionados
              </button>
            </div>
          )}

          <DataTable
            columns={columnasProductos}
            data={productosFiltrados}
            pagination
            highlightOnHover
            pointerOnHover
            dense
            noDataComponent="No se encontraron productos"
            paginationRowsPerPageOptions={[10, 20, 50]}
          />
        </div>
        {/* Historial de entradas de compra */}
        <div className="card" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>Entradas registradas</h2>
            <div className="buscador" style={{ maxWidth: 340 }}>
              <FaSearch className="icono-buscar" />
              <input
                type="text"
                placeholder="Buscar por producto, parte u observaci\u00f3n..."
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
              />
            </div>
          </div>

          {loadingMovs ? (
            <div className="loading" style={{ marginTop: "1rem" }}>Cargando entradas...</div>
          ) : (
            <div className="tabla-wrapper" style={{ marginTop: "1rem" }}>
              <DataTable
                columns={columnasMovimientos}
                data={movimientosFiltrados}
                pagination
                highlightOnHover
                dense
                noDataComponent="A\u00fan no se registran entradas de compra"
                paginationRowsPerPageOptions={[10, 20, 50]}
              />
            </div>
          )}
        </div>

        {/* Modal edici\u00f3n */}
        {movimientoEditando && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "1rem",
            }}
            onClick={() => setMovimientoEditando(null)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "min(520px, 95vw)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
                <h3 style={{ margin: 0, color: "#0f172a" }}>
                  Editar entrada #{movimientoEditando.id}
                </h3>
                <button
                  onClick={() => setMovimientoEditando(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#475569",
                    fontSize: "1.1rem",
                  }}
                  title="Cerrar"
                >
                  <FaTimes />
                </button>
              </div>

              <p style={{ marginTop: 0, color: "#475569" }}>
                {movimientoEditando.inventario?.numeroParte || "-"} \u2014 {movimientoEditando.inventario?.nombre || "-"}
              </p>

              <div className="form-grid" style={{ marginTop: ".5rem" }}>
                <div className="form-group">
                  <label>Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={editCantidad}
                    onChange={(e) => setEditCantidad(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div className="form-group">
                  <label>Costo USD</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editCostoUsd}
                    onChange={(e) => setEditCostoUsd(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <small style={{ color: "#475569" }}>
                    C$ {(editCostoUsd * tipoCambio).toFixed(2)} (tc: {tipoCambio})
                  </small>
                </div>
                <div className="form-group full-width">
                  <label>Observaci\u00f3n</label>
                  <input
                    type="text"
                    value={editObservacion}
                    onChange={(e) => setEditObservacion(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: ".75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => setMovimientoEditando(null)}
                  style={{ padding: ".55rem 1rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-guardar"
                  onClick={guardarEdicion}
                  style={{ padding: ".55rem 1rem" }}
                >
                  <FaSave /> Guardar cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal eliminar */}
        {movimientoAEliminar && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              padding: "1rem",
            }}
            onClick={() => setMovimientoAEliminar(null)}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "min(420px, 95vw)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0 }}>Eliminar entrada</h3>
              <p style={{ color: "#475569" }}>
                \u00bfEliminar el movimiento #{movimientoAEliminar.id} de{" "}
                <strong>{movimientoAEliminar.inventario?.numeroParte || movimientoAEliminar.inventario?.nombre || "-"}</strong>?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: ".75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-guardar"
                  style={{ background: "#e2e8f0", color: "#0f172a" }}
                  onClick={() => setMovimientoAEliminar(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={confirmarEliminar}
                >
                  <FaTrash /> Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntradaCompra;
