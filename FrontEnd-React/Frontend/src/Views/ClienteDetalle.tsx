import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { buildApiUrl } from '../api/constants';

const API_URL = (clienteId: string) => buildApiUrl(`/reportes/cliente-detalle/${clienteId}`);

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

type ClienteData = {
  cliente: {
    id: number;
    nombre: string | null;
    empresa: string | null;
    telefono: string | null;
    correo: string | null;
    creditoHabilitado: boolean;
    creditoMaximoCordoba: number;
    creditoMaximoDolar: number;
  };
  estadisticas: {
    totalVentas: number;
    totalCordoba: number;
    totalDolar: number;
    promedioCordoba: number;
    promedioDolar: number;
    ventasContado: number;
    ventasCredito: number;
    ultimaCompra: string | null;
    diasDesdeUltimaCompra: number | null;
  };
  topProductos: Array<{ id: number; nombre: string; cantidad: number; veces: number; total: number }>;
  topMarcas: Array<{ nombre: string; cantidad: number; veces: number }>;
  topCategorias: Array<{ nombre: string; cantidad: number; veces: number }>;
  habitosCompra: Array<{ mes: string; cantidad: number }>;
};

const ClienteDetalle: React.FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ClienteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clienteId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getCookie('token') || localStorage.getItem('token');
        const res = await fetch(API_URL(clienteId), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('Error cargando detalle del cliente');
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clienteId]);

  if (loading) {
    return (
      <PageContainer>
        <AnimatedBackground />
        <Header>
          <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
          <div className="header-content">
            <h1>Cargando...</h1>
          </div>
        </Header>
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <AnimatedBackground />
        <Header>
          <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
          <div className="header-content">
            <h1>Error</h1>
          </div>
        </Header>
        <Main>
          <ErrorBox>
            <p>{error || 'No se encontraron datos'}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </ErrorBox>
        </Main>
      </PageContainer>
    );
  }

  const { cliente, estadisticas, topProductos, topMarcas, topCategorias, habitosCompra } = data;

  return (
    <PageContainer>
      <AnimatedBackground />
      <Header>
        <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">👤</span>
            <h1>{cliente.nombre || cliente.empresa || `Cliente #${cliente.id}`}</h1>
          </div>
          <p>Analisis completo de ventas y habitos de compra</p>
        </div>
      </Header>

      <Main>
        {/* Información del cliente */}
        <Section>
          <SectionTitle>Informacion del Cliente</SectionTitle>
          <InfoGrid>
            <InfoCard>
              <div className="label">Nombre</div>
              <div className="value">{cliente.nombre || '—'}</div>
            </InfoCard>
            <InfoCard>
              <div className="label">Empresa</div>
              <div className="value">{cliente.empresa || '—'}</div>
            </InfoCard>
            <InfoCard>
              <div className="label">Telefono</div>
              <div className="value">{cliente.telefono || '—'}</div>
            </InfoCard>
            <InfoCard>
              <div className="label">Correo</div>
              <div className="value">{cliente.correo || '—'}</div>
            </InfoCard>
          </InfoGrid>
        </Section>

        {/* Sección de Crédito */}
        <Section>
          <SectionTitle>Informacion de Credito</SectionTitle>
          <CreditoBox className={cliente.creditoHabilitado ? 'habilitado' : 'deshabilitado'}>
            <div className="credito-header">
              <div className="estado-badge">
                {cliente.creditoHabilitado ? (
                  <>
                    <span className="icon">✓</span>
                    <span>Credito Habilitado</span>
                  </>
                ) : (
                  <>
                    <span className="icon">✕</span>
                    <span>Credito Deshabilitado</span>
                  </>
                )}
              </div>
            </div>
            
            {cliente.creditoHabilitado && (
              <div className="credito-limites">
                <div className="limite-item">
                  <div className="limite-label">Limite en Cordobas</div>
                  <div className="limite-valor">C$ {cliente.creditoMaximoCordoba.toFixed(2)}</div>
                </div>
                <div className="limite-item">
                  <div className="limite-label">Limite en Dolares</div>
                  <div className="limite-valor">US$ {cliente.creditoMaximoDolar.toFixed(2)}</div>
                </div>
              </div>
            )}
            
            {!cliente.creditoHabilitado && (
              <div className="credito-mensaje">
                Este cliente no tiene credito habilitado. Solo puede realizar compras al contado.
              </div>
            )}
          </CreditoBox>
        </Section>

        {/* Estadísticas generales */}
        <Section>
          <SectionTitle>Estadisticas de Ventas</SectionTitle>
          <StatsGrid>
            <StatCard className="primary">
              <div className="icon">📊</div>
              <div className="value">{estadisticas.totalVentas}</div>
              <div className="label">Total de Ventas</div>
            </StatCard>
            <StatCard className="success">
              <div className="icon">💰</div>
              <div className="value">C$ {estadisticas.totalCordoba.toFixed(2)}</div>
              <div className="label">Total en Cordobas</div>
            </StatCard>
            <StatCard className="info">
              <div className="icon">💵</div>
              <div className="value">US$ {estadisticas.totalDolar.toFixed(2)}</div>
              <div className="label">Total en Dolares</div>
            </StatCard>
            <StatCard className="warning">
              <div className="icon">📈</div>
              <div className="value">C$ {estadisticas.promedioCordoba.toFixed(2)}</div>
              <div className="label">Promedio por Venta</div>
            </StatCard>
            <StatCard className="contado">
              <div className="icon">💳</div>
              <div className="value">{estadisticas.ventasContado}</div>
              <div className="label">Ventas al Contado</div>
            </StatCard>
            <StatCard className="credito">
              <div className="icon">🏦</div>
              <div className="value">{estadisticas.ventasCredito}</div>
              <div className="label">Ventas a Credito</div>
            </StatCard>
            <StatCard className="date">
              <div className="icon">📅</div>
              <div className="value">
                {estadisticas.ultimaCompra 
                  ? new Date(estadisticas.ultimaCompra).toLocaleDateString()
                  : '—'}
              </div>
              <div className="label">Ultima Compra</div>
            </StatCard>
            <StatCard className="days">
              <div className="icon">⏱️</div>
              <div className="value">
                {estadisticas.diasDesdeUltimaCompra !== null 
                  ? `${estadisticas.diasDesdeUltimaCompra} dias`
                  : '—'}
              </div>
              <div className="label">Desde Ultima Compra</div>
            </StatCard>
          </StatsGrid>
        </Section>

        {/* Top Productos */}
        <Section>
          <SectionTitle>Top 10 Productos Mas Comprados</SectionTitle>
          <TableBox>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cantidad Total</th>
                  <th>Veces Comprado</th>
                  <th>Total Gastado (C$)</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.map((p, idx) => (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td>{p.nombre}</td>
                    <td>{p.cantidad}</td>
                    <td>{p.veces}</td>
                    <td>C$ {p.total.toFixed(2)}</td>
                  </tr>
                ))}
                {topProductos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: '#666' }}>
                      No hay datos de productos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableBox>
        </Section>

        {/* Top Marcas y Categorías */}
        <TwoColumnGrid>
          <Section>
            <SectionTitle>Top Marcas</SectionTitle>
            <TableBox>
              <table>
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th>Cantidad</th>
                    <th>Veces</th>
                  </tr>
                </thead>
                <tbody>
                  {topMarcas.map((m, idx) => (
                    <tr key={idx}>
                      <td>{m.nombre}</td>
                      <td>{m.cantidad}</td>
                      <td>{m.veces}</td>
                    </tr>
                  ))}
                  {topMarcas.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#666' }}>
                        No hay datos de marcas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableBox>
          </Section>

          <Section>
            <SectionTitle>Top Categorias</SectionTitle>
            <TableBox>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Cantidad</th>
                    <th>Veces</th>
                  </tr>
                </thead>
                <tbody>
                  {topCategorias.map((c, idx) => (
                    <tr key={idx}>
                      <td>{c.nombre}</td>
                      <td>{c.cantidad}</td>
                      <td>{c.veces}</td>
                    </tr>
                  ))}
                  {topCategorias.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#666' }}>
                        No hay datos de categorias
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableBox>
          </Section>
        </TwoColumnGrid>

        {/* Hábitos de compra */}
        <Section>
          <SectionTitle>Habitos de Compra (Ultimos 12 meses)</SectionTitle>
          <TableBox>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cantidad de Compras</th>
                  <th>Grafico</th>
                </tr>
              </thead>
              <tbody>
                {habitosCompra.map((h) => {
                  const maxCompras = Math.max(...habitosCompra.map((x) => x.cantidad), 1);
                  const porcentaje = (h.cantidad / maxCompras) * 100;
                  return (
                    <tr key={h.mes}>
                      <td>{h.mes}</td>
                      <td>{h.cantidad}</td>
                      <td>
                        <BarContainer>
                          <Bar style={{ width: `${porcentaje}%` }} />
                        </BarContainer>
                      </td>
                    </tr>
                  );
                })}
                {habitosCompra.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: '#666' }}>
                      No hay datos de habitos de compra
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableBox>
        </Section>
      </Main>

      <Footer>© 2025 AYHER - Reportes</Footer>
    </PageContainer>
  );
};

export default ClienteDetalle;

/* ===== Estilos ===== */
const wave = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const PageContainer = styled.div`
  width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
  display: flex;
  flex-direction: column;
  color: #001a33;
  position: relative;
`;

const AnimatedBackground = styled.div`
  position: fixed;
  inset: 0;
  background: linear-gradient(-45deg, #004aad, #ff3131, #001a33, #0066ff);
  background-size: 400% 400%;
  animation: ${wave} 12s ease infinite;
  opacity: 0.08;
  z-index: 0;
`;

const Header = styled.header`
  width: 100%;
  padding: 24px 0;
  text-align: center;
  color: #fff;
  background: linear-gradient(270deg, #001f4d, #004aad);
  background-size: 200% 200%;
  animation: ${wave} 10s ease infinite;
  box-shadow: 0 8px 20px rgba(0, 0, 50, 0.4);
  position: relative;
  z-index: 1;

  .back-btn {
    position: absolute;
    left: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: transparent;
    border: 2px solid #fff;
    color: #fff;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.3s ease;
    
    &:hover {
      background: #fff;
      color: #004aad;
    }
  }

  .logo { display: flex; justify-content: center; align-items: center; gap: 10px; }
  .logo-icon { font-size: 32px; }
  h1 { font-size: 28px; font-weight: 700; margin: 0; color: #fff; }
  p { font-size: 14px; margin-top: 6px; color: #f8eaea; }
`;

const Main = styled.main`
  flex: 1;
  width: 90%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 30px 0;
  z-index: 1;
  position: relative;
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
  color: #001a33;
  border-bottom: 3px solid #004aad;
  padding-bottom: 8px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
`;

const InfoCard = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  
  .label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 8px;
    font-weight: 600;
  }
  
  .value {
    font-size: 16px;
    font-weight: 700;
    color: #001a33;
    
    &.success { color: #2e7d32; }
    &.danger { color: #c62828; }
  }
`;

const CreditoBox = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 3px solid;
  
  &.habilitado {
    border-color: #2e7d32;
    background: linear-gradient(135deg, #ffffff 0%, #f1f8f4 100%);
  }
  
  &.deshabilitado {
    border-color: #c62828;
    background: linear-gradient(135deg, #ffffff 0%, #fef1f1 100%);
  }
  
  .credito-header {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    
    .estado-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 12px 32px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
  
  &.habilitado .estado-badge {
    background: linear-gradient(135deg, #2e7d32, #4caf50);
    color: #fff;
    
    .icon {
      font-size: 24px;
      background: rgba(255, 255, 255, 0.3);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
  }
  
  &.deshabilitado .estado-badge {
    background: linear-gradient(135deg, #c62828, #e53935);
    color: #fff;
    
    .icon {
      font-size: 24px;
      background: rgba(255, 255, 255, 0.3);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
  }
  
  .credito-limites {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    
    .limite-item {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      border-left: 4px solid #2e7d32;
      
      .limite-label {
        font-size: 13px;
        color: #666;
        font-weight: 600;
        text-transform: uppercase;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }
      
      .limite-valor {
        font-size: 24px;
        font-weight: 700;
        color: #2e7d32;
      }
    }
  }
  
  .credito-mensaje {
    text-align: center;
    padding: 20px;
    background: rgba(198, 40, 40, 0.1);
    border-radius: 12px;
    color: #c62828;
    font-weight: 600;
    font-size: 15px;
    line-height: 1.6;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const StatCard = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }
  
  .icon {
    font-size: 32px;
    margin-bottom: 12px;
  }
  
  .value {
    font-size: 20px;
    font-weight: 700;
    margin-bottom: 8px;
  }
  
  .label {
    font-size: 12px;
    color: #666;
    text-transform: uppercase;
    font-weight: 600;
  }
  
  &.primary { border-left: 4px solid #004aad; }
  &.success { border-left: 4px solid #2e7d32; }
  &.info { border-left: 4px solid #0288d1; }
  &.warning { border-left: 4px solid #f57c00; }
  &.contado { border-left: 4px solid #2e7d32; }
  &.credito { border-left: 4px solid #c62828; }
  &.date { border-left: 4px solid #7b1fa2; }
  &.days { border-left: 4px solid #00796b; }
`;

const TableBox = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  thead th {
    text-align: left;
    font-weight: 700;
    padding: 12px;
    border-bottom: 2px solid #004aad;
    background: #f8f9fa;
    color: #001a33;
  }
  
  tbody td {
    padding: 12px;
    border-bottom: 1px solid #f3f3f3;
  }
  
  tbody tr:hover {
    background: #fafafa;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const BarContainer = styled.div`
  width: 100%;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
`;

const Bar = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #004aad, #0066ff);
  border-radius: 10px;
  transition: width 0.3s ease;
`;

const ErrorBox = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  
  p {
    color: #c62828;
    font-size: 16px;
    margin-bottom: 20px;
  }
  
  button {
    padding: 10px 20px;
    background: #004aad;
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    
    &:hover {
      background: #003a8d;
    }
  }
`;

const Footer = styled.footer`
  width: 100%;
  background: #001a33;
  color: #fff;
  text-align: center;
  padding: 14px 0;
  font-size: 14px;
  box-shadow: 0 -8px 16px rgba(0, 0, 0, 0.2);
`;
