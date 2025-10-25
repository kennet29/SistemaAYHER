import React, { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaCog, FaSave } from "react-icons/fa";

const API_URL = "http://localhost:4000/api/configuracion";

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 🔹 Obtener configuración actual
  useEffect(() => {
    fetch(API_URL, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data) setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 🔹 Guardar cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Error al guardar configuración");

      alert("✅ Configuración guardada correctamente");
    } catch (error) {
      console.error(error);
      alert("❌ No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading>Cargando configuración...</Loading>;

  return (
    <Container>
      <AnimatedBackground />
      <Header>
        <div className="title">
          <FaCog className="icon" />
          <h1>Configuración General</h1>
        </div>
        <p>Administra la información principal de tu empresa</p>
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
            onChange={(e) => setConfig({ ...config, razonSocial: e.target.value })}
            required
          />

          <label>Dirección</label>
          <textarea
            placeholder="Ingrese la dirección completa"
            value={config.direccion}
            onChange={(e) => setConfig({ ...config, direccion: e.target.value })}
            required
          />

          <label>Teléfono 1</label>
          <input
            type="text"
            placeholder="Ejemplo: +505 8888-8888"
            value={config.telefono1}
            onChange={(e) => setConfig({ ...config, telefono1: e.target.value })}
          />

          <label>Teléfono 2</label>
          <input
            type="text"
            placeholder="Ejemplo: +505 7777-7777"
            value={config.telefono2}
            onChange={(e) => setConfig({ ...config, telefono2: e.target.value })}
          />

          <label>Correo</label>
          <input
            type="email"
            placeholder="correo@empresa.com"
            value={config.correo}
            onChange={(e) => setConfig({ ...config, correo: e.target.value })}
          />

          <label>Sitio Web</label>
          <input
            type="text"
            placeholder="https://empresa.com"
            value={config.sitioWeb}
            onChange={(e) => setConfig({ ...config, sitioWeb: e.target.value })}
          />

          <label>Logo (URL)</label>
          <input
            type="text"
            placeholder="https://ruta-del-logo.png"
            value={config.logoUrl}
            onChange={(e) => setConfig({ ...config, logoUrl: e.target.value })}
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

// ======================= 🎨 ESTILOS ==========================
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
  z-index: 1;
  transition: 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }
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
    border: 1.5px solid #ccd6eb;
    border-radius: 0.6em;
    font-size: 1em;
    background-color: rgba(255, 255, 255, 0.95);
    color: #001a33; /* ✅ Texto visible */
    font-weight: 500;
    transition: all 0.25s ease;
  }

  input::placeholder,
  textarea::placeholder {
    color: #7a8ca9; /* ✅ Placeholder visible */
  }

  input:focus,
  textarea:focus {
    border-color: #004aad;
    background: #f4f8ff;
    box-shadow: 0 0 6px rgba(0, 74, 173, 0.2);
    outline: none;
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
    border: 2px solid #004aad33;
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
    transform: scale(1.03);
    box-shadow: 0 0 1em rgba(255, 49, 49, 0.35);
  }

  &:disabled {
    background: #a0a0a0;
    cursor: not-allowed;
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
