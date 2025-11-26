import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import DataTable from 'react-data-table-component';
import type { TableColumn } from 'react-data-table-component';
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
  totalDolar?: number | string | null;
  tipoCambioValor?: number | null;
  tipoPago?: string | null;
  plazoDias?: number | null;
  cliente?: { id: number; nombre?: string | null; empresa?: string | null } | null;
  cancelada?: boolean | null;
  detalles?: Array<{
    id: number;
    cantidad: number;
    precioUnitarioCordoba?: number;
    precioUnitarioDolar?: number;
    subtotalCordoba?: number;
    subtotalDolar?: number;
    inventario?: {
      id: number;
      nombre?: string;
      numeroParte?: string;
      marca?: { nombre?: string };
      categoria?: { nombre?: string };
    };
  }>;
};

const FacturasPendientes: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VentaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [detalleFactura, setDetalleFactura] = useState<VentaPendiente | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const cargarDetalleFactura = async (factura: VentaPendiente) => {
    setLoadingDetalle(true);
    try {
      const token = getCookie('token') || localStorage.getItem('token');
      const res = await fetch(buildApiUrl(`/ventas/${factura.id}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Error cargando detalles');
      const json = await res.json();
      setDetalleFactura(json.venta || json);
    } catch (e: any) {
      toast.error('Error al cargar detalles de la factura');
      setDetalleFactura(factura); // Mostrar al menos la info básica
    } finally {
      setLoadingDetalle(false);
    }
  };

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

  const handleMarcarPagada = async (id: number) => {
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
      if (!res.ok) throw new Error('No se pudo marcar como pagada');
      // Refrescar filas localmente
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, cancelada: true } : r)));
      toast.success('✓ Factura marcada como pagada');
      setConfirmId(null);
    } catch (e) {
      toast.error((e as any)?.message || 'Error al marcar como pagada');
    } finally {
      setUpdatingId(null);
    }
  };

  const getEstadoVencimiento = (fechaVencimiento: string | null, cancelada?: boolean | null) => {
    if (cancelada) return { texto: 'Pagada', clase: 'pagada' };
    if (!fechaVencimiento) return { texto: 'Sin vencimiento', clase: 'sin-venc' };
    
    const hoy = new Date();
    const venc = new Date(fechaVencimiento);
    const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDias < 0) return { texto: `Vencida (${Math.abs(diffDias)} dias)`, clase: 'vencida' };
    if (diffDias === 0) return { texto: 'Vence hoy', clase: 'vence-hoy' };
    if (diffDias <= 7) return { texto: `Vence en ${diffDias} dias`, clase: 'proximo' };
    return { texto: `${diffDias} dias restantes`, clase: 'vigente' };
  };

  const columns: TableColumn<VentaPendiente>[] = [
    {
      name: 'N° Factura',
      selector: (r) => r.numeroFactura || '—',
      width: '140px',
    },
    {
      name: 'Cliente',
      selector: (r) => r.cliente?.nombre || r.cliente?.empresa || '—',
      grow: 2,
    },
    {
      name: 'Fecha',
      selector: (r) => r.fecha,
      width: '120px',
      cell: (r) => new Date(r.fecha).toLocaleDateString(),
    },
    {
      name: 'Vencimiento',
      selector: (r) => r.fechaVencimiento || '',
      width: '130px',
      cell: (r) => r.fechaVencimiento ? new Date(r.fechaVencimiento).toLocaleDateString() : '—',
    },
    {
      name: 'Estado',
      selector: (r) => getEstadoVencimiento(r.fechaVencimiento, r.cancelada).texto,
      width: '180px',
      cell: (r) => {
        const estado = getEstadoVencimiento(r.fechaVencimiento, r.cancelada);
        return (
          <span className={`estado-badge ${estado.clase}`}>
            {estado.texto}
          </span>
        );
      },
    },
    {
      name: 'Total (C$)',
      selector: (r) => Number(r.totalCordoba || 0),
      right: true,
      width: '140px',
      cell: (r) => `C$ ${Number(r.totalCordoba || 0).toFixed(2)}`,
    },
    {
      name: 'Acciones',
      button: true,
      width: '240px',
      cell: (r) => {
        return (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              className="btn-ver"
              onClick={() => cargarDetalleFactura(r)}
              title="Ver detalles de la factura"
            >
              👁️ Ver
            </button>
            {!r.cancelada && (
              <button
                className="btn-pagar"
                onClick={() => setConfirmId(r.id)}
                disabled={updatingId === r.id}
                title="Marcar como pagada"
              >
                {updatingId === r.id ? 'Guardando...' : '✓ Pagada'}
              </button>
            )}
            {r.cancelada && (
              <span style={{ color: '#2e7d32', fontWeight: 600, fontSize: '12px' }}>✓ Pagada</span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <PageContainer>
      <AnimatedBackground />
      <ToastContainer position="bottom-right" />
      <Header>
        <button className="back-btn" onClick={() => navigate(-1)}>← Volver</button>
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🧾</span>
            <h1>Facturas de credito pendientes</h1>
          </div>
          <p>Listado de facturas pendientes de pago</p>
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
            <DataTable
              columns={columns}
              data={filtered}
              pagination
              paginationPerPage={10}
              paginationRowsPerPageOptions={[5, 10, 20, 50]}
              highlightOnHover
              dense
              noDataComponent="No hay facturas pendientes"
              customStyles={{
                table: {
                  style: {
                    backgroundColor: '#fff',
                  },
                },
                headRow: {
                  style: {
                    backgroundColor: '#fff',
                    borderBottom: '2px solid #dee2e6',
                    minHeight: '52px',
                  },
                },
                headCells: {
                  style: {
                    fontWeight: 700,
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    color: '#000',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                  },
                },
                rows: {
                  style: {
                    minHeight: '60px',
                    backgroundColor: '#fff',
                    borderBottom: '1px solid #f3f3f3',
                    '&:hover': {
                      backgroundColor: '#fafafa',
                    },
                  },
                },
                cells: {
                  style: {
                    fontSize: '13px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                  },
                },
              }}
            />
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
                  <h3>Confirmar pago</h3>
                  <p>¿Deseas marcar como pagada {label}?</p>
                  <div className="actions">
                    <button className="btn cancel" onClick={() => setConfirmId(null)} disabled={updatingId === confirmId}>Cancelar</button>
                    <button className="btn confirm" onClick={() => handleMarcarPagada(confirmId)} disabled={updatingId === confirmId}>
                      {updatingId === confirmId ? 'Guardando…' : '✓ Confirmar pago'}
                    </button>
                  </div>
                </>
              );
            })()}
          </ModalBox>
        </ModalOverlay>
      )}

      {/* Modal de detalles de factura */}
      {detalleFactura && (
        <ModalOverlay onClick={() => setDetalleFactura(null)}>
          <DetalleModalBox onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Detalles de Factura {detalleFactura.numeroFactura ? `N° ${detalleFactura.numeroFactura}` : `#${detalleFactura.id}`}
              </h3>
              <button className="close-btn" onClick={() => setDetalleFactura(null)}>✕</button>
            </div>
            
            <div className="modal-content">
              <div className="info-section">
                <h4>Informacion General</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Cliente:</span>
                    <span className="value">{detalleFactura.cliente?.nombre || detalleFactura.cliente?.empresa || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Fecha:</span>
                    <span className="value">{new Date(detalleFactura.fecha).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Vencimiento:</span>
                    <span className="value">
                      {detalleFactura.fechaVencimiento ? new Date(detalleFactura.fechaVencimiento).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Tipo de Pago:</span>
                    <span className="value">{detalleFactura.tipoPago || '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Plazo:</span>
                    <span className="value">{detalleFactura.plazoDias ? `${detalleFactura.plazoDias} dias` : '—'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Estado:</span>
                    <span className={`value ${detalleFactura.cancelada ? 'success' : 'danger'}`}>
                      {detalleFactura.cancelada ? '✓ Pagada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h4>Totales</h4>
                <div className="totales-grid">
                  <div className="total-item">
                    <span className="label">Total en Cordobas:</span>
                    <span className="value total">C$ {Number(detalleFactura.totalCordoba || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-item">
                    <span className="label">Total en Dolares:</span>
                    <span className="value total">US$ {Number(detalleFactura.totalDolar || 0).toFixed(2)}</span>
                  </div>
                  {detalleFactura.tipoCambioValor && (
                    <div className="total-item">
                      <span className="label">Tipo de Cambio:</span>
                      <span className="value">C$ {Number(detalleFactura.tipoCambioValor).toFixed(4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Artículos de la factura */}
              {loadingDetalle ? (
                <div className="info-section">
                  <h4>Articulos</h4>
                  <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                    Cargando detalles...
                  </div>
                </div>
              ) : detalleFactura.detalles && detalleFactura.detalles.length > 0 ? (
                <div className="info-section">
                  <h4>Articulos ({detalleFactura.detalles.length})</h4>
                  <div className="articulos-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Marca</th>
                          <th>Categoria</th>
                          <th>Cant.</th>
                          <th>Precio Unit. C$</th>
                          <th>Subtotal C$</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleFactura.detalles.map((detalle, idx) => (
                          <tr key={detalle.id || idx}>
                            <td>
                              <div className="producto-info">
                                {detalle.inventario?.numeroParte && (
                                  <span className="numero-parte">{detalle.inventario.numeroParte}</span>
                                )}
                                <span className="nombre">{detalle.inventario?.nombre || '—'}</span>
                              </div>
                            </td>
                            <td>{detalle.inventario?.marca?.nombre || '—'}</td>
                            <td>{detalle.inventario?.categoria?.nombre || '—'}</td>
                            <td className="text-center">{detalle.cantidad}</td>
                            <td className="text-right">C$ {Number(detalle.precioUnitarioCordoba || 0).toFixed(2)}</td>
                            <td className="text-right subtotal">C$ {Number(detalle.subtotalCordoba || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {(() => {
                const estado = getEstadoVencimiento(detalleFactura.fechaVencimiento, detalleFactura.cancelada);
                return (
                  <div className="info-section">
                    <h4>Estado de Vencimiento</h4>
                    <div className="estado-container">
                      <span className={`estado-badge-large ${estado.clase}`}>
                        {estado.texto}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={() => setDetalleFactura(null)}>Cerrar</button>
            </div>
          </DetalleModalBox>
        </ModalOverlay>
      )}

      <Footer>© 2025 AYHER - Ventas</Footer>
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
  .btn.confirm { background: #16a34a; color: #fff; border: 1px solid #15803d; }
  .btn.confirm:hover { background: #15803d; }
  .btn[disabled] { opacity: .6; cursor: not-allowed; }
`;

const DetalleModalBox = styled.div`
  background: #fff;
  border-radius: 20px;
  width: min(900px, 95%);
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 70px rgba(0,0,0,0.35);
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 2px solid #e3e9f5;
    background: linear-gradient(135deg, #004aad, #0066ff);
    border-radius: 16px 16px 0 0;
    
    h3 {
      margin: 0;
      color: #fff;
      font-size: 20px;
      font-weight: 700;
    }
    
    .close-btn {
      background: rgba(255,255,255,0.2);
      border: 2px solid #fff;
      color: #fff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
      font-weight: 700;
      transition: all 0.2s ease;
      
      &:hover {
        background: #fff;
        color: #004aad;
      }
    }
  }
  
  .modal-content {
    padding: 24px;
  }
  
  .info-section {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 16px 0;
      color: #004aad;
      font-size: 16px;
      font-weight: 700;
      border-bottom: 2px solid #e3e9f5;
      padding-bottom: 8px;
    }
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .value {
      font-size: 15px;
      color: #001a33;
      font-weight: 600;
      
      &.success { color: #2e7d32; }
      &.danger { color: #c62828; }
      &.total { color: #004aad; font-size: 18px; }
    }
  }
  
  .totales-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    background: #f8f9fa;
    padding: 16px;
    border-radius: 12px;
  }
  
  .total-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    .label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }
    
    .value {
      font-size: 16px;
      color: #001a33;
      font-weight: 700;
      
      &.total { color: #004aad; font-size: 20px; }
    }
  }
  
  .estado-container {
    display: flex;
    justify-content: center;
    padding: 16px;
  }
  
  .estado-badge-large {
    display: inline-block;
    padding: 12px 24px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 700;
    
    &.pagada {
      background: #dcfce7;
      color: #166534;
      border: 2px solid #86efac;
    }
    
    &.vencida {
      background: #fee2e2;
      color: #991b1b;
      border: 2px solid #fca5a5;
    }
    
    &.vence-hoy {
      background: #fef3c7;
      color: #92400e;
      border: 2px solid #fbbf24;
    }
    
    &.proximo {
      background: #fed7aa;
      color: #9a3412;
      border: 2px solid #fb923c;
    }
    
    &.vigente {
      background: #dbeafe;
      color: #1e40af;
      border: 2px solid #93c5fd;
    }
    
    &.sin-venc {
      background: #f3f4f6;
      color: #6b7280;
      border: 2px solid #d1d5db;
    }
  }
  
  .articulos-table {
    overflow-x: auto;
    border-radius: 12px;
    border: 1px solid #e3e9f5;
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    
    thead {
      background: linear-gradient(135deg, #f8f9fa, #e9ecef);
      
      th {
        padding: 14px 12px;
        text-align: left;
        font-weight: 700;
        color: #001a33;
        border-bottom: 2px solid #004aad;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
    
    tbody {
      tr {
        border-bottom: 1px solid #f3f3f3;
        transition: background 0.2s ease;
        
        &:hover {
          background: #f8f9fa;
        }
        
        &:last-child {
          border-bottom: none;
        }
      }
      
      td {
        padding: 14px 12px;
        color: #001a33;
        
        &.text-center {
          text-align: center;
          font-weight: 600;
        }
        
        &.text-right {
          text-align: right;
          font-weight: 600;
        }
        
        &.subtotal {
          color: #004aad;
          font-weight: 700;
          font-size: 14px;
        }
      }
    }
    
    .producto-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      
      .numero-parte {
        font-size: 11px;
        color: #666;
        font-weight: 600;
        background: #f3f4f6;
        padding: 2px 8px;
        border-radius: 4px;
        display: inline-block;
        width: fit-content;
      }
      
      .nombre {
        font-weight: 600;
        color: #001a33;
      }
    }
  }
  
  .modal-footer {
    padding: 20px 24px;
    border-top: 2px solid #e3e9f5;
    display: flex;
    justify-content: flex-end;
    background: #f8f9fa;
    
    .btn-close {
      padding: 10px 24px;
      background: #004aad;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s ease;
      
      &:hover {
        background: #003a8d;
      }
    }
  }
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
  .logo-icon { font-size: 28px; }
  h1 { font-size: 26px; font-weight: 700; margin: 0; color: #fff; }
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
  
  /* Eliminar líneas azules del header */
  .rdt_TableHeadRow {
    background-color: #fff !important;
    border-bottom: 2px solid #dee2e6 !important;
  }
  
  .rdt_TableCol {
    background-color: #fff !important;
    color: #000 !important;
  }
  
  .rdt_TableCol_Sortable {
    background-color: #fff !important;
    color: #000 !important;
  }
  
  .rdt_TableCol div {
    color: #000 !important;
  }

  .btn-ver {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #0066ff;
    background: #eaf1ff;
    color: #003c8a;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #0066ff;
      color: #fff;
    }
  }

  .btn-pagar {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #16a34a;
    background: #dcfce7;
    color: #166534;
    cursor: pointer;
    font-weight: 600;
    font-size: 12px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #16a34a;
      color: #fff;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .estado-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    
    &.pagada {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    
    &.vencida {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    
    &.vence-hoy {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }
    
    &.proximo {
      background: #fed7aa;
      color: #9a3412;
      border: 1px solid #fb923c;
    }
    
    &.vigente {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
    }
    
    &.sin-venc {
      background: #f3f4f6;
      color: #6b7280;
      border: 1px solid #d1d5db;
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
