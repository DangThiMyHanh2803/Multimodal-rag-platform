// ─── Design tokens — dùng chung toàn bộ dự án ──────────────────────────────
export const C = {
  bg:          "#edf0f7",
  surface:     "#ffffff",
  surfaceHigh: "#e4e8f2",
  border:      "#c8cfe0",
  borderHover: "#a0aac0",
  accent:      "#3b6af0",
  accentHover: "#2a56d6",
  accentDim:   "#dce6ff",
  accentGlow:  "rgba(59,106,240,0.18)",
  teal:        "#0891b2",
  tealDim:     "#cff0f8",
  amber:       "#b45309",
  coral:       "#dc2626",
  green:       "#15803d",
  purple:      "#6d28d9",
  text:        "#0f1218",
  textSub:     "#3d4558",
  textMuted:   "#7a8299",
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