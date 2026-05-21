import { useState } from "react";
import { C } from "../styles/theme";
import { Btn, Input, Divider, LogoMark, FeatureDot, AuthShell, Spinner } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LoginPageProps {
  onLogin?: (email: string) => void;
  onNavigateRegister?: () => void;
}

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.email) errors.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Email không hợp lệ";
  if (!form.password) errors.password = "Vui lòng nhập mật khẩu";
  else if (form.password.length < 6) errors.password = "Mật khẩu tối thiểu 6 ký tự";
  return errors;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LoginPage({ onLogin, onNavigateRegister }: LoginPageProps) {
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      // TODO: gọi POST /api/auth/login
      // const res = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email: form.email, password: form.password }),
      // });
      // if (!res.ok) throw new Error("Sai email hoặc mật khẩu");
      // const { access_token } = await res.json();
      // localStorage.setItem("token", access_token);
      await new Promise(r => setTimeout(r, 1200)); // demo delay
      onLogin?.(form.email);
    } catch {
      setErrors({ general: "Sai email hoặc mật khẩu. Vui lòng thử lại." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    // TODO: redirect sang Google OAuth
    // window.location.href = "/api/auth/google";
    alert("Google OAuth — chưa cấu hình");
  };

  return (
    <AuthShell>
      {/* Glow background */}
      <div style={{
        position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400, background: `radial-gradient(ellipse, ${C.accentGlow} 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <LogoMark size={52} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, color: C.text }}>
            Đăng nhập
          </h1>
          <p style={{ fontSize: 14, color: C.textSub, marginTop: 6 }}>
            Hệ thống hỏi đáp tài liệu RAG
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20,
          padding: "32px 28px",
        }}>
          {/* General error */}
          {errors.general && (
            <div style={{
              background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.25)`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 18,
              fontSize: 13, color: C.coral, display: "flex", gap: 8, alignItems: "center",
            }}>
              ⚠️ {errors.general}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Input
              label="Email"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
              autoFocus
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>Mật khẩu</label>
                <button
                  type="button"
                  style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer" }}
                  onClick={() => {/* TODO: navigate to forgot password */}}
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: 11, background: "none", border: "none",
                    cursor: "pointer", color: C.textMuted, fontSize: 14, padding: 2,
                  }}
                >{showPass ? "🙈" : "👁️"}</button>
              </div>
            </div>

            {/* Remember me */}
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.textSub }}>
              <input
                type="checkbox"
                style={{ width: 15, height: 15, accentColor: C.accent, cursor: "pointer" }}
              />
              Ghi nhớ đăng nhập
            </label>

            {/* Submit */}
            <Btn
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              style={{ height: 44, fontSize: 14, fontWeight: 600, marginTop: 4 }}
            >
              {loading ? <Spinner /> : "Đăng nhập"}
            </Btn>
          </form>

          <Divider label="hoặc" />

          {/* Google OAuth */}
          <Btn
            variant="ghost"
            fullWidth
            onClick={handleGoogle}
            style={{ height: 42, fontSize: 14 }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9L37 9.7C33.5 6.5 29 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11 0 20.5-8 20.5-20.5 0-1.4-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9L37 9.7C33.5 6.5 29 4.5 24 4.5c-7.6 0-14.2 4.3-17.7 10.2z"/>
              <path fill="#4CAF50" d="M24 45.5c4.9 0 9.3-1.8 12.7-4.8l-5.9-5c-2 1.5-4.4 2.3-6.8 2.3-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.7 41.1 16.4 45.5 24 45.5z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c3.5-3.2 5.6-7.9 5.6-13.7 0-1.4-.1-2.7-.4-4z"/>
            </svg>
            Tiếp tục với Google
          </Btn>

          {/* Switch to register */}
          <p style={{ textAlign: "center", fontSize: 13, color: C.textSub, marginTop: 22 }}>
            Chưa có tài khoản?{" "}
            <button
              type="button"
              onClick={onNavigateRegister}
              style={{ color: C.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              Đăng ký miễn phí
            </button>
          </p>
        </div>

        {/* Features teaser */}
        <div style={{
          marginTop: 24, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 9,
        }}>
          <p style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontWeight: 500 }}>
            Tính năng hệ thống
          </p>
          <FeatureDot>Upload PDF, ảnh chụp, ghi âm bài giảng</FeatureDot>
          <FeatureDot>Hỏi đáp với trích nguồn chính xác (trang, chương)</FeatureDot>
          <FeatureDot>Advanced RAG + Reranker — giảm hallucination</FeatureDot>
          <FeatureDot>Workspace nhóm, chia sẻ link chỉ xem</FeatureDot>
        </div>
      </div>
    </AuthShell>
  );
}
