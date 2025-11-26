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
    return ventas.filter((v) =>
      (v.id?.toString() ?? "").includes(query) ||
      (v.numeroFactura ?? "").toLowerCase().includes(query) ||
      (v.cliente?.nombre ?? "").toLowerCase().includes(query)
    );
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

  const descargarFacturaExcel = async (venta: Venta) => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Configurar propiedades del workbook
      workbook.views = [{
        activeTab: 0,
        visibility: 'visible'
      }];
      
      const worksheet = workbook.addWorksheet('Factura');

      // Configurar tamaño de página A4 con saltos de página
      worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1, // Una página de alto
        margins: {
          left: 0.5 / 2.54,      // Convertir cm a pulgadas: 0.5 cm
          right: 0.8 / 2.54,     // 0.8 cm
          top: 0.4 / 2.54,       // 0.4 cm
          bottom: 0.9 / 2.54,    // 0.9 cm
          header: 0.8 / 2.54,    // 0.8 cm
          footer: 0.8 / 2.54     // 0.8 cm
        },
        printArea: 'A1:J40',
        horizontalCentered: false,
        verticalCentered: false,
        showGridLines: false
      };
      
      // Configurar zoom al 93% y vista de diseño de página
      worksheet.views = [{
        state: 'pageLayout',
        zoomScale: 93,
        zoomScaleNormal: 93,
        showGridLines: false,
        showRowColHeaders: true,
        showRuler: true
      }];

      // Configurar anchos de columnas según plantilla
      worksheet.columns = [
        { width: 3.86 },   // A
        { width: 9.14 },   // B
        { width: 18.14 },  // C
        { width: 29.14 },  // D
        { width: 9.14 },   // E
        { width: 17.86 },  // F
        { width: 14.14 },  // G
        { width: 8.14 },   // H
        { width: 8.14 },   // I
        { width: 8.14 },   // J
      ];

      const clienteNombre = venta.cliente?.empresa || venta.cliente?.nombre || 'N/A';
      const clienteDireccion = (venta.cliente as any)?.direccion || '';
      const clienteRuc = (venta.cliente as any)?.ruc || '';
      const pio = venta.pio || '';
      const moneda = venta.moneda || 'NIO';
      const simboloMoneda = moneda === 'USD' ? '$' : 'C$';
      const fecha = venta.fecha ? new Date(venta.fecha).toLocaleDateString() : '';
      const montoTotal = moneda === 'USD' ? (Number(venta.totalDolar) || 0) : (Number(venta.totalCordoba) || 0);
      const monto = montoTotal.toFixed(2);
      const plazo = venta.tipoPago === 'CONTADO' ? 'Contado' : `${venta.plazoDias || 0}`;


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
      
      const totalEntero = Math.floor(Number(venta.totalCordoba) || 0);
      const totalDecimal = Math.round(((Number(venta.totalCordoba) || 0) - totalEntero) * 100);
      const montoEnTexto = `${numeroATexto(totalEntero)}${totalDecimal > 0 ? ` con ${totalDecimal}/100` : ''} Córdobas`;

      // Configurar alturas de filas según plantilla
      worksheet.getRow(4).height = 74.25;
      worksheet.getRow(5).height = 12.75;
      worksheet.getRow(6).height = 12.75;
      worksheet.getRow(7).height = 11.25;
      worksheet.getRow(8).height = 12.75;
      worksheet.getRow(11).height = 15.75;

      // Calcular fecha de vencimiento
      const fechaVenc = venta.fechaVencimiento ? new Date(venta.fechaVencimiento).toLocaleDateString() : '';

      // Fila 5: Cliente, Code y Fecha
      worksheet.getCell('C5').value = 'CLIENTE:';
      worksheet.getCell('D5').value = clienteNombre;
      worksheet.getCell('E5').value = `Code:${venta.numeroFactura || ''}`;
      worksheet.getCell('F5').value = 'FECHA:';
      worksheet.getCell('G5').value = fecha;

      // Fila 6: Dirección y Monto
      worksheet.getCell('C6').value = 'DIRECCION:';
      worksheet.getCell('D6').value = clienteDireccion;
      worksheet.getCell('F6').value = 'MONTO:';
      worksheet.getCell('G6').value = `${simboloMoneda}${monto}`;

      // Fila 7: Continuación dirección y Plazo
      worksheet.getCell('F7').value = 'PLAZO:';
      worksheet.getCell('G7').value = `${plazo} dias`;

      // Fila 8: RUC, Orden de Compra y Vencimiento
      worksheet.getCell('C8').value = 'RUC:';
      worksheet.getCell('D8').value = `${clienteRuc}        Orden de Compra:${pio}`;
      
      // Solo mostrar vencimiento si es a crédito
      if (venta.tipoPago === 'CREDITO') {
        worksheet.getCell('F8').value = 'VENCIMIENTO:';
        worksheet.getCell('G8').value = fechaVenc;
      }

      // Fila 11: Inicio de productos
      let currentRow = 11;
      const maxProductosPorPagina = 20; // Límite de productos por página

      // Agregar productos (limitado a los que caben en una página)
      const productosLimitados = (venta.detalles || []).slice(0, maxProductosPorPagina);
      productosLimitados.forEach((d: any) => {
        const cantidad = Number(d?.cantidad || 0);
        const numeroParte = d?.inventario?.numeroParte || '-';
        const producto = d?.inventario?.nombre || d?.producto?.nombre || '-';
        const precioUnitario = moneda === 'USD' 
          ? Number(d?.precioUnitarioDolar || (d?.precioUnitarioCordoba || 0) / (venta.tipoCambioValor || 1))
          : Number(d?.precioUnitarioCordoba || 0);
        const subtotal = cantidad * precioUnitario;

        const row = worksheet.getRow(currentRow);
        row.getCell(2).value = cantidad;
        row.getCell(3).value = numeroParte;
        row.getCell(4).value = producto;
        row.getCell(6).value = `${simboloMoneda}${precioUnitario.toFixed(2)}`;
        row.getCell(7).value = `${simboloMoneda}${subtotal.toFixed(2)}`;

        // Estilos (sin bordes)
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };

        currentRow++;
      });

      // Saltar a la fila 34 para el total
      currentRow = 34;

      // Fila 34: Total en texto y monto
      worksheet.getCell('C34').value = 'SON:';
      worksheet.mergeCells('D34:F34');
      const nombreMoneda = moneda === 'USD' ? 'Dolares' : 'Cordobas';
      worksheet.getCell('D34').value = `${montoEnTexto} ${nombreMoneda}`;
      worksheet.getCell('F34').value = 'Total';
      worksheet.getCell('G34').value = `${simboloMoneda}${monto}`;

      // Fila 37: Dirección de la empresa
      worksheet.mergeCells('C37:G37');
      worksheet.getCell('C37').value = configuracion?.direccion || '';
      worksheet.getCell('C37').alignment = { horizontal: 'center', vertical: 'middle' };

      // Fila 38: Razón social
      worksheet.mergeCells('E38:G38');
      worksheet.getCell('E38').value = configuracion?.razonSocial || '';
      worksheet.getCell('E38').alignment = { horizontal: 'center', vertical: 'middle' };

      // Fila 40: Método de pago - Solo el primero
      if (metodosPago.length > 0) {
        const metodo = metodosPago[0];
        worksheet.getCell('D40').value = `${metodo.banco || ''} - ${metodo.numeroCuenta || ''} - ${metodo.moneda || ''} - ${metodo.titular || ''}`;
        worksheet.getCell('D40').alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Factura_${venta.numeroFactura || venta.id}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast.success('✅ Factura descargada');
    } catch (error) {
      console.error('Error al generar Excel:', error);
      toast.error('❌ Error al generar la factura');
    }
  };

  const columns: any = [
    { name: "ID", selector: (r: Venta) => Number(r.id), width: "100px" },
    { name: "Factura", selector: (r: Venta) => r.numeroFactura ?? "-", sortable: true, width: "160px" },
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
    { id: "fecha", name: "Fecha", selector: (r: Venta) => (r.fecha as any), sortable: true, width: "120px",
      cell: (r: Venta) => <span>{fmtDate(r.fecha as any)}</span> },
    { name: "Vence", selector: (r: Venta) => (r.fechaVencimiento as any), sortable: true, width: "120px",
      cell: (r: Venta) => <span>{fmtDate(r.fechaVencimiento as any)}</span> },
    { name: "Plazo", selector: (r: Venta) => r.plazoDias ?? 0, width: "140px", right: true,
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
    { name: "Total C$", selector: (r: Venta) => r.totalCordoba ?? 0, right: true,
      cell: (r: Venta) => <span className="num-right">C$ {(Number(r.totalCordoba)||0).toFixed(2)}</span>, width: "160px" },
    { name: "Total $", selector: (r: Venta) => r.totalDolar ?? 0, right: true,
      cell: (r: Venta) => <span className="num-right">$ {(Number(r.totalDolar)||0).toFixed(2)}</span>, width: "140px" },
    { name: "# Items", selector: (r: Venta) => r.detalles?.length ?? 0, width: "110px" },
    { name: "PIO", selector: (r: Venta) => r.pio ?? "-", width: "150px", 
      cell: (r: Venta) => <span>{r.pio || "-"}</span> },
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
            onClick={() => descargarFacturaExcel(r)}
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
              <input placeholder="por ID, factura o cliente" value={q} onChange={(e)=>setQ(e.target.value)} style={{ width: "260px" }} />
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
              fixedHeaderScrollHeight="360px"
              highlightOnHover
              dense
              customStyles={{
                table: { style: { minWidth: "1100px" } },
                headCells: { style: { justifyContent: "center", textAlign: "center" } },
                cells: { style: { justifyContent: "center", textAlign: "center" } },
              }}
              defaultSortFieldId="fecha"
              defaultSortAsc={false}
              paginationRowsPerPageOptions={[5,10,20,50]}
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
                  { name: "Precio C$", selector: (d: any) => d.precioCordoba, width: "150px", right: true, cell: (d: any) => <span className="num-right">C$ {Number(d.precioCordoba||0).toFixed(2)}</span> },
                  { name: "Precio $", selector: (d: any) => d.precioDolar, width: "140px", right: true, cell: (d: any) => <span className="num-right">$ {Number(d.precioDolar||0).toFixed(2)}</span> },
                  { name: "Subtotal C$", selector: (d: any) => d.subtotalCordoba, width: "170px", right: true, cell: (d: any) => <span className="num-right">C$ {Number(d.subtotalCordoba||0).toFixed(2)}</span> },
                  { name: "Subtotal $", selector: (d: any) => d.subtotalDolar, width: "160px", right: true, cell: (d: any) => <span className="num-right">$ {Number(d.subtotalDolar||0).toFixed(2)}</span> },
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

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
};

export default Ventas;






