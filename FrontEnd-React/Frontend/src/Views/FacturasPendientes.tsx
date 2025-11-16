import React, { useEffect, useMemo, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { buildApiUrl } from '../api/constants';

const API_URL = buildApiUrl('/ventas/pendientes');

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

type VentaPendiente = {
  id: number;
  numeroFactura: string | null;
  fecha: string;
  fechaVencimiento: string | null;
  totalCordoba?: number | string | null;
  cliente?: { id: number; nombre?: string | null; empresa?: string | null } | null;
  cancelada?: boolean | null;
};

const FacturasPendientes: React.FC = () => {
  const [rows, setRows] = useState<VentaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getCookie('token') || localStorage.getItem('token');
        const res = await fetch(API_URL, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) throw new Error('Error cargando pendientes');
        const json = await res.json();
        const data = Array.isArray(json.ventas) ? json.ventas : [];
        setRows(data);
      } catch (e: any) {
        setError(e?.message || 'Error cargando pendientes');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => {
      const name = (r.cliente?.nombre || r.cliente?.empresa || '').toLowerCase();
      const nf = String(r.numeroFactura || '').toLowerCase();
      return name.includes(qq) || nf.includes(qq);
    });
  }, [rows, q]);

  useEffect(() => {
    if (confirmId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && updatingId !== confirmId) setConfirmId(null);
    };
    window.addEventListener('keydown', onKey as any);
    return () => window.removeEventListener('keydown', onKey as any);
  }, [confirmId, updatingId]);

  const handleCancelar = async (id: number) => {
    try {
      setUpdatingId(id);
      const token = getCookie('token') || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/ventas/${id}/cancelada`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cancelada: true }),
      });
      if (!res.ok) throw new Error('No se pudo marcar como cancelada');
      // Refrescar filas localmente
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, cancelada: true } : r)));
      toast.success('Factura marcada como cancelada');
      setConfirmId(null);
    } catch (e) {
      toast.error((e as any)?.message || 'Error al cancelar');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <PageContainer>
      <AnimatedBackground />
      <ToastContainer position="bottom-right" />
      <Header>
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🧾</span>
            <h1>Facturas de crédito pendientes</h1>
          </div>
          <p>Listado de facturas no marcadas como canceladas</p>
        </div>
      </Header>

      <Main>
        <Controls>
          <input
            type="search"
            placeholder="Buscar por cliente o N° factura..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </Controls>

        {loading && <p style={{ marginTop: 16 }}>Cargando...</p>}
        {error && (
          <div style={{ marginTop: 16 }}>
            <p style={{ color: 'red' }}>{error}</p>
            <button onClick={() => window.location.reload()}>Reintentar</button>
          </div>
        )}

        {!loading && !error && (
          <TableBox>
            <table>
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Vencimiento</th>
                  <th>Total (C$)</th>
                  <th>Cancelada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const overdue = !!r.fechaVencimiento && !r.cancelada && new Date(r.fechaVencimiento) < new Date();
                  return (
                  <tr key={r.id} className={overdue ? 'overdue' : ''}>
                    <td>{r.numeroFactura || '—'}</td>
                    <td>{r.cliente?.nombre || r.cliente?.empresa || '—'}</td>
                    <td>{new Date(r.fecha).toLocaleDateString()}</td>
                    <td className={overdue ? 'due' : ''}>{r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString() : '—'}</td>
                    <td>{Number(r.totalCordoba || 0).toFixed(2)}</td>
                    <td>{r.cancelada ? 'Sí' : 'No'}</td>
                    <td>
                      {!r.cancelada ? (
                        <button
                          className="btn-cancel"
                          onClick={() => setConfirmId(r.id)}
                          disabled={updatingId === r.id}
                          title={overdue ? 'Vencida: se recomienda cancelar' : 'Marcar como cancelada'}
                        >
                          {updatingId === r.id ? 'Guardando...' : 'Cancelar'}
                        </button>
                      ) : (
                        <span style={{ color: '#2e7d32', fontWeight: 600 }}>—</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#666' }}>Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableBox>
        )}
      </Main>

      {confirmId !== null && (
        <ModalOverlay onClick={() => (updatingId !== confirmId ? setConfirmId(null) : undefined)}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            {(() => {
              const sel = rows.find((r) => r.id === confirmId);
              const label = sel?.numeroFactura ? `Factura N° ${sel.numeroFactura}` : `Factura #${confirmId}`;
              return (
                <>
                  <h3>Confirmar cancelación</h3>
                  <p>¿Deseas marcar como cancelada {label}?</p>
                  <div className="actions">
                    <button className="btn cancel" onClick={() => setConfirmId(null)} disabled={updatingId === confirmId}>Cerrar</button>
                    <button className="btn confirm" onClick={() => handleCancelar(confirmId)} disabled={updatingId === confirmId}>
                      {updatingId === confirmId ? 'Guardando…' : 'Confirmar'}
                    </button>
                  </div>
                </>
              );
            })()}
          </ModalBox>
        </ModalOverlay>
      )}

      <Footer>© 2025 AYHER — Ventas</Footer>
    </PageContainer>
  );
};

export default FacturasPendientes;

// ===== Modal de confirmación =====
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalBox = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  width: min(480px, 92%);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  h3 { margin: 0 0 8px 0; }
  p { margin: 0; color: #555; }
  .actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px; }
  .btn { padding: 8px 14px; border-radius: 8px; border: 1px solid #ddd; background: #fff; cursor: pointer; }
  .btn.cancel { background: #eee; color: #333; border-color: #ddd; }
  .btn.confirm { background: #c62828; color: #fff; border: 1px solid #b71c1c; }
  .btn.confirm:hover { background: #b71c1c; }
  .btn[disabled] { opacity: .6; cursor: not-allowed; }
`;

/* ===== Estilos ===== */
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
  h1 { font-size: 26px; font-weight: 700; margin: 0; }
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
`;

const TableBox = styled.div`
  margin-top: 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);

  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-weight: 700; padding: 10px; border-bottom: 1px solid #eee; }
  tbody td { padding: 10px; border-bottom: 1px solid #f3f3f3; }
  tbody tr:hover { background: #fafafa; }

  tbody tr.overdue td, tbody td.due { color: #c62828; font-weight: 600; }
  tbody tr.overdue td.due { text-decoration: underline; }

  button { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; background: #fff; cursor: pointer; }
  .btn-cancel { background: #c62828; color: #fff; border: 1px solid #b71c1c; }
  .btn-cancel:hover { background: #b71c1c; }
  button[disabled] { opacity: 0.6; cursor: not-allowed; }
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
