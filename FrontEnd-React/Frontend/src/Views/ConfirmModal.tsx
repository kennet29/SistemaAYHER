import React from "react";
import "./Remisiones.css";

type ConfirmModalProps = {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  open,
  title = "Confirmación",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="rem-modal" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="rem-modal-content">
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <div style={{ margin: "8px 0 16px", color: "#374151" }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="rem-close-btn" onClick={onCancel}>{cancelText}</button>
          <button className="rem-table-btn rem-view-btn" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

