import React, { useState } from "react";
import { FaFileExcel, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { buildApiUrl } from "../api/constants";

function getCookie(name: string) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

interface ImportarExcelProps {
  onSuccess: () => void;
}

export const ImportarExcel: React.FC<ImportarExcelProps> = ({ onSuccess }) => {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleImportar = async () => {
    if (!archivo) {
      toast.warn("Seleccione un archivo Excel");
      return;
    }

    const token = getCookie("token") || localStorage.getItem("token");
    if (!token) {
      toast.error("No hay token válido");
      return;
    }

    setImportando(true);

    try {
      const formData = new FormData();
      formData.append("file", archivo);

      const res = await fetch(buildApiUrl("/inventario/importar"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al importar");
      }

      toast.success(
        `✅ Importación exitosa!\n` +
        `Creados: ${data.creados}\n` +
        `Actualizados: ${data.actualizados}\n` +
        `Total procesado: ${data.total}`
      );

      if (data.errores && data.errores.length > 0) {
        console.warn("Errores durante la importación:", data.errores);
        toast.warn(`⚠️ ${data.errores.length} filas con errores (ver consola)`);
      }

      setModalAbierto(false);
      setArchivo(null);
      onSuccess();
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setImportando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAbierto(true)}
        style={{
          padding: "0.75rem 1.5rem",
          background: "#10b981",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <FaFileExcel /> Importar desde Excel
      </button>

      {modalAbierto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2 style={{ margin: 0, color: "#001a33" }}>
                <FaFileExcel style={{ marginRight: "0.5rem" }} />
                Importar Inventario desde Excel
              </h2>
              <button
                onClick={() => setModalAbierto(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ marginBottom: "1rem", color: "#666" }}>
                El archivo Excel debe tener las siguientes columnas:
              </p>
              <ul style={{ color: "#666", fontSize: "0.9rem" }}>
                <li><strong>NUMERO DE PARTE</strong> (obligatorio)</li>
                <li><strong>DESCRIPCION</strong> (obligatorio)</li>
                <li><strong>MARCA</strong></li>
                <li><strong>CATEGORIA</strong></li>
                <li><strong>STOCK REAL</strong></li>
                <li><strong>PRECIO COSTO PROMEDIO</strong> (en dólares)</li>
                <li><strong>PRECIO VENTA PROMEDIO</strong> (en dólares)</li>
                <li><strong>PRECIO SUGERIDO</strong> (en dólares)</li>
                <li><strong>PPCY</strong> (código sustituto opcional)</li>
                <li><strong>PPVU</strong> (código sustituto opcional)</li>
              </ul>
            </div>

            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{
                marginBottom: "1.5rem",
                padding: "0.5rem",
                border: "2px dashed #ccc",
                borderRadius: "0.5rem",
                width: "100%",
              }}
            />

            {archivo && (
              <p style={{ marginBottom: "1rem", color: "#10b981", fontWeight: 600 }}>
                ✓ Archivo seleccionado: {archivo.name}
              </p>
            )}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleImportar}
                disabled={!archivo || importando}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: archivo && !importando ? "#10b981" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: archivo && !importando ? "pointer" : "not-allowed",
                  fontWeight: 600,
                }}
              >
                {importando ? "Importando..." : "Importar"}
              </button>
              <button
                onClick={() => setModalAbierto(false)}
                disabled={importando}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "#6b7280",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  cursor: importando ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
