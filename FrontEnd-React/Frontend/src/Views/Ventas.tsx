// src/Views/Ventas.tsx - Historial de Ventas
import React, { useEffect, useMemo, useState } from "react";
import DataTable from "react-data-table-component";
import { FaArrowLeft, FaEye, FaTimes } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Ventas.css";
import { getApiBaseSync } from "../api/base";
import { fmtDate } from "../utils/dates";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const API_VENTAS = `${getApiBaseSync()}/api/ventas`;

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
};

const Ventas: React.FC = () => {
  const navigate = useNavigate();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [q, setQ] = useState("");
  const [ventaSel, setVentaSel] = useState<Venta | null>(null);

  // usando util fmtDate

  useEffect(() => {
    fetch(API_VENTAS, { headers: { Authorization: `Bearer ${getCookie("token")}` } })
      .then((r) => r.json())
      .then((j) => setVentas(j.ventas ?? j.data ?? []))
      .catch(() => setVentas([]));
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

  const columns: any = [
    { name: "ID", selector: (r: Venta) => r.id, width: "90px" },
    { name: "Factura", selector: (r: Venta) => r.numeroFactura ?? "-", sortable: true, width: "140px" },
    { name: "Cliente", selector: (r: Venta) => r.cliente?.nombre ?? "-", sortable: true, grow: 2 },
    { name: "Tipo pago", selector: (r: Venta) => r.tipoPago ?? "-", width: "140px" },
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
    {
      name: "Detalles",
      button: true,
      width: "140px",
      cell: (r: Venta) => (
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
          }}
        >
          <FaEye /> Ver
        </button>
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
                    <FaEye /> Detalles de la Venta {ventaSel.numeroFactura ? `#${ventaSel.numeroFactura}` : `ID ${ventaSel.id}`}
                  </div>
                  <button className="picker-close" onClick={() => setVentaSel(null)} title="Cerrar">
                    <FaTimes />
                  </button>
                </div>

                <div className="rem-modal">
                  {(ventaSel.detalles?.length ?? 0) === 0 && (
                    <div style={{ padding: "0.5rem 1rem" }}>Sin detalles para mostrar.</div>
                  )}

                  {(ventaSel.detalles?.length ?? 0) > 0 && (
                    <div className="rem-table">
                      <div className="rem-head">
                        <div>Producto</div>
                        <div>Cant</div>
                        <div>Precio</div>
                        <div>Subtotal</div>
                      </div>
                      <div className="rem-body">
                        {ventaSel.detalles!.map((d, idx) => {
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

                  {(ventaSel.detalles?.length ?? 0) > 0 && (
                    <details style={{ marginTop: ".75rem" }}>
                      <summary>Ver datos crudos</summary>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: ".85rem", background: "#f8fafc", padding: ".5rem", borderRadius: 8 }}>
                        {JSON.stringify(ventaSel.detalles, null, 2)}
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
    </div>
  );
};

export default Ventas;






