// src/Views/EditarFactura.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaSave, FaArrowLeft, FaCashRegister, FaPlus, FaTrash, FaSearch } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { buildApiUrl } from "../api/constants";
import "./Facturacion.css";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function formatMoney(val: number, currency: string) {
  const symbol = currency === "USD" ? "$" : "C$";
  return `${symbol} ${Number(val || 0).toFixed(2)}`;
}

function formatDate(dateStr: any) {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-NI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type Venta = {
  id: number;
  numeroFactura?: string;
  clienteId?: number;
  fecha?: string;
  fechaVencimiento?: string;
  moneda?: string;
  tipoPago?: string;
  plazoDias?: number;
  tipoCambioValor?: number;
  pio?: string;
  totalCordoba?: number;
  totalDolar?: number;
  cancelada?: boolean;
  estadoPago?: string;
  detalles?: any[];
  cliente?: any;
};

const EditarFactura: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados editables
  const [numeroFactura, setNumeroFactura] = useState("");
  const [tipoPago, setTipoPago] = useState<"CONTADO" | "CREDITO">("CONTADO");
  const [plazoDias, setPlazoDias] = useState(0);
  const [pio, setPio] = useState("");
  const [detalles, setDetalles] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [mostrarBuscador, setMostrarBuscador] = useState(false);

  useEffect(() => {
    const cargarVenta = async () => {
      try {
        const token = getCookie("token");
        const response = await fetch(buildApiUrl(`/ventas/${id}`), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          toast.error("Error al cargar la factura");
          return;
        }

        const data = await response.json();
        console.log("Venta cargada completa:", JSON.stringify(data, null, 2));
        
        // Verificar si data es la venta directamente o viene en data.venta
        const ventaData = data.venta || data;
        
        setVenta(ventaData);
        setNumeroFactura(ventaData.numeroFactura || "");
        setTipoPago(ventaData.tipoPago || "CONTADO");
        setPlazoDias(ventaData.plazoDias || 0);
        setPio(ventaData.pio || "");
        setDetalles(ventaData.detalles || []);
      } catch (error) {
        console.error("Error al cargar venta:", error);
        toast.error("Error de red al cargar la factura");
      } finally {
        setLoading(false);
      }
    };

    cargarVenta();
  }, [id]);

  const handleGuardar = async () => {
    if (!venta) return;

    try {
      const token = getCookie("token");
      const payload = {
        numeroFactura,
        tipoPago,
        plazoDias,
        pio: pio.trim() || null,
        detalles: detalles.map((d) => ({
          id: d.id,
          cantidad: d.cantidad,
          precioUnitarioCordoba: d.precioUnitarioCordoba,
        })),
      };

      console.log("Guardando cambios:", payload);

      const response = await fetch(buildApiUrl(`/ventas/${id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        toast.error(`Error al guardar: ${error}`);
        return;
      }

      toast.success("✅ Factura actualizada correctamente");
      setTimeout(() => navigate("/ventas"), 1500);
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error de red al guardar los cambios");
    }
  };

  // Cargar productos disponibles
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const token = getCookie("token");
        const response = await fetch(buildApiUrl("/inventario"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setProductos(data.items || data.data || data || []);
        }
      } catch (error) {
        console.error("Error al cargar productos:", error);
      }
    };
    cargarProductos();
  }, []);

  const actualizarDetalle = (index: number, campo: string, valor: any) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = { ...nuevosDetalles[index], [campo]: valor };
    setDetalles(nuevosDetalles);
  };

  const eliminarDetalle = (index: number) => {
    const nuevosDetalles = detalles.filter((_, i) => i !== index);
    setDetalles(nuevosDetalles);
    toast.success("Producto eliminado");
  };

  const agregarProducto = (producto: any) => {
    const nuevoDetalle = {
      inventarioId: producto.id,
      inventario: {
        id: producto.id,
        nombre: producto.nombre,
        numeroParte: producto.numeroParte,
      },
      cantidad: 1,
      precioUnitarioCordoba: Number(producto.precioVentaSugeridoCordoba || 0),
      precioUnitarioDolar: Number(producto.precioVentaSugeridoDolar || 0),
    };
    setDetalles([...detalles, nuevoDetalle]);
    setMostrarBuscador(false);
    setBusquedaProducto("");
    toast.success("Producto agregado");
  };

  const productosFiltrados = productos.filter((p) =>
    [p.nombre, p.numeroParte, p.descripcion]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(busquedaProducto.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="view-container">
        <div className="fact-page">
          <header className="fact-header">
            <button className="back-btn" onClick={() => navigate("/ventas")}>
              <FaArrowLeft /> Volver
            </button>
            <h1>Cargando...</h1>
          </header>
        </div>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="view-container">
        <div className="fact-page">
          <header className="fact-header">
            <button className="back-btn" onClick={() => navigate("/ventas")}>
              <FaArrowLeft /> Volver
            </button>
            <h1>Factura no encontrada</h1>
          </header>
        </div>
      </div>
    );
  }

  const estaPagada = venta?.cancelada === true || venta?.estadoPago === "PAGADO";

  return (
    <div className="view-container">
      <ToastContainer />
      <div className="fact-page">
        <header className="fact-header">
          <button className="back-btn" onClick={() => navigate("/ventas")}>
            <FaArrowLeft /> Volver
          </button>
          <FaCashRegister className="icon" />
          <div>
            <h1>Editar Factura #{venta.numeroFactura || venta.id}</h1>
          </div>
        </header>

        <div className="fact-content">
          <div className="card">
            <h2 style={{ marginBottom: "1.5rem", color: "#001a33" }}>
              Información General
            </h2>

            <div className="grid-3">
              <label>
                Cliente
                <input
                  type="text"
                  value={venta.cliente?.nombre || "N/A"}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>

              <label>
                Empresa
                <input
                  type="text"
                  value={venta.cliente?.empresa || "N/A"}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>

              <label>
                RUC
                <input
                  type="text"
                  value={venta.cliente?.ruc || "N/A"}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <label>
                Número de Factura
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                />
              </label>

              <label>
                Fecha
                <input
                  type="text"
                  value={formatDate(venta.fecha)}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>

              <label>
                Fecha Vencimiento
                <input
                  type="text"
                  value={formatDate(venta.fechaVencimiento)}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <label>
                Moneda
                <input
                  type="text"
                  value={venta.moneda || "N/A"}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>

              <label>
                Tipo de Pago
                <select
                  value={tipoPago}
                  onChange={(e) => setTipoPago(e.target.value as "CONTADO" | "CREDITO")}
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
                  onChange={(e) => setPlazoDias(Number(e.target.value))}
                  disabled={tipoPago !== "CREDITO"}
                />
              </label>
            </div>

            <div className="grid-3" style={{ marginTop: "1rem" }}>
              <label>
                Tipo de Cambio
                <input
                  type="text"
                  value={Number(venta.tipoCambioValor || 0).toFixed(4)}
                  disabled
                  style={{ background: "#f5f5f5" }}
                />
              </label>

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
                Estado
                <input
                  type="text"
                  value={estaPagada ? "PAGADA" : "PENDIENTE"}
                  disabled
                  style={{
                    background: estaPagada ? "#dcfce7" : "#fee2e2",
                    color: estaPagada ? "#166534" : "#991b1b",
                    fontWeight: "bold",
                  }}
                />
              </label>
            </div>

            <div style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, color: "#001a33" }}>
                  Detalles de Productos
                </h3>
                <button
                  type="button"
                  onClick={() => setMostrarBuscador(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#0b58f0",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaPlus /> Agregar Producto
                </button>
              </div>

              {detalles && detalles.length > 0 ? (
                <div className="items-container">
                  <div className="items-header">
                    <span>Producto</span>
                    <span>Cant</span>
                    <span>Precio C$</span>
                    <span>Subtotal</span>
                    <span>Acciones</span>
                  </div>

                  {detalles.map((detalle: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 120px 160px 160px 100px",
                        gap: ".9rem",
                        alignItems: "center",
                        padding: ".75rem 0",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div>
                        <strong>{detalle.inventario?.numeroParte || "-"}</strong>
                        <br />
                        <span style={{ fontSize: "0.9rem", color: "#666" }}>
                          {detalle.inventario?.nombre || "Producto"}
                        </span>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min={1}
                          value={detalle.cantidad}
                          onChange={(e) =>
                            actualizarDetalle(index, "cantidad", Number(e.target.value))
                          }
                          style={{
                            width: "80px",
                            padding: "0.4rem",
                            textAlign: "center",
                            border: "1px solid #b8c6e0",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={Number(detalle.precioUnitarioCordoba || 0).toFixed(2)}
                          onChange={(e) =>
                            actualizarDetalle(
                              index,
                              "precioUnitarioCordoba",
                              Number(e.target.value)
                            )
                          }
                          style={{
                            width: "120px",
                            padding: "0.4rem",
                            textAlign: "center",
                            border: "1px solid #b8c6e0",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                      <div style={{ textAlign: "center", fontWeight: "700" }}>
                        {formatMoney(
                          Number(detalle.cantidad || 0) *
                            Number(detalle.precioUnitarioCordoba || 0),
                          "NIO"
                        )}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => eliminarDetalle(index)}
                          style={{
                            padding: "0.4rem 0.6rem",
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                          title="Eliminar producto"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "#999", fontStyle: "italic" }}>
                  No hay productos en esta factura
                </p>
              )}
            </div>

            {/* Modal de búsqueda de productos */}
            {mostrarBuscador && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                }}
                onClick={() => setMostrarBuscador(false)}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    width: "90%",
                    maxWidth: "800px",
                    maxHeight: "80vh",
                    overflow: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ margin: 0 }}>
                      <FaSearch /> Buscar Producto
                    </h3>
                    <button
                      onClick={() => setMostrarBuscador(false)}
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Cerrar
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Buscar por nombre o número de parte..."
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      border: "1px solid #b8c6e0",
                      borderRadius: "8px",
                      marginBottom: "1rem",
                      fontSize: "1rem",
                    }}
                  />

                  <div style={{ maxHeight: "400px", overflow: "auto" }}>
                    {productosFiltrados.length > 0 ? (
                      productosFiltrados.map((producto) => (
                        <div
                          key={producto.id}
                          style={{
                            padding: "0.75rem",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            marginBottom: "0.5rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <strong>{producto.numeroParte}</strong> - {producto.nombre}
                            <br />
                            <small style={{ color: "#666" }}>
                              Stock: {producto.stockActual} | Precio: C$ {Number(producto.precioVentaSugeridoCordoba || 0).toFixed(2)}
                            </small>
                          </div>
                          <button
                            onClick={() => agregarProducto(producto)}
                            style={{
                              padding: "0.5rem 1rem",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            Agregar
                          </button>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: "center", color: "#999" }}>
                        No se encontraron productos
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="resumen-actions-container" style={{ marginTop: "2rem" }}>
              <div className="resumen">
                <div className="right">
                  <div className="row">
                    <span>Total en Córdobas</span>
                    <b style={{ color: "#166534" }}>
                      {formatMoney(Number(venta.totalCordoba || 0), "NIO")}
                    </b>
                  </div>
                  <div className="row total">
                    <span>Total en Dólares</span>
                    <b style={{ color: "#1e40af" }}>
                      {formatMoney(Number(venta.totalDolar || 0), "USD")}
                    </b>
                  </div>
                </div>
              </div>

              <div className="actions">
                <button type="button" className="primary" onClick={handleGuardar}>
                  <FaSave /> Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarFactura;
