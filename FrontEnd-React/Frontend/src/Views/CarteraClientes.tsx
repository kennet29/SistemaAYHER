import { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { buildApiUrl } from '../api/constants';

const API_URL = buildApiUrl('/reportes/cartera-clientes');

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

type CarteraItem = {
  clienteId: number;
  clienteNombre: string;
  totalContadoCordoba: number;
  totalCreditoCordoba: number;
  totalContadoDolar: number;
  totalCreditoDolar: number;
  creditoHabilitado?: boolean;
  creditoMaximoCordoba?: number;
  creditoMaximoDolar?: number;
};

// Removed unused COLORS

const CarteraClientes: React.FC = () => {
  const [data, setData] = useState<CarteraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moneda, setMoneda] = useState<'C$' | 'US$'>(() => (localStorage.getItem('moneda') as 'C$' | 'US$') || 'C$');
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'credito' | 'contado'>('total');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [topN, setTopN] = useState<number>(20);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getCookie('token') || localStorage.getItem('token');
        const res = await fetch(API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('Error cargando cartera de clientes');
        const json = await res.json();
        setData(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setError(e?.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('moneda', moneda);
  }, [moneda]);

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return data.filter((d) => !lower || d.clienteNombre.toLowerCase().includes(lower));
  }, [data, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getTotal = (r: CarteraItem) => (moneda === 'C$' ? r.totalContadoCordoba + r.totalCreditoCordoba : r.totalContadoDolar + r.totalCreditoDolar);
    const getCredito = (r: CarteraItem) => (moneda === 'C$' ? r.totalCreditoCordoba : r.totalCreditoDolar);
    const getContado = (r: CarteraItem) => (moneda === 'C$' ? r.totalContadoCordoba : r.totalContadoDolar);
    const keyFn = sortKey === 'total' ? getTotal : sortKey === 'credito' ? getCredito : getContado;
    arr.sort((a, b) => {
      const va = keyFn(a);
      const vb = keyFn(b);
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return arr;
  }, [filtered, sortKey, sortDir, moneda]);

  const limited = useMemo(() => sorted.slice(0, Math.max(1, topN)), [sorted, topN]);

  const summary = useMemo(() => {
    const sum = (arr: CarteraItem[], sel: (r: CarteraItem) => number) => arr.reduce((acc, r) => acc + Number(sel(r) || 0), 0);
    const contado = sum(filtered, (r) => (moneda === 'C$' ? r.totalContadoCordoba : r.totalContadoDolar));
    const credito = sum(filtered, (r) => (moneda === 'C$' ? r.totalCreditoCordoba : r.totalCreditoDolar));
    return { contado, credito, total: contado + credito };
  }, [filtered, moneda]);

  const exportCSV = () => {
    const rows = [['Cliente', `Contado ${moneda}`, `Credito ${moneda}`, `Total ${moneda}`],
      ...sorted.map((r) => {
        const contado = moneda === 'C$' ? r.totalContadoCordoba : r.totalContadoDolar;
        const credito = moneda === 'C$' ? r.totalCreditoCordoba : r.totalCreditoDolar;
        return [r.clienteNombre, contado, credito, contado + credito];
      })];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartera_clientes_${moneda}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = useMemo(() => {
    return limited.map((row) => {
      const contado = moneda === 'C$' ? row.totalContadoCordoba : row.totalContadoDolar;
      const credito = moneda === 'C$' ? row.totalCreditoCordoba : row.totalCreditoDolar;
      const total = (contado || 0) + (credito || 0);
      const limite = moneda === 'C$' ? row.creditoMaximoCordoba : row.creditoMaximoDolar;
      return {
        key: row.clienteId,
        cliente: row.clienteNombre,
        contado: Number(contado || 0),
        credito: Number(credito || 0),
        total: Number(total || 0),
        limite: Number(limite ?? 0),
        habilitado: Boolean(row.creditoHabilitado),
      };
    });
  }, [limited, moneda]);

  return (
    <PageContainer>
      <AnimatedBackground />
      <Header>
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📊</span>
            <h1>Cartera de clientes</h1>
          </div>
          <p>Totales de ventas por cliente (Credito vs Contado)</p>
        </div>
      </Header>

      <Main>
        <Controls>
          <input
            type="search"
            placeholder="Buscar cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="row">
            <label>Moneda:</label>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value as any)}>
              <option value="C$">C$</option>
              <option value="US$">US$</option>
            </select>
            <label>Orden:</label>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
              <option value="total">Total</option>
              <option value="credito">Credito</option>
              <option value="contado">Contado</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value as any)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <label>Top:</label>
            <input
              type="number"
              min={1}
              max={200}
              value={topN}
              onChange={(e) => setTopN(Math.max(1, Number(e.target.value || 1)))}
            />
            <button onClick={exportCSV}>Exportar CSV</button>
          </div>
        </Controls>

        {loading && <p style={{ marginTop: 16 }}>Cargando...</p>}
        {error && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'red' }}>{error}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <SummaryBox>
              <div className="title">Resumen total ({moneda})</div>
              <div className="stats">
                <div>
                  <span className="label">Contado:</span>
                  <span className="value contado">{summary.contado.toFixed(2)} {moneda}</span>
                </div>
                <div>
                  <span className="label">Credito:</span>
                  <span className="value credito">{summary.credito.toFixed(2)} {moneda}</span>
                </div>
                <div>
                  <span className="label">Total:</span>
                  <span className="value total">{summary.total.toFixed(2)} {moneda}</span>
                </div>
                <div className="muted">Clientes: {filtered.length}</div>
              </div>
            </SummaryBox>

            <Grid>
              {rows.map((r) => (
                <ClientCard key={r.key}>
                  <div className="name">{r.cliente}</div>
                  <div className="row"><span>Contado:</span><b className="contado">{r.contado.toFixed(2)} {moneda}</b></div>
                  <div className="row"><span>Cr�dito:</span><b className="credito">{r.credito.toFixed(2)} {moneda}</b></div>
                  <div className="row"><span>L�mite cr�dito:</span><b className="total">{r.limite.toFixed(2)} {moneda}</b></div>
                  <div className="row"><span>Cr�dito habilitado:</span><b className={r.habilitado ? "contado" : "credito"}>{r.habilitado ? "S�" : "No"}</b></div>
                  <div className="row sep"><span>Total:</span><b className="total">{r.total.toFixed(2)} {moneda}</b></div>
                </ClientCard>
              ))}
              {rows.length === 0 && <p>No hay datos para mostrar.</p>}
            </Grid>
          </>
        )}
      </Main>

      <Footer>© 2025 AYHER — Reportes</Footer>
    </PageContainer>
  );
};

export default CarteraClientes;
/* ===== Estilos similares a Home ===== */
const wave = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const PageContainer = styled.div`
  width: 100vw;
  height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%);
  display: flex;
  flex-direction: column;
  color: #001a33;
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
  padding: 24px 0;
  text-align: center;
  color: #fff;
  background: linear-gradient(270deg, #001f4d, #004aad);
  background-size: 200% 200%;
  animation: ${wave} 10s ease infinite;
  box-shadow: 0 8px 20px rgba(0, 0, 50, 0.4);
  position: relative;
  z-index: 1;

  .logo { display: flex; justify-content: center; align-items: center; gap: 10px; }
  .logo-icon { font-size: 28px; }
  h1 { font-size: 28px; font-weight: 700; margin: 0; }
  p { font-size: 14px; margin-top: 6px; color: #f8eaea; }
`;

const Main = styled.main`
  flex: 1;
  width: 90%;
  margin: 0 auto;
  padding: 20px 0 30px;
  z-index: 1;
  position: relative;
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px;

  input[type='search'] { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; }
  select { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; }
  input[type='number'] { width: 80px; padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; }
  button { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; background: #fff; cursor: pointer; }

  .row { display: inline-flex; gap: 8px; align-items: center; }
`;

const SummaryBox = styled.div`
  margin-top: 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 14px;
  .title { font-weight: 700; margin-bottom: 8px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
  .label { color: #666; margin-right: 6px; }
  .value.contado { color: #2e7d32; }
  .value.credito { color: #c62828; }
  .value.total { color: #1a237e; }
  .muted { color: #666; margin-top: 6px; grid-column: 1 / -1; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const ClientCard = styled.div`
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.04);
  .name { font-weight: 700; margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .row.sep { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #eee; }
  .contado { color: #2e7d32; }
  .credito { color: #c62828; }
  .total { color: #1a237e; }
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
