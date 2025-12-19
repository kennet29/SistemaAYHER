import React, { useEffect, useState, useMemo } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaBoxOpen,
  FaSearch,
  FaEye,
  FaFileExcel,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import type { TableStyles } from "react-data-table-component";
import "./Inventario.css";
import { fmtDateTime } from "../utils/dates";
import { buildApiUrl } from "../api/constants";
import { ImportarExcel } from "../components/ImportarExcel";
import ExcelJS from "exceljs";

// Ubicaciones físicas válidas: A1..A12, B1..B12, ... Z1..Z12
const UBICACIONES = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
).flatMap((l) => Array.from({ length: 12 }, (_, j) => `${l}${j + 1}`));

const API_URL = buildApiUrl("/inventario");
const API_MARCA = buildApiUrl("/marcas");
const API_CATEGORIA = buildApiUrl("/categorias");
const roundUp2 = (n: number) => Math.ceil((Number(n) || 0) * 100) / 100;
const formatMoneyUp = (n: any) => roundUp2(n).toFixed(2);
const formatMoneyUpOrDash = (n: any) =>
  n === null || n === undefined || n === "" ? "-" : formatMoneyUp(n);

const tableCustomStyles: TableStyles = {
  tableWrapper: {
    style: {
      maxHeight: "70vh",
      overflowY: "auto",
      overflowX: "auto",
      position: "relative",
    },
  },
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const InventarioView = () => {
  const [items, setItems] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tipoCambio, setTipoCambio] = useState<number>(36.5);
  const [filtro, setFiltro] = useState("");
  const [view, setView] = useState<any | null>(null);
  const [totales, setTotales] = useState({
    valorTotalC: 0,
    valorTotalD: 0,
    utilidadTotalC: 0,
    utilidadTotalD: 0,
  });
  const [generandoExcel, setGenerandoExcel] = useState(false);

  const [form, setForm] = useState({
    numeroParte: "",
    nombre: "",
    descripcion: "",
    marcaId: 0,
    categoriaId: 0,
    stockMinimo: 0,
    ubicacion: "",
    stockActual: 0,
    costoPromedioDolar: 0,
    precioVentaPromedioDolar: 0,
    precioVentaSugeridoDolar: 0,
    codigoSustituto: "",
    marcaSustitutoId: 0,
    descontinuado: false,
    compatibilidadMaquinas: [] as string[],
    preciosCompetencia: [] as any[],
  });
  const [codigosSustituto, setCodigosSustituto] = useState<string[]>([]);
  const [codigoSustManual, setCodigoSustManual] = useState("");

  // Estado temporal para agregar/editar precios de competencia
  const [pcForm, setPcForm] = useState({
    proveedor: "",
    precioCordoba: "",
    precioDolar: "",
    referencia: "",
  });
  const [pcEditIdx, setPcEditIdx] = useState<number | null>(null);

  const formCordoba = useMemo(() => {
    const toC = (usd: number) => (tipoCambio > 0 ? usd * tipoCambio : usd);
    return {
      costoPromedioCordoba: roundUp2(toC(Number(form.costoPromedioDolar))),
      precioVentaPromedioCordoba: roundUp2(toC(Number(form.precioVentaPromedioDolar))),
      precioVentaSugeridoCordoba: roundUp2(toC(Number(form.precioVentaSugeridoDolar))),
    };
  }, [form, tipoCambio]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = getCookie("token") || localStorage.getItem("token");
    if (!token) {
      toast.error("🔒 No hay token, inicia sesión nuevamente.");
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [resInv, resMar, resCat] = await Promise.all([
        fetch(API_URL, { headers }),
        fetch(API_MARCA, { headers }),
        fetch(API_CATEGORIA, { headers }),
      ]);

      const [dataInv, dataMar, dataCat] = await Promise.all([
        resInv.json(),
        resMar.json(),
        resCat.json(),
      ]);

      const tipo = Number(dataInv.tipoCambio ?? 36.5);
      setTipoCambio(tipo);

      const lista = (dataInv.items || []).map((i: any) => {
        const costoC = roundUp2(i.costoPromedioCordoba ?? 0);
        const costoD = roundUp2(i.costoPromedioDolar ?? 0);
        const ventaC = roundUp2(i.precioVentaPromedioCordoba ?? 0);
        const ventaD = roundUp2(i.precioVentaPromedioDolar ?? 0);
        const stock = Number(i.stockActual ?? 0);

        // Normalizar posibles strings JSON → arrays
        const toArray = (v: any) => {
          if (Array.isArray(v)) return v;
          if (typeof v === "string") {
            try {
              const parsed = JSON.parse(v);
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          }
          return [];
        };
        const compat = toArray(i.compatibilidadMaquinas);
        const compPrecios = toArray(i.preciosCompetencia);

        const utilidadC = roundUp2(ventaC - costoC);
        const utilidadD = roundUp2(ventaD - costoD);

        return {
          ...i,
          compatibilidadMaquinas: compat,
          preciosCompetencia: compPrecios,
          costoPromedioCordoba: costoC,
          costoPromedioDolar: costoD,
          precioVentaPromedioCordoba: ventaC,
          precioVentaPromedioDolar: ventaD,
          utilidadCordoba: utilidadC,
          utilidadDolar: utilidadD,
          costoTotalCordoba: roundUp2(costoC * stock),
          costoTotalDolar: roundUp2(costoD * stock),
          ventaTotalCordoba: roundUp2(ventaC * stock),
          ventaTotalDolar: roundUp2(ventaD * stock),
          utilidadTotalCordoba: roundUp2(utilidadC * stock),
          utilidadTotalDolar: roundUp2(utilidadD * stock),
        };
      });

      const totalC = roundUp2((lista as any[]).reduce((sum: number, i: any) => sum + Number(i.ventaTotalCordoba || 0), 0 as number));
      const totalD = roundUp2((lista as any[]).reduce((sum: number, i: any) => sum + Number(i.ventaTotalDolar || 0), 0 as number));
      const utilidadC = roundUp2((lista as any[]).reduce((sum: number, i: any) => sum + Number(i.utilidadTotalCordoba || 0), 0 as number));
      const utilidadD = roundUp2((lista as any[]).reduce((sum: number, i: any) => sum + Number(i.utilidadTotalDolar || 0), 0 as number));

      setItems(lista);
      setMarcas(dataMar.marcas || []);
      setCategorias(dataCat.categorias || []);
      setTotales({
        valorTotalC: totalC,
        valorTotalD: totalD,
        utilidadTotalC: utilidadC,
        utilidadTotalD: utilidadD,
      });
    } catch {
      toast.error("❌ Error al cargar datos del inventario");
    } finally {
      setLoading(false);
    }
  };

  const itemsFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.nombre?.toLowerCase().includes(q) ||
        i.numeroParte?.toLowerCase().includes(q) ||
        (i.descripcion || "").toLowerCase().includes(q) ||
        (i.codigoSustituto || "").toLowerCase().includes(q)
    );
  }, [filtro, items]);

  const parseCodigosSustituto = (val?: string | null) =>
    (val || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCookie("token") || localStorage.getItem("token");
    if (!token) return toast.error("🔒 No hay token válido.");

    if (!form.numeroParte.trim() || !form.nombre.trim())
      return toast.warning("⚠️ Completa los campos obligatorios.");

    setSaving(true);
    try {
      const toC = (usd: number) => (tipoCambio > 0 ? usd * tipoCambio : usd);
      const payload: any = {
        ...form,
        costoPromedioDolar: roundUp2(form.costoPromedioDolar),
        precioVentaPromedioDolar: roundUp2(form.precioVentaPromedioDolar),
        precioVentaSugeridoDolar: roundUp2(form.precioVentaSugeridoDolar),
        costoPromedioCordoba: roundUp2(toC(form.costoPromedioDolar)),
        precioVentaPromedioCordoba: roundUp2(toC(form.precioVentaPromedioDolar)),
        precioVentaSugeridoCordoba: roundUp2(toC(form.precioVentaSugeridoDolar)),
        codigoSustituto: codigosSustituto.join(","),
      };
      if (!payload.compatibilidadMaquinas || payload.compatibilidadMaquinas.length === 0) {
        delete payload.compatibilidadMaquinas;
      }
      if (!payload.preciosCompetencia || payload.preciosCompetencia.length === 0) {
        delete payload.preciosCompetencia;
      }
      if (!payload.ubicacion) {
        delete payload.ubicacion;
      }
      if (!(Number(payload.stockMinimo) > 0)) {
        delete payload.stockMinimo;
      }

      console.log("[Inventario.submit] payload:", payload);
      const res = await fetch(editing ? `${API_URL}/${editing}` : API_URL, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let resJson: any = null;
      try {
        resJson = await res.json();
      } catch {}
      console.log("[Inventario.submit] response ok:", res.ok, "status:", res.status, "json:", resJson);
      if (!res.ok) throw new Error("Error al guardar producto");

      toast.success(editing ? "✅ Producto actualizado" : "✅ Producto agregado");
      setForm({
        numeroParte: "",
        nombre: "",
        descripcion: "",
        marcaId: 0,
        categoriaId: 0,
        stockMinimo: 0,
        ubicacion: "",
        stockActual: 0,
        costoPromedioDolar: 0,
        precioVentaPromedioDolar: 0,
        precioVentaSugeridoDolar: 0,
        codigoSustituto: "",
        marcaSustitutoId: 0,
      descontinuado: false,
      compatibilidadMaquinas: [],
      preciosCompetencia: [],
    });
    setCodigosSustituto([]);
    setCodigoSustManual("");
    setEditing(null);
    fetchData();
    } catch {
      toast.error("❌ No se pudo guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = getCookie("token") || localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("🗑️ Producto eliminado correctamente");
      fetchData();
    } catch {
      toast.error("❌ Error al eliminar producto");
    }
  };

  const handleEdit = (item: any) => {
    setForm({
      numeroParte: item.numeroParte || "",
      nombre: item.nombre || "",
      descripcion: item.descripcion || "",
      marcaId: Number(item.marcaId || 0),
    categoriaId: Number(item.categoriaId || 0),
    stockMinimo: Number(item.stockMinimo || 0),
    ubicacion: item.ubicacion || "",
    stockActual: Number(item.stockActual || 0),
    costoPromedioDolar: Number(
      item.costoPromedioDolar ?? ((tipoCambio > 0 ? Number(item.costoPromedioCordoba || 0) / tipoCambio : 0) || 0)
    ),
    precioVentaPromedioDolar: Number(
      item.precioVentaPromedioDolar ?? ((tipoCambio > 0 ? Number(item.precioVentaPromedioCordoba || 0) / tipoCambio : 0) || 0)
    ),
    precioVentaSugeridoDolar: Number(
      item.precioVentaSugeridoDolar ?? ((tipoCambio > 0 ? Number(item.precioVentaSugeridoCordoba || 0) / tipoCambio : 0) || 0)
    ),
      codigoSustituto: item.codigoSustituto || "",
      marcaSustitutoId: Number(item.marcaSustitutoId || 0),
      descontinuado: Boolean(item.descontinuado || false),
      compatibilidadMaquinas: Array.isArray(item.compatibilidadMaquinas)
        ? item.compatibilidadMaquinas
        : [],
      preciosCompetencia: Array.isArray(item.preciosCompetencia)
        ? item.preciosCompetencia
        : [],
    });
    setCodigosSustituto(parseCodigosSustituto(item.codigoSustituto));
    setCodigoSustManual("");
    setEditing(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Helpers para resaltar celda de stock
  const isLowStock = (r: any) => {
    const min = Number(r.stockMinimo || 0);
    const stock = Number(r.stockActual || 0);
    // Rojo si: tiene mínimo y está por debajo/igual, o si no hay mínimo pero el stock es 0
    if (min > 0) return stock <= min;
    return stock === 0;
  };
  const isNearStock = (r: any) => {
    const min = Number(r.stockMinimo || 0);
    const stock = Number(r.stockActual || 0);
    if (min <= 0) {
      // Sin mínimo: considerar "próximo" si stock entre 1 y 3
      return stock > 0 && stock <= 3;
    }
    if (stock <= min) return false;
    const threshold = Math.max(1, Math.ceil(min * 0.1)); // 10% o al menos 1 unidad
    return stock <= min + threshold;
  };
  const isComfortableStock = (r: any) => {
    const min = Number(r.stockMinimo || 0);
    const stock = Number(r.stockActual || 0);
    if (min <= 0) return stock > 3; // sin mínimo: suficiente si > 3
    return stock > min + Math.max(1, Math.ceil(min * 0.1));
  };

  const lowStockItems = useMemo(() => items.filter((r) => isLowStock(r)), [items]);

  const exportLowStockExcel = async () => {
    if (!lowStockItems.length) {
      toast.info("No hay articulos en bajo stock");
      return;
    }
    setGenerandoExcel(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Bajo stock");
      ws.columns = [
        { header: "#", key: "idx", width: 4 },
        { header: "No. Parte", key: "numeroParte", width: 16 },
        { header: "Nombre", key: "nombre", width: 28 },
        { header: "Marca", key: "marca", width: 16 },
        { header: "Categoria", key: "categoria", width: 16 },
        { header: "Stock", key: "stockActual", width: 8 },
        { header: "Stock Min", key: "stockMinimo", width: 10 },
        { header: "Ubicacion", key: "ubicacion", width: 12 },
        { header: "Costo C$", key: "costoC", width: 12 },
        { header: "Costo US$", key: "costoD", width: 12 },
        { header: "Venta C$", key: "ventaC", width: 12 },
        { header: "Venta US$", key: "ventaD", width: 12 },
        { header: "Compatibilidades", key: "compat", width: 20 },
      ];
      ws.getRow(1).font = { bold: true };

      lowStockItems.forEach((r, idx) => {
        ws.addRow({
          idx: idx + 1,
          numeroParte: r.numeroParte || "",
          nombre: r.nombre || "",
          marca: r.marca?.nombre || "",
          categoria: r.categoria?.nombre || "",
          stockActual: Number(r.stockActual ?? 0),
          stockMinimo: Number(r.stockMinimo ?? 0),
          ubicacion: r.ubicacion || "",
          costoC: formatMoneyUp(r.costoPromedioCordoba),
          costoD: formatMoneyUp(r.costoPromedioDolar),
          ventaC: formatMoneyUp(r.precioVentaPromedioCordoba),
          ventaD: formatMoneyUp(r.precioVentaPromedioDolar),
          compat: Array.isArray(r.compatibilidadMaquinas)
            ? r.compatibilidadMaquinas.join(", ")
            : "",
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `inventario_bajo_stock_${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel generado");
    } catch (err) {
      console.error("Error generando Excel de bajo stock", err);
      toast.error("No se pudo generar el Excel");
    } finally {
      setGenerandoExcel(false);
    }
  };

  const columns = [
    { name: "N° Parte", selector: (r: any) => r.numeroParte, sortable: true },
    { name: "Nombre", selector: (r: any) => r.nombre, grow: 2 },
    { name: "Marca", selector: (r: any) => r.marca?.nombre || "—" },
    { name: "Categoría", selector: (r: any) => r.categoria?.nombre || "—" },
    {
      name: "Stock",
      selector: (r: any) => r.stockActual,
      center: true,
    },
    { name: "Stock Min", selector: (r: any) => (Number(r.stockMinimo) > 0 ? Number(r.stockMinimo) : '—'), center: true },
    { name: "Ubicación", selector: (r: any) => r.ubicacion || "—", center: true },
    {
      name: "Compatibilidad",
      selector: (r: any) =>
        Array.isArray(r.compatibilidadMaquinas) && r.compatibilidadMaquinas.length
          ? `${r.compatibilidadMaquinas.length} máquinas`
          : "—",
    },
    {
      name: "Costo (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.costoPromedioCordoba)} / ${formatMoneyUp(
          r.costoPromedioDolar
        )}`,
      right: true,
    },
    {
      name: "Venta Prom (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.precioVentaPromedioCordoba)} / ${formatMoneyUp(
          r.precioVentaPromedioDolar
        )}`,
      right: true,
    },
    {
      name: "Costo Total (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.costoTotalCordoba)} / ${formatMoneyUp(
          r.costoTotalDolar
        )}`,
      right: true,
    },
    {
      name: "Venta Total (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.ventaTotalCordoba)} / ${formatMoneyUp(
          r.ventaTotalDolar
        )}`,
      right: true,
    },
    {
      name: "Utilidad x Unidad (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.utilidadCordoba)} / ${formatMoneyUp(
          r.utilidadDolar
        )}`,
      right: true,
    },
    {
      name: "Utilidad Total (C$/US$)",
      selector: (r: any) =>
        `${formatMoneyUp(r.utilidadTotalCordoba)} / ${formatMoneyUp(
          r.utilidadTotalDolar
        )}`,
      right: true,
    },
    {
      name: "Código Sustituto",
      selector: (r: any) => {
        const sustituto = r.codigoSustituto
          ? items.find((i) => i.numeroParte === r.codigoSustituto)
          : null;
        if (sustituto) return `${sustituto.numeroParte} — ${sustituto.nombre}`;
        if (r.codigoSustituto) return r.codigoSustituto;
        return "—";
      },
    },
    {
      name: "Marca Sustituto",
      selector: (r: any) => r.marcaSustituto?.nombre || "—",
    },
    {
      name: "Acciones",
      cell: (r: any) => (
        <div className="inventario-actions">
          <button
            className="action-btn edit"
            onClick={() => setView(r)}
            title="Ver"
          >
            <FaEye />
          </button>
          <button className="action-btn edit" onClick={() => handleEdit(r)} title="Editar">
            <FaEdit />
          </button>
          <button
            className="action-btn delete"
            onClick={() => handleDelete(r.id)}
            title="Eliminar"
          >
            <FaTrash />
          </button>
        </div>
      ),
    },
  ];

  if (loading)
    return <div className="inventario-loading">Cargando inventario...</div>;

  return (
    <div className="inventario-container">
      <div className="inventario-bg" />
      <ToastContainer position="top-right" autoClose={2500} />

      <button
        className="inventario-back-btn"
        onClick={() => (window.location.href = "/home")}
      >
        <FaArrowLeft /> Volver
      </button>

      <header className="inventario-header">
        <FaBoxOpen className="icon" />
        <h1>Gestión de Inventario</h1>
        <p>
          Tipo de cambio actual: <strong>{tipoCambio.toFixed(2)} C$ = 1 US$</strong>
        </p>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "1rem 5%", background: "linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)" }}>
        <button
          type="button"
          onClick={exportLowStockExcel}
          disabled={generandoExcel}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#16a34a",
            color: "#fff",
            border: "none",
          padding: "0.65rem 1rem",
          borderRadius: "10px",
          cursor: generandoExcel ? "not-allowed" : "pointer",
          boxShadow: "0 8px 18px rgba(22,163,74,0.2)",
          opacity: generandoExcel ? 0.8 : 1,
          fontWeight: 700,
        }}
          title="Exportar articulos con stock critico"
        >
          <FaFileExcel />
          {generandoExcel ? "Generando..." : `Excel Bajo Stock (${lowStockItems.length})`}
        </button>

        <ImportarExcel onSuccess={fetchData} />
      </div>

      {/* ===== Formulario Crear/Editar ===== */}
      <div className="inventario-card">
        <h2 className="inventario-title">
          {editing ? "Editar Producto" : "Nuevo Producto"}
        </h2>

        <form className="inventario-form" onSubmit={handleSubmit}>
          <div className="inventario-row">
            <div>
              <label>Número de Parte</label>
              <input
                type="text"
                value={form.numeroParte}
                onChange={(e) => setForm({ ...form, numeroParte: e.target.value })}
                required
              />
            </div>
            <div>
              <label>Nombre</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="inventario-row">
            <div>
              <label>Marca</label>
              <select
                value={form.marcaId}
                onChange={(e) => setForm({ ...form, marcaId: Number(e.target.value) })}
              >
                <option value={0}>Seleccione</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Categoría</label>
              <select
                value={form.categoriaId}
                onChange={(e) =>
                  setForm({ ...form, categoriaId: Number(e.target.value) })
                }
              >
                <option value={0}>Seleccione</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* === Ubicación física === */}
          <div className="inventario-row">
            <div>
              <label>Ubicación física</label>
              <select
                value={form.ubicacion || ""}
                onChange={(e) => setForm({ ...form, ubicacion: e.target.value || "" })}
              >
                <option value="">— Sin ubicación —</option>
                {UBICACIONES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
              <input
                type="checkbox"
                id="descontinuado"
                checked={form.descontinuado}
                onChange={(e) => setForm({ ...form, descontinuado: e.target.checked })}
                style={{ width: "20px", height: "20px", cursor: "pointer" }}
              />
              <label htmlFor="descontinuado" style={{ cursor: "pointer", margin: 0, fontWeight: 600, color: "#d97706" }}>
                Producto Descontinuado
              </label>
            </div>
          </div>

          <div className="inventario-row">
            <div>
              <label>Stock Actual</label>
              <input
                type="number"
                value={form.stockActual}
                onChange={(e) => setForm({ ...form, stockActual: Number(e.target.value) })}
                min={0}
              />
            </div>
            <div>
              <label>Stock Mínimo</label>
              <input
                type="number"
                value={form.stockMinimo}
                onChange={(e) => setForm({ ...form, stockMinimo: Number(e.target.value) })}
                min={0}
              />
              <small>Se marcará en rojo si está por debajo</small>
            </div>
            <div>
              <label>Costo Promedio (US$)</label>
              <input
                type="number"
                value={form.costoPromedioDolar}
                onChange={(e) =>
                  setForm({ ...form, costoPromedioDolar: Number(e.target.value) })
                }
                min={0}
                step="0.01"
              />
              <small>≈ C$ {formatMoneyUp(formCordoba.costoPromedioCordoba)}</small>
            </div>
            <div>
              <label>Precio Venta Promedio (US$)</label>
              <input
                type="number"
                value={form.precioVentaPromedioDolar}
                onChange={(e) =>
                  setForm({
                    ...form,
                    precioVentaPromedioDolar: Number(e.target.value),
                  })
                }
                min={0}
                step="0.01"
              />
              <small>≈ C$ {formatMoneyUp(formCordoba.precioVentaPromedioCordoba)}</small>
            </div>
          </div>

          <div className="inventario-row">
            <div>
              <label>Precio Venta Sugerido (US$)</label>
              <input
                type="number"
                value={form.precioVentaSugeridoDolar}
                onChange={(e) =>
                  setForm({
                    ...form,
                    precioVentaSugeridoDolar: Number(e.target.value),
                  })
                }
                min={0}
                step="0.01"
              />
              <small>≈ C$ {formatMoneyUp(formCordoba.precioVentaSugeridoCordoba)}</small>
            </div>
            <div>
              <label>Descripción</label>
              <input
                type="text"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          {/* === Sustitutos === */}
          <div className="inventario-row">
            <div>
              <label>Código Sustituto</label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", flexDirection: "column" }}>
                <select
                  value=""
                  onChange={(e) => {
                    const selectedParte = e.target.value;
                    if (selectedParte) {
                      const selectedProduct = items.find((i) => i.numeroParte === selectedParte);
                      if (!codigosSustituto.includes(selectedParte)) {
                        setCodigosSustituto((prev) => [...prev, selectedParte]);
                      }
                      setForm({
                        ...form,
                        marcaSustitutoId: selectedProduct?.marcaId || 0,
                      });
                    }
                  }}
                  style={{ width: "100%" }}
                >
                  <option value="">— Seleccione un producto existente —</option>
                  {items
                    .filter((i) => i.id !== editing)
                    .map((i) => (
                      <option key={i.id} value={i.numeroParte}>
                        {i.numeroParte} — {i.nombre} ({i.marca?.nombre})
                      </option>
                    ))}
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                  <span style={{ whiteSpace: "nowrap", fontSize: "0.9rem", color: "#666" }}>o ingrese manualmente:</span>
                  <input
                    type="text"
                    value={codigoSustManual}
                    onChange={(e) => setCodigoSustManual(e.target.value)}
                    placeholder="Número de parte del sustituto"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      const codigo = codigoSustManual.trim();
                      if (!codigo) return;
                      if (codigosSustituto.includes(codigo)) {
                        toast.warn("Código ya agregado");
                        return;
                      }
                      const productoExiste = items.find((i) => i.numeroParte === codigo);
                      setCodigosSustituto((prev) => [...prev, codigo]);
                      setForm({
                        ...form,
                        marcaSustitutoId: productoExiste?.marcaId || 0,
                      });
                      setCodigoSustManual("");
                    }}
                    style={{ padding: ".45rem .7rem", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    title="Agregar código"
                  >
                    +
                  </button>
                </div>
                {codigosSustituto.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                    {codigosSustituto.map((c) => (
                      <span
                        key={c}
                        style={{
                          padding: ".25rem .5rem",
                          background: "#eef2ff",
                          border: "1px solid #c7d2fe",
                          borderRadius: "999px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: ".4rem",
                          color: "#0f172a",
                        }}
                      >
                        {c}
                        <button
                          type="button"
                          onClick={() => setCodigosSustituto((prev) => prev.filter((x) => x !== c))}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#4f46e5",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                          title="Quitar"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <small>Seleccione de la lista o agregue manualmente (uno por clic)</small>
            </div>

            <div>
              <label>Marca del Sustituto</label>
              <select
                value={form.marcaSustitutoId}
                onChange={(e) =>
                  setForm({ ...form, marcaSustitutoId: Number(e.target.value) })
                }
              >
                <option value={0}>Desconocida</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
              <small>Si el código no existe, deje en "Desconocida"</small>
            </div>
          </div>

          {/* === Compatibilidad con máquinas === */}
          <div className="inventario-row">
            <div className="compat-box">
              <label>Compatibilidad con máquinas</label>
              <div className="compat-input">
                <input
                  type="text"
                  placeholder="Agregar modelo o máquina..."
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target.value || "").trim();
                      if (!val) return;
                      if (form.compatibilidadMaquinas.includes(val)) return;
                      setForm({
                        ...form,
                        compatibilidadMaquinas: [...form.compatibilidadMaquinas, val],
                      });
                      e.target.value = "";
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = (document.querySelector(
                      ".compat-input input"
                    ) as HTMLInputElement)!;
                    const val = (input.value || "").trim();
                    if (!val) return;
                    if (form.compatibilidadMaquinas.includes(val)) return;
                    setForm({
                      ...form,
                      compatibilidadMaquinas: [...form.compatibilidadMaquinas, val],
                    });
                    input.value = "";
                  }}
                >
                  Agregar
                </button>
              </div>
              <div className="compat-chips">
                {form.compatibilidadMaquinas.map((m, idx) => (
                  <span key={idx} className="chip">
                    {m}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          compatibilidadMaquinas: form.compatibilidadMaquinas.filter(
                            (x) => x !== m
                          ),
                        })
                      }
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* === Precios competencia === */}
          <div className="inventario-row">
            <div className="pc-box">
              <label>Precios de proveedores competidores</label>
              <div className="pc-form">
                <input
                  type="text"
                  placeholder="Proveedor"
                  value={pcForm.proveedor}
                  onChange={(e) => setPcForm({ ...pcForm, proveedor: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Precio C$"
                  value={pcForm.precioCordoba}
                  onChange={(e) => setPcForm({ ...pcForm, precioCordoba: e.target.value })}
                  step="0.01"
                  min={0}
                />
                <input
                  type="number"
                  placeholder="Precio US$"
                  value={pcForm.precioDolar}
                  onChange={(e) => setPcForm({ ...pcForm, precioDolar: e.target.value })}
                  step="0.01"
                  min={0}
                />
                <input
                  type="text"
                  placeholder="Referencia/Notas (opcional)"
                  value={pcForm.referencia}
                  onChange={(e) => setPcForm({ ...pcForm, referencia: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!pcForm.proveedor.trim()) {
                      toast.warning("Proveedor es requerido");
                      return;
                    }
                    const entry = {
                      proveedor: pcForm.proveedor.trim(),
                      precioCordoba: pcForm.precioCordoba ? roundUp2(Number(pcForm.precioCordoba)) : undefined,
                      precioDolar: pcForm.precioDolar ? roundUp2(Number(pcForm.precioDolar)) : undefined,
                      referencia: pcForm.referencia?.trim() || undefined,
                      fecha: new Date().toISOString(),
                    };
                    const list = [...form.preciosCompetencia];
                    if (pcEditIdx !== null) {
                      list[pcEditIdx] = entry;
                    } else {
                      list.push(entry);
                    }
                    setForm({ ...form, preciosCompetencia: list });
                    setPcForm({ proveedor: "", precioCordoba: "", precioDolar: "", referencia: "" });
                    setPcEditIdx(null);
                  }}
                >
                  {pcEditIdx !== null ? "Actualizar" : "Agregar"}
                </button>
              </div>

              <div className="pc-list">
                {(!form.preciosCompetencia || form.preciosCompetencia.length === 0) && (
                  <small>No hay precios de competencia añadidos</small>
                )}
                {form.preciosCompetencia?.map((pc: any, idx: number) => (
                  <div key={idx} className="pc-item">
                    <div className="pc-left">
                      <strong>{pc.proveedor}</strong>
                      <span>
                        {pc.precioCordoba != null ? `${formatMoneyUp(pc.precioCordoba)} C$` : "-"}
                        {" / "}
                        {pc.precioDolar != null ? `${formatMoneyUp(pc.precioDolar)} US$` : "-"}
                      </span>
                      {pc.referencia && <em>{pc.referencia}</em>}
                    </div>
                    <div className="pc-actions">
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => {
                          setPcForm({
                            proveedor: pc.proveedor || "",
                            precioCordoba: pc.precioCordoba != null ? formatMoneyUp(pc.precioCordoba) : "",
                            precioDolar: pc.precioDolar != null ? formatMoneyUp(pc.precioDolar) : "",
                            referencia: pc.referencia || "",
                          });
                          setPcEditIdx(idx);
                        }}
                        title="Editar referencia"
                      >
                        <FaEdit />
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => {
                          const list = [...form.preciosCompetencia];
                          list.splice(idx, 1);
                          setForm({ ...form, preciosCompetencia: list });
                          if (pcEditIdx === idx) {
                            setPcForm({ proveedor: "", precioCordoba: "", precioDolar: "", referencia: "" });
                            setPcEditIdx(null);
                          }
                        }}
                        title="Eliminar referencia"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button type="submit" className="inventario-save-btn" disabled={saving}>
            <FaPlus /> {editing ? "Actualizar" : "Agregar"}
          </button>
        </form>
      </div>

      {/* ===== Buscador + Tabla ===== */}
      <div className="inventario-filter-box">
        <FaSearch className="filter-icon" />
        <input
          type="text"
          placeholder="Buscar por nombre o número de parte..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      <div className="inventario-table">
        <DataTable
          columns={columns}
          data={itemsFiltrados}
          pagination
          fixedHeader
          fixedHeaderScrollHeight="70vh"
          highlightOnHover
          striped
          responsive
          persistTableHead
          customStyles={tableCustomStyles}
          conditionalRowStyles={[
            {
              when: (r: any) => isLowStock(r),
              style: {
                backgroundColor: '#fdecea', // rojo claro
                color: '#3a3a3a',
              },
            },
            {
              when: (r: any) => isNearStock(r),
              style: {
                backgroundColor: '#fff8e1', // amarillo claro
                color: '#3a3a3a',
              },
            },
            {
              when: (r: any) => isComfortableStock(r),
              style: {
                backgroundColor: '#e8f5e9', // verde claro (suficiente stock)
                color: '#2e7d32',
              },
            },
          ]}
          noDataComponent="No hay productos registrados"
        />

      <div className="inventario-totales">
        <p>
          💰 <strong>Total inventario:</strong>{" "}
          {formatMoneyUp(totales.valorTotalC)} C$ / {formatMoneyUp(totales.valorTotalD)} US$
        </p>
        <p>
          📈 <strong>Utilidad total:</strong>{" "}
          <span
            style={{
              color: totales.utilidadTotalC >= 0 ? "green" : "red",
              fontWeight: "bold",
            }}
          >
            {formatMoneyUp(totales.utilidadTotalC)} C$ / {formatMoneyUp(totales.utilidadTotalD)} US$
          </span>
        </p>
      </div>
    </div>

      {/* ===== Modal Ver Detalles ===== */}
      {view && (
        <div className="inventario-modal-overlay" onClick={() => setView(null)}>
          <div className="inventario-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h3>Detalle del Producto</h3>
              <button className="modal-close" onClick={() => setView(null)}>×</button>
            </header>
            <div className="modal-body">
              <div className="modal-grid">
                <div>
                  <strong>N° Parte:</strong>
                  <div>{view.numeroParte}</div>
                </div>
                <div>
                  <strong>Nombre:</strong>
                  <div>{view.nombre}</div>
                </div>
                <div>
                  <strong>Marca:</strong>
                  <div>{view.marca?.nombre || "—"}</div>
                </div>
                <div>
                  <strong>Categoría:</strong>
                  <div>{view.categoria?.nombre || "—"}</div>
                </div>
                <div>
                  <strong>Stock:</strong>
                  <div>{Number(view.stockActual ?? 0)}</div>
                </div>
                <div>
                  <strong>Costo (C$/US$):</strong>
                  <div>
                    {formatMoneyUp(view.costoPromedioCordoba)} / {formatMoneyUp(view.costoPromedioDolar)}
                  </div>
                </div>
                <div>
                  <strong>Venta Prom (C$/US$):</strong>
                  <div>
                    {formatMoneyUp(view.precioVentaPromedioCordoba)} / {formatMoneyUp(view.precioVentaPromedioDolar)}
                  </div>
                </div>
                <div>
                  <strong>Venta Sug (C$/US$):</strong>
                  <div>
                    {formatMoneyUp(view.precioVentaSugeridoCordoba)} / {formatMoneyUp(view.precioVentaSugeridoDolar)}
                  </div>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <strong>Descripción:</strong>
                  <div>{view.descripcion || "—"}</div>
                </div>
              </div>

              <div className="modal-section">
                <h4>Sustituto</h4>
                <div className="modal-grid">
                  <div>
                    <strong>Código Sustituto:</strong>
                    <div>{view.codigoSustituto || "—"}</div>
                  </div>
                  <div>
                    <strong>Marca Sustituto:</strong>
                    <div>{view.marcaSustituto?.nombre || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h4>Compatibilidad con máquinas</h4>
                <div className="compat-chips">
                  {Array.isArray(view.compatibilidadMaquinas) && view.compatibilidadMaquinas.length > 0 ? (
                    view.compatibilidadMaquinas.map((m: string, idx: number) => (
                      <span key={idx} className="chip">{m}</span>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div className="modal-section">
                <h4>Precios de competencia</h4>
                {Array.isArray(view.preciosCompetencia) && view.preciosCompetencia.length > 0 ? (
                  <div className="pc-table">
                    <div className="pc-thead">
                      <div>Proveedor</div>
                      <div>Precio C$</div>
                      <div>Precio US$</div>
                      <div>Fecha</div>
                      <div>Referencia</div>
                    </div>
                    {view.preciosCompetencia.map((pc: any, idx: number) => (
                      <div key={idx} className="pc-trow">
                        <div>{pc.proveedor}</div>
                        <div>{formatMoneyUpOrDash(pc.precioCordoba)}</div>
                        <div>{formatMoneyUpOrDash(pc.precioDolar)}</div>
                        <div>{pc.fecha ? fmtDateTime(pc.fecha) : "—"}</div>
                        <div>{pc.referencia || "—"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="inventario-footer">© 2025 AYHER — Todos los derechos reservados</footer>
    </div>
  );
};

export default InventarioView;
