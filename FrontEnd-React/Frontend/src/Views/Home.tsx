// React import not required with JSX runtime
import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import {
  FaBoxOpen,
  FaCashRegister,
  FaTags,
  FaExchangeAlt,
  FaChartLine,
  FaThLarge,
  FaCog,
  FaDollarSign,
  FaUserFriends,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { buildApiUrl } from "../api/constants";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const LOW_STOCK_THRESHOLD = 8;

type InventoryItem = {
  id: number;
  nombre?: string;
  stockActual?: number | string;
};

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

const Home = () => {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockError, setLowStockError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const token = getCookie("token") || localStorage.getItem("token") || "";

    const loadLowStock = async () => {
      setLowStockLoading(true);
      setLowStockError(null);
      try {
        const response = await fetch(buildApiUrl("/inventario/low-stock"), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el inventario");
        }

        const payload = await response.json();
        const items: InventoryItem[] = Array.isArray(payload)
          ? payload
          : payload.items ?? payload.data ?? payload.productos ?? [];

        if (aborted) return;
        const filtered = items.filter((item) => {
          const value = Number(item.stockActual ?? 0);
          return !Number.isNaN(value) && value <= LOW_STOCK_THRESHOLD;
        });
        setLowStockItems(filtered);
      } catch (error) {
        if (!aborted) {
          setLowStockError(
            error instanceof Error ? error.message : "Error cargando inventario"
          );
        }
      } finally {
        if (!aborted) {
          setLowStockLoading(false);
        }
      }
    };

    const loadRemisionesPendientes = async () => {
      try {
        const response = await fetch(buildApiUrl("/remision/pendientes"), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json();
        const pendientes = data.remisiones || data.data || data || [];
        const cantidad = Array.isArray(pendientes) ? pendientes.length : 0;
        
        if (cantidad > 0) {
          toast.info(`📋 Remisiones pendientes: ${cantidad}`, {
            position: "top-right",
            autoClose: 5000,
          });
        } else {
          toast.success(`✅ Sin remisiones pendientes por facturar`, {
            position: "top-right",
            autoClose: 5000,
          });
        }
      } catch (error) {
        // Silenciar errores de remisiones
      }
    };

    const loadFacturasPendientes = async () => {
      try {
        const response = await fetch(buildApiUrl("/ventas"), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data = await response.json();
        const ventas = data.ventas || data.data || [];
        const pendientes = ventas.filter((v: any) => 
          v.tipoPago === "CREDITO" && !(v.cancelada === true || v.estadoPago === "PAGADO")
        );
        const cantidad = pendientes.length;
        
        if (cantidad > 0) {
          toast.warning(`💰 Facturas Pendientes de Cobrar: ${cantidad}`, {
            position: "top-right",
            autoClose: 5000,
          });
        }
      } catch (error) {
        // Silenciar errores de facturas
      }
    };

    loadLowStock();
    loadRemisionesPendientes();
    loadFacturasPendientes();
    
    return () => {
      aborted = true;
      controller.abort();
    };
  }, []);

  return (
    <HomeContainer>
      <ToastContainer />
      <AnimatedBackground />
      <Header>
        <div className="header-content">
          <div className="logo">
            <FaChartLine className="logo-icon" />
            <h1>AYHER</h1>
          </div>
          <p>Sistema Integral de Gestión Empresarial</p>
        </div>
      </Header>

      <MainContent>
        <Card color1="#003399" color2="#0052cc">
          <div className="icon-circle">
            <FaBoxOpen />
          </div>
          <h2>Inventario</h2>
          <p>Control total sobre tus productos, existencias y repuestos.</p>
          <Link to="/inventario" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#ff8f00" color2="#ffc107">
          <div className="icon-circle">
            <FaExclamationTriangle />
          </div>
          <h2>Stock crítico</h2>
         <p>Listado de Productos Bajos de Stock </p>
          <Link to="/stock-critico" className="card-link">
            Ver productos críticos
          </Link>
        </Card>

        <Card color1="#0052cc" color2="#0080ff">
          <div className="icon-circle">
            <FaCashRegister />
          </div>
          <h2>Facturación</h2>
          <p>Emití facturas, remisiones y cotizaciones fácilmente.</p>
          <Link to="/facturacion" className="card-link">Entrar</Link>
        </Card>

        {/* ✅ Nueva Card Clientes */}
        <Card color1="#00695c" color2="#26a69a">
          <div className="icon-circle">
            <FaUserFriends />
          </div>
          <h2>Clientes</h2>
          <p>Administra tus clientes y su historial de compras y crédito.</p>
          <Link to="/clientes" className="card-link">Entrar</Link>
        </Card>

        {/* ✅ Facturas de crédito pendientes */}
        <Card color1="#7b1fa2" color2="#512da8">
          <div className="icon-circle">
            <FaCashRegister />
          </div>
          <h2>Facturas pendientes</h2>
          <p>Ver facturas de crédito sin cancelar y sus fechas.</p>
          <Link to="/facturas-pendientes" className="card-link">Ver pendientes</Link>
        </Card>

        {/* ✅ Nueva Card Cartera de clientes */}
        <Card color1="#6a1b9a" color2="#9c27b0">
          <div className="icon-circle">
            <FaChartLine />
          </div>
          <h2>Cartera de clientes</h2>
          <p>Totales de ventas por cliente (Crédito vs Contado).</p>
          <Link to="/cartera-clientes" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#cc0000" color2="#ff3333">
          <div className="icon-circle">
            <FaTags />
          </div>
          <h2>Marcas</h2>
          <p>Organiza tus proveedores y catálogos de productos.</p>
          <Link to="/marcas" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#16a34a" color2="#22c55e">
          <div className="icon-circle">
            <FaBoxOpen />
          </div>
          <h2>Entrada de Compra</h2>
          <p>Registra compras de productos y actualiza inventario.</p>
          <Link to="/entrada-compra" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#3182ce" color2="#4299e1">
          <div className="icon-circle">
            <FaChartLine />
          </div>
          <h2>Historial de Compras</h2>
          <p>Consulta el historial completo de entradas de compra.</p>
          <Link to="/historial-compras" className="card-link">Ver Historial</Link>
        </Card>

        <Card color1="#001f33" color2="#003366">
          <div className="icon-circle">
            <FaExchangeAlt />
          </div>
          <h2>Movimientos</h2>
          <p>Consulta entradas, salidas y ajustes de inventario.</p>
          <Link to="/movimientos" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#660000" color2="#990000">
          <div className="icon-circle">
            <FaThLarge />
          </div>
          <h2>Categorías</h2>
          <p>Clasificación total del catálogo de productos.</p>
          <Link to="/categorias" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#00695c" color2="#26a69a">
          <div className="icon-circle">
            <FaDollarSign />
          </div>
          <h2>Tipo de Cambio</h2>
          <p>Consulta y actualiza el valor del dólar.</p>
          <Link to="/tipo-cambio" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#004d40" color2="#009688">
          <div className="icon-circle">
            <FaCog />
          </div>
          <h2>Configuración</h2>
          <p>Gestión del sistema, usuarios y preferencias.</p>
          <Link to="/configuracion" className="card-link">Entrar</Link>
        </Card>

        <Card color1="#d32f2f" color2="#f44336">
          <div className="icon-circle">
            <FaBoxOpen />
          </div>
          <h2>Restaurar Base de Datos</h2>
          <p>Restaura tu base de datos desde un archivo de respaldo.</p>
          <Link to="/restaurar-db" className="card-link">Restaurar</Link>
        </Card>
      </MainContent>

      <Footer>
        <p>© 2025 AYHER — Todos los derechos reservados</p>
      </Footer>
    </HomeContainer>
  );
};

export default Home;

/* ========== ANIMACIONES ========== */

const wave = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2%); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 1em rgba(255,255,255,0.1); }
  50% { box-shadow: 0 0 2.5em rgba(255,255,255,0.6); }
  100% { box-shadow: 0 0 1em rgba(255,255,255,0.1); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

/* ========== ESTILOS BASE ========== */

const HomeContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  height: auto;
  overflow-x: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
  display: flex;
  flex-direction: column;
  color: #001a33;
  font-family: "Poppins", sans-serif;
  position: relative;
`;

const AnimatedBackground = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(-45deg, #004aad, #ff3131, #001a33, #0066ff);
  background-size: 400% 400%;
  animation: ${wave} 12s ease infinite;
  opacity: 0.08;
  z-index: 0;
`;

const Header = styled.header`
  width: 100%;
  padding: 2% 0;
  text-align: center;
  color: #fff;
  background: linear-gradient(270deg, #001f4d, #004aad);
  background-size: 200% 200%;
  animation: ${wave} 10s ease infinite;
  box-shadow: 0 1vh 2vh rgba(0, 0, 50, 0.4);
  position: relative;
  z-index: 1;

  .logo {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.6em;
  }

  .logo-icon {
    font-size: 2.8em;
    color: #ff4d4d;
    animation: ${float} 3s ease-in-out infinite;
  }

  h1 {
    font-size: 2.4em;
    font-weight: 700;
    margin: 0;
  }

  p {
    font-size: 1.1em;
    margin-top: 0.5%;
    color: #f8eaea;
  }
`;

const MainContent = styled.main`
  flex: 1;
  width: 90%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2.5%;
  padding: 3% 0 5% 0;
  z-index: 1;
  position: relative;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(90%, 1fr));
  }
`;

const Card = styled.div<{ color1: string; color2: string }>`
  background: linear-gradient(135deg, ${(p) => p.color1} 0%, ${(p) => p.color2} 100%);
  border-radius: 1.2em;
  padding: 4%;
  box-shadow: 0 1.5vh 3vh rgba(0, 0, 0, 0.15);
  text-align: center;
  color: white;
  transition: all 0.4s ease;
  position: relative;
  animation: ${float} 6s ease-in-out infinite;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);

  &:hover {
    transform: translateY(-3%) scale(1.03);
    box-shadow: 0 1.5vh 4vh rgba(0, 0, 50, 0.3);
  }

  .icon-circle {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(8px);
    width: 70px;
    height: 70px;
    border-radius: 50%;
    margin: 0 auto 1em;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.9em;
    animation: ${glow} 5s ease-in-out infinite, ${pulse} 6s ease-in-out infinite;
  }

  h2 {
    font-size: 1.4em;
    font-weight: 700;
    margin-bottom: 0.5em;
  }

  p {
    font-size: 0.95em;
    margin-bottom: 6%;
  }

  button,
  .card-link {
    background: #fff;
    border: none;
    color: ${(p) => p.color1};
    font-weight: 700;
    border-radius: 0.5em;
    padding: 0.6em 1.5em;
    cursor: pointer;
    transition: all 0.3s ease;
    text-decoration: none;
    display: inline-block;
  }

  button:hover,
  .card-link:hover {
    background: #fff0f0;
    color: #cc0000;
    transform: scale(1.07);
    box-shadow: 0 0.6vh 1.5vh rgba(255, 255, 255, 0.4);
  }
`;

const StockList = styled.ul`
  text-align: left;
  margin: 0 auto 1rem;
  padding: 0;
  list-style: none;
  font-size: 0.9rem;

  li {
    margin-bottom: 4px;
    letter-spacing: 0.02em;
  }

  li:last-child {
    margin-bottom: 0;
  }
`;

const Footer = styled.footer`
  width: 100%;
  background: #001a33;
  color: #fff;
  text-align: center;
  padding: 1.5% 0;
  font-size: 0.9em;
  letter-spacing: 0.05em;
  box-shadow: 0 -0.5vh 1.5vh rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10;
  margin-top: 2rem;
`;
