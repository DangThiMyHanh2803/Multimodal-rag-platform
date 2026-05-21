// ─── Design tokens — dùng chung toàn bộ dự án ──────────────────────────────
export const C = {
  bg:          "#f4f6fb",
  surface:     "#ffffff",
  surfaceHigh: "#f0f2f7",
  border:      "#e2e6f0",
  borderHover: "#c5cad8",
  accent:      "#4f7cff",
  accentHover: "#3a68ff",
  accentDim:   "#e8eeff",
  accentGlow:  "rgba(79,124,255,0.15)",
  teal:        "#0ea5a0",
  tealDim:     "#e6faf8",
  amber:       "#d97706",
  coral:       "#e85555",
  green:       "#16a34a",
  purple:      "#7c3aed",
  text:        "#1a1d26",
  textSub:     "#5a6275",
  textMuted:   "#9aa0b4",
} as const;

// ─── Shared CSS injected once in main.tsx ────────────────────────────────────
export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body {
    font-family: 'DM Sans', sans-serif;
    background: ${C.bg};
    color: ${C.text};
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
  a { color: inherit; text-decoration: none; }
`;