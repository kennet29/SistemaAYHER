// src/Views/EntradaCompra.tsx
import React, { useEffect, useMemo, useState } from "react";
import { FaShoppingCart, FaPlus, FaTrash, FaSave, FaSearch, FaHome } from "react-icons/fa";
import DataTable from "react-data-table-component";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./EntradaCompra.css";
import { buildApiUrl } from "../api/constants";
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

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.numeroParte?.toLowerCase().includes(q) ||
        p.descripcion?.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

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

      // Recargar inventario
      const headers = { Authorization: `Bearer ${getCookie("token")}` };
      fetch(API_PRODUCTOS, { headers })
        .then((r) => r.json())
        .then((data) => setProductos(data.items || data.data || []))
        .catch(() => toast.error("Error al actualizar inventario"));
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

                      return (
                        <tr key={item.id}>
                          <td>{item.numeroParte || "-"}</td>
                          <td>{item.nombre}</td>
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
              placeholder="Buscar por nombre, número de parte o descripción..."
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


      </div>
    </div>
  );
};

export default EntradaCompra;
