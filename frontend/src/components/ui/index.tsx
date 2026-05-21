import React from "react";
import { C } from "../../styles/theme";

// ─── Button ──────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "ghost" | "teal" | "danger";
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  fullWidth?: boolean;
  children: React.ReactNode;
}
export function Btn({ variant = "ghost", fullWidth, children, style, ...props }: BtnProps) {
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 6, padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 500,
    cursor: "pointer", border: "none", transition: "all .15s", whiteSpace: "nowrap",
    width: fullWidth ? "100%" : undefined, ...style,
  };
  const map: Record<BtnVariant, React.CSSProperties> = {
    primary: { background: C.accent, color: "#fff" },
    ghost:   { background: "transparent", color: C.textSub, border: `1px solid ${C.border}` },
    teal:    { background: C.tealDim, color: C.teal, border: `1px solid rgba(45,212,191,.2)` },
    danger:  { background: "rgba(248,113,113,.1)", color: C.coral, border: `1px solid rgba(248,113,113,.2)` },
  };
  return <button style={{ ...base, ...map[variant] }} {...props}>{children}</button>;
}

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}
export function Input({ label, hint, error, style, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>{label}</label>}
      <input
        style={{
          background: C.surfaceHigh, border: `1px solid ${error ? C.coral : C.border}`,
          borderRadius: 10, padding: "11px 14px", fontSize: 14, color: C.text,
          outline: "none", transition: "border-color .15s", width: "100%", boxSizing: "border-box", ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = error ? C.coral : C.accent; }}
        onBlur={e => { e.currentTarget.style.borderColor = error ? C.coral : C.border; }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: C.coral }}>{error}</span>}
      {hint && !error && <span style={{ fontSize: 11, color: C.textMuted }}>{hint}</span>}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, ...style }}>
      {children}
    </div>
  );
}

// ─── Divider with label ───────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ─── Badge / Pill ─────────────────────────────────────────────────────────────
interface BadgeProps { children: React.ReactNode; color?: string; bg?: string; }
export function Badge({ children, color = C.accent, bg }: BadgeProps) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
      color, background: bg ?? `${color}18`, border: `1px solid ${color}30`,
    }}>{children}</span>
  );
}

// ─── Logo mark ────────────────────────────────────────────────────────────────
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/logo2.png"
      alt="logo"
      style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, objectFit: "contain" }}
    />
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{
      width: 16, height: 16, border: `2px solid rgba(255,255,255,.2)`,
      borderTopColor: "white", borderRadius: "50%",
      animation: "spin .7s linear infinite",
    }} />
  );
}

// ─── Feature bullet ──────────────────────────────────────────────────────────
export function FeatureDot({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: C.textSub }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, flexShrink: 0 }} />
      {children}
    </div>
  );
}

// ─── Page shell (centered card layout for auth pages) ────────────────────────
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.bg, padding: "24px 16px",
    }}>
      {children}
    </div>
  );
}
