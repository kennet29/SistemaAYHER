import React, { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { FaPlus, FaEdit, FaTrash, FaUser, FaArrowLeft } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import "./Clientes.css";

const API_CLIENTES = "http://localhost:4000/api/clientes";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// ✅ Form inicial sin ID
const defaultForm = {
  tipoCliente: "PERSONA",
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
};

export default function Clientes() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);

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
      toast.error("📧 Correo inválido");
      return null;
    }

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
      toast.success(`✅ Cliente ${editing ? "actualizado" : "creado"} correctamente`);
      setForm(defaultForm);
      setEditing(false);
      loadClientes();
    } else {
      toast.error("❌ Error guardando cliente");
    }
  }

  async function deleteCliente(id) {
    if (!window.confirm("¿Seguro que deseas eliminar este cliente?")) return;

    const res = await fetch(`${API_CLIENTES}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getCookie("token")}` },
    });

    if (res.ok) {
      toast.success("🗑️ Cliente eliminado");
      loadClientes();
    } else {
      toast.error("❌ Error al eliminar cliente");
    }
  }

  function editRow(row) {
    setForm(row);
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtered = useMemo(() => {
    const q = busqueda.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.empresa?.toLowerCase().includes(q) ||
        c.ruc?.toLowerCase().includes(q)
    );
  }, [busqueda, clientes]);

  const columns = [
    { name: "CLIENTE", selector: (r) => r.nombre, sortable: true },
    { name: "EMPRESA", selector: (r) => r.empresa || "—" },
    { name: "RUC", selector: (r) => r.ruc || "—" },
    { name: "TELÉFONO", selector: (r) => r.telefono1 || "—" },
    {
      name: "ACCIONES",
      cell: (r) => (
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

      {/* 🔙 Botón volver */}
      <button className="btn-back" onClick={() => navigate("/home")}>
        <FaArrowLeft /> Menú
      </button>

      <h1><FaUser /> Clientes</h1>

      <div className="form-card">
        <h2>{editing ? "Editar Cliente" : "Nuevo Cliente"}</h2>

        <div className="form-grid">
          <div>
            <label>Tipo</label>
            <select value={form.tipoCliente} onChange={(e) => setForm({ ...form, tipoCliente: e.target.value })}>
              <option value="PERSONA">Persona</option>
              <option value="EMPRESA">Empresa</option>
            </select>
          </div>

          <div>
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>

          <div>
            <label>Empresa</label>
            <input value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
          </div>

          <div>
            <label>RUC</label>
            <input value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
          </div>

          <div>
            <label>Teléfono</label>
            <input value={form.telefono1} onChange={(e) => setForm({ ...form, telefono1: e.target.value })} />
          </div>

          <div>
            <label>Correo</label>
            <input value={form.correo1} onChange={(e) => setForm({ ...form, correo1: e.target.value })} />
          </div>

          <div className="full">
            <label>Dirección</label>
            <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          </div>
        </div>

        <button className="btn-save" onClick={saveCliente}>
          <FaPlus /> {editing ? "Actualizar" : "Guardar"}
        </button>
      </div>

      <input
        className="search"
        placeholder="Buscar por nombre, empresa o RUC..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <DataTable
        columns={columns}
        data={filtered}
        progressPending={loading}
        pagination
        highlightOnHover
        dense
      />

      <ToastContainer position="top-center" autoClose={2000} />
    </div>
  );
}
