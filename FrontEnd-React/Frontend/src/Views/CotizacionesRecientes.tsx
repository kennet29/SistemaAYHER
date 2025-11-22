import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { buildApiUrl } from "../api/constants";
import { fmtDateTime } from "../utils/dates";
import "./CotizacionesRecientes.css";

const API_COTIZACIONES = buildApiUrl("/cotizaciones/recientes");

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

type RecentQuote = {
  id: number;
  inventarioId: number;
  cantidad: number;
  precioCordoba: number;
  precioDolar: number;
  moneda: string;
  fecha: string;
  inventario?: {
    id: number;
    nombre?: string | null;
    numeroParte?: string | null;
  };
  cliente?: {
    id: number;
    nombre?: string | null;
    empresa?: string | null;
    razonSocial?: string | null;
  };
};

const CotizacionesRecientes: React.FC = () => {
  const [cotizaciones, setCotizaciones] = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getCookie("token");
    fetch(API_COTIZACIONES, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("No se obtuvo respuesta del servidor");
        return res.json();
      })
      .then((data) => {
        const recientes = Array.isArray(data?.recientes) ? data.recientes : [];
        setCotizaciones(recientes);
      })
      .catch(() => {
        toast.error("No se pudieron cargar las cotizaciones recientes.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="cotizaciones-page">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <div className="cotizaciones-card">
        <div className="cotizaciones-card__header">
          <div>
            <p className="cotizaciones-card__subtitle">Cotizaciones recientes</p>
            <h1>Últimos registros por producto</h1>
          </div>
          <span className="cotizaciones-card__badge">{cotizaciones.length} registros</span>
        </div>

        {loading ? (
          <div className="cotizaciones-empty">Cargando cotizaciones...</div>
        ) : cotizaciones.length === 0 ? (
          <div className="cotizaciones-empty">No hay cotizaciones recientes registradas.</div>
        ) : (
          <div className="cotizaciones-table-wrapper">
            <table className="cotizaciones-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cliente</th>
                  <th>Cantidad</th>
                  <th>Precio C$</th>
                  <th>Precio $</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((item) => {
                  const producto = item.inventario?.numeroParte
                    ? `${item.inventario.numeroParte} — ${item.inventario?.nombre ?? ""}`.trim()
                    : item.inventario?.nombre ?? `#${item.inventarioId}`;
                  const cliente =
                    item.cliente?.nombre ||
                    item.cliente?.razonSocial ||
                    item.cliente?.empresa ||
                    "Cliente general";
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="cotizaciones-producto">{producto}</div>
                      </td>
                      <td>{cliente}</td>
                      <td>{Number(item.cantidad).toLocaleString()}</td>
                      <td>C$ {Number(item.precioCordoba || 0).toFixed(2)}</td>
                      <td>$ {Number(item.precioDolar || 0).toFixed(2)}</td>
                      <td>{fmtDateTime(item.fecha)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CotizacionesRecientes;
