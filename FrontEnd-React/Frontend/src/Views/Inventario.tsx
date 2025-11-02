import React, { useEffect, useState, useMemo } from "react";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaBoxOpen,
  FaSearch,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import "./Inventario.css";

const API_URL = "http://localhost:4000/api/inventario";
const API_MARCA = "http://localhost:4000/api/marcas";
const API_CATEGORIA = "http://localhost:4000/api/categorias";

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
    stockActual: 0,
    costoPromedioCordoba: 0,
    precioVentaPromedioCordoba: 0,
    precioVentaSugeridoCordoba: 0,
    codigoSustituto: "",
    marcaSustitutoId: 0,
  });

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

        const utilidadC = ventaC - costoC;
        const utilidadD = ventaD - costoD;

        return {
          ...i,
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
      const res = await fetch(editing ? `${API_URL}/${editing}` : API_URL, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Error al guardar producto");

      toast.success(editing ? "✅ Producto actualizado" : "✅ Producto agregado");
      setForm({
        numeroParte: "",
        nombre: "",
        descripcion: "",
        marcaId: 0,
        categoriaId: 0,
        stockActual: 0,
        costoPromedioCordoba: 0,
        precioVentaPromedioCordoba: 0,
        precioVentaSugeridoCordoba: 0,
        codigoSustituto: "",
        marcaSustitutoId: 0,
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
      stockActual: Number(item.stockActual || 0),
      costoPromedioCordoba: Number(item.costoPromedioCordoba || 0),
      precioVentaPromedioCordoba: Number(item.precioVentaPromedioCordoba || 0),
      precioVentaSugeridoCordoba: Number(item.precioVentaSugeridoCordoba || 0),
      codigoSustituto: item.codigoSustituto || "",
      marcaSustitutoId: Number(item.marcaSustitutoId || 0),
    });
    setEditing(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const columns = [
    { name: "N° Parte", selector: (r: any) => r.numeroParte, sortable: true },
    { name: "Nombre", selector: (r: any) => r.nombre, grow: 2 },
    { name: "Marca", selector: (r: any) => r.marca?.nombre || "—" },
    { name: "Categoría", selector: (r: any) => r.categoria?.nombre || "—" },
    { name: "Stock", selector: (r: any) => r.stockActual, center: true },
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

      <footer className="inventario-footer">© 2025 AYHER — Todos los derechos reservados</footer>
    </div>
  );
};

export default InventarioView;
