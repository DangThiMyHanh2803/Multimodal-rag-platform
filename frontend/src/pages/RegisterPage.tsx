import { useState } from "react";
import { C } from "../styles/theme";
import { Btn, Input, Divider, LogoMark, AuthShell, Badge, Spinner } from "../components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegisterPageProps {
  onRegister?: (email: string) => void;
  onNavigateLogin?: () => void;
}

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
  general?: string;
}

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: [string, string][] = [
    ["Rất yếu", C.coral],
    ["Yếu",     C.amber],
    ["Trung bình", C.amber],
    ["Mạnh",    C.teal],
    ["Rất mạnh", C.green],
  ];
  return { score, label: map[score][0], color: map[score][1] };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, color } = getStrength(password);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? color : C.border,
            transition: "background .3s",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: FormState): FormErrors {
  const e: FormErrors = {};
  if (!form.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
  else if (form.fullName.trim().length < 2) e.fullName = "Họ tên quá ngắn";
  if (!form.email) e.email = "Vui lòng nhập email";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email không hợp lệ";
  if (!form.password) e.password = "Vui lòng nhập mật khẩu";
  else if (form.password.length < 8) e.password = "Mật khẩu tối thiểu 8 ký tự";
  if (!form.confirmPassword) e.confirmPassword = "Vui lòng xác nhận mật khẩu";
  else if (form.password !== form.confirmPassword) e.confirmPassword = "Mật khẩu không khớp";
  if (!form.agreeTerms) e.agreeTerms = "Vui lòng đồng ý với điều khoản sử dụng";
  return e;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepDot({ active, done }: { active?: boolean; done?: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%",
      background: done ? C.green : active ? C.accent : C.border,
      transition: "background .3s",
    }} />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function RegisterPage({ onRegister, onNavigateLogin }: RegisterPageProps) {
  const [form, setForm] = useState<FormState>({
    fullName: "", email: "", password: "", confirmPassword: "", agreeTerms: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = field === "agreeTerms" ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Tính "bước hoàn thành" để hiển thị progress
  const filled = [
    !!form.fullName,
    !!form.email && !errors.email,
    !!form.password && form.password.length >= 8,
    !!form.confirmPassword && form.password === form.confirmPassword,
  ];
  const step = filled.filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      // TODO: POST /api/auth/register
      // const res = await fetch("/api/auth/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     full_name: form.fullName,
      //     email: form.email,
      //     password: form.password,
      //   }),
      // });
      // if (!res.ok) {
      //   const data = await res.json();
      //   throw new Error(data.detail ?? "Đăng ký thất bại");
      // }
      await new Promise(r => setTimeout(r, 1400)); // demo
      onRegister?.(form.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* Glow */}
      <div style={{
        position: "fixed", top: -180, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 350,
        background: `radial-gradient(ellipse, rgba(45,212,191,.08) 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <LogoMark size={50} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5 }}>Tạo tài khoản</h1>
            <Badge color={C.teal}>Miễn phí</Badge>
          </div>
          <p style={{ fontSize: 14, color: C.textSub }}>Bắt đầu hỏi đáp tài liệu thông minh</p>
        </div>

        {/* Card */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "28px 28px 24px",
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, justifyContent: "center" }}>
            {[0, 1, 2, 3].map(i => (
              <StepDot key={i} active={step === i} done={step > i} />
            ))}
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>
              {step}/4 đã điền
            </span>
          </div>

          {/* General error */}
          {errors.general && (
            <div style={{
              background: "rgba(248,113,113,.08)", border: `1px solid rgba(248,113,113,.25)`,
              borderRadius: 10, padding: "10px 14px", marginBottom: 18,
              fontSize: 13, color: C.coral,
            }}>
              ⚠️ {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Tên */}
            <Input
              label="Họ và tên"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={set("fullName")}
              error={errors.fullName}
              autoComplete="name"
              autoFocus
            />

            {/* Email */}
            <Input
              label="Email"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={set("email")}
              error={errors.email}
              autoComplete="email"
              hint="Dùng để đăng nhập và nhận thông báo"
            />

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>Mật khẩu</label>
              <div style={{ position: "relative" }}>
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Tối thiểu 8 ký tự"
                  value={form.password}
                  onChange={set("password")}
                  error={errors.password}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  style={{ position: "absolute", right: 12, top: errors.password ? "unset" : "50%", transform: errors.password ? "none" : "translateY(-50%)", top2: 11, background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 14 } as React.CSSProperties}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm password */}
            <div style={{ position: "relative" }}>
              <Input
                label="Xác nhận mật khẩu"
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                error={errors.confirmPassword}
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              {form.confirmPassword && form.password === form.confirmPassword && (
                <span style={{ position: "absolute", right: 12, top: 36, fontSize: 14 }}>✅</span>
              )}
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: "absolute", right: 12, top: 36, background: "none", border: "none", cursor: "pointer", color: C.textMuted, fontSize: 14, display: errors.confirmPassword ? "none" : (form.confirmPassword && form.password === form.confirmPassword ? "none" : "block") }}>
                {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
              </button>
            </div>

            {/* Terms */}
            <div>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={set("agreeTerms")}
                  style={{ width: 15, height: 15, accentColor: C.accent, cursor: "pointer", marginTop: 2, flexShrink: 0 }}
                />
                <span style={{ color: C.textSub, lineHeight: 1.5 }}>
                  Tôi đồng ý với{" "}
                  <span style={{ color: C.accent, cursor: "pointer" }}>Điều khoản sử dụng</span>
                  {" "}và{" "}
                  <span style={{ color: C.accent, cursor: "pointer" }}>Chính sách bảo mật</span>
                </span>
              </label>
              {errors.agreeTerms && (
                <p style={{ fontSize: 11, color: C.coral, marginTop: 4, marginLeft: 23 }}>
                  {errors.agreeTerms}
                </p>
              )}
            </div>

            {/* Submit */}
            <Btn
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading}
              style={{ height: 44, fontSize: 14, fontWeight: 600, marginTop: 4 }}
            >
              {loading ? <Spinner /> : "Tạo tài khoản"}
            </Btn>
          </form>

          <Divider label="hoặc" />

          <Btn variant="ghost" fullWidth style={{ height: 42, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9L37 9.7C33.5 6.5 29 4.5 24 4.5 12.7 4.5 3.5 13.7 3.5 25S12.7 45.5 24 45.5c11 0 20.5-8 20.5-20.5 0-1.4-.1-2.7-.4-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9L37 9.7C33.5 6.5 29 4.5 24 4.5c-7.6 0-14.2 4.3-17.7 10.2z"/>
              <path fill="#4CAF50" d="M24 45.5c4.9 0 9.3-1.8 12.7-4.8l-5.9-5c-2 1.5-4.4 2.3-6.8 2.3-5.2 0-9.6-3.5-11.2-8.2l-6.6 5.1C9.7 41.1 16.4 45.5 24 45.5z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.7l5.9 5c3.5-3.2 5.6-7.9 5.6-13.7 0-1.4-.1-2.7-.4-4z"/>
            </svg>
            Đăng ký với Google
          </Btn>

          <p style={{ textAlign: "center", fontSize: 13, color: C.textSub, marginTop: 20 }}>
            Đã có tài khoản?{" "}
            <button
              type="button"
              onClick={onNavigateLogin}
              style={{ color: C.accent, fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
            >
              Đăng nhập
            </button>
          </p>
        </div>

        {/* Plan info */}
        <div style={{
          marginTop: 20, background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: "14px 18px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Gói Free
            </span>
            <Badge color={C.green}>Không cần thẻ</Badge>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 16px" }}>
            {[
              "10 file upload / tháng",
              "500 câu hỏi / tháng",
              "3 workspaces",
              "Lưu trữ 500MB",
              "Trích nguồn tài liệu",
              "RAGAS evaluation",
            ].map(f => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textSub }}>
                <span style={{ color: C.green, fontSize: 11 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
