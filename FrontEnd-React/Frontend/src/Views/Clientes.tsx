import { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { FaPlus, FaUser, FaArrowLeft, FaSearch, FaTimes } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import "./Clientes.css";
import { buildApiUrl } from "../api/constants";

const API_CLIENTES = buildApiUrl("/clientes");

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type ClienteForm = {
  id?: number;
  tipoCliente: string;
  codigo: string;
  nombre: string;
  empresa: string;
  nombreContacto: string;
  ruc: string;
  razonSocial: string;
  telefono1: string;
  telefono2: string;
  correo1: string;
  correo2: string;
  direccion: string;
  observacion: string;
  creditoHabilitado: boolean;
  creditoMaximoCordoba: number;
  creditoMaximoDolar: number;
};

const defaultForm: ClienteForm = {
  tipoCliente: "PERSONA",
  codigo: "",
  nombre: "",
  empresa: "",
  nombreContacto: "",
  ruc: "",
  razonSocial: "",
  telefono1: "",
  telefono2: "",
  correo1: "",
  correo2: "",
  direccion: "",
  observacion: "",
  creditoHabilitado: true,
  creditoMaximoCordoba: 100000,
  creditoMaximoDolar: 2739.73,
};

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<any[]>([]);
  const [form, setForm] = useState<ClienteForm>(defaultForm);
  const [editing, setEditing] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaModal, setBusquedaModal] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  async function loadClientes() {
    setLoading(true);
    const res = await fetch(API_CLIENTES, {
      headers: { Authorization: `Bearer ${getCookie("token")}` },
    });
    const data = await res.json();
    setClientes(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadClientes();
  }, []);

  function prepareFormData() {
    const cleaned = { ...form };
    if (!editing) delete cleaned.id;

    cleaned.correo1 = cleaned.correo1?.trim() || "";
    cleaned.correo2 = cleaned.correo2?.trim() || "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cleaned.correo1 && !emailRegex.test(cleaned.correo1)) {
      toast.error("Correo inv�lido");
      return null;
    }

    cleaned.creditoHabilitado = Boolean(cleaned.creditoHabilitado);
    cleaned.creditoMaximoCordoba = Number(cleaned.creditoMaximoCordoba || 0);
    cleaned.creditoMaximoDolar = Number(cleaned.creditoMaximoDolar || 0);
    return cleaned;
  }

  async function saveCliente() {
    const dataToSend = prepareFormData();
    if (!dataToSend) return;

    const method = editing ? "PUT" : "POST";
    const url = editing ? `${API_CLIENTES}/${form.id}` : API_CLIENTES;

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getCookie("token")}`,
      },
      body: JSON.stringify(dataToSend),
    });

    if (res.ok) {
      toast.success(`Cliente ${editing ? "actualizado" : "creado"} correctamente`);
      setForm(defaultForm);
      setEditing(false);
      loadClientes();
    } else {
      const errorData = await res.json().catch(() => ({}));
      console.error("Error al guardar cliente:", errorData);
      toast.error(errorData.message || "No se pudo guardar el cliente");
    }
  }

  async function deleteCliente(id: number) {
    if (!window.confirm("�Seguro que deseas eliminar este cliente?")) return;

    const res = await fetch(`${API_CLIENTES}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getCookie("token")}` },
    });
    if (res.ok) {
      toast.info("Cliente eliminado");
      loadClientes();
    } else {
      toast.error("No se pudo eliminar");
    }
  }

  function editRow(row: any) {
    setForm({
      ...defaultForm,
      ...row,
    });
    setEditing(true);
  }

  const filtrarClientes = (query: string) => {
    const q = query.toLowerCase();
    return clientes.filter(
      (c: any) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.ruc?.toLowerCase().includes(q)
    );
  };

  const filtered = useMemo(() => filtrarClientes(busqueda), [busqueda, clientes]);
  const filteredModal = useMemo(() => filtrarClientes(busquedaModal), [busquedaModal, clientes]);

  const creditSummary = useMemo(() => {
    const enabled = clientes.filter((c) => c.creditoHabilitado).length;
    const limiteCordoba = clientes.reduce((sum, c) => sum + Number(c.creditoMaximoCordoba || 0), 0);
    return { enabled, limiteCordoba };
  }, [clientes]);

  const columns = [
    { name: "CLIENTE", selector: (r: any) => r.nombre ?? "�", sortable: true },
    { name: "EMPRESA", selector: (r: any) => r.empresa ?? "�" },
    { name: "RUC", selector: (r: any) => r.ruc ?? "�" },
    { name: "TELEFONO", selector: (r: any) => r.telefono1 ?? "�" },
    {
      name: "ACCIONES",
      cell: (r: any) => (
        <div className="actions">
          <button className="btn-edit" onClick={() => editRow(r)}>
            Editar
          </button>
          <button className="btn-del" onClick={() => deleteCliente(r.id)}>
            Borrar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="clientes-container">
      <button className="btn-back" onClick={() => navigate("/home")}>
        <FaArrowLeft /> Menu
      </button>

      <header className="page-header">
        <h1><FaUser /> Clientes</h1>
        <div className="overview">
          <span>{clientes.length} clientes registrados</span>
          <span>{creditSummary.enabled} con credito habilitado</span>
          <span>Limite total: {creditSummary.limiteCordoba.toFixed(2)} C$</span>
        </div>
      </header>

      <div className="form-card">
        <h2>{editing ? "Editar Cliente" : "Nuevo Cliente"}</h2>
        <div className="form-grid">
          <section className="form-section">
            <h3>Datos basicos</h3>
            <label>Tipo</label>
            <select value={form.tipoCliente} onChange={(e) => setForm({ ...form, tipoCliente: e.target.value })}>
              <option value="PERSONA">Persona</option>
              <option value="EMPRESA">Empresa</option>
            </select>
            <label>Codigo</label>
            <input 
              value={form.codigo} 
              onChange={(e) => setForm({ ...form, codigo: e.target.value })} 
              placeholder="Codigo del cliente (opcional)"
            />
            <label>Nombre de Contacto</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <label>Empresa</label>
            <input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            <label>RUC</label>
            <input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
          </section>

          <section className="form-section">
            <h3>Contacto</h3>
            <label>Telefono</label>
            <input value={form.telefono1} onChange={(e) => setForm({ ...form, telefono1: e.target.value })} />
            <label>Correo</label>
            <input value={form.correo1} onChange={(e) => setForm({ ...form, correo1: e.target.value })} />
            <label>Direccion</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            <label>Observacion</label>
            <input value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} />
          </section>

          <section className="form-section credit-section">
            <h3>Credito</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.creditoHabilitado}
                onChange={(e) => setForm({ ...form, creditoHabilitado: e.target.checked })}
              />
              Habilitar credito
            </label>
            <label>Credito maximo (C$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.creditoMaximoCordoba}
              onChange={(e) => setForm({ ...form, creditoMaximoCordoba: Number(e.target.value) })}
            />
            <label>Credito maximo (US$)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.creditoMaximoDolar}
              onChange={(e) => setForm({ ...form, creditoMaximoDolar: Number(e.target.value) })}
            />
          </section>
        </div>

        <button className="btn-save" onClick={saveCliente}>
          <FaPlus /> {editing ? "Actualizar" : "Guardar"}
        </button>
      </div>

      <div className="search-wrapper">
        <input
          className="search"
          placeholder="Buscar por nombre, empresa o RUC..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="search-meta">
          <span>Resultados: {filtered.length}</span>
        </div>
        <button className="btn-modal" type="button" onClick={() => setMostrarModal(true)}>
          <FaSearch /> Ver tabla
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        progressPending={loading}
        pagination
        highlightOnHover
        dense
      />

      {mostrarModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMostrarModal(false);
          }}
        >
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Listado</p>
                <h3>Clientes</h3>
              </div>
              <button className="btn-close" type="button" onClick={() => setMostrarModal(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="modal-search">
              <input
                className="search"
                placeholder="Filtrar por nombre, empresa o RUC..."
                value={busquedaModal}
                onChange={(e) => setBusquedaModal(e.target.value)}
              />
              <div className="search-meta">
                <span>Resultados: {filteredModal.length}</span>
              </div>
            </div>

            <div className="modal-table">
              <DataTable
                columns={columns}
                data={filteredModal}
                progressPending={loading}
                pagination
                highlightOnHover
                dense
              />
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" autoClose={2000} />
    </div>
  );
}
