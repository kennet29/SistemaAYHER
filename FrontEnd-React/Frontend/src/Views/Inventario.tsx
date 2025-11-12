import React, { useEffect, useState, useMemo } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaBoxOpen,
  FaSearch,
  FaEye,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import "./Inventario.css";
import { getApiBaseSync } from "../api/base";
import { fmtDateTime } from "../utils/dates";

// Ubicaciones físicas válidas: A1..A12, B1..B12, ... Z1..Z12
const UBICACIONES = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
).flatMap((l) => Array.from({ length: 12 }, (_, j) => `${l}${j + 1}`));

const API_BASE = getApiBaseSync();
const API_URL = `${API_BASE}/api/inventario`;
const API_MARCA = `${API_BASE}/api/marcas`;
const API_CATEGORIA = `${API_BASE}/api/categorias`;

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

  const [form, setForm] = useState({
    numeroParte: "",
    nombre: "",
    descripcion: "",
    marcaId: 0,
    categoriaId: 0,
    stockMinimo: 0,
    ubicacion: "",
    stockActual: 0,
    costoPromedioCordoba: 0,
    precioVentaPromedioCordoba: 0,
    precioVentaSugeridoCordoba: 0,
    codigoSustituto: "",
    marcaSustitutoId: 0,
    compatibilidadMaquinas: [] as string[],
    preciosCompetencia: [] as any[],
  });

  // Estado temporal para agregar/editar precios de competencia
  const [pcForm, setPcForm] = useState({
    proveedor: "",
    precioCordoba: "",
    precioDolar: "",
    referencia: "",
  });
  const [pcEditIdx, setPcEditIdx] = useState<number | null>(null);

  const formUSD = useMemo(() => {
    const toUSD = (v: number) => (tipoCambio > 0 ? v / tipoCambio : 0);
    return {
      costoPromedioDolar: toUSD(Number(form.costoPromedioCordoba)),
      precioVentaPromedioDolar: toUSD(Number(form.precioVentaPromedioCordoba)),
      precioVentaSugeridoDolar: toUSD(Number(form.precioVentaSugeridoCordoba)),
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
        const costoC = Number(i.costoPromedioCordoba ?? 0);
        const costoD = Number(i.costoPromedioDolar ?? 0);
        const ventaC = Number(i.precioVentaPromedioCordoba ?? 0);
        const ventaD = Number(i.precioVentaPromedioDolar ?? 0);
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

        const utilidadC = ventaC - costoC;
        const utilidadD = ventaD - costoD;

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
          costoTotalCordoba: costoC * stock,
          costoTotalDolar: costoD * stock,
          ventaTotalCordoba: ventaC * stock,
          ventaTotalDolar: ventaD * stock,
          utilidadTotalCordoba: utilidadC * stock,
          utilidadTotalDolar: utilidadD * stock,
        };
      });

      const totalC = lista.reduce((sum, i) => sum + i.ventaTotalCordoba, 0);
      const totalD = lista.reduce((sum, i) => sum + i.ventaTotalDolar, 0);
      const utilidadC = lista.reduce((sum, i) => sum + i.utilidadTotalCordoba, 0);
      const utilidadD = lista.reduce((sum, i) => sum + i.utilidadTotalDolar, 0);

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
        i.numeroParte?.toLowerCase().includes(q)
    );
  }, [filtro, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCookie("token") || localStorage.getItem("token");
    if (!token) return toast.error("🔒 No hay token válido.");

    if (!form.numeroParte.trim() || !form.nombre.trim())
      return toast.warning("⚠️ Completa los campos obligatorios.");

    setSaving(true);
    try {
      // No enviar campos vacíos para evitar errores si el backend aún no migró
      const payload: any = { ...form };
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
        costoPromedioCordoba: 0,
        precioVentaPromedioCordoba: 0,
        precioVentaSugeridoCordoba: 0,
        codigoSustituto: "",
        marcaSustitutoId: 0,
        compatibilidadMaquinas: [],
        preciosCompetencia: [],
      });
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
      costoPromedioCordoba: Number(item.costoPromedioCordoba || 0),
      precioVentaPromedioCordoba: Number(item.precioVentaPromedioCordoba || 0),
      precioVentaSugeridoCordoba: Number(item.precioVentaSugeridoCordoba || 0),
      codigoSustituto: item.codigoSustituto || "",
      marcaSustitutoId: Number(item.marcaSustitutoId || 0),
      compatibilidadMaquinas: Array.isArray(item.compatibilidadMaquinas)
        ? item.compatibilidadMaquinas
        : [],
      preciosCompetencia: Array.isArray(item.preciosCompetencia)
        ? item.preciosCompetencia
        : [],
    });
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
        `${Number(r.costoPromedioCordoba).toFixed(2)} / ${Number(
          r.costoPromedioDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Venta Prom (C$/US$)",
      selector: (r: any) =>
        `${Number(r.precioVentaPromedioCordoba).toFixed(2)} / ${Number(
          r.precioVentaPromedioDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Costo Total (C$/US$)",
      selector: (r: any) =>
        `${Number(r.costoTotalCordoba).toFixed(2)} / ${Number(
          r.costoTotalDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Venta Total (C$/US$)",
      selector: (r: any) =>
        `${Number(r.ventaTotalCordoba).toFixed(2)} / ${Number(
          r.ventaTotalDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Utilidad x Unidad (C$/US$)",
      selector: (r: any) =>
        `${Number(r.utilidadCordoba).toFixed(2)} / ${Number(
          r.utilidadDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Utilidad Total (C$/US$)",
      selector: (r: any) =>
        `${Number(r.utilidadTotalCordoba).toFixed(2)} / ${Number(
          r.utilidadTotalDolar
        ).toFixed(2)}`,
      right: true,
    },
    {
      name: "Código Sustituto",
      selector: (r: any) => {
        const sustituto = items.find((i) => i.numeroParte === r.codigoSustituto);
        return sustituto ? `${sustituto.numeroParte} — ${sustituto.nombre}` : "—";
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
              <label>Costo Promedio (C$)</label>
              <input
                type="number"
                value={form.costoPromedioCordoba}
                onChange={(e) =>
                  setForm({ ...form, costoPromedioCordoba: Number(e.target.value) })
                }
                min={0}
                step="0.01"
              />
              <small>≈ {formUSD.costoPromedioDolar.toFixed(2)} US$</small>
            </div>
            <div>
              <label>Precio Venta Promedio (C$)</label>
              <input
                type="number"
                value={form.precioVentaPromedioCordoba}
                onChange={(e) =>
                  setForm({
                    ...form,
                    precioVentaPromedioCordoba: Number(e.target.value),
                  })
                }
                min={0}
                step="0.01"
              />
              <small>≈ {formUSD.precioVentaPromedioDolar.toFixed(2)} US$</small>
            </div>
          </div>

          <div className="inventario-row">
            <div>
              <label>Precio Venta Sugerido (C$)</label>
              <input
                type="number"
                value={form.precioVentaSugeridoCordoba}
                onChange={(e) =>
                  setForm({
                    ...form,
                    precioVentaSugeridoCordoba: Number(e.target.value),
                  })
                }
                min={0}
                step="0.01"
              />
              <small>≈ {formUSD.precioVentaSugeridoDolar.toFixed(2)} US$</small>
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
              <select
                value={form.codigoSustituto}
                onChange={(e) => setForm({ ...form, codigoSustituto: e.target.value })}
              >
                <option value="">Seleccione un producto</option>
                {items
                  .filter((i) => i.id !== editing)
                  .map((i) => (
                    <option key={i.id} value={i.numeroParte}>
                      {i.numeroParte} — {i.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label>Marca del Sustituto</label>
              <select
                value={form.marcaSustitutoId}
                onChange={(e) =>
                  setForm({ ...form, marcaSustitutoId: Number(e.target.value) })
                }
              >
                <option value={0}>Seleccione</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
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
                      precioCordoba: pcForm.precioCordoba ? Number(pcForm.precioCordoba) : undefined,
                      precioDolar: pcForm.precioDolar ? Number(pcForm.precioDolar) : undefined,
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
                        {pc.precioCordoba != null ? `${Number(pc.precioCordoba).toFixed(2)} C$` : "—"}
                        {" / "}
                        {pc.precioDolar != null ? `${Number(pc.precioDolar).toFixed(2)} US$` : "—"}
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
                            precioCordoba: pc.precioCordoba ?? "",
                            precioDolar: pc.precioDolar ?? "",
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
          highlightOnHover
          striped
          responsive
          persistTableHead
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
          {totales.valorTotalC.toFixed(2)} C$ / {totales.valorTotalD.toFixed(2)} US$
        </p>
        <p>
          📈 <strong>Utilidad total:</strong>{" "}
          <span
            style={{
              color: totales.utilidadTotalC >= 0 ? "green" : "red",
              fontWeight: "bold",
            }}
          >
            {totales.utilidadTotalC.toFixed(2)} C$ / {totales.utilidadTotalD.toFixed(2)} US$
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
                    {Number(view.costoPromedioCordoba).toFixed(2)} / {Number(view.costoPromedioDolar).toFixed(2)}
                  </div>
                </div>
                <div>
                  <strong>Venta Prom (C$/US$):</strong>
                  <div>
                    {Number(view.precioVentaPromedioCordoba).toFixed(2)} / {Number(view.precioVentaPromedioDolar).toFixed(2)}
                  </div>
                </div>
                <div>
                  <strong>Venta Sug (C$/US$):</strong>
                  <div>
                    {Number(view.precioVentaSugeridoCordoba).toFixed(2)} / {Number(view.precioVentaSugeridoDolar).toFixed(2)}
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
                        <div>{pc.precioCordoba != null ? Number(pc.precioCordoba).toFixed(2) : "—"}</div>
                        <div>{pc.precioDolar != null ? Number(pc.precioDolar).toFixed(2) : "—"}</div>
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
