import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  FaCog,
  FaSave,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaCreditCard,
  FaExclamationTriangle,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { buildApiUrl } from "../api/constants";

const API_URL = buildApiUrl("/configuracion");
const API_METODOS_PAGO = buildApiUrl("/metodos-pago");

// 🔹 Leer cookies manualmente
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

// 🔹 Decodificar token JWT
function decodeToken(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

const ConfiguracionView = () => {
  const [config, setConfig] = useState({
    ruc: "",
    razonSocial: "",
    direccion: "",
    telefono1: "",
    telefono2: "",
    correo: "",
    sitioWeb: "",
    logoUrl: "",
    mensajeFactura: "",
    numeroFacturaInicial: 1,
  });

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para métodos de pago
  const [metodosPago, setMetodosPago] = useState<any[]>([]);
  const [editandoMetodo, setEditandoMetodo] = useState<number | null>(null);
  const [formMetodo, setFormMetodo] = useState({
    nombre: "",
    banco: "",
    numeroCuenta: "",
    titular: "",
    moneda: "NIO",
  });

  useEffect(() => {
    const token = getCookie("token");
    if (!token) {
      toast.error("⚠️ No hay sesión activa. Inicia sesión nuevamente.");
      setTimeout(() => (window.location.href = "/"), 2000);
      return;
    }

    const decoded = decodeToken(token);
    if (decoded) {
      setUser(decoded);
      console.log("👤 Usuario autenticado:", decoded);
    } else {
      toast.error("⚠️ Token inválido o expirado. Inicia sesión nuevamente.");
      setTimeout(() => (window.location.href = "/"), 2000);
      return;
    }

    // 🔹 Obtener configuración
    fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("❌ Error al cargar configuración.");
        setLoading(false);
      });

    // 🔹 Obtener métodos de pago
    fetchMetodosPago();
  }, []);

  const fetchMetodosPago = async () => {
    const token = getCookie("token");
    try {
      const res = await fetch(API_METODOS_PAGO, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMetodosPago(data.metodos || []);
    } catch {
      toast.error("❌ Error al cargar métodos de pago");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = getCookie("token");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Error al guardar configuración");

      toast.success("✅ Configuración guardada correctamente");
    } catch (error) {
      console.error(error);
      toast.error("❌ No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarMetodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCookie("token");

    if (!formMetodo.nombre || !formMetodo.banco || !formMetodo.numeroCuenta || !formMetodo.titular) {
      toast.warn("⚠️ Complete todos los campos obligatorios");
      return;
    }

    try {
      const url = editandoMetodo ? `${API_METODOS_PAGO}/${editandoMetodo}` : API_METODOS_PAGO;
      const method = editandoMetodo ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formMetodo,
          tipoCuenta: "BANCO",
          activo: true,
        }),
      });

      if (!res.ok) throw new Error("Error al guardar método de pago");

      toast.success(editandoMetodo ? "✅ Método actualizado" : "✅ Método agregado");
      setFormMetodo({ nombre: "", banco: "", numeroCuenta: "", titular: "", moneda: "NIO" });
      setEditandoMetodo(null);
      fetchMetodosPago();
    } catch {
      toast.error("❌ Error al guardar método de pago");
    }
  };

  const handleEditarMetodo = (metodo: any) => {
    setFormMetodo({
      nombre: metodo.nombre || "",
      banco: metodo.banco || "",
      numeroCuenta: metodo.numeroCuenta || "",
      titular: metodo.titular || "",
      moneda: metodo.moneda || "NIO",
    });
    setEditandoMetodo(metodo.id);
  };

  const handleEliminarMetodo = async (id: number) => {
    if (!confirm("¿Eliminar este método de pago?")) return;

    const token = getCookie("token");
    try {
      const res = await fetch(`${API_METODOS_PAGO}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al eliminar");

      toast.success("🗑️ Método eliminado");
      fetchMetodosPago();
    } catch {
      toast.error("❌ Error al eliminar método de pago");
    }
  };

  if (loading) return <Loading>Cargando configuración...</Loading>;

  return (
    <Container>
      <AnimatedBackground />
      <ToastContainer position="top-right" autoClose={3000} />

      {/* 🔹 Botón de volver */}
      <BackButton onClick={() => (window.location.href = "/home")}>
        <FaArrowLeft /> Volver
      </BackButton>

      <Header>
        <div className="title">
          <FaCog className="icon" />
          <h1>Configuración General</h1>
        </div>
        <p>Bienvenido</p>
      </Header>

      <FormContainer onSubmit={handleSubmit}>
        <SectionTitle>Datos Generales</SectionTitle>
        <InputGrid>
          <label>RUC</label>
          <input
            type="text"
            placeholder="Ingrese el RUC"
            value={config.ruc}
            onChange={(e) => setConfig({ ...config, ruc: e.target.value })}
            required
          />

          <label>Razón Social</label>
          <input
            type="text"
            placeholder="Nombre legal de la empresa"
            value={config.razonSocial}
            onChange={(e) =>
              setConfig({ ...config, razonSocial: e.target.value })
            }
            required
          />

          <label>Dirección</label>
          <textarea
            placeholder="Ingrese la dirección completa"
            value={config.direccion}
            onChange={(e) =>
              setConfig({ ...config, direccion: e.target.value })
            }
            required
          />

          <label>Teléfono 1</label>
          <input
            type="text"
            placeholder="Ejemplo: +505 8888-8888"
            value={config.telefono1}
            onChange={(e) =>
              setConfig({ ...config, telefono1: e.target.value })
            }
          />

          <label>Teléfono 2</label>
          <input
            type="text"
            placeholder="Ejemplo: +505 7777-7777"
            value={config.telefono2}
            onChange={(e) =>
              setConfig({ ...config, telefono2: e.target.value })
            }
          />

          <label>Correo</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            value={config.correo}
            onChange={(e) =>
              setConfig({ ...config, correo: e.target.value })
            }
          />

          <label>Sitio Web</label>
          <input
            type="text"
            placeholder="https://empresa.com"
            value={config.sitioWeb}
            onChange={(e) =>
              setConfig({ ...config, sitioWeb: e.target.value })
            }
          />

          <label>Logo (URL)</label>
          <input
            type="text"
            placeholder="https://ruta-del-logo.png"
            value={config.logoUrl}
            onChange={(e) =>
              setConfig({ ...config, logoUrl: e.target.value })
            }
          />

          {config.logoUrl && (
            <LogoPreview>
              <img src={config.logoUrl} alt="Logo preview" />
            </LogoPreview>
          )}

          <label>Mensaje de Factura</label>
          <textarea
            placeholder="Gracias por su compra..."
            value={config.mensajeFactura}
            onChange={(e) =>
              setConfig({ ...config, mensajeFactura: e.target.value })
            }
          />

          <label>Número de Factura Inicial</label>
          <input
            type="number"
            placeholder="Ej: 875"
            min="1"
            value={config.numeroFacturaInicial}
            onChange={(e) =>
              setConfig({ ...config, numeroFacturaInicial: parseInt(e.target.value) || 1 })
            }
          />
          <small style={{ gridColumn: 'span 2', color: '#5a6d90', fontSize: '0.85em', marginTop: '-0.5em' }}>
            Este será el número inicial para las facturas. Las siguientes facturas serán consecutivas.
          </small>
        </InputGrid>

        <SaveButton type="submit" disabled={saving}>
          <FaSave />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </SaveButton>
      </FormContainer>

      {/* 🔹 Sección de Métodos de Pago */}
      <MetodosPagoSection>
        <SectionTitle>Métodos de Pago</SectionTitle>

        {/* Formulario para agregar/editar método de pago */}
        <FormMetodoContainer onSubmit={handleGuardarMetodo}>
          {editandoMetodo && (
            <EditModeIndicator>
              <FaExclamationTriangle className="icon" />
              Editando método de pago
            </EditModeIndicator>
          )}

          <div>
            <label>Nombre del Método *</label>
            <input
              type="text"
              placeholder="Ej: Transferencia BAC"
              value={formMetodo.nombre}
              onChange={(e) =>
                setFormMetodo({ ...formMetodo, nombre: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Banco *</label>
            <input
              type="text"
              placeholder="Ej: BAC"
              value={formMetodo.banco}
              onChange={(e) =>
                setFormMetodo({ ...formMetodo, banco: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Número de Cuenta *</label>
            <input
              type="text"
              placeholder="Ej: 123456789"
              value={formMetodo.numeroCuenta}
              onChange={(e) =>
                setFormMetodo({ ...formMetodo, numeroCuenta: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Titular *</label>
            <input
              type="text"
              placeholder="Nombre del titular"
              value={formMetodo.titular}
              onChange={(e) =>
                setFormMetodo({ ...formMetodo, titular: e.target.value })
              }
              required
            />
          </div>

          <div>
            <label>Moneda *</label>
            <select
              value={formMetodo.moneda}
              onChange={(e) =>
                setFormMetodo({ ...formMetodo, moneda: e.target.value })
              }
              required
            >
              <option value="NIO">NIO (Córdoba)</option>
              <option value="USD">USD (Dólar)</option>
            </select>
          </div>

          <ActionButton type="submit" variant="save">
            <FaSave />
            {editandoMetodo ? "Actualizar Método" : "Guardar Método"}
          </ActionButton>

          {editandoMetodo && (
            <ActionButton
              type="button"
              variant="cancel"
              onClick={() => {
                setEditandoMetodo(null);
                setFormMetodo({
                  nombre: "",
                  banco: "",
                  numeroCuenta: "",
                  titular: "",
                  moneda: "NIO",
                });
              }}
            >
              Cancelar
            </ActionButton>
          )}
        </FormMetodoContainer>

        {/* Lista de métodos de pago */}
        {metodosPago.length === 0 ? (
          <EmptyState>
            <FaCreditCard className="icon" />
            <p>No hay métodos de pago configurados</p>
          </EmptyState>
        ) : (
          <ListaMetodosPago>
            {metodosPago.map((metodo) => (
              <MetodoPagoCard key={metodo.id}>
                <div className="metodo-nombre">
                  <FaCreditCard />
                  {metodo.nombre}
                </div>
                <div className="metodo-info">
                  <div className="info-row">
                    <span className="info-label">Banco:</span>
                    <span className="info-value">{metodo.banco}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Cuenta:</span>
                    <span className="info-value">{metodo.numeroCuenta}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Titular:</span>
                    <span className="info-value">{metodo.titular}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Moneda:</span>
                    <span className="moneda-badge">{metodo.moneda}</span>
                  </div>
                </div>
                <div className="actions">
                  <ActionButton
                    variant="edit"
                    onClick={() => handleEditarMetodo(metodo)}
                  >
                    <FaEdit />
                    Editar
                  </ActionButton>
                  <ActionButton
                    variant="delete"
                    onClick={() => handleEliminarMetodo(metodo.id)}
                  >
                    <FaTrash />
                    Eliminar
                  </ActionButton>
                </div>
              </MetodoPagoCard>
            ))}
          </ListaMetodosPago>
        )}
      </MetodosPagoSection>

      <Footer>© 2025 AYHER — Todos los derechos reservados</Footer>
    </Container>
  );
};

export default ConfiguracionView;

// === 🎨 ESTILOS ===
const wave = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
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
  z-index: 0;
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

  svg {
    font-size: 1.1em;
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
    animation: ${float} 3s ease-in-out infinite;
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

const FormContainer = styled.form`
  width: 85%;
  max-width: 950px;
  margin-top: 3%;
  padding: 2.5%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 1em;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
`;

const SectionTitle = styled.h2`
  font-size: 1.3em;
  color: #004aad;
  font-weight: 700;
  margin-bottom: 1em;
  border-left: 5px solid #ff3131;
  padding-left: 10px;
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1em;
  margin-bottom: 2em;

  label {
    grid-column: span 2;
    font-weight: 600;
    color: #002b5b;
  }

  input,
  textarea {
    width: 100%;
    padding: 0.8em;
    border: 2px solid #5a6d90; /* 🔹 Borde oscuro */
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
    grid-column: span 2;
    resize: none;
    height: 90px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LogoPreview = styled.div`
  grid-column: span 2;
  text-align: center;
  margin-top: 1em;

  img {
    max-height: 130px;
    border-radius: 0.6em;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
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

// === 🎨 STYLED COMPONENTS FOR PAYMENT METHODS ===

const MetodosPagoSection = styled.div`
  width: 85%;
  max-width: 950px;
  margin-top: 2%;
  padding: 2.5%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 1em;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  z-index: 1;
`;

const FormMetodoContainer = styled.form`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6em;
  margin-bottom: 2em;
  padding: 2.5em;
  background: rgba(240, 245, 255, 0.5);
  border-radius: 0.8em;
  border: 2px solid #e0e7ff;
  max-width: 850px;
  margin-left: auto;
  margin-right: auto;

  label {
    font-weight: 600;
    color: #002b5b;
    margin-bottom: 0.3em;
    display: block;
  }

  input,
  select {
    width: 100%;
    padding: 0.7em;
    border: 2px solid #5a6d90;
    border-radius: 0.6em;
    font-size: 0.95em;
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

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ListaMetodosPago = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5em;
  margin-top: 1.5em;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MetodoPagoCard = styled.div`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 245, 255, 0.9));
  border-radius: 0.8em;
  padding: 1.5em;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border: 2px solid #e0e7ff;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 74, 173, 0.2);
    border-color: #004aad;
  }

  .metodo-nombre {
    font-size: 1.2em;
    font-weight: 700;
    color: #004aad;
    margin-bottom: 0.8em;
    display: flex;
    align-items: center;
    gap: 0.5em;
  }

  .metodo-info {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
    margin-bottom: 1em;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.5em;
    font-size: 0.95em;
    color: #002b5b;
  }

  .info-label {
    font-weight: 600;
    color: #5a6d90;
  }

  .info-value {
    color: #001a33;
    font-weight: 500;
  }

  .moneda-badge {
    display: inline-block;
    background: linear-gradient(135deg, #004aad, #0066cc);
    color: white;
    padding: 0.3em 0.8em;
    border-radius: 0.5em;
    font-size: 0.85em;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .actions {
    display: flex;
    gap: 0.8em;
    margin-top: 1em;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3em 2em;
  background: rgba(240, 245, 255, 0.5);
  border-radius: 0.8em;
  border: 2px dashed #5a6d90;
  margin-top: 1.5em;

  p {
    font-size: 1.1em;
    color: #5a6d90;
    font-weight: 500;
    margin: 0;
  }

  .icon {
    font-size: 3em;
    color: #004aad;
    opacity: 0.3;
    margin-bottom: 0.5em;
  }
`;

const ActionButton = styled.button<{ variant?: 'edit' | 'delete' | 'save' | 'cancel' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5em;
  padding: 0.6em 1.2em;
  border: none;
  border-radius: 0.6em;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;

  ${({ variant }) => {
    switch (variant) {
      case 'edit':
        return `
          background: linear-gradient(135deg, #004aad, #0066cc);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #0066cc, #004aad);
            transform: scale(1.05);
          }
        `;
      case 'delete':
        return `
          background: linear-gradient(135deg, #ff3131, #cc0000);
          color: white;
          &:hover {
            background: linear-gradient(135deg, #cc0000, #ff3131);
            transform: scale(1.05);
          }
        `;
      case 'save':
        return `
          background: linear-gradient(135deg, #004aad, #ff3131);
          color: white;
          grid-column: span 3;
          width: 100%;
          padding: 0.9em 2em;
          font-size: 1.05em;
          font-weight: 700;
          &:hover {
            transform: scale(1.02);
          }
        `;
      case 'cancel':
        return `
          background: linear-gradient(135deg, #5a6d90, #7a8da0);
          color: white;
          grid-column: span 3;
          width: 100%;
          padding: 0.7em 1.5em;
          font-size: 0.95em;
          &:hover {
            background: linear-gradient(135deg, #7a8da0, #5a6d90);
            transform: scale(1.02);
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, #004aad, #ff3131);
          color: white;
          &:hover {
            transform: scale(1.05);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  }
`;

const EditModeIndicator = styled.div`
  grid-column: span 2;
  background: linear-gradient(135deg, #fff3cd, #ffeaa7);
  border: 2px solid #ffc107;
  border-radius: 0.6em;
  padding: 0.8em 1.2em;
  margin-bottom: 0.5em;
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-weight: 600;
  color: #856404;

  .icon {
    font-size: 1.2em;
  }
`;
