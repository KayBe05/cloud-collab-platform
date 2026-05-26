import { useState, useEffect, useRef, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart,
} from "recharts";

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE =
  (typeof window !== "undefined" && window.__API_BASE) ||
  import.meta.env?.VITE_API_BASE ||
  "http://localhost:5000";

const api = (path) => fetch(`${API_BASE}${path}`, { credentials: "include" });

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  cyan: "#00ccff",
  purple: "#9d6fff",
  yellow: "#f5c842",
  green: "#00e87a",
  red: "#ff4455",
  orange: "#ff7c42",
  t1: "#dbeaff",
  t2: "#7b9db8",
  t3: "#3d5870",
  bg0: "#050b14",
  bg1: "#111e2e",
  bg2: "#0c1624",
  bg3: "#10202f",
  border: "rgba(255,255,255,0.065)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 45; // r=45

function pct2offset(pct) {
  return CIRCUMFERENCE - (Math.min(pct, 100) / 100) * CIRCUMFERENCE;
}

function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ACTION_META = {
  user_login: { icon: "fa-sign-in-alt", color: C.green },
  user_logout: { icon: "fa-sign-out-alt", color: C.t3 },
  user_signup: { icon: "fa-user-plus", color: C.cyan },
  project_created: { icon: "fa-folder-plus", color: C.green },
  project_deleted: { icon: "fa-trash", color: C.red },
  deployment_created: { icon: "fa-rocket", color: C.cyan },
  deployment_redeployed: { icon: "fa-sync-alt", color: C.purple },
  workspace_provisioned: { icon: "fa-server", color: C.yellow },
  ai_assist_request: { icon: "fa-robot", color: C.purple },
  file_write: { icon: "fa-pen", color: C.cyan },
  file_read: { icon: "fa-file", color: C.t2 },
  page_view: { icon: "fa-eye", color: C.t3 },
  websocket_connect: { icon: "fa-plug", color: C.green },
  database_test: { icon: "fa-database", color: C.yellow },
};

// ─── Sparkline (canvas-based mini chart) ──────────────────────────────────────
function Sparkline({ data = [], color = C.cyan }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data);
    const max = Math.max(...data) || 1;
    const pts = data.map((v, i) => [
      (i / (data.length - 1)) * width,
      height - ((v - min) / (max - min)) * height * 0.85 - height * 0.05,
    ]);

    // Fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");
    ctx.beginPath();
    ctx.moveTo(pts[0][0], height);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[pts.length - 1][0], height);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={28}
      style={{ width: "100%", height: 28, borderRadius: 4, opacity: 0.8 }}
    />
  );
}

// ─── Circular SVG Gauge ───────────────────────────────────────────────────────
function Gauge({ value = 0, label, unit = "%", color = C.cyan, sub, sparkData = [] }) {
  const [animVal, setAnimVal] = useState(0);

  useEffect(() => {
    let frame;
    let current = animVal;
    const target = value;
    const step = () => {
      current += (target - current) * 0.12;
      setAnimVal(current);
      if (Math.abs(target - current) > 0.3) frame = requestAnimationFrame(step);
      else setAnimVal(target);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const offset = pct2offset(animVal);

  return (
    <div
      style={{
        background: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "1.5rem 1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        transition: "border-color 0.2s, box-shadow 0.2s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.boxShadow = `0 0 24px ${color}33, 0 0 48px ${color}14`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* top radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse at 50% 0%, ${color}12 0%, transparent 65%)`,
        borderRadius: "inherit",
      }} />

      {/* SVG gauge */}
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg
          viewBox="0 0 120 120"
          style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}
        >
          <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
          <circle
            cx="60" cy="60" r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              filter: `drop-shadow(0 0 5px ${color})`,
              transition: "stroke-dashoffset 0.05s linear",
            }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            fontSize: "1.25rem", fontWeight: 500, color: C.t1, lineHeight: 1,
          }}>
            {Math.round(animVal)}
          </span>
          <span style={{
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            fontSize: "0.65rem", color: C.t3, marginTop: 2,
          }}>
            {unit}
          </span>
        </div>
      </div>

      <div style={{
        fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
        fontWeight: 700, letterSpacing: "0.04em",
        textTransform: "uppercase", color: C.t2, fontSize: "0.75rem",
      }}>
        {label}
      </div>

      <Sparkline data={sparkData.length ? sparkData : [value]} color={color} />

      {sub && (
        <div style={{
          fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
          fontSize: "0.7rem", color: C.t3, textAlign: "center",
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    running: { bg: "rgba(0,232,122,0.14)", color: C.green, border: "rgba(0,232,122,0.2)" },
    exited: { bg: "rgba(255,68,85,0.1)", color: C.red, border: "rgba(255,68,85,0.2)" },
    stopped: { bg: "rgba(255,124,66,0.1)", color: C.orange, border: "rgba(255,124,66,0.2)" },
  };
  const s = map[status] || map.stopped;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.4rem",
      fontSize: "0.72rem", fontWeight: 500,
      padding: "0.2rem 0.65rem", borderRadius: 999,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: "currentColor",
        animation: status === "running" ? "blink 2s ease-in-out infinite" : "none",
        boxShadow: status === "running" ? `0 0 6px ${s.color}` : "none",
      }} />
      {status}
    </span>
  );
}

// ─── Container action button ───────────────────────────────────────────────────
function ActionBtn({ icon, title, onClick, danger }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 28, borderRadius: 6,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.border}`,
        color: danger ? C.red : C.t2,
        cursor: "pointer", display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: "0.72rem", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(255,68,85,0.12)" : "rgba(0,204,255,0.08)";
        e.currentTarget.style.borderColor = danger ? C.red : C.cyan;
        e.currentTarget.style.color = danger ? C.red : C.cyan;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.04)";
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.color = danger ? C.red : C.t2;
      }}
    >
      <i className={`fas ${icon}`} />
    </button>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
function CxTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,11,18,0.92)", border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "0.6rem 0.9rem",
      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
    }}>
      <div style={{ fontSize: "0.7rem", color: C.t3, marginBottom: "0.35rem" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ fontSize: "0.78rem", color: p.color, display: "flex", gap: "0.5rem" }}>
          <span>{p.name}:</span>
          <span style={{ color: C.t1, fontWeight: 600 }}>{p.value}{p.unit || ""}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Sk({ h = 16, w = "100%", r = 6 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: "rgba(255,255,255,0.05)",
      animation: "pulse 1.6s ease-in-out infinite",
    }} />
  );
}

// ─── Section panel wrapper ────────────────────────────────────────────────────
function Panel({ children, style = {} }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.42)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function PanelHeader({ title, icon, badge, right }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.95rem 1.4rem",
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(5,11,20,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        {icon && <i className={`fas ${icon}`} style={{ color: C.cyan, fontSize: "0.85rem" }} />}
        <span style={{
          fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
          fontWeight: 700, color: C.t1, fontSize: "0.88rem", letterSpacing: "0.02em",
        }}>
          {title}
        </span>
        {badge != null && (
          <span style={{
            background: "rgba(0,204,255,0.18)", color: C.cyan,
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            fontSize: "0.68rem", fontWeight: 500,
            padding: "0.18rem 0.55rem", borderRadius: 999,
            border: "1px solid rgba(0,204,255,0.2)",
          }}>
            {badge}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── PERFORMANCE CHART DATA ───────────────────────────────────────────────────
const perfData = [
  { t: "00:00", CPU: 45, Mem: 62 },
  { t: "02:00", CPU: 52, Mem: 65 },
  { t: "04:00", CPU: 48, Mem: 64 },
  { t: "06:00", CPU: 55, Mem: 68 },
  { t: "08:00", CPU: 65, Mem: 72 },
  { t: "10:00", CPU: 58, Mem: 70 },
  { t: "12:00", CPU: 70, Mem: 75 },
  { t: "14:00", CPU: 62, Mem: 73 },
  { t: "16:00", CPU: 68, Mem: 74 },
  { t: "18:00", CPU: 74, Mem: 76 },
  { t: "20:00", CPU: 66, Mem: 72 },
  { t: "24:00", CPU: 59, Mem: 68 },
];

const deployData = [
  { day: "Mon", Success: 12, Failed: 1 },
  { day: "Tue", Success: 15, Failed: 0 },
  { day: "Wed", Success: 10, Failed: 2 },
  { day: "Thu", Success: 18, Failed: 1 },
  { day: "Fri", Success: 14, Failed: 0 },
  { day: "Sat", Success: 8, Failed: 1 },
  { day: "Sun", Success: 6, Failed: 0 },
];

// Sparkline history pools (simulate rolling data)
function useSparkHistory(liveVal, len = 18) {
  const ref = useRef(Array(len).fill(0));
  useEffect(() => {
    if (liveVal == null) return;
    ref.current = [...ref.current.slice(1), liveVal];
  }, [liveVal]);
  return ref.current;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingContainers, setLoadingContainers] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [perfRange, setPerfRange] = useState("24h");
  const [containerLastSync, setContainerLastSync] = useState(null);

  // Live gauge values (in real app: from WebSocket)
  const [gauge, setGauge] = useState({ cpu: 62, mem: 74, disk: 38, net: 22 });

  const cpuSpark = useSparkHistory(gauge.cpu);
  const memSpark = useSparkHistory(gauge.mem);
  const diskSpark = useSparkHistory(gauge.disk);
  const netSpark = useSparkHistory(gauge.net);

  // ── Fetch stats ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (quiet = false) => {
    if (!quiet) setLoadingStats(true);
    else setRefreshing(true);
    try {
      const res = await api("/api/dashboard");
      if (res.status === 401 || res.redirected) {
        // Flask redirected to /login — reload to let it handle auth
        window.location.reload();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Server returned HTML instead of JSON. Check Vite proxy or VITE_API_BASE.");
      }
      const data = await res.json();
      setStats(data);
      setLastSync(new Date());
      setErrorStats(null);
    } catch (e) {
      setErrorStats(e.message);
    } finally {
      setLoadingStats(false);
      setRefreshing(false);
    }
  }, []);

  // ── Fetch containers ───────────────────────────────────────────────────────
  const fetchContainers = useCallback(async () => {
    setLoadingContainers(true);
    try {
      const res = await api("/api/containers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContainers(data.containers || []);
      setContainerLastSync(new Date());
    } catch {
      setContainers([]);
    } finally {
      setLoadingContainers(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchContainers();
    const iv1 = setInterval(() => fetchStats(true), 30_000);
    const iv2 = setInterval(fetchContainers, 15_000);
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [fetchStats, fetchContainers]);

  // Simulate gauge ticks (replace with real socket data in production)
  useEffect(() => {
    const iv = setInterval(() => {
      setGauge((g) => ({
        cpu: Math.max(10, Math.min(95, g.cpu + (Math.random() - 0.5) * 6)),
        mem: Math.max(30, Math.min(92, g.mem + (Math.random() - 0.5) * 3)),
        disk: Math.max(20, Math.min(85, g.disk + (Math.random() - 0.5) * 1)),
        net: Math.max(5, Math.min(200, g.net + (Math.random() - 0.5) * 12)),
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // ── Container actions ──────────────────────────────────────────────────────
  async function containerAction(id, action) {
    try {
      await api(`/api/containers/${id}/action`, /* method */).catch(() => { });
      await fetch(`${API_BASE}/api/containers/${id}/action`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      fetchContainers();
    } catch { /* silent */ }
  }

  const runningCount = containers.filter((c) => c.status === "running").length;

  // ── Gauge colors ───────────────────────────────────────────────────────────
  const gaugeProps = [
    { key: "cpu", label: "CPU", unit: "%", color: C.cyan, spark: cpuSpark, sub: `~${Math.round(gauge.cpu)}% avg last hour` },
    { key: "mem", label: "RAM", unit: "%", color: C.purple, spark: memSpark, sub: `${(gauge.mem * 0.16).toFixed(1)} / 16 GB` },
    { key: "disk", label: "Disk", unit: "%", color: C.yellow, spark: diskSpark, sub: `${Math.round(gauge.disk * 2.4)} / 240 GB` },
    { key: "net", label: "Network", unit: "KB/s", color: C.green, spark: netSpark, sub: `↑ ${Math.round(gauge.net * 0.6)} ↓ ${Math.round(gauge.net * 0.4)} KB/s` },
  ];

  // chart axis / tick style
  const axTick = { fill: C.t3, fontFamily: "'JetBrains Mono',monospace", fontSize: 11 };

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:.9} }
        @keyframes blink  { 0%,100%{opacity:1}  50%{opacity:.3} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideR { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        .cx-row-hover:hover { background:rgba(0,204,255,0.04)!important; }
        .cx-row-hover:hover td { color:${C.t1}!important; }
      `}</style>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem",
        animation: "fadeUp 0.4s ease both",
      }}>
        <div>
          <h2 style={{
            margin: 0, fontSize: "1.85rem", fontWeight: 800, lineHeight: 1,
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            color: C.t1, letterSpacing: "-0.02em",
          }}>
            System Monitor
          </h2>
          <p style={{
            margin: "0.4rem 0 0", fontSize: "0.75rem", color: C.t3,
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
          }}>
            Live infrastructure telemetry · auto-refresh every 30 s
            {lastSync && ` · synced ${relTime(lastSync.toISOString())}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Live badge */}
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.35rem 0.85rem",
            background: "rgba(0,232,122,0.12)", border: "1px solid rgba(0,232,122,0.2)",
            borderRadius: 999, fontSize: "0.75rem", fontWeight: 500,
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", color: C.green,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: C.green,
              boxShadow: `0 0 8px ${C.green}`, animation: "blink 2s ease-in-out infinite",
            }} />
            All systems nominal
          </span>

          <button
            onClick={() => { fetchStats(true); fetchContainers(); }}
            disabled={refreshing}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.48rem 1rem", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.t2, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
              opacity: refreshing ? 0.6 : 1, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,204,255,0.08)"; e.currentTarget.style.color = C.cyan; e.currentTarget.style.borderColor = "rgba(0,204,255,0.28)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = C.t2; e.currentTarget.style.borderColor = C.border; }}
          >
            <i className="fas fa-sync-alt" style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }} />
            Refresh
          </button>

          <a href="/projects" style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.48rem 1rem",
            background: "rgba(0,204,255,0.14)", border: "1px solid rgba(0,204,255,0.24)",
            borderRadius: 8, color: C.cyan, fontSize: "0.8rem", fontWeight: 700,
            fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            textDecoration: "none", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,204,255,0.22)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,204,255,0.14)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <i className="fas fa-plus" />
            New Project
          </a>
        </div>
      </div>

      {/* ── ERROR BANNER ──────────────────────────────────────────────────── */}
      {errorStats && (
        <div style={{
          padding: "0.85rem 1.1rem", marginBottom: "1.5rem",
          background: "rgba(255,68,85,0.08)", border: `1px solid rgba(255,68,85,0.22)`,
          borderRadius: 10, color: C.red,
          fontSize: "0.8rem", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
          display: "flex", alignItems: "flex-start", gap: "0.65rem",
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong>Dashboard data failed to load:</strong> {errorStats}
            {errorStats.includes("HTML") && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.72rem", color: C.t3 }}>
                Fix: add <code style={{ background: "rgba(255,255,255,0.08)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>VITE_API_BASE=http://localhost:5000</code> to your <code style={{ background: "rgba(255,255,255,0.08)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>.env</code>, or configure a <code style={{ background: "rgba(255,255,255,0.08)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>vite.config.js</code> proxy for <code style={{ background: "rgba(255,255,255,0.08)", padding: "0.1rem 0.35rem", borderRadius: 4 }}>/api → http://localhost:5000</code>.
              </div>
            )}
          </div>
          <button onClick={() => fetchStats()} style={{
            background: "none", border: "none", color: C.red, cursor: "pointer",
            fontFamily: "inherit", fontSize: "0.75rem", textDecoration: "underline", flexShrink: 0,
          }}>Retry</button>
        </div>
      )}

      {/* ── GAUGE GRID ────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1.25rem",
        marginBottom: "2rem",
        animation: "fadeUp 0.45s ease 0.05s both",
      }}>
        {gaugeProps.map(({ key, label, unit, color, spark, sub }) => (
          <Gauge
            key={key}
            value={Math.round(gauge[key])}
            label={label}
            unit={unit}
            color={color}
            sparkData={spark}
            sub={sub}
          />
        ))}
      </div>

      {/* ── CONTAINER TABLE ───────────────────────────────────────────────── */}
      <Panel style={{ marginBottom: "2rem", animation: "fadeUp 0.45s ease 0.1s both" }}>
        <PanelHeader
          title="Live Containers"
          icon="fa-cubes"
          badge={`${runningCount} Running`}
          right={
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <span style={{
                fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                fontSize: "0.68rem", color: C.t3,
              }}>
                {containerLastSync ? `synced ${relTime(containerLastSync.toISOString())}` : "—"}
              </span>
              <button
                onClick={fetchContainers}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.border}`, color: C.cyan,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.75rem", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.background = "rgba(0,204,255,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              >
                <i className={`fas fa-sync-alt ${loadingContainers ? "fa-spin" : ""}`} />
              </button>
            </div>
          }
        />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Status", "Image", "Ports", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "0.6rem 1.25rem", textAlign: "left",
                    fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                    fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.08em",
                    textTransform: "uppercase", color: C.t1,
                    borderBottom: `1px solid rgba(255,255,255,0.06)`,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingContainers ? (
                [0, 1, 2].map(i => (
                  <tr key={i}>
                    {[0, 1, 2, 3, 4].map(j => (
                      <td key={j} style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                        <Sk h={14} w={j === 1 ? 80 : j === 4 ? 90 : "80%"} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : containers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{
                    textAlign: "center", padding: "3rem",
                    color: C.t3, fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontSize: "0.85rem",
                  }}>
                    <i className="fas fa-cubes" style={{ display: "block", fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.2 }} />
                    No containers found for your projects
                  </td>
                </tr>
              ) : (
                containers.map((c) => (
                  <tr key={c.id} className="cx-row-hover" style={{ transition: "background 0.12s" }}>
                    <td style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <i className="fas fa-cube" style={{ color: C.cyan, fontSize: "0.75rem" }} />
                        <span style={{
                          fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                          fontSize: "0.8rem", color: C.t2,
                        }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <StatusPill status={c.status} />
                    </td>
                    <td style={{
                      padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)`,
                      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                      fontSize: "0.78rem", color: C.t2,
                    }}>
                      {c.image}
                    </td>
                    <td style={{
                      padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)`,
                      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                      fontSize: "0.75rem", color: C.t3,
                    }}>
                      {Object.entries(c.ports || {}).map(([k, v]) => (
                        <span key={k} style={{ marginRight: "0.5rem" }}>
                          {v ? `${v[0]?.HostPort}→${k}` : k}
                        </span>
                      ))}
                      {!Object.keys(c.ports || {}).length && "—"}
                    </td>
                    <td style={{ padding: "0.9rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <ActionBtn icon="fa-stop" title="Stop" onClick={() => containerAction(c.id, "stop")} />
                        <ActionBtn icon="fa-redo" title="Restart" onClick={() => containerAction(c.id, "restart")} />
                        <ActionBtn icon="fa-terminal" title="Open Terminal"
                          onClick={() => window.open(`/workspace?container=${c.id}`, "_blank")} />
                        <ActionBtn icon="fa-trash" title="Delete" danger
                          onClick={() => containerAction(c.id, "delete")} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── CHARTS ROW ────────────────────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem",
        marginBottom: "2rem",
        animation: "fadeUp 0.45s ease 0.15s both",
      }}>
        {/* Performance chart */}
        <Panel>
          <PanelHeader
            title="System Performance"
            icon="fa-chart-line"
            right={
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {["24h", "7d", "30d"].map(r => (
                  <button key={r} onClick={() => setPerfRange(r)} style={{
                    padding: "0.3rem 0.75rem", borderRadius: 20, cursor: "pointer",
                    fontSize: "0.75rem", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                    fontWeight: 500, transition: "all 0.15s",
                    background: perfRange === r ? C.cyan : "rgba(255,255,255,0.05)",
                    border: `1px solid ${perfRange === r ? C.cyan : C.border}`,
                    color: perfRange === r ? "#000" : C.t2,
                  }}>{r}</button>
                ))}
              </div>
            }
          />
          <div style={{ padding: "1.25rem 0.5rem 0.75rem" }}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={perfData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.cyan} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.purple} stopOpacity={0.14} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="t" tick={axTick} axisLine={false} tickLine={false} />
                <YAxis domain={[20, 100]} tick={axTick} axisLine={false} tickLine={false}
                  tickFormatter={v => `${v}%`} />
                <Tooltip content={<CxTooltip />} />
                <Legend
                  wrapperStyle={{
                    paddingTop: 8, fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                    fontSize: 12, color: C.t3,
                  }}
                />
                <Area type="monotone" dataKey="CPU" stroke={C.cyan} fill="url(#gcpu)"
                  strokeWidth={1.75} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
                <Area type="monotone" dataKey="Mem" stroke={C.purple} fill="url(#gmem)"
                  strokeWidth={1.75} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Deployment chart */}
        <Panel>
          <PanelHeader
            title="Deployment Success Rate"
            icon="fa-rocket"
            right={
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.45rem",
                padding: "0.3rem 0.85rem",
                background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.2)",
                borderRadius: 999, fontSize: "0.8rem", fontWeight: 600,
                fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", color: C.green,
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: "0.75rem" }} />
                98.5%
              </span>
            }
          />
          <div style={{ padding: "1.25rem 0.5rem 0.75rem" }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deployData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}
                barCategoryGap="35%">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={axTick} axisLine={false} tickLine={false} />
                <YAxis tick={axTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CxTooltip />} />
                <Legend
                  wrapperStyle={{
                    paddingTop: 8, fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                    fontSize: 12, color: C.t3,
                  }}
                />
                <Bar dataKey="Success" fill={`${C.green}cc`} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Failed" fill={`${C.red}bb`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ── BOTTOM GRID: Activity + Resources ─────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "1.25rem",
        marginBottom: "2rem",
        animation: "fadeUp 0.45s ease 0.2s both",
      }}>
        {/* Activity feed */}
        <Panel>
          <PanelHeader
            title="Recent Activity"
            icon="fa-history"
            right={
              <a href="/analytics" style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                fontSize: "0.72rem", color: C.cyan,
                fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontWeight: 600,
                textDecoration: "none", transition: "gap 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.gap = "0.65rem"}
                onMouseLeave={e => e.currentTarget.style.gap = "0.4rem"}
              >
                View All <i className="fas fa-arrow-right" style={{ fontSize: "0.65rem" }} />
              </a>
            }
          />
          <div style={{
            padding: "0.75rem 1rem",
            display: "flex", flexDirection: "column", gap: "0.5rem",
            maxHeight: 390, overflowY: "auto",
            scrollbarWidth: "thin", scrollbarColor: `${C.bg1} transparent`,
          }}>
            {loadingStats
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  display: "flex", gap: "0.85rem", alignItems: "center", padding: "0.75rem 0",
                  borderBottom: `1px solid ${C.border}`
                }}>
                  <Sk h={34} w={34} r="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <Sk h={12} w="55%" />
                    <Sk h={10} w="75%" />
                  </div>
                  <Sk h={10} w={48} />
                </div>
              ))
              : (stats?.recent_activities?.length > 0
                ? stats.recent_activities.slice(0, 12)
                : []
              ).map((item, i) => {
                const raw = item.action || "";
                const meta = ACTION_META[raw] || { icon: "fa-circle", color: C.t3 };
                const label = raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: "0.8rem",
                    padding: "0.75rem", borderRadius: 10,
                    background: "rgba(255,255,255,0.02)",
                    border: `1px solid rgba(255,255,255,0.045)`,
                    transition: "background 0.12s, border-color 0.12s",
                    animation: `slideR 0.35s ease ${i * 50}ms both`,
                    cursor: "default",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${meta.color}0a`; e.currentTarget.style.borderColor = `${meta.color}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.045)"; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: `${meta.color}1a`, border: `1px solid ${meta.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: meta.color, fontSize: "0.72rem",
                    }}>
                      <i className={`fas ${meta.icon}`} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: "0.8rem",
                        fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                        color: C.t1, marginBottom: "0.18rem",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{label}</div>
                      {item.details && (
                        <div style={{
                          fontSize: "0.7rem", color: C.t2,
                          fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{item.details}</div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, textAlign: "right" }}>
                      <div style={{
                        fontSize: "0.65rem", color: C.t3,
                        fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                      }}>
                        {fmtTime(item.created_at)}
                      </div>
                      <div style={{
                        fontSize: "0.6rem", color: C.t3, marginTop: "0.15rem",
                        fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                      }}>
                        {relTime(item.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            {!loadingStats && !stats?.recent_activities?.length && (
              <div style={{
                textAlign: "center", padding: "3rem 1rem",
                color: C.t3, fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontSize: "0.85rem",
              }}>
                <i className="fas fa-inbox" style={{ display: "block", fontSize: "2rem", marginBottom: "0.75rem", opacity: 0.2 }} />
                No recent activity
              </div>
            )}
          </div>
        </Panel>

        {/* System Resources */}
        <Panel>
          <PanelHeader
            title="System Resources"
            icon="fa-server"
            right={
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.2rem 0.6rem",
                background: "rgba(0,204,255,0.1)", border: "1px solid rgba(0,204,255,0.2)",
                borderRadius: 999, fontSize: "0.65rem", fontWeight: 600,
                fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                color: C.cyan, letterSpacing: "0.05em", textTransform: "uppercase",
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", background: C.cyan,
                  animation: "blink 1.4s ease-in-out infinite",
                  boxShadow: `0 0 6px ${C.cyan}`,
                }} />
                Live
              </span>
            }
          />
          <div style={{ padding: "1.25rem" }}>
            {[
              { label: "CPU Usage", icon: "fa-microchip", val: gauge.cpu, color: C.cyan, unit: "%" },
              { label: "Memory", icon: "fa-memory", val: gauge.mem, color: C.purple, unit: "%" },
              { label: "Disk", icon: "fa-hdd", val: gauge.disk, color: C.yellow, unit: "%" },
              { label: "Network I/O", icon: "fa-wifi", val: gauge.net, color: C.green, unit: " KB/s", max: 200 },
            ].map(({ label, icon, val, color, unit, max = 100 }) => {
              const pctBar = Math.min((val / max) * 100, 100);
              const warn = pctBar > 75, crit = pctBar > 90;
              const barCol = crit ? C.red : warn ? C.orange : color;
              return (
                <div key={label} style={{ marginBottom: "1.4rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.55rem" }}>
                    <span style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      fontSize: "0.82rem", fontWeight: 500,
                      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", color: C.t2,
                    }}>
                      <i className={`fas ${icon}`} style={{ color, fontSize: "0.75rem" }} />
                      {label}
                    </span>
                    <span style={{
                      fontSize: "0.85rem", fontWeight: 700,
                      fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", color: C.t1,
                    }}>
                      {Math.round(val)}{unit}
                    </span>
                  </div>
                  <div style={{
                    height: 10, background: "rgba(255,255,255,0.05)",
                    borderRadius: 999, overflow: "hidden", position: "relative",
                  }}>
                    {/* tick marks */}
                    <div style={{
                      position: "absolute", inset: 0,
                      backgroundImage: "repeating-linear-gradient(90deg,transparent,transparent 11px,rgba(255,255,255,0.07) 11px,rgba(255,255,255,0.07) 12px)",
                      zIndex: 2, pointerEvents: "none", borderRadius: 999,
                    }} />
                    <div style={{
                      height: "100%", borderRadius: 999,
                      width: `${pctBar}%`,
                      background: `linear-gradient(90deg,${barCol}bb,${barCol})`,
                      boxShadow: `0 0 8px ${barCol}55`,
                      transition: "width 0.7s cubic-bezier(0.16,1,0.3,1)",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* shimmer */}
                      <div style={{
                        position: "absolute", top: 0, left: "-40%", width: "30%", height: "100%",
                        background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.4) 50%,transparent 100%)",
                        animation: "shimmer 2.2s ease-in-out infinite",
                        borderRadius: "inherit",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* service status */}
            <div style={{
              borderTop: `1px solid ${C.border}`, paddingTop: "1rem",
              display: "flex", flexDirection: "column", gap: "0.55rem",
            }}>
              {[
                { label: "PostgreSQL", ok: true },
                { label: "WebSocket", ok: true },
                { label: "Containers", ok: runningCount > 0 },
                { label: "Traefik Proxy", ok: true },
              ].map(({ label, ok }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{
                    fontSize: "0.75rem", color: C.t3,
                    fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                  }}>{label}</span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    fontSize: "0.7rem", fontWeight: 600,
                    fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                    color: ok ? C.green : C.red,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%", background: "currentColor",
                      boxShadow: `0 0 6px currentColor`,
                      animation: ok ? "blink 2s ease-in-out infinite" : "none",
                    }} />
                    {ok ? (label === "Containers" ? `${runningCount} running` : "Healthy") : "Degraded"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* ── KPI METRIC CARDS (bottom) ──────────────────────────────────────── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1.25rem",
        animation: "fadeUp 0.45s ease 0.25s both",
      }}>
        {[
          { icon: "fa-project-diagram", label: "Total Projects", val: stats?.total_projects ?? 0, trend: "+12%", color: C.cyan },
          { icon: "fa-rocket", label: "Active Deployments", val: stats?.active_deployments ?? 0, trend: "+8%", color: C.green },
          { icon: "fa-server", label: "Uptime SLA", val: "99.9%", trend: "✓ 100%", color: C.purple },
          { icon: "fa-history", label: "Total Activities", val: stats?.total_activities ?? 0, trend: "+24%", color: C.yellow },
        ].map(({ icon, label, val, trend, color }, i) => (
          <div key={label} style={{
            background: "rgba(15,23,42,0.42)", backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: `1px solid ${C.border}`, borderRadius: 16, padding: "1.35rem",
            position: "relative", overflow: "hidden",
            transition: "transform 0.22s,border-color 0.22s,box-shadow 0.22s",
            animation: `fadeUp 0.45s ease ${0.3 + i * 0.07}s both`,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = `${color}44`; e.currentTarget.style.boxShadow = `0 0 30px ${color}18,0 8px 32px rgba(0,0,0,0.35)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            {/* top accent line */}
            <div style={{
              position: "absolute", top: 0, left: "15%", right: "15%", height: 1,
              background: `linear-gradient(90deg,transparent,${color}66,transparent)`,
            }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 10,
                background: `${color}18`, border: `1px solid ${color}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color, fontSize: "1.2rem",
              }}>
                <i className={`fas ${icon}`} />
              </div>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.3rem",
                fontSize: "0.7rem", fontWeight: 600,
                fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
                padding: "0.2rem 0.55rem", borderRadius: 999,
                background: "rgba(0,232,122,0.1)", color: C.green,
                border: "1px solid rgba(0,232,122,0.2)",
              }}>
                <i className="fas fa-arrow-up" style={{ fontSize: "0.55rem" }} />
                {trend}
              </span>
            </div>
            <div style={{
              fontSize: "2rem", fontWeight: 700, lineHeight: 1,
              fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
              color: C.t1, letterSpacing: "-0.02em", marginBottom: "0.35rem",
            }}>
              {loadingStats ? <Sk h={32} w="60%" /> : val}
            </div>
            <div style={{
              fontSize: "0.8rem", color: C.t2, fontWeight: 500,
              fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)",
            }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { left:-40% }
          100% { left:140% }
        }
      `}</style>
    </>
  );
}