"use client";

import { useState } from "react";
import { EyeIcon, LockIcon } from "./Icons";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
  state?: "error" | "ok";
};

export function PasswordField({ id, label, value, onChange, autoComplete, placeholder, state }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="group">
      <label htmlFor={id}>{label}</label>
      <div className={`field has-btn ${state ?? ""}`}>
        <LockIcon />
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="icon-btn"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={() => setVisible((v) => !v)}
        >
          <EyeIcon />
        </button>
      </div>
    </div>
  );
}
