import { useState, useEffect } from "react";

function PasswordStrength({ password }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["#1E3A5F", "#EF4444", "#F59E0B", "#0EA5E9", "#10B981"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-1 h-0.5 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : "#1E3A5F" }} />
        ))}
      </div>
      {score > 0 && (
        <p className="text-xs mt-1 font-medium" style={{ color: colors[score] }}>{labels[score]}</p>
      )}
    </div>
  );
}

// Step list for hero panel
const STEPS = [
  { num: "01", title: "Create your account", desc: "Set up credentials and get instant access to your isolated tenant." },
  { num: "02", title: "Provision a workspace", desc: "Launch containers, configure networking, and connect your repos." },
  { num: "03", title: "Deploy & scale", desc: "Push changes via Git and let CloudX handle orchestration automatically." },
];

function HeroNetworkSVG() {
  return (
    <svg viewBox="0 0 480 200" xmlns="http://www.w3.org/2000/svg" aria-hidden className="w-full h-auto">
      <defs>
        <filter id="glow-s" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="eg-s" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity=".08" />
          <stop offset="30%" stopColor="#38BDF8" stopOpacity=".85" />
          <stop offset="70%" stopColor="#06B6D4" stopOpacity=".85" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity=".08" />
        </linearGradient>
        <path id="sq1" d="M 60,100 Q 170,50 240,100" fill="none" />
        <path id="sq2" d="M 240,100 Q 330,55 420,75" fill="none" />
        <path id="sq3" d="M 240,100 Q 330,145 420,130" fill="none" />
        <path id="sq4" d="M 60,100 Q 150,150 240,100" fill="none" />
      </defs>
      <g transform="translate(8,60)" opacity=".85">
        <rect x="0" y="0" width="42" height="80" rx="4" fill="#0F2744" stroke="#1E3A5F" strokeWidth="1.2" />
        {[0, 11, 22, 33].map((y, i) => <rect key={i} x="4" y={5 + y} width="34" height="8" rx="2" fill="#0C3460" />)}
        <circle cx="35" cy="9" r="2" fill="#10B981" />
        <circle cx="35" cy="20" r="2" fill="#0EA5E9" />
        <circle cx="35" cy="31" r="2" fill="#10B981" />
        <circle cx="35" cy="42" r="2" fill="#F59E0B" />
      </g>
      <g fill="none" opacity=".9">
        <path d="M 60,100 Q 170,50 240,100" stroke="url(#eg-s)" strokeWidth="1.6" />
        <path d="M 60,100 Q 150,150 240,100" stroke="url(#eg-s)" strokeWidth="1.6" />
        <path d="M 240,100 Q 330,55 420,75" stroke="url(#eg-s)" strokeWidth="1.6" />
        <path d="M 240,100 Q 330,145 420,130" stroke="url(#eg-s)" strokeWidth="1.6" />
      </g>
      <circle cx="240" cy="100" r="22" fill="#0A1F3A" stroke="#0EA5E9" strokeWidth="1.8" filter="url(#glow-s)" />
      <circle cx="240" cy="100" r="14" fill="#0EA5E9" opacity=".15" />
      <text x="240" y="105" textAnchor="middle" fontSize="11" fill="#38BDF8" fontFamily="monospace" fontWeight="600">HUB</text>
      <circle cx="60" cy="100" r="8" fill="#0F2744" stroke="#0EA5E9" strokeWidth="1.5" filter="url(#glow-s)" />
      <circle cx="60" cy="100" r="3.5" fill="#0EA5E9" />
      <rect x="406" y="61" width="28" height="28" rx="5" fill="#0F2744" stroke="#06B6D4" strokeWidth="1.5" />
      <text x="420" y="80" textAnchor="middle" fontSize="8" fill="#06B6D4" fontFamily="monospace">CTR</text>
      <rect x="406" y="116" width="28" height="28" rx="5" fill="#0F2744" stroke="#8B5CF6" strokeWidth="1.5" />
      <text x="420" y="135" textAnchor="middle" fontSize="8" fill="#8B5CF6" fontFamily="monospace">DB</text>
      {[
        { path: "#sq1", color: "#38BDF8", r: 4, dur: "3.5s", begin: "0s" },
        { path: "#sq2", color: "#8B5CF6", r: 3.5, dur: "3s", begin: "1.2s" },
        { path: "#sq3", color: "#10B981", r: 3, dur: "4s", begin: "2s" },
        { path: "#sq4", color: "#F59E0B", r: 3, dur: "3.8s", begin: ".5s" },
      ].map((p, i) => (
        <circle key={i} r={p.r} fill={p.color} opacity=".9" filter="url(#glow-s)">
          <animateMotion dur={p.dur} repeatCount="indefinite" begin={p.begin}>
            <mpath href={p.path} />
          </animateMotion>
        </circle>
      ))}
      <text x="60" y="118" textAnchor="middle" fontSize="7.5" fill="#7E9BB5" fontFamily="sans-serif">Origin</text>
      <text x="240" y="132" textAnchor="middle" fontSize="7.5" fill="#7E9BB5" fontFamily="sans-serif">Orchestrator</text>
    </svg>
  );
}

export default function Signup() {
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm_password: "" });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = [];
    if (!form.username.trim() || form.username.trim().length < 3) errs.push("Username must be at least 3 characters.");
    if (!form.email.trim() || !form.email.includes("@")) errs.push("A valid email is required.");
    if (form.password.length < 8) errs.push("Password must be at least 8 characters.");
    if (form.password !== form.confirm_password) errs.push("Passwords do not match.");
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    const localErrors = validate();
    if (localErrors.length) { setErrors(localErrors); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirect || "/";
      } else {
        setErrors(Array.isArray(data.errors) ? data.errors : [data.error || "Registration failed."]);
      }
    } catch {
      setErrors(["Network error — please try again."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif" }} className="min-h-screen bg-slate-900 flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes orb-drift  { from{transform:translate(0,0) scale(1)} to{transform:translate(22px,32px) scale(1.15)} }
        @keyframes grid-drift { to { background-position: 52px 52px; } }
        @keyframes fade-up    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dot-travel { 0%{top:0%;opacity:0} 10%{opacity:1} 90%{opacity:1} 100%{top:100%;opacity:0} }
        .orb { position:absolute; border-radius:50%; filter:blur(90px); pointer-events:none; }
        .orb-1 { width:420px;height:420px;background:#0EA5E9;opacity:.14;top:-120px;left:-120px;animation:orb-drift 12s ease-in-out infinite alternate; }
        .orb-2 { width:320px;height:320px;background:#8B5CF6;opacity:.12;bottom:-60px;right:-60px;animation:orb-drift 9s ease-in-out infinite alternate-reverse; }
        .orb-3 { width:220px;height:220px;background:#06B6D4;opacity:.10;top:45%;left:38%;animation:orb-drift 15s ease-in-out infinite alternate; }
        .hero-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(14,165,233,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,.06) 1px,transparent 1px);background-size:52px 52px;animation:grid-drift 25s linear infinite; }
        .fade-up { animation:fade-up .55s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-1{animation-delay:.06s} .fade-up-2{animation-delay:.14s} .fade-up-3{animation-delay:.22s}
        .fade-up-4{animation-delay:.30s} .fade-up-5{animation-delay:.38s} .fade-up-6{animation-delay:.46s}
        .btn-primary { background:linear-gradient(135deg,#0EA5E9,#06B6D4); box-shadow:0 4px 18px rgba(14,165,233,.4); transition:transform .2s,box-shadow .2s; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(14,165,233,.5); }
        .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
        .input-field { background:#0F1E35; border:1.5px solid #1E3A5F; color:#E2E8F0; transition:border-color .15s,box-shadow .15s; outline:none; }
        .input-field::placeholder { color:#3E5A7A; }
        .input-field:focus { border-color:#0EA5E9; box-shadow:0 0 0 3px rgba(14,165,233,.15); }
        .btn-google { background:rgba(255,255,255,.04); border:1.5px solid #1E3A5F; transition:all .2s; }
        .btn-google:hover { background:rgba(255,255,255,.08); border-color:#0EA5E9; transform:translateY(-1px); }
        .toggle-pw-btn { background:none; border:none; color:#3E5A7A; cursor:pointer; transition:color .15s; }
        .toggle-pw-btn:hover { color:#0EA5E9; }
        .step-connector { width:2px;flex:1;min-height:28px;background:linear-gradient(180deg,rgba(14,165,233,.5),rgba(6,182,212,.15));border-radius:2px;margin-top:3px;position:relative; }
        .step-connector::after { content:'';position:absolute;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#38BDF8;box-shadow:0 0 6px #0EA5E9;animation:dot-travel 2.4s ease-in-out infinite; }
        .step-card:hover { background:rgba(14,165,233,.06); border-radius:12px; padding-left:.75rem; }
        .step-card:hover .step-num-circle { box-shadow:0 0 0 4px rgba(14,165,233,.18),0 0 18px rgba(14,165,233,.3); transform:scale(1.08); }
      `}</style>

      {/* ── LEFT HERO ── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden overflow-y-auto"
        style={{ flex: "1.1", background: "#0F172A", borderRadius: "60px", margin: "18px 18px 18px 24px", padding: "3rem 3.25rem" }}
      >
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        <div className="hero-grid" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.35rem", color: "#fff", boxShadow: "0 0 28px rgba(14,165,233,.5)" }}>☁</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
            Cloud<span style={{ color: "#0EA5E9" }}>X</span>
          </span>
        </div>

        {/* Body */}
        <div className="relative z-10 mt-6">
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(2rem,2.8vw,3rem)", fontWeight: 800, lineHeight: 1.1, color: "#fff", marginBottom: "1.25rem" }}>
            Welcome to the Cloud<span style={{ background: "linear-gradient(110deg,#38BDF8,#06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>X</span>
          </h1>
          <p style={{ color: "#7E9BB5", lineHeight: 1.8, maxWidth: 480, marginBottom: "2rem" }}>
            Your isolated container workspace is one login away.
          </p>

          <div style={{ marginBottom: "2rem" }}><HeroNetworkSVG /></div>

          {/* Step list */}
          <div className="flex flex-col gap-0 mb-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-start gap-4 py-4 pr-4 transition-all duration-200 cursor-default step-card">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="step-num-circle flex items-center justify-center rounded-full text-white text-xs font-bold transition-all duration-200"
                    style={{ width: 34, height: 34, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)", boxShadow: "0 0 0 3px rgba(14,165,233,.12)", fontFamily: "monospace" }}>
                    {s.num}
                  </div>
                  {i < STEPS.length - 1 && <div className="step-connector" />}
                </div>
                <div className="flex-1 pt-1">
                  <strong className="block text-sm font-semibold mb-1" style={{ color: "#E2E8F0" }}>{s.title}</strong>
                  <span className="text-xs leading-relaxed" style={{ color: "#5E7A94" }}>{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs" style={{ color: "#2E4A62" }}>© 2026 CloudX Platform · Apache 2.0</div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 overflow-y-auto" style={{ background: "#060E1A" }}>
        <div className={`w-full max-w-sm ${mounted ? "fade-up" : "opacity-0"}`}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}>☁</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: 1 }}>Cloud<span style={{ color: "#0EA5E9" }}>X</span></span>
          </div>

          <h2 className="fade-up fade-up-1" style={{ fontFamily: "'Syne',sans-serif", fontSize: "2rem", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.5px", marginBottom: ".3rem" }}>
            Join CloudX
          </h2>
          <p className="fade-up fade-up-1 text-sm mb-6" style={{ color: "#475569" }}>
            Create your account — free to start, no card required.
          </p>

          {/* Error list */}
          {errors.length > 0 && (
            <ul className="mb-5 rounded-xl p-3 space-y-1" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)" }}>
              {errors.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "#FCA5A5" }}>
                  <span>⚠</span> {e}
                </li>
              ))}
            </ul>
          )}

          {/* Google SSO */}
          <button className="fade-up fade-up-2 btn-google w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold mb-5" style={{ color: "#94A3B8" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          <div className="fade-up fade-up-2 flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "#1E3A5F" }} />
            <span className="text-xs" style={{ color: "#3E5A7A" }}>or create with email</span>
            <div className="flex-1 h-px" style={{ background: "#1E3A5F" }} />
          </div>

          <form onSubmit={handleSubmit} noValidate>

            {/* Username */}
            <div className="fade-up fade-up-3 mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#3E5A7A" }}>👤</span>
                <input type="text" value={form.username} onChange={set("username")}
                  placeholder="your_username" autoComplete="username"
                  className="input-field w-full pl-9 pr-4 py-3 rounded-xl text-sm" required />
              </div>
            </div>

            {/* Email */}
            <div className="fade-up fade-up-3 mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Email address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#3E5A7A" }}>✉</span>
                <input type="email" value={form.email} onChange={set("email")}
                  placeholder="you@company.com" autoComplete="email"
                  className="input-field w-full pl-9 pr-4 py-3 rounded-xl text-sm" required />
              </div>
            </div>

            {/* Password */}
            <div className="fade-up fade-up-4 mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm z-10" style={{ color: "#3E5A7A" }}>🔒</span>
                <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")}
                  placeholder="Min. 8 characters" autoComplete="new-password"
                  className="input-field w-full pl-9 pr-10 py-3 rounded-xl text-sm" required />
                <button type="button" className="toggle-pw-btn absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  onClick={() => setShowPw(v => !v)} aria-label="Toggle password">{showPw ? "🙈" : "👁"}</button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirm */}
            <div className="fade-up fade-up-4 mb-6">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Confirm password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm z-10" style={{ color: "#3E5A7A" }}>🔒</span>
                <input type={showCPw ? "text" : "password"} value={form.confirm_password} onChange={set("confirm_password")}
                  placeholder="••••••••" autoComplete="new-password"
                  className="input-field w-full pl-9 pr-10 py-3 rounded-xl text-sm" required />
                <button type="button" className="toggle-pw-btn absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  onClick={() => setShowCPw(v => !v)} aria-label="Toggle confirm password">{showCPw ? "🙈" : "👁"}</button>
              </div>
              {/* Live match indicator */}
              {form.confirm_password && (
                <p className="text-xs mt-1 font-medium" style={{ color: form.password === form.confirm_password ? "#10B981" : "#EF4444" }}>
                  {form.password === form.confirm_password ? "✓ Passwords match" : "✗ Passwords don't match"}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="fade-up fade-up-5 btn-primary w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide"
              style={{ fontFamily: "'Syne',sans-serif" }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating account…
                </span>
              ) : "Create Account →"}
            </button>

            <p className="text-xs text-center mt-3" style={{ color: "#3E5A7A" }}>
              By creating an account you agree to the{" "}
              <a href="#" style={{ color: "#0EA5E9" }}>Terms of Service</a> and{" "}
              <a href="#" style={{ color: "#0EA5E9" }}>Privacy Policy</a>.
            </p>
          </form>

          <p className="fade-up fade-up-6 text-center text-sm mt-6" style={{ color: "#475569" }}>
            Already have an account?{" "}
            <a href="/login" className="font-semibold ml-1" style={{ color: "#0EA5E9" }}>Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}