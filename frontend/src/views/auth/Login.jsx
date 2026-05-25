import { useState, useEffect, useRef } from "react";

// Animated network SVG – same visual language as legacy HTML
function NetworkSVG() {
  return (
    <svg viewBox="0 0 480 220" xmlns="http://www.w3.org/2000/svg" aria-hidden className="w-full h-auto">
      <defs>
        <filter id="glow-l" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="eg-l" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity=".08" />
          <stop offset="30%" stopColor="#38BDF8" stopOpacity=".85" />
          <stop offset="70%" stopColor="#06B6D4" stopOpacity=".85" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity=".08" />
        </linearGradient>
        <path id="lp1" d="M 60,110 Q 170,60 240,110" fill="none" />
        <path id="lp2" d="M 240,110 Q 310,60 420,80" fill="none" />
        <path id="lp3" d="M 240,110 Q 310,150 420,140" fill="none" />
        <path id="lp4" d="M 60,110 Q 150,160 240,110" fill="none" />
        <path id="lp5" d="M 150,180 Q 195,145 240,110" fill="none" />
      </defs>

      {/* Server rack */}
      <g transform="translate(8,70)" opacity=".85">
        <rect x="0" y="0" width="42" height="80" rx="4" fill="#0F2744" stroke="#1E3A5F" strokeWidth="1.2" />
        {[0, 11, 22, 33].map((y, i) => (
          <rect key={i} x="4" y={5 + y} width="34" height="8" rx="2" fill="#0C3460" />
        ))}
        <circle cx="35" cy="9" r="2" fill="#10B981" />
        <circle cx="35" cy="20" r="2" fill="#0EA5E9" />
        <circle cx="35" cy="31" r="2" fill="#10B981" />
        <circle cx="35" cy="42" r="2" fill="#F59E0B" />
      </g>

      {/* Edges */}
      <g fill="none" opacity=".9">
        <path d="M 60,110 Q 170,60 240,110" stroke="url(#eg-l)" strokeWidth="1.6" />
        <path d="M 60,110 Q 150,160 240,110" stroke="url(#eg-l)" strokeWidth="1.6" />
        <path d="M 240,110 Q 310,60 420,80" stroke="url(#eg-l)" strokeWidth="1.6" />
        <path d="M 240,110 Q 310,150 420,140" stroke="url(#eg-l)" strokeWidth="1.6" />
        <path d="M 150,180 Q 195,145 240,110" stroke="url(#eg-l)" strokeWidth="1.4" />
        <path d="M 420,80 L 420,140" stroke="#38BDF8" strokeWidth=".9" opacity=".45" />
      </g>

      {/* Hub */}
      <circle cx="240" cy="110" r="22" fill="#0A1F3A" stroke="#0EA5E9" strokeWidth="1.8" filter="url(#glow-l)" />
      <circle cx="240" cy="110" r="14" fill="#0EA5E9" opacity=".15" />
      <text x="240" y="115" textAnchor="middle" fontSize="11" fill="#38BDF8" fontFamily="monospace" fontWeight="600">HUB</text>

      {/* Leaf nodes */}
      <circle cx="60" cy="110" r="8" fill="#0F2744" stroke="#0EA5E9" strokeWidth="1.5" filter="url(#glow-l)" />
      <circle cx="60" cy="110" r="3.5" fill="#0EA5E9" />
      <rect x="406" y="66" width="28" height="28" rx="5" fill="#0F2744" stroke="#06B6D4" strokeWidth="1.5" />
      <text x="420" y="85" textAnchor="middle" fontSize="8" fill="#06B6D4" fontFamily="monospace">CTR</text>
      <rect x="406" y="126" width="28" height="28" rx="5" fill="#0F2744" stroke="#8B5CF6" strokeWidth="1.5" />
      <text x="420" y="145" textAnchor="middle" fontSize="8" fill="#8B5CF6" fontFamily="monospace">DB</text>
      <circle cx="150" cy="180" r="7" fill="#0F2744" stroke="#10B981" strokeWidth="1.5" filter="url(#glow-l)" />
      <circle cx="150" cy="180" r="3" fill="#10B981" />

      {/* Animated packets */}
      {[
        { path: "#lp1", color: "#38BDF8", r: 4, dur: "3.5s", begin: "0s" },
        { path: "#lp2", color: "#8B5CF6", r: 3.5, dur: "3s", begin: "1.2s" },
        { path: "#lp3", color: "#10B981", r: 3, dur: "4s", begin: "2s" },
        { path: "#lp4", color: "#F59E0B", r: 3, dur: "3.8s", begin: ".5s" },
        { path: "#lp5", color: "#38BDF8", r: 2.5, dur: "3.2s", begin: "1.8s" },
      ].map((p, i) => (
        <circle key={i} r={p.r} fill={p.color} opacity=".9" filter="url(#glow-l)">
          <animateMotion dur={p.dur} repeatCount="indefinite" begin={p.begin}>
            <mpath href={p.path} />
          </animateMotion>
        </circle>
      ))}

      <text x="60" y="128" textAnchor="middle" fontSize="7.5" fill="#7E9BB5" fontFamily="sans-serif">Origin</text>
      <text x="150" y="197" textAnchor="middle" fontSize="7.5" fill="#7E9BB5" fontFamily="sans-serif">Worker</text>
      <text x="240" y="142" textAnchor="middle" fontSize="7.5" fill="#7E9BB5" fontFamily="sans-serif">Orchestrator</text>
    </svg>
  );
}

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [mounted, setMounted] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    usernameRef.current?.focus();
  }, []);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), password: form.password, remember: form.remember }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.redirect || "/";
      } else {
        setError(data.error || "Invalid username or password.");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }} className="min-h-screen bg-slate-900 flex">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Syne:wght@700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes orb-drift { from { transform: translate(0,0) scale(1); } to { transform: translate(22px,32px) scale(1.15); } }
        @keyframes grid-drift { to { background-position: 52px 52px; } }
        @keyframes fade-up { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        .orb { position:absolute; border-radius:50%; filter:blur(90px); pointer-events:none; }
        .orb-1 { width:420px;height:420px;background:#0EA5E9;opacity:.14;top:-120px;left:-120px;animation:orb-drift 12s ease-in-out infinite alternate; }
        .orb-2 { width:320px;height:320px;background:#8B5CF6;opacity:.12;bottom:-60px;right:-60px;animation:orb-drift 9s ease-in-out infinite alternate-reverse; }
        .orb-3 { width:220px;height:220px;background:#06B6D4;opacity:.10;top:45%;left:38%;animation:orb-drift 15s ease-in-out infinite alternate; }
        .hero-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(14,165,233,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,.06) 1px,transparent 1px);background-size:52px 52px;animation:grid-drift 25s linear infinite; }
        .fade-up { animation: fade-up .55s cubic-bezier(.22,1,.36,1) both; }
        .fade-up-1 { animation-delay:.08s; }
        .fade-up-2 { animation-delay:.18s; }
        .fade-up-3 { animation-delay:.28s; }
        .fade-up-4 { animation-delay:.38s; }
        .fade-up-5 { animation-delay:.48s; }
        .shake { animation: shake .35s ease; }
        .btn-primary { background: linear-gradient(135deg,#0EA5E9,#06B6D4); box-shadow: 0 4px 18px rgba(14,165,233,.4); transition: transform .2s, box-shadow .2s; }
        .btn-primary:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 28px rgba(14,165,233,.5); }
        .btn-primary:active { transform:translateY(0); }
        .btn-primary:disabled { opacity:.65; cursor:not-allowed; }
        .input-field { background:#0F1E35; border:1.5px solid #1E3A5F; color:#E2E8F0; transition: border-color .15s, box-shadow .15s; outline:none; }
        .input-field::placeholder { color:#3E5A7A; }
        .input-field:focus { border-color:#0EA5E9; box-shadow:0 0 0 3px rgba(14,165,233,.15); }
        .badge-pill { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); backdrop-filter:blur(8px); transition:all .2s; }
        .badge-pill:hover { background:rgba(14,165,233,.12); border-color:#0EA5E9; color:#fff; }
        .btn-google { background:rgba(255,255,255,.04); border:1.5px solid #1E3A5F; transition:all .2s; }
        .btn-google:hover { background:rgba(255,255,255,.08); border-color:#0EA5E9; transform:translateY(-1px); }
        .toggle-pw-btn { background:none; border:none; color:#3E5A7A; cursor:pointer; transition:color .15s; }
        .toggle-pw-btn:hover { color:#0EA5E9; }
        .pw-wrap { position:relative; }
        .pw-wrap input { padding-right:2.75rem; }
        .pw-wrap button { position:absolute;right:.85rem;top:50%;transform:translateY(-50%); }
      `}</style>

      {/* ── LEFT HERO PANEL ─── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden"
        style={{ flex: "1.1", background: "#0F172A", borderRadius: "60px", margin: "18px 18px 18px 24px", padding: "3rem 3.5rem" }}
      >
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
        <div className="hero-grid" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-4">
          <div style={{
            width: 48, height: 48, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)",
            borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.35rem", color: "#fff", boxShadow: "0 0 28px rgba(14,165,233,.5)"
          }}>☁</div>
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
            Cloud<span style={{ color: "#0EA5E9" }}>X</span>
          </span>
        </div>

        {/* Body */}
        <div className="relative z-10">
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "clamp(2rem,2.8vw,3rem)", fontWeight: 800, lineHeight: 1.1, color: "#fff", marginBottom: "1.25rem" }}>
            Welcome Back to Cloud<span style={{ background: "linear-gradient(110deg,#38BDF8,#06B6D4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>X</span>
          </h1>
          <p style={{ color: "#7E9BB5", lineHeight: 1.8, maxWidth: 400, marginBottom: "2.5rem" }}>
            Automating the future of decentralized computing.
          </p>
          <div style={{ marginBottom: "2.5rem" }}>
            <NetworkSVG />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: "🛡", label: "Isolated Tenants" },
              { icon: "⚡", label: "Real-time Logs" },
              { icon: "🔀", label: "Git-native" },
            ].map(({ icon, label }) => (
              <span key={label} className="badge-pill flex items-center gap-2 px-3 py-1.5 rounded-full text-slate-300 text-xs font-medium">
                <span>{icon}</span>{label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ─── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 py-12" style={{ background: "#060E1A" }}>
        <div className={`w-full max-w-sm ${mounted ? "fade-up" : "opacity-0"}`}>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg,#0EA5E9,#06B6D4)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem" }}>☁</div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: "1.3rem", fontWeight: 800, color: "#fff", letterSpacing: 1 }}>Cloud<span style={{ color: "#0EA5E9" }}>X</span></span>
          </div>

          <h2 className="fade-up fade-up-1" style={{ fontFamily: "'Syne',sans-serif", fontSize: "2rem", fontWeight: 800, color: "#F1F5F9", letterSpacing: "-0.5px", marginBottom: ".3rem" }}>
            Welcome back
          </h2>
          <p className="fade-up fade-up-1 text-sm mb-7" style={{ color: "#475569" }}>
            Sign in to your CloudX workspace
          </p>

          {/* Error banner */}
          {error && (
            <div className={`shake flex items-center gap-2 p-3 mb-5 rounded-xl text-sm font-medium`}
              style={{ background: "rgba(239,68,68,.1)", color: "#FCA5A5", border: "1px solid rgba(239,68,68,.25)" }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Google SSO (placeholder) */}
          <button className="fade-up fade-up-2 btn-google w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-slate-300 text-sm font-semibold mb-5" style={{ color: "#94A3B8" }}>
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
            <span className="text-xs" style={{ color: "#3E5A7A" }}>or sign in with credentials</span>
            <div className="flex-1 h-px" style={{ background: "#1E3A5F" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="fade-up fade-up-3 mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B", letterSpacing: ".01em" }}>Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#3E5A7A" }}>👤</span>
                <input
                  ref={usernameRef}
                  type="text"
                  value={form.username}
                  onChange={set("username")}
                  placeholder="your_username"
                  autoComplete="username"
                  className="input-field w-full pl-9 pr-4 py-3 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="fade-up fade-up-3 mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#64748B" }}>Password</label>
              <div className="pw-wrap">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm z-10" style={{ color: "#3E5A7A" }}>🔒</span>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="input-field w-full pl-9 py-3 rounded-xl text-sm"
                  required
                />
                <button type="button" className="toggle-pw-btn absolute right-3 top-1/2 -translate-y-1/2 text-sm" onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                  {showPw ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className="fade-up fade-up-4 flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "#64748B" }}>
                <input type="checkbox" checked={form.remember} onChange={set("remember")}
                  className="w-4 h-4 rounded accent-sky-500" style={{ accentColor: "#0EA5E9" }} />
                Remember me
              </label>
              <a href="#" className="text-sm font-medium" style={{ color: "#0EA5E9" }}>Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="fade-up fade-up-5 btn-primary w-full py-3 rounded-xl text-white text-sm font-bold tracking-wide"
              style={{ fontFamily: "'Syne',sans-serif" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In →"}
            </button>
          </form>

          <p className="fade-up fade-up-5 text-center text-sm mt-6" style={{ color: "#475569" }}>
            Don't have an account?{" "}
            <a href="/signup" className="font-semibold ml-1" style={{ color: "#0EA5E9" }}>Create one</a>
          </p>
        </div>
      </div>
    </div>
  );
}