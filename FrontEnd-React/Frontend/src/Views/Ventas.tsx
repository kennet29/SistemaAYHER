// src/Views/Ventas.tsx - Historial de Ventas
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { FaEye, FaTimes, FaFileExcel } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Ventas.css";
import { fmtDate } from "../utils/dates";
import { buildApiUrl } from "../api/constants";
import ExcelJS from "exceljs";
import { generateInvoiceExcel, type InvoiceExcelData } from "./GenerateInvoiceExcel";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const API_VENTAS = buildApiUrl("/ventas");
const API_CONFIGURACION = buildApiUrl("/configuracion");
const API_METODOS_PAGO = buildApiUrl("/metodos-pago");

type Venta = {
  id: number;
  numeroFactura?: string | null;
  tipoPago?: string | null;
  plazoDias?: number | null;
  fecha?: string | Date;
  fechaVencimiento?: string | Date | null;
  totalCordoba?: number | null;
  totalDolar?: number | null;
  tipoCambioValor?: number | null;
  cliente?: { nombre?: string | null } | null;
  detalles?: any[];
  cancelada?: boolean | null;
  estadoPago?: string | null;
  pio?: string | null;
  moneda?: string | null;
};

const Ventas: React.FC = () => {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [q, setQ] = useState("");
  const [ventaSel, setVentaSel] = useState<Venta | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ventaAPagar, setVentaAPagar] = useState<Venta | null>(null);
  const [configuracion, setConfiguracion] = useState<any>(null);
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [showNumeroFacturaModal, setShowNumeroFacturaModal] = useState(false);
  const [ventaParaExcel, setVentaParaExcel] = useState<Venta | null>(null);
  const [numeroFacturaInicial, setNumeroFacturaInicial] = useState<string>('');
  const [monedaExcel, setMonedaExcel] = useState<'NIO' | 'USD'>('NIO');

  const ventaTitle = useMemo(() => {
    if (!ventaSel) return '';
    return ventaSel.numeroFactura ? `#${ventaSel.numeroFactura}` : `ID ${ventaSel.id}`;
  }, [ventaSel]);
  const detallesJson = useMemo(() => (
    ventaSel?.detalles ? JSON.stringify(ventaSel.detalles, null, 2) : ''
  ), [ventaSel]);

  // usando util fmtDate

  const cargarVentas = () => {
    fetch(API_VENTAS, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setVentas(j.ventas ?? j.data ?? []));
  };

  const solicitarConfirmacion = (venta: Venta) => {
    setVentaAPagar(venta);
    setShowConfirmModal(true);
  };

  const marcarComoPagada = async () => {
    if (!ventaAPagar) return;

    setShowConfirmModal(false);

    try {
      const token = getCookie("token");
      const resp = await fetch(buildApiUrl(`/ventas/${ventaAPagar.id}/cancelada`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ cancelada: true }),
      });

      if (!resp.ok) {
        toast.error("Error al marcar como pagada");
        return;
      }

      toast.success("✓ Factura marcada como pagada");
      cargarVentas();
    } catch (error) {
      toast.error("Error al marcar como pagada");
    } finally {
      setVentaAPagar(null);
    }
  };

  useEffect(() => {
    cargarVentas();
    // Cargar configuración
    fetch(API_CONFIGURACION, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((data) => setConfiguracion(data))
      .catch(() => setConfiguracion(null));
    // Cargar métodos de pago
    fetch(API_METODOS_PAGO, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((data) => setMetodosPago(data.metodos || []))
      .catch(() => setMetodosPago([]));
  }, []);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ventas;
    return ventas.filter((v) => {
      // Búsqueda por ID
      if ((v.id?.toString() ?? "").includes(query)) return true;
      
      // Búsqueda por cliente
      if ((v.cliente?.nombre ?? "").toLowerCase().includes(query)) return true;
      
      // Búsqueda por número de factura y rango de consecutivos
      if (v.numeroFactura) {
        const numeroInicial = parseInt(v.numeroFactura) || 0;
        const numPaginas = Math.ceil((v.detalles?.length || 0) / 15);
        const numeroFinal = numeroInicial + numPaginas - 1;
        
        // Buscar en el número inicial
        if (v.numeroFactura.toLowerCase().includes(query)) return true;
        
        // Buscar en el rango (si el query es un número)
        const queryNum = parseInt(query);
        if (!isNaN(queryNum) && queryNum >= numeroInicial && queryNum <= numeroFinal) {
          return true;
        }
        
        // Buscar en el número final formateado
        const numeroFinalStr = numeroFinal.toString().padStart(6, '0');
        if (numeroFinalStr.includes(query)) return true;
      }
      
      return false;
    });
  }, [q, ventas]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, v) => {
        acc.c += Number(v.totalCordoba || 0);
        acc.d += Number(v.totalDolar || 0);
        return acc;
      },
      { c: 0, d: 0 }
    );
  }, [rows]);

  const solicitarNumeroFactura = async (venta: Venta) => {
    // Calcular cuántas páginas tendrá la factura
    const numPaginas = Math.ceil((venta.detalles?.length || 0) / 15);
    setVentaParaExcel(venta);
    
    // Establecer la moneda por defecto basada en la venta
    setMonedaExcel((venta.moneda as 'NIO' | 'USD') || 'NIO');
    
    // Si la venta ya tiene un número de factura, sugerirlo (reimpresión)
    if (venta.numeroFactura) {
      setNumeroFacturaInicial(venta.numeroFactura);
      setShowNumeroFacturaModal(true);
      return;
    }
    
    // Si no tiene número, obtener el siguiente disponible (primera impresión)
    try {
      const response = await fetch(buildApiUrl('/configuracion/siguiente-numero-factura'), {
        headers: { Authorization: `Bearer ${getCookie("token")}` }
      });
      const data = await response.json();
      const siguienteNumero = data.siguienteNumero || 1;
      setNumeroFacturaInicial(siguienteNumero.toString().padStart(6, '0'));
    } catch (error) {
      console.error('Error al obtener siguiente número:', error);
      setNumeroFacturaInicial('000001');
    }
    
    setShowNumeroFacturaModal(true);
  };

  const descargarFacturaExcel = async () => {
    if (!ventaParaExcel) return;
    
    const venta = ventaParaExcel;
    setShowNumeroFacturaModal(false);

    try {
      // Guardar el número de factura en la base de datos
      if (numeroFacturaInicial && numeroFacturaInicial !== venta.numeroFactura) {
        try {
          const token = getCookie("token");
          await fetch(buildApiUrl(`/ventas/${venta.id}`), {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : "",
            },
            body: JSON.stringify({ numeroFactura: numeroFacturaInicial }),
          });
          // Actualizar la venta local
          venta.numeroFactura = numeroFacturaInicial;
        } catch (error) {
          console.error('Error al guardar número de factura:', error);
        }
      }

      const clienteNombre = (venta.cliente as any)?.empresa || venta.cliente?.nombre || 'N/A';
      const clienteDireccion = (venta.cliente as any)?.direccion || '';
      const clienteRuc = (venta.cliente as any)?.ruc || '';
      const pio = venta.pio || '';
      const moneda = monedaExcel; // Usar la moneda seleccionada por el usuario
      const montoTotal = moneda === 'USD' ? (Number(venta.totalDolar) || 0) : (Number(venta.totalCordoba) || 0);

      const plazo = venta.tipoPago === 'CONTADO' ? 'Contado' : `${venta.plazoDias || 0} días`;


      // Convertir número a texto
      const numeroATexto = (num: number): string => {
        const unidades = ['', 'Uno', 'Dos', 'Tres', 'Cuatro', 'Cinco', 'Seis', 'Siete', 'Ocho', 'Nueve'];
        const decenas = ['', '', 'Veinte', 'Treinta', 'Cuarenta', 'Cincuenta', 'Sesenta', 'Setenta', 'Ochenta', 'Noventa'];
        const especiales = ['Diez', 'Once', 'Doce', 'Trece', 'Catorce', 'Quince', 'Dieciséis', 'Diecisiete', 'Dieciocho', 'Diecinueve'];
        const centenas = ['', 'Ciento', 'Doscientos', 'Trescientos', 'Cuatrocientos', 'Quinientos', 'Seiscientos', 'Setecientos', 'Ochocientos', 'Novecientos'];

        if (num === 0) return 'Cero';
        if (num === 100) return 'Cien';

        let texto = '';
        const miles = Math.floor(num / 1000);
        const resto = num % 1000;

        if (miles > 0) {
          if (miles === 1) texto += 'Mil ';
          else texto += numeroATexto(miles) + ' Mil ';
        }

        const cent = Math.floor(resto / 100);
        const dec = Math.floor((resto % 100) / 10);
        const uni = resto % 10;

        if (cent > 0) texto += centenas[cent] + ' ';
        if (dec === 1 && uni > 0) texto += especiales[uni] + ' ';
        else {
          if (dec > 0) texto += decenas[dec] + ' ';
          if (uni > 0 && dec !== 1) texto += unidades[uni] + ' ';
        }

        return texto.trim();
      };

      const montoParaTexto = moneda === 'USD' ? Number(venta.totalDolar || 0) : Number(venta.totalCordoba || 0);
      const totalEntero = Math.floor(montoParaTexto);
      const totalDecimal = Math.round((montoParaTexto - totalEntero) * 100);
      const montoEnTexto = `${numeroATexto(totalEntero)}${totalDecimal > 0 ? ` con ${totalDecimal}/100` : ''}`;


      const excelDataItems = venta.detalles?.map((d: any) => {
        const cantidad = Number(d?.cantidad || 0);
        const numeroParte = d?.inventario?.numeroParte || '-';
        const producto = d?.inventario?.nombre || d?.producto?.nombre || '-';
        const precioUnitario = moneda === 'USD'
          ? Number(d?.precioUnitarioDolar || (d?.precioUnitarioCordoba || 0) / (venta.tipoCambioValor || 1))
          : Number(d?.precioUnitarioCordoba || 0);
        const subtotal = cantidad * precioUnitario;

        return {
          cantidad: cantidad,
          numeroParte: numeroParte,
          descripcion: producto,
          precioUnitario: precioUnitario,
          subtotal: subtotal
        }
      });

      const excelData: InvoiceExcelData = {
        clienteNombre: clienteNombre,
        clienteDireccion: clienteDireccion,
        clienteRuc: clienteRuc,
        numeroFactura: venta.numeroFactura,
        numeroFacturaInicial: parseInt(numeroFacturaInicial) || undefined,
        fecha: venta.fecha,
        fechaVencimiento: venta.tipoPago === 'CREDITO' ? venta.fechaVencimiento : null,
        montoTotal: montoTotal,
        montoEnTexto: montoEnTexto,
        plazo: plazo,
        pio: pio,
        moneda: moneda,
        direccion: configuracion?.direccion,
        razonSocial: configuracion?.razonSocial,
        metodo: metodosPago.length > 0 ? metodosPago[0] : null,
        items: excelDataItems
      }
      const blob = await generateInvoiceExcel(excelData);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura_${numeroFacturaInicial || venta.id}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      // Solo actualizar el consecutivo si es un número nuevo (no reimpresión)
      const esReimpresion = venta.numeroFactura === numeroFacturaInicial;
      
      if (!esReimpresion) {
        // Calcular el último número usado (número inicial + páginas - 1)
        const numPaginas = Math.ceil((venta.detalles?.length || 0) / 15);
        const ultimoNumeroUsado = parseInt(numeroFacturaInicial) + numPaginas - 1;

        // Actualizar el último número de factura en la configuración
        try {
          const token = getCookie("token");
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
      }

      toast.success('✅ Factura descargada');
      
      // Recargar las ventas para actualizar la tabla
      cargarVentas();
      
      // Limpiar estados
      setVentaParaExcel(null);
      setNumeroFacturaInicial('');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      toast.error('❌ Error al generar la factura');
    }
  };

  const columns: any = [
    { name: "ID", selector: (r: Venta) => Number(r.id), width: "100px" },
    {
      name: "Consecutivos", 
      selector: (r: Venta) => r.numeroFactura ?? "-", 
      sortable: true,
      width: "180px",
      cell: (r: Venta) => {
        if (!r.numeroFactura) {
          return <span className="chip chip--muted">Sin asignar</span>;
        }
        
        const numPaginas = Math.ceil((r.detalles?.length || 0) / 15);
        const numeroInicial = parseInt(r.numeroFactura) || 0;
        const numeroFinal = numeroInicial + numPaginas - 1;
        
        if (numPaginas > 1) {
          return (
            <span 
              className="chip" 
              style={{ 
                background: "#fef3c7", 
                borderColor: "#fbbf24", 
                color: "#92400e",
                fontWeight: 600,
                fontSize: "0.85rem"
              }}
              title={`${numPaginas} páginas = ${numPaginas} números consecutivos`}
            >
              {r.numeroFactura} - {numeroFinal.toString().padStart(6, '0')}
            </span>
          );
        }
        
        return (
          <span 
            className="chip" 
            style={{ 
              background: "#dcfce7", 
              borderColor: "#86efac", 
              color: "#166534",
              fontWeight: 600,
              fontSize: "0.85rem"
            }}
          >
            {r.numeroFactura}
          </span>
        );
      }
    },
    { name: "Cliente", selector: (r: Venta) => r.cliente?.nombre ?? "-", sortable: true, width: "200px" },
    { name: "Tipo pago", selector: (r: Venta) => r.tipoPago ?? "-", width: "140px" },
    {
      name: "Estado",
      selector: (r: Venta) => r.estadoPago ?? "-",
      width: "140px",
      cell: (r: Venta) => {
        const estaPagada = r.cancelada === true || r.estadoPago === "PAGADO";
        const esCredito = r.tipoPago === "CREDITO";

        if (estaPagada) {
          return <span className="chip" style={{ background: "#dcfce7", borderColor: "#86efac", color: "#166534" }}>✓ Pagada</span>;
        } else if (esCredito) {
          return <span className="chip chip--danger">Pendiente</span>;
        } else {
          return <span className="chip">Contado</span>;
        }
      }
    },
    {
      id: "fecha", name: "Fecha", selector: (r: Venta) => (r.fecha as any), sortable: true, width: "120px",
      cell: (r: Venta) => <span>{fmtDate(r.fecha as any)}</span>
    },
    {
      name: "Vence", selector: (r: Venta) => (r.fechaVencimiento as any), sortable: true, width: "120px",
      cell: (r: Venta) => <span>{fmtDate(r.fechaVencimiento as any)}</span>
    },
    {
      name: "Plazo", selector: (r: Venta) => r.plazoDias ?? 0, width: "140px", right: true,
      cell: (r: Venta) => {
        const venc = r.fechaVencimiento ? new Date(r.fechaVencimiento as any) : null;
        const today = new Date();
        const norm = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const overdue = venc ? norm(venc) < norm(today) : false;
        if (overdue) return <span className="chip chip--danger">Plazo terminado</span>;
        if (r.plazoDias == null) return <span className="chip chip--muted">-</span>;
        return <span className="chip">{r.plazoDias} dias</span>;
      }
    },
    {
      name: "Total C$", selector: (r: Venta) => r.totalCordoba ?? 0, right: true,
      cell: (r: Venta) => <span className="num-right">C$ {(Number(r.totalCordoba) || 0).toFixed(2)}</span>, width: "160px"
    },
    {
      name: "Total $", selector: (r: Venta) => r.totalDolar ?? 0, right: true,
      cell: (r: Venta) => <span className="num-right">$ {(Number(r.totalDolar) || 0).toFixed(2)}</span>, width: "140px"
    },
    { name: "# Items", selector: (r: Venta) => r.detalles?.length ?? 0, width: "110px" },
    {
      name: "PIO", selector: (r: Venta) => r.pio ?? "-", width: "150px",
      cell: (r: Venta) => <span>{r.pio || "-"}</span>
    },
    {
      name: "Acciones",
      button: true,
      width: "300px",
      cell: (r: Venta) => (
        <div style={{ display: "flex", gap: ".4rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setVentaSel((prev) => (prev?.id === r.id ? null : r))}
            title="Ver detalles"
            style={{
              padding: ".35rem .6rem",
              borderRadius: "8px",
              border: "1px solid #bcd3ff",
              background: "#eaf1ff",
              color: "#003c8a",
              display: "inline-flex",
              alignItems: "center",
              gap: ".4rem",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <FaEye /> Ver
          </button>
          <button
            onClick={() => solicitarNumeroFactura(r)}
            title="Descargar factura en Excel"
            style={{
              padding: ".35rem .6rem",
              borderRadius: "8px",
              border: "1px solid #10b981",
              background: "#d1fae5",
              color: "#065f46",
              display: "inline-flex",
              alignItems: "center",
              gap: ".4rem",
              fontWeight: 600,
              fontSize: "0.85rem",
            }}
          >
            <FaFileExcel /> Excel
          </button>
          {r.tipoPago === "CREDITO" && !(r.cancelada === true || r.estadoPago === "PAGADO") && (
            <button
              onClick={() => solicitarConfirmacion(r)}
              title="Marcar como pagada"
              style={{
                padding: ".35rem .6rem",
                borderRadius: "8px",
                border: "1px solid #86efac",
                background: "#dcfce7",
                color: "#166534",
                display: "inline-flex",
                alignItems: "center",
                gap: ".4rem",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              ✓ Pagada
            </button>
          )}
        </div>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
    },
  ];

  return (
    <div className="fact-page ventas-page">
      <header className="fact-header">
        <button className="back-btn" title="Volver" onClick={() => navigate(-1)}>Volver</button>
        <div><h1>Historial de Ventas</h1></div>
      </header>

      <div className="fact-content" style={{ width: "100%" }}>
        <div className="card">
          <div className="ventas-center">
            <div className="toolbar">
              <label>
                Buscar
                <input placeholder="por ID, factura o cliente" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "260px" }} />
              </label>
              <button className="icon-btn" title="Limpiar" onClick={() => setQ("")}>✕</button>
              <div className="flex-spacer" />
              <div className="metrics">
                <span className="chip">Ventas: {rows.length}</span>
                <span className="chip">Total C$ {totals.c.toFixed(2)}</span>
                <span className="chip">Total $ {totals.d.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="ventas-table-wrap">
            <div className="ventas-table">
              <DataTable
                columns={columns}
                data={rows}
                pagination
                fixedHeader
                fixedHeaderScrollHeight="500px"
                highlightOnHover
                dense
                customStyles={{
                  table: { style: { minWidth: "1100px" } },
                  headCells: { style: { justifyContent: "center", textAlign: "center" } },
                  cells: { style: { justifyContent: "center", textAlign: "center" } },
                }}
                defaultSortFieldId="fecha"
                defaultSortAsc={false}
                paginationRowsPerPageOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
          {ventaSel && <div className="ventas-separator" />}
          {ventaSel && false && (
            <div className="picker-overlay" onClick={() => setVentaSel(null)}>
              <div className="picker-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 90%)" }}>
                <div className="picker-top">
                  <div className="picker-title">
                    <FaEye /> Detalles de la Venta {ventaTitle}
                  </div>
                  <button className="picker-close" onClick={() => setVentaSel(null)} title="Cerrar">
                    <FaTimes />
                  </button>
                </div>

                <div className="rem-modal">
                  {(ventaSel?.detalles?.length ?? 0) === 0 && (
                    <div style={{ padding: "0.5rem 1rem" }}>Sin detalles para mostrar.</div>
                  )}

                  {(ventaSel?.detalles?.length ?? 0) > 0 && (
                    <div className="rem-table">
                      <div className="rem-head">
                        <div>Producto</div>
                        <div>Cant</div>
                        <div>Precio</div>
                        <div>Subtotal</div>
                      </div>
                      <div className="rem-body">
                        {ventaSel?.detalles?.map((d, idx) => {
                          const nombre =
                            d?.inventario?.nombre ?? d?.producto?.nombre ?? d?.producto ?? d?.nombre ?? d?.descripcion ?? "-";
                          const cantidad = Number(d?.cantidad ?? d?.cant ?? d?.unidades ?? 0);
                          const precio = Number(
                            d?.precioUnitarioCordoba ??
                            d?.precio ?? d?.precioUnitario ?? d?.precioVenta ?? d?.precioCordoba ?? d?.precioDolar ?? 0
                          );
                          const subtotal = Number(
                            d?.subtotal ?? d?.subtotalCordoba ?? (cantidad && precio ? cantidad * precio : 0)
                          );
                          return (
                            <div className="rem-row" key={idx}>
                              <div className="rem-col rem-col--product">
                                <span className="rem-name" title={typeof nombre === 'string' ? nombre : ''}>{typeof nombre === 'string' ? nombre : "-"}</span>
                              </div>
                              <div className="rem-col rem-col--qty">{cantidad || 0}</div>
                              <div className="rem-col rem-col--price">
                                {precio ? ("C$ " + precio.toFixed(2)) : "-"}
                              </div>
                              <div className="rem-col rem-col--action">
                                {subtotal ? ("C$ " + subtotal.toFixed(2)) : "-"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {(ventaSel?.detalles?.length ?? 0) > 0 && (
                    <details style={{ marginTop: ".75rem" }}>
                      <summary>Ver datos crudos</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: ".85rem", background: "#f8fafc", padding: ".5rem", borderRadius: 8 }}>
                        {detallesJson}
                      </pre>
                    </details>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: ".9rem" }}>
                    <button
                      onClick={() => setVentaSel(null)}
                      title="Cerrar"
                      style={{
                        padding: ".55rem 1rem",
                        borderRadius: 8,
                        border: "1px solid #bcd3ff",
                        background: "#eaf1ff",
                        color: "#003c8a",
                        fontWeight: 600,
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {ventaSel && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: ".75rem", marginBottom: ".5rem" }}>
                <button
                  onClick={() => setVentaSel(null)}
                  title="Ocultar detalles"
                  style={{
                    padding: ".45rem .85rem",
                    borderRadius: 8,
                    border: "1px solid #bcd3ff",
                    background: "#eaf1ff",
                    color: "#003c8a",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".4rem",
                  }}
                >
                  <FaTimes /> Ocultar
                </button>
                <h3 style={{ margin: 0 }}>
                  Detalles de la Venta {ventaSel.numeroFactura ? `#${ventaSel.numeroFactura}` : `ID ${ventaSel.id}`}
                </h3>
              </div>

              <div className="ventas-table-wrap">
                <div className="ventas-table">
                  <DataTable
                    columns={[
                      { name: "Producto", selector: (d: any) => d.producto, grow: 2 },
                      { name: "Cant", selector: (d: any) => d.cantidad, width: "90px", right: true },
                      { name: "Precio C$", selector: (d: any) => d.precioCordoba, width: "150px", right: true, cell: (d: any) => <span className="num-right">C$ {Number(d.precioCordoba || 0).toFixed(2)}</span> },
                      { name: "Precio $", selector: (d: any) => d.precioDolar, width: "140px", right: true, cell: (d: any) => <span className="num-right">$ {Number(d.precioDolar || 0).toFixed(2)}</span> },
                      { name: "Subtotal C$", selector: (d: any) => d.subtotalCordoba, width: "170px", right: true, cell: (d: any) => <span className="num-right">C$ {Number(d.subtotalCordoba || 0).toFixed(2)}</span> },
                      { name: "Subtotal $", selector: (d: any) => d.subtotalDolar, width: "160px", right: true, cell: (d: any) => <span className="num-right">$ {Number(d.subtotalDolar || 0).toFixed(2)}</span> },
                    ]}
                    data={(ventaSel.detalles ?? []).map((d: any) => {
                      const producto = d?.inventario?.nombre ?? d?.producto?.nombre ?? d?.producto ?? d?.nombre ?? d?.descripcion ?? "-";
                      const cantidad = Number(d?.cantidad ?? d?.cant ?? d?.unidades ?? 0);
                      const tc = Number(ventaSel?.tipoCambioValor || 0);
                      let precioCordoba = Number(
                        d?.precioUnitarioCordoba ?? d?.precioCordoba ?? d?.precio ?? d?.precioUnitario ?? d?.precioVenta ?? 0
                      );
                      let precioDolar = Number(d?.precioUnitarioDolar ?? d?.precioDolar ?? 0);
                      if (!precioCordoba && precioDolar && tc > 0) precioCordoba = precioDolar * tc;
                      if (!precioDolar && precioCordoba && tc > 0) precioDolar = precioCordoba / tc;
                      const subtotalCordoba = cantidad * (precioCordoba || 0);
                      const subtotalDolar = cantidad * (precioDolar || 0);
                      return { producto, cantidad, precioCordoba, precioDolar, subtotalCordoba, subtotalDolar };
                    })}
                    dense
                    highlightOnHover
                    pagination
                    customStyles={{
                      table: { style: { minWidth: "900px" } },
                      headCells: { style: { justifyContent: "center", textAlign: "center" } },
                      cells: { style: { justifyContent: "center", textAlign: "center" } },
                    }}
                  />
                </div>
              </div>
              {(() => {
                const tc = Number(ventaSel?.tipoCambioValor || 0);
                const totals = (ventaSel?.detalles ?? []).reduce(
                  (acc: any, d: any) => {
                    const cantidad = Number(d?.cantidad ?? d?.cant ?? d?.unidades ?? 0);
                    let precioCordoba = Number(
                      d?.precioUnitarioCordoba ?? d?.precioCordoba ?? d?.precio ?? d?.precioUnitario ?? d?.precioVenta ?? 0
                    );
                    let precioDolar = Number(d?.precioUnitarioDolar ?? d?.precioDolar ?? 0);
                    if (!precioCordoba && precioDolar && tc > 0) precioCordoba = precioDolar * tc;
                    if (!precioDolar && precioCordoba && tc > 0) precioDolar = precioCordoba / tc;
                    acc.c += cantidad * (precioCordoba || 0);
                    acc.d += cantidad * (precioDolar || 0);
                    return acc;
                  },
                  { c: 0, d: 0 }
                );
                const totalC = Number(ventaSel?.totalCordoba ?? totals.c);
                const totalD = Number(
                  ventaSel?.totalDolar ?? ((totalC && tc > 0) ? totalC / tc : totals.d)
                );
                return (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginTop: ".75rem" }}>
                    <div style={{ background: "#fff", border: "1px solid #e3e9f5", borderRadius: 8, padding: ".75rem 1rem", minWidth: 280 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: ".25rem 0" }}>
                        <span>Total C$</span>
                        <strong>C$ {totalC.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: ".25rem 0" }}>
                        <span>Total $</span>
                        <strong>$ {totalD.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación */}
      {showConfirmModal && ventaAPagar && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
            minWidth: "400px",
            maxWidth: "500px",
          }}>
            <h3 style={{ marginTop: 0, color: "#003399" }}>Confirmar Pago</h3>
            <p style={{ marginBottom: "1.5rem", color: "#475569" }}>
              ¿Deseas marcar la factura <strong>{ventaAPagar.numeroFactura || `#${ventaAPagar.id}`}</strong> como pagada?
            </p>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.5rem" }}>
              Cliente: <strong>{ventaAPagar.cliente?.nombre || "N/A"}</strong><br />
              Total: <strong>C$ {(Number(ventaAPagar.totalCordoba) || 0).toFixed(2)}</strong>
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setVentaAPagar(null);
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={marcarComoPagada}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                ✓ Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para solicitar número de factura */}
      {showNumeroFacturaModal && ventaParaExcel && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 9999,
        }}>
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "12px",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
            minWidth: "450px",
            maxWidth: "550px",
          }}>
            <h3 style={{ marginTop: 0, color: "#003399" }}>
              {ventaParaExcel.numeroFactura ? '🔄 Reimpresión de Factura' : '📄 Nueva Factura'}
            </h3>
            
            {ventaParaExcel.numeroFactura && (
              <div style={{ 
                background: "#dcfce7", 
                border: "2px solid #86efac", 
                borderRadius: "8px", 
                padding: "0.75rem 1rem", 
                marginBottom: "1rem",
                color: "#166534",
                fontWeight: 600
              }}>
                ✓ Esta factura ya fue impresa anteriormente con el número: <strong>{ventaParaExcel.numeroFactura}</strong>
              </div>
            )}
            
            <p style={{ marginBottom: "1rem", color: "#475569" }}>
              Esta factura tiene <strong>{ventaParaExcel.detalles?.length || 0} artículos</strong> y se imprimirá en{' '}
              <strong>{Math.ceil((ventaParaExcel.detalles?.length || 0) / 15)} página(s)</strong>.
            </p>
            
            <div style={{ 
              background: "#f1f5f9", 
              border: "2px solid #cbd5e1", 
              borderRadius: "8px", 
              padding: "0.75rem 1rem", 
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span style={{ fontWeight: 600, color: "#334155" }}>Monto total:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                {monedaExcel === 'USD' 
                  ? `$ ${(Number(ventaParaExcel.totalDolar) || 0).toFixed(2)}`
                  : `C$ ${(Number(ventaParaExcel.totalCordoba) || 0).toFixed(2)}`
                }
              </span>
            </div>
            
            {!ventaParaExcel.numeroFactura && (
              <p style={{ marginBottom: "1.5rem", color: "#dc2626", fontSize: "0.9rem", fontWeight: 600 }}>
                ⚠️ Cada página consumirá un número de factura consecutivo
              </p>
            )}
            
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#334155" }}>
                Moneda para la factura:
              </label>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <label style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  padding: "0.75rem",
                  border: monedaExcel === 'NIO' ? "3px solid #10b981" : "2px solid #e2e8f0",
                  borderRadius: "8px",
                  background: monedaExcel === 'NIO' ? "#d1fae5" : "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}>
                  <input
                    type="radio"
                    name="moneda"
                    value="NIO"
                    checked={monedaExcel === 'NIO'}
                    onChange={(e) => setMonedaExcel(e.target.value as 'NIO' | 'USD')}
                    style={{ cursor: "pointer" }}
                  />
                  <span>Córdobas (C$)</span>
                </label>
                <label style={{ 
                  flex: 1, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.5rem",
                  padding: "0.75rem",
                  border: monedaExcel === 'USD' ? "3px solid #10b981" : "2px solid #e2e8f0",
                  borderRadius: "8px",
                  background: monedaExcel === 'USD' ? "#d1fae5" : "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}>
                  <input
                    type="radio"
                    name="moneda"
                    value="USD"
                    checked={monedaExcel === 'USD'}
                    onChange={(e) => setMonedaExcel(e.target.value as 'NIO' | 'USD')}
                    style={{ cursor: "pointer" }}
                  />
                  <span>Dólares ($)</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#334155" }}>
                Número de factura inicial:
              </label>
              <input
                type="text"
                value={numeroFacturaInicial}
                onChange={(e) => setNumeroFacturaInicial(e.target.value)}
                placeholder="Ej: 001234"
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontFamily: "monospace",
                  textAlign: "center",
                  letterSpacing: "0.1em"
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    descargarFacturaExcel();
                  }
                }}
              />
              <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.5rem" }}>
                Números que se usarán: {numeroFacturaInicial || '?'} hasta{' '}
                {numeroFacturaInicial ? (parseInt(numeroFacturaInicial) + Math.ceil((ventaParaExcel.detalles?.length || 0) / 15) - 1).toString().padStart(numeroFacturaInicial.length, '0') : '?'}
              </p>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowNumeroFacturaModal(false);
                  setVentaParaExcel(null);
                  setNumeroFacturaInicial('');
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#dc2626",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={descargarFacturaExcel}
                disabled={!numeroFacturaInicial}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: numeroFacturaInicial ? "#16a34a" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: numeroFacturaInicial ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                ✓ Generar Excel
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default Ventas;


