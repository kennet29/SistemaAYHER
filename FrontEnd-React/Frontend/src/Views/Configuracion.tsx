import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaCog, FaSave, FaArrowLeft } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_URL = "http://localhost:4000/api/configuracion";

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
  });

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
  }, []);

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
        </InputGrid>

        <SaveButton type="submit" disabled={saving}>
          <FaSave />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </SaveButton>
      </FormContainer>

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
