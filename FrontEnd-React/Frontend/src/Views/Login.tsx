import React, { useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:4000/api/auth";

// 🔹 Función para decodificar el token sin librerías externas
function decodeToken(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// 🔹 Guardar token y usuario en cookies seguras
function saveAuthCookies(token: string) {
  const user = decodeToken(token);
  const userData = encodeURIComponent(JSON.stringify(user));

  // 7 días de duración
  const maxAge = 7 * 24 * 60 * 60;

  document.cookie = `token=${token}; path=/; max-age=${maxAge}; secure; samesite=strict`;
  document.cookie = `user=${userData}; path=/; max-age=${maxAge}; secure; samesite=strict`;
}

const Form = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Credenciales inválidas");

      // ✅ Guardar token y usuario en cookies
      saveAuthCookies(data.token);

      // ✅ Redirigir al Home
      navigate("/home");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <StyledWrapper>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-title"><span>Inicio de Sesión</span></div>
        <div className="title-2"><span>AYHER</span></div>

        <div className="input-container">
          <input
            className="input-mail"
            name="email"
            type="email"
            placeholder="Correo electrónico"
            required
          />
        </div>

        {/* 💰 Animación de signos de dólar */}
        <section className="bg-stars">
          <span className="dollar">$</span>
          <span className="dollar">$</span>
          <span className="dollar">$</span>
          <span className="dollar">$</span>
        </section>

        <div className="input-container">
          <input
            className="input-pwd"
            name="password"
            type="password"
            placeholder="Contraseña"
            required
          />
        </div>

        <button type="submit" className="submit" disabled={loading}>
          {loading ? "Iniciando..." : "Iniciar Sesión"}
        </button>
      </form>
    </StyledWrapper>
  );
};

export default Form;

// ======================================================
// 🎨 ESTILOS
// ======================================================
const StyledWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at top, #00111a 0%, #000 100%);
  overflow: hidden;
  margin: 0;
  padding: 0;

  .form {
    position: relative;
    display: block;
    padding: 2.2rem;
    max-width: 350px;
    background: linear-gradient(
        14deg,
        rgba(2, 0, 36, 0.8) 0%,
        rgba(24, 24, 65, 0.7) 66%,
        rgb(20, 76, 99) 100%
      ),
      radial-gradient(
        circle,
        rgba(2, 0, 36, 0.5) 0%,
        rgba(32, 15, 53, 0.2) 65%,
        rgba(14, 29, 28, 0.9) 100%
      );
    border: 2px solid #fff;
    box-shadow: rgba(0, 212, 255, 0.7) 0px 0px 40px -15px;
    border-radius: 10px;
    z-index: 1;
  }

  /* ----- Inputs ----- */
  .input-container {
    position: relative;
  }

  .input-container input {
    background-color: rgba(255, 255, 255, 0.08);
    color: #e8f9ff;
    padding: 6px 10px;
    font-size: 0.875rem;
    width: 250px;
    border-radius: 4px;
    border: 2px solid #ffffff;
    margin: 8px 0;
    font-family: monospace;
    transition: all 0.3s ease;
  }

  .input-container input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .input-container input:focus {
    border-color: #00ffcc;
    box-shadow: 0 0 8px #00ffcc;
    background-color: rgba(0, 255, 204, 0.15);
  }

  /* ----- Botón ----- */
  .submit {
    display: block;
    padding: 8px;
    background-color: #00cc66;
    color: #ffffff;
    text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.5);
    font-size: 0.875rem;
    font-weight: 600;
    width: 100%;
    text-transform: uppercase;
    border-radius: 5px;
    transition: all 0.2s ease-out;
  }

  .submit:hover {
    box-shadow: 4px 5px 17px -4px #00ff99;
    cursor: pointer;
  }

  .submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* ----- Títulos ----- */
  .form-title {
    font-size: 1.25rem;
    font-family: monospace;
    font-weight: 600;
    text-align: center;
    color: #fff;
    text-shadow: 0 0 5px #00ffcc;
    animation: flickering 2s linear infinite both;
  }

  .title-2 {
    display: block;
    margin-top: -0.5rem;
    font-size: 2.1rem;
    font-weight: 800;
    font-family: Arial, Helvetica, sans-serif;
    text-align: center;
    -webkit-text-stroke: #fff 0.1rem;
    letter-spacing: 0.2rem;
    color: transparent;
    text-shadow: 0px 0px 16px #00ffcc;
  }

  @keyframes flickering {
    0%, 100% { opacity: 1; }
    42%, 43%, 48%, 49% { opacity: 0; }
  }

  /* ----- Dólares flotantes ----- */
  .bg-stars {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -2;
    overflow: hidden;
  }

  .dollar {
    position: absolute;
    font-size: 1.2rem;
    font-weight: bold;
    color: #00ff99;
    text-shadow: 0 0 10px #00ffcc, 0 0 20px #00ffcc;
    opacity: 0.8;
    animation: floatDollar 5s linear infinite;
  }

  @keyframes floatDollar {
    0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
    50% { transform: translateY(-100px) rotate(20deg); opacity: 1; }
    100% { transform: translateY(-250px) rotate(-20deg); opacity: 0; }
  }

  .dollar:nth-child(1) { top: 70%; left: 10%; animation-delay: 0s; }
  .dollar:nth-child(2) { top: 80%; left: 40%; animation-delay: 1s; }
  .dollar:nth-child(3) { top: 60%; left: 70%; animation-delay: 2s; }
  .dollar:nth-child(4) { top: 90%; left: 85%; animation-delay: 1.5s; }

  @media (max-width: 480px) {
    .form {
      max-width: 300px;
      padding: 1.5rem;
    }

    .input-container input {
      width: 220px;
    }
  }
`;
