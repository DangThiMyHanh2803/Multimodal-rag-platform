import React from "react";
import { C } from "../../styles/theme";
import "./UI.css";

type BtnVariant =
  | "primary"
  | "ghost"
  | "teal"
  | "danger";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Btn({variant = "ghost", fullWidth = false, children, className = "", ...props}: BtnProps) {
  return (
    <button className={`ui-btn ui-btn-${variant} ${ fullWidth ? "ui-btn-full" : ""} ${className}`}{...props}>
      {children}
    </button>
  );
}

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({label, hint, error, className = "", ...props}: InputProps) {
  return (
    <div className="ui-input-group">
      {label && ( <label className="ui-input-label">{label}</label>)}
      <input className={`ui-input ${ error ? "ui-input-error" : ""} ${className}`}{...props}/>
      {error && (<span className="ui-input-error-text">{error}</span>)}
      {hint && !error && (<span className="ui-input-hint">{hint}</span>)}
    </div>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({children, className = "",}: CardProps) {
  return (
    <div className={`ui-card ${className}`}>{children}</div>
  );
}

interface DividerProps {
  label?: string;
}

export function Divider({label,}: DividerProps) {
  return (
    <div className="ui-divider">
      <div className="ui-divider-line" />
      {label && (<span className="ui-divider-label">{label}</span>)}
      <div className="ui-divider-line" />
    </div>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}

export function Badge({children, color = C.accent, bg,}: BadgeProps) {
  return (
    <span className="ui-badge"  style={{  color,  background:  bg ?? `${color}18`,  borderColor: `${color}30`,}}>{children}</span>
  );
}

interface LogoMarkProps {
  size?: number;
}

export function LogoMark({size = 40,}: LogoMarkProps) {
  return (
    <img src="/logo2.png"  alt="logo"  className="ui-logo"  style={{width: size, height: size,}}/>
  );
}

export function Spinner() {
  return (
    <div className="ui-spinner" />
  );
}

interface FeatureDotProps {
  children: React.ReactNode;
}

export function FeatureDot({children,}: FeatureDotProps) {
  return (
    <div className="ui-feature-dot">
      <div className="ui-feature-dot-icon" />
      <span>{children}</span>
    </div>
  );
}

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({children,}: AuthShellProps) {
  return (
    <div className="ui-auth-shell">{children}</div>
  );
}