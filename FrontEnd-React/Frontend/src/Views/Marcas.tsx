import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaTags } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DataTable from "react-data-table-component";
import { buildApiUrl } from "../api/constants";

const API_URL = buildApiUrl("/marcas");

// 🔹 Leer cookies manualmente
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const MarcasView = () => {
  const [marcas, setMarcas] = useState<any[]>([]);
  const [form, setForm] = useState({ nombre: "", descripcion: "" });
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // === 🔹 Obtener todas las marcas
  const fetchMarcas = async () => {
    try {
      const token = getCookie("token");
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMarcas(data.marcas || []);
    } catch {
      toast.error("❌ Error al cargar las marcas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarcas();
  }, []);

  // === 🔹 Guardar o actualizar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCookie("token");

    if (!form.nombre.trim()) {
      toast.warning("⚠️ El nombre es obligatorio");
      return;
    }

    try {
      const res = await fetch(editing ? `${API_URL}/${editing}` : API_URL, {
        method: editing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Error al guardar marca");

      toast.success(
        editing
          ? "✅ Marca actualizada correctamente"
          : "✅ Marca creada correctamente"
      );
      setForm({ nombre: "", descripcion: "" });
      setEditing(null);
      fetchMarcas();
    } catch {
      toast.error("❌ No se pudo guardar la marca");
    }
  };

  // === 🔹 Eliminar con confirmación usando Toast
  const confirmDelete = (id: number) => {
    toast.info(
      <div style={{ textAlign: "center" }}>
        <p>¿Seguro que deseas eliminar esta marca?</p>
        <div style={{ display: "flex", justifyContent: "center", gap: "1em" }}>
          <button
            style={{
              background: "#ff3131",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
            onClick={() => handleDelete(id)}
          >
            Sí, eliminar
          </button>
          <button
            style={{
              background: "#004aad",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              cursor: "pointer",
            }}
            onClick={() => toast.dismiss()}
          >
            Cancelar
          </button>
        </div>
      </div>,
      {
        autoClose: false,
        closeOnClick: false,
      }
    );
  };

  const handleDelete = async (id: number) => {
    const token = getCookie("token");

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al eliminar");
      toast.dismiss();
      toast.success("🗑️ Marca eliminada correctamente");
      fetchMarcas();
    } catch {
      toast.error("❌ No se pudo eliminar la marca");
    }
  };

  // === 🔹 Editar
  const handleEdit = (marca: any) => {
    setForm({ nombre: marca.nombre, descripcion: marca.descripcion || "" });
    setEditing(marca.id);
  };

  // === 🔹 Columnas de DataTable
  const columns = [
    {
      name: "Nombre",
      selector: (row: any) => row.nombre,
      sortable: true,
      grow: 2,
    },
    {
      name: "Descripción",
      selector: (row: any) => row.descripcion || "—",
      grow: 3,
    },
    {
      name: "Acciones",
      cell: (row: any) => (
        <Actions>
          <ActionBtn edit onClick={() => handleEdit(row)}>
            <FaEdit />
          </ActionBtn>
          <ActionBtn delete onClick={() => confirmDelete(row.id)}>
            <FaTrash />
          </ActionBtn>
        </Actions>
      ),
    },
  ];

  if (loading) return <Loading>Cargando marcas...</Loading>;

  return (
    <Container>
      <AnimatedBackground />
      <ToastContainer position="top-right" autoClose={2500} />

      {/* 🔹 Botón volver */}
      <BackButton onClick={() => (window.location.href = "/home")}>
        <FaArrowLeft /> Volver
      </BackButton>

      <Header>
        <div className="title">
          <FaTags className="icon" />
          <h1>Gestión de Marcas</h1>
        </div>
        <p>Administra las marcas de tus productos</p>
      </Header>

      <ContentCard>
        <SectionTitle>{editing ? "Editar Marca" : "Nueva Marca"}</SectionTitle>
        <Form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nombre de la marca"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
          <textarea
            placeholder="Descripción (opcional)"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
          <SaveButton type="submit">
            <FaPlus />
            {editing ? "Actualizar" : "Agregar"}
          </SaveButton>
        </Form>
      </ContentCard>

      <TableContainer>
        <DataTable
          columns={columns}
          data={marcas}
          pagination
          highlightOnHover
          striped
          responsive
          noDataComponent="No hay marcas registradas"
        />
      </TableContainer>

      <Footer>© 2025 AYHER — Todos los derechos reservados</Footer>
    </Container>
  );
};

export default MarcasView;

//
// === 💅 ESTILOS ===
//
const wave = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const Container = styled.div`
  width: 100vw;
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #eef3ff 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Poppins", sans-serif;
  color: #001a33;
  position: relative;
  overflow-x: hidden;
`;

const AnimatedBackground = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(-45deg, #004aad, #ff3131, #001a33, #007bff);
  background-size: 400% 400%;
  animation: ${wave} 12s ease infinite;
  opacity: 0.09;
  z-index: -1;
  pointer-events: none;
`;

const BackButton = styled.button`
  position: absolute;
  top: 20px;
  left: 20px;
  background: linear-gradient(135deg, #004aad, #ff3131);
  color: white;
  font-weight: 600;
  border: none;
  border-radius: 0.6em;
  padding: 0.5em 1.2em;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.95em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    background: linear-gradient(135deg, #ff3131, #004aad);
  }
`;

const Header = styled.header`
  width: 100%;
  text-align: center;
  padding: 3% 0;
  background: linear-gradient(90deg, #001f4d, #004aad);
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  z-index: 1;

  .title {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.8em;
  }

  .icon {
    font-size: 2.3em;
    color: #ff4d4d;
  }

  h1 {
    font-size: 2em;
    margin: 0;
  }

  p {
    margin-top: 0.4em;
    color: #d0d0d0;
  }
`;

const ContentCard = styled.div`
  width: 50%;
  max-width: 900px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 1em;
  padding: 2em;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  margin-top: 2em;
  z-index: 5;
`;

const SectionTitle = styled.h2`
  font-size: 1.3em;
  color: #004aad;
  font-weight: 700;
  border-left: 5px solid #ff3131;
  padding-left: 10px;
  margin-bottom: 1em;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1em;

  input,
  textarea {
    width: 80%;
    margin: 0 auto;
    padding: 0.8em;
    border: 2px solid #5a6d90;
    border-radius: 0.6em;
    font-size: 1em;
    background-color: rgba(255, 255, 255, 0.95);
    color: #001a33;
    font-weight: 500;
    transition: all 0.3s ease;

    &:focus {
      outline: none;
      border-color: #003399;
      box-shadow: 0 0 6px rgba(0, 51, 153, 0.3);
    }
  }

  textarea {
    resize: none;
    height: 80px;
  }
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6em;
  width: 100%;
  background: linear-gradient(135deg, #004aad, #ff3131);
  color: white;
  font-weight: 700;
  border: none;
  border-radius: 0.8em;
  padding: 0.9em 2em;
  cursor: pointer;
  font-size: 1.05em;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.02);
  }
`;

const TableContainer = styled.div`
  width: 90%;
  max-width: 1100px;
  background: white;
  border-radius: 1em;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  margin: 2em 0;
  padding: 1em;
  z-index: 5;
  position: relative;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.8em;
`;

const ActionBtn = styled.button<{ edit?: boolean; delete?: boolean }>`
  background: ${({ edit, delete: del }) =>
    edit
      ? "linear-gradient(135deg, #007bff, #004aad)"
      : del
      ? "linear-gradient(135deg, #ff4d4d, #cc0000)"
      : "#ccc"};
  color: white;
  border: none;
  border-radius: 0.5em;
  padding: 0.5em 0.8em;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const Loading = styled.div`
  text-align: center;
  margin-top: 20%;
  font-size: 1.3em;
  color: #004aad;
`;

const Footer = styled.footer`
  width: 100%;
  text-align: center;
  background: #001a33;
  color: white;
  padding: 1.2% 0;
  margin-top: auto;
  font-size: 0.9em;
  letter-spacing: 0.5px;
`;
