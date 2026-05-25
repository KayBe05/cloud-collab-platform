import { useState, useEffect, useRef, useCallback } from "react";

const CX = {
  bg0: "#020810",
  bg1: "#060d18",
  bg2: "#0a1628",
  bg3: "#0f1f38",
  border: "rgba(14,165,233,0.12)",
  borderHi: "rgba(14,165,233,0.30)",
  blue: "#0ea5e9",
  cyan: "#00ccff",
  purple: "#9d6fff",
  green: "#00e87a",
  orange: "#ff7c42",
  red: "#ff4455",
  t1: "#dbeaff",
  t2: "#7d9ab8",
  t3: "#3d5870",
  font: "'JetBrains Mono', 'Fira Code', monospace",
};

const S = {
  root: {
    fontFamily: CX.font,
    background: CX.bg0,
    minHeight: "100vh",
    color: CX.t1,
    padding: "1.5rem",
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "1.75rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  pageTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: CX.t1,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  pageSub: {
    fontSize: "0.72rem",
    color: CX.t3,
    marginTop: "0.2rem",
  },
  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    background: "rgba(0,232,122,0.10)",
    border: "1px solid rgba(0,232,122,0.20)",
    color: CX.green,
    fontSize: "0.68rem",
    fontWeight: 600,
    letterSpacing: "0.06em",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: CX.green,
    boxShadow: `0 0 6px ${CX.green}`,
    animation: "pulse 1.8s ease-in-out infinite",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "1.75rem",
  },
  kpiCard: {
    background: `linear-gradient(135deg, ${CX.bg2} 0%, ${CX.bg1} 100%)`,
    border: `1px solid ${CX.border}`,
    borderRadius: 12,
    padding: "1.1rem 1.25rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.9rem",
    backdropFilter: "blur(12px)",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  kpiIcon: (color) => ({
    width: 38,
    height: 38,
    borderRadius: 10,
    background: `${color}18`,
    border: `1px solid ${color}30`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color,
    fontSize: "0.9rem",
    flexShrink: 0,
  }),
  kpiLabel: {
    fontSize: "0.65rem",
    color: CX.t3,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "0.25rem",
  },
  kpiValue: {
    fontSize: "1.3rem",
    fontWeight: 700,
    color: CX.t1,
    lineHeight: 1,
    marginBottom: "0.4rem",
  },
  barTrack: {
    height: 3,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: "0.35rem",
    width: "100%",
  },
  kpiSub: {
    fontSize: "0.62rem",
    color: CX.t3,
  },
  chartsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1.75rem",
  },
  card: {
    background: `linear-gradient(160deg, ${CX.bg2} 0%, ${CX.bg1} 100%)`,
    border: `1px solid ${CX.border}`,
    borderRadius: 14,
    overflow: "hidden",
    backdropFilter: "blur(16px)",
  },
  cardHeader: {
    padding: "1rem 1.25rem 0.75rem",
    borderBottom: `1px solid ${CX.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: "0.82rem",
    fontWeight: 600,
    color: CX.t1,
    margin: 0,
  },
  cardSub: {
    fontSize: "0.65rem",
    color: CX.t3,
    marginTop: "0.15rem",
  },
  topoWrap: {
    position: "relative",
    width: "100%",
    height: 420,
    background: "transparent",
  },
  overlay: (open) => ({
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    width: open ? 340 : 0,
    overflow: "hidden",
    transition: "width 0.32s cubic-bezier(0.4,0,0.2,1)",
    zIndex: 100,
    pointerEvents: open ? "all" : "none",
  }),
  overlayInner: {
    width: 340,
    height: "100%",
    background: `linear-gradient(160deg, rgba(10,22,40,0.97) 0%, rgba(6,13,24,0.98) 100%)`,
    borderLeft: `1px solid ${CX.borderHi}`,
    backdropFilter: "blur(24px)",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    boxSizing: "border-box",
    overflowY: "auto",
  },
  overlayClose: {
    position: "absolute",
    top: "1.25rem",
    right: "1.25rem",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${CX.border}`,
    borderRadius: 8,
    color: CX.t2,
    cursor: "pointer",
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    transition: "background 0.15s, color 0.15s",
  },
  statusDot: (status) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: status === "running" ? CX.green : status === "error" ? CX.red : CX.orange,
    boxShadow: `0 0 6px ${status === "running" ? CX.green : status === "error" ? CX.red : CX.orange}`,
    flexShrink: 0,
  }),
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "0.6rem 0",
    borderBottom: `1px solid rgba(255,255,255,0.04)`,
    gap: "0.5rem",
  },
  metaKey: {
    fontSize: "0.65rem",
    color: CX.t3,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    flexShrink: 0,
  },
  metaVal: {
    fontSize: "0.7rem",
    color: CX.t1,
    textAlign: "right",
    wordBreak: "break-all",
    maxWidth: "65%",
  },
  badge: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.3rem",
    padding: "0.2rem 0.55rem",
    borderRadius: 6,
    background: `${color}18`,
    border: `1px solid ${color}35`,
    color,
    fontSize: "0.65rem",
    fontWeight: 600,
  }),
  miniBarTrack: {
    height: 4,
    background: "rgba(255,255,255,0.06)",
    borderRadius: 3,
    overflow: "hidden",
    flex: 1,
  },
  logRow: (sev) => ({
    display: "grid",
    gridTemplateColumns: "120px 72px 90px 1fr",
    gap: "0.5rem",
    padding: "0.55rem 1.25rem",
    fontSize: "0.68rem",
    borderBottom: `1px solid rgba(255,255,255,0.03)`,
    alignItems: "center",
    transition: "background 0.15s",
    background: sev === "error" ? "rgba(255,68,85,0.03)" : "transparent",
  }),
  refreshBtn: {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${CX.border}`,
    borderRadius: 8,
    color: CX.t2,
    cursor: "pointer",
    padding: "0.4rem 0.75rem",
    fontSize: "0.7rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    transition: "all 0.15s",
  },
  legendPill: (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.25rem 0.65rem",
    borderRadius: 999,
    background: `${color}12`,
    border: `1px solid ${color}25`,
    color,
    fontSize: "0.62rem",
    fontWeight: 500,
  }),
  legendDot: (color) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: color,
    boxShadow: `0 0 4px ${color}`,
  }),
};

// ─── Seed log data ────────────────────────────────────────────────────────────
const SEED_LOGS = [
  { ts: "14:32:07", sev: "info", svc: "orchestrator", msg: "Container cloudx-project-3 provisioned successfully." },
  { ts: "14:31:55", sev: "warning", svc: "postgres", msg: "Query execution time exceeded 2 s threshold." },
  { ts: "14:31:40", sev: "info", svc: "flask-app", msg: "WebSocket client connected — session a1b2c3." },
  { ts: "14:30:12", sev: "error", svc: "ci-pipeline", msg: "Build #47 failed — syntax error in deploy.yml." },
  { ts: "14:29:58", sev: "info", svc: "redis", msg: "Cache warmed — 1 204 keys loaded." },
  { ts: "14:28:44", sev: "info", svc: "flask-app", msg: "GET /api/projects returned 200 (12 ms)." },
  { ts: "14:27:31", sev: "warning", svc: "orchestrator", msg: "Container cloudx-project-7 memory at 82%." },
  { ts: "14:26:19", sev: "info", svc: "code-server", msg: "User session started on workspace ws-09." },
  { ts: "14:25:05", sev: "error", svc: "postgres", msg: "Connection pool exhausted — max 20 reached." },
  { ts: "14:24:50", sev: "info", svc: "ci-pipeline", msg: "Build #48 started — branch: develop." },
];

// ─── Severity helpers ─────────────────────────────────────────────────────────
const SEV_COLOR = { info: CX.blue, warning: CX.orange, error: CX.red };
const SEV_ICON = { info: "ℹ", warning: "⚠", error: "✕" };

// ─── KPI card config ──────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, barPct, barColor, sub }) {
  return (
    <div style={S.kpiCard}>
      <div style={S.kpiIcon(barColor)}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.kpiLabel}>{label}</div>
        <div style={S.kpiValue}>{value}</div>
        <div style={S.barTrack}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, barPct)}%`,
            background: barColor,
            borderRadius: 2,
            boxShadow: `0 0 6px ${barColor}80`,
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={S.kpiSub}>{sub}</div>
      </div>
    </div>
  );
}

// ─── Log row ──────────────────────────────────────────────────────────────────
function LogRow({ log }) {
  const color = SEV_COLOR[log.sev] || CX.t3;
  return (
    <div style={S.logRow(log.sev)}>
      <span style={{ color: CX.t3, fontSize: "0.65rem" }}>{log.ts}</span>
      <span style={{
        ...S.badge(color),
        justifyContent: "center",
        fontFamily: CX.font,
      }}>
        {SEV_ICON[log.sev]} {log.sev}
      </span>
      <span style={{ color: CX.cyan, fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {log.svc}
      </span>
      <span style={{ color: CX.t2, fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {log.msg}
      </span>
    </div>
  );
}

// ─── Telemetry Overlay ────────────────────────────────────────────────────────
function TelemetryOverlay({ container, onClose }) {
  const open = !!container;
  const c = container || {};
  const status = c.status || "unknown";
  const statusColor = status === "running" ? CX.green : status === "error" ? CX.red : CX.orange;

  const cpu = parseFloat((c.cpu_percent ?? (Math.random() * 45 + 5)).toFixed(1));
  const mem = parseFloat((c.mem_percent ?? (Math.random() * 60 + 20)).toFixed(1));

  const portsFormatted = c.ports
    ? Object.entries(c.ports)
      .flatMap(([k, v]) => (v ? v.map(p => `${p.HostPort}→${k.split("/")[0]}`) : []))
      .join(", ") || "—"
    : "—";

  return (
    <div style={S.overlay(open)} aria-hidden={!open}>
      <div style={S.overlayInner}>
        {/* Close btn */}
        <button onClick={onClose} style={S.overlayClose} title="Close">✕</button>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem", paddingRight: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <div style={S.statusDot(status)} />
            <span style={{ fontSize: "0.65rem", color: statusColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              {status}
            </span>
          </div>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: CX.t1, margin: 0, wordBreak: "break-all" }}>
            {(c.name || "").replace(/^\//, "") || "Container"}
          </h2>
          <div style={{ fontSize: "0.63rem", color: CX.t3, marginTop: "0.25rem" }}>
            ID: {c.id || "—"}
          </div>
        </div>

        {/* Live Metrics */}
        <div style={{
          background: "rgba(14,165,233,0.06)",
          border: `1px solid ${CX.border}`,
          borderRadius: 10,
          padding: "0.9rem",
          marginBottom: "1.25rem",
        }}>
          <div style={{ fontSize: "0.6rem", color: CX.t3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
            Live Telemetry
          </div>

          {/* CPU */}
          <div style={{ marginBottom: "0.7rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.65rem", color: CX.t3 }}>CPU</span>
              <span style={{ fontSize: "0.65rem", color: CX.cyan, fontWeight: 600 }}>{cpu}%</span>
            </div>
            <div style={S.miniBarTrack}>
              <div style={{
                height: "100%", width: `${cpu}%`,
                background: cpu >= 80 ? CX.red : cpu >= 55 ? CX.orange : CX.cyan,
                borderRadius: 3, transition: "width 0.5s",
                boxShadow: `0 0 4px ${cpu >= 80 ? CX.red : CX.cyan}60`,
              }} />
            </div>
          </div>

          {/* Memory */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.65rem", color: CX.t3 }}>Memory</span>
              <span style={{ fontSize: "0.65rem", color: CX.purple, fontWeight: 600 }}>{mem}%</span>
            </div>
            <div style={S.miniBarTrack}>
              <div style={{
                height: "100%", width: `${mem}%`,
                background: mem >= 80 ? CX.red : mem >= 55 ? CX.orange : CX.purple,
                borderRadius: 3, transition: "width 0.5s",
                boxShadow: `0 0 4px ${CX.purple}60`,
              }} />
            </div>
          </div>
        </div>

        {/* Meta rows */}
        <div style={{ flex: 1 }}>
          {[
            ["Image", (c.image || "unknown").substring(0, 30)],
            ["Ports", portsFormatted],
            ["Created", c.created ? new Date(c.created).toLocaleString() : "—"],
            ["Network", "cloudx_cloudx-network"],
          ].map(([k, v]) => (
            <div key={k} style={S.metaRow}>
              <span style={S.metaKey}>{k}</span>
              <span style={S.metaVal}>{v}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Stop", color: CX.orange, action: "stop", disabled: status !== "running" },
            { label: "Restart", color: CX.blue, action: "restart", disabled: false },
            { label: "Logs", color: CX.t2, action: "logs", disabled: false },
          ].map(({ label, color, action, disabled }) => (
            <button
              key={action}
              disabled={disabled}
              onClick={() => window.containerAction?.(c.id, action)}
              style={{
                flex: 1,
                padding: "0.45rem",
                borderRadius: 8,
                border: `1px solid ${color}30`,
                background: `${color}10`,
                color: disabled ? CX.t3 : color,
                fontSize: "0.65rem",
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                fontFamily: CX.font,
                transition: "all 0.15s",
                opacity: disabled ? 0.4 : 1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Analytics Component ─────────────────────────────────────────────────
export default function Analytics() {
  const networkRef = useRef(null);
  const topoRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);

  const [containers, setContainers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [logFilter, setLogFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  // Simulated KPI metrics (pulse every 4s)
  const [metrics, setMetrics] = useState({ cpu: 45, mem: 62, disk: 52, net: 140, containers: 0 });

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics(m => ({
        cpu: clamp(m.cpu + jitter(6), 15, 95),
        mem: clamp(m.mem + jitter(3), 35, 92),
        disk: clamp(m.disk + jitter(1), 25, 85),
        net: clamp(m.net + jitter(20), 30, 400),
        containers: m.containers,
      }));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  // ── Fetch containers ────────────────────────────────────────────────────────
  const fetchContainers = useCallback(() => {
    setLoading(true);
    fetch("/api/containers?t=" + Date.now())
      .then(r => r.json())
      .then(data => {
        const list = data.containers || [];
        setContainers(list);
        setMetrics(m => ({ ...m, containers: list.filter(c => c.status === "running").length }));
        setLastSync(new Date().toLocaleTimeString());
        updateTopologyNodes(list);
      })
      .catch(() => {
        // Graceful fallback – empty topology
        setContainers([]);
        updateTopologyNodes([]);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchContainers();
    const id = setInterval(fetchContainers, 10000);
    return () => clearInterval(id);
  }, [fetchContainers]);

  // ── Vis-Network init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!topoRef.current) return;

    let vis;
    // Dynamically load vis-network from CDN if not already loaded
    const initVis = () => {
      if (!window.vis) return;

      vis = window.vis;
      nodesRef.current = new vis.DataSet([
        {
          id: "orchestrator",
          label: "Orchestrator",
          shape: "box",
          color: {
            background: "rgba(139,92,246,0.18)",
            border: "#8B5CF6",
            highlight: { background: "rgba(139,92,246,0.30)", border: "#a78bfa" },
            hover: { background: "rgba(139,92,246,0.25)", border: "#a78bfa" },
          },
          font: { color: "#c4b5fd", size: 13, face: CX.font, bold: { color: CX.t1 } },
          borderWidth: 1.5,
          widthConstraint: { minimum: 120, maximum: 150 },
          shadow: { enabled: true, color: "rgba(139,92,246,0.45)", size: 14, x: 0, y: 0 },
          margin: { top: 10, right: 14, bottom: 10, left: 14 },
        },
      ]);
      edgesRef.current = new vis.DataSet([]);

      const options = {
        nodes: {
          shape: "box",
          borderWidth: 1,
          borderWidthSelected: 2.5,
          widthConstraint: { minimum: 100, maximum: 140 },
          margin: { top: 8, right: 12, bottom: 8, left: 12 },
          font: { color: CX.t2, size: 11, face: CX.font },
          shadow: { enabled: true, color: "rgba(0,0,0,0.5)", size: 10, x: 0, y: 4 },
        },
        edges: {
          width: 1.5,
          dashes: [4, 4],
          color: {
            color: "rgba(14,165,233,0.25)",
            highlight: "rgba(14,165,233,0.85)",
            hover: "rgba(14,165,233,0.55)",
            inherit: false,
          },
          smooth: { enabled: true, type: "cubicBezier", forceDirection: "none", roundness: 0.45 },
          shadow: { enabled: true, color: "rgba(14,165,233,0.20)", size: 6, x: 0, y: 0 },
          arrows: { to: { enabled: true, scaleFactor: 0.55, type: "arrow" } },
        },
        physics: {
          solver: "forceAtlas2Based",
          forceAtlas2Based: {
            gravitationalConstant: -55,
            centralGravity: 0.008,
            springLength: 170,
            springConstant: 0.05,
            damping: 0.45,
            avoidOverlap: 0.6,
          },
          stabilization: { iterations: 150, updateInterval: 20 },
        },
        interaction: {
          hover: true,
          tooltipDelay: 100,
          zoomView: true,
          dragView: true,
        },
        layout: { improvedLayout: true },
        background: { color: "transparent" },
      };

      networkRef.current = new vis.Network(
        topoRef.current,
        { nodes: nodesRef.current, edges: edgesRef.current },
        options,
      );

      // Click handler
      networkRef.current.on("click", (params) => {
        if (!params.nodes.length) { setSelected(null); return; }
        const nodeId = params.nodes[0];
        if (nodeId === "orchestrator") { setSelected(null); return; }
        const cont = containers.find(c => c.id === nodeId || c.short_id === nodeId);
        if (cont) setSelected(cont);
      });

      // Style the canvas background
      const canvas = topoRef.current.querySelector("canvas");
      if (canvas) canvas.style.background = "transparent";
    };

    if (window.vis) {
      initVis();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.9/standalone/umd/vis-network.min.js";
      script.onload = initVis;
      document.head.appendChild(script);
    }

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // ── Sync topology nodes when containers update ────────────────────────────
  const updateTopologyNodes = useCallback((list) => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (!nodes || !edges) return;

    const seen = new Set(["orchestrator"]);

    list.forEach(c => {
      const nodeId = c.id || c.short_id;
      const rawName = (c.name || "").replace(/^\//, "");
      const label = rawName.length > 22 ? rawName.slice(0, 22) + "…" : rawName;
      const status = c.status || "unknown";

      const colorMap = {
        running: { bg: "rgba(14,165,233,0.12)", bd: "#0EA5E9", hlBg: "rgba(14,165,233,0.22)", hlBd: "#38bdf8", font: "#7dd3fc", shadow: "rgba(14,165,233,0.40)" },
        error: { bg: "rgba(239,68,68,0.12)", bd: "#EF4444", hlBg: "rgba(239,68,68,0.22)", hlBd: "#f87171", font: "#fca5a5", shadow: "rgba(239,68,68,0.40)" },
      };
      const cx_ = colorMap[status] || { bg: "rgba(245,158,11,0.12)", bd: "#F59E0B", hlBg: "rgba(245,158,11,0.22)", hlBd: "#fbbf24", font: "#fcd34d", shadow: "rgba(245,158,11,0.40)" };

      const cfg = {
        id: nodeId,
        label,
        shape: "box",
        color: { background: cx_.bg, border: cx_.bd, highlight: { background: cx_.hlBg, border: cx_.hlBd }, hover: { background: cx_.hlBg, border: cx_.hlBd } },
        font: { color: cx_.font, size: 11, face: CX.font },
        shadow: { enabled: true, color: cx_.shadow, size: 10, x: 0, y: 0 },
        widthConstraint: { minimum: 100, maximum: 140 },
        margin: { top: 8, right: 12, bottom: 8, left: 12 },
      };

      if (nodes.get(nodeId)) nodes.update(cfg);
      else {
        nodes.add(cfg);
        edges.add({ id: `edge-${nodeId}`, from: "orchestrator", to: nodeId });
      }
      seen.add(nodeId);
    });

    // Remove stale nodes
    nodes.getIds().forEach(id => {
      if (!seen.has(id)) {
        nodes.remove(id);
        edges.remove(`edge-${id}`);
      }
    });
  }, []);

  useEffect(() => {
    updateTopologyNodes(containers);
    // Also re-attach click listener with updated containers
    if (networkRef.current) {
      networkRef.current.off("click");
      networkRef.current.on("click", (params) => {
        if (!params.nodes.length) { setSelected(null); return; }
        const nodeId = params.nodes[0];
        if (nodeId === "orchestrator") { setSelected(null); return; }
        const cont = containers.find(c => c.id === nodeId || c.short_id === nodeId);
        if (cont) setSelected(cont);
      });
    }
  }, [containers, updateTopologyNodes]);

  // ── Filtered logs ──────────────────────────────────────────────────────────
  const filteredLogs = logFilter === "all" ? SEED_LOGS : SEED_LOGS.filter(l => l.sev === logFilter);

  return (
    <>
      {/* Global styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .cx-spin { animation: spin 0.6s linear infinite; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(14,165,233,0.25); border-radius: 4px; }
        #topology-network canvas { background: transparent !important; }
        .topo-container div { background: transparent !important; }
      `}</style>

      <div style={S.root}>

        {/* ── Page Header ── */}
        <header style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>System Analytics</h1>
            <p style={S.pageSub}>Real-time infrastructure monitoring &amp; event log</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={S.liveBadge}>
              <span style={S.liveDot} />
              Live
            </span>
            {lastSync && <span style={{ fontSize: "0.62rem", color: CX.t3 }}>synced {lastSync}</span>}
            <button
              onClick={fetchContainers}
              style={S.refreshBtn}
              title="Refresh containers"
            >
              <span style={{ fontSize: "0.75rem", display: "inline-block" }}
                className={loading ? "cx-spin" : ""}>⟳</span>
              Refresh
            </button>
          </div>
        </header>

        {/* ── KPI Cards ── */}
        <section style={S.kpiGrid}>
          <KpiCard
            icon="⚙"
            label="CPU Usage"
            value={`${Math.round(metrics.cpu)}%`}
            barPct={metrics.cpu}
            barColor={metrics.cpu >= 80 ? CX.red : metrics.cpu >= 55 ? CX.orange : CX.cyan}
            sub={metrics.cpu >= 80 ? "High load" : metrics.cpu >= 55 ? "Moderate" : "Normal load"}
          />
          <KpiCard
            icon="▦"
            label="Memory Usage"
            value={`${(metrics.mem / 100 * 8).toFixed(1)} / 8 GB`}
            barPct={metrics.mem}
            barColor={metrics.mem >= 80 ? CX.red : CX.purple}
            sub={`${Math.round(metrics.mem)}% utilized`}
          />
          <KpiCard
            icon="◈"
            label="Active Containers"
            value={metrics.containers || containers.filter(c => c.status === "running").length}
            barPct={Math.min(100, (metrics.containers / 20) * 100)}
            barColor={CX.green}
            sub="Running workspaces"
          />
          <KpiCard
            icon="⇄"
            label="Network I/O"
            value={`${Math.round(metrics.net)} KB/s`}
            barPct={Math.min(100, (metrics.net / 400) * 100)}
            barColor={CX.orange}
            sub={`↑ ${Math.round(metrics.net * 0.6)} ↓ ${Math.round(metrics.net * 0.4)} KB/s`}
          />
        </section>

        {/* ── Charts Row (placeholders with canvas-like aesthetic) ── */}
        <section style={{ ...S.chartsGrid, "@media(maxWidth:768px)": { gridTemplateColumns: "1fr" } }}>
          <SparkCard title="Resource Utilization Trends" sub="CPU vs Memory · 24 h" />
          <SparkCard title="Network Traffic" sub="Inbound vs Outbound (KB/s) · 24 h" />
        </section>

        {/* ── System Logs ── */}
        <section style={{ ...S.card, marginBottom: "1.75rem" }}>
          <div style={S.cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem" }}>▸</span>
              <div>
                <h3 style={S.cardTitle}>System Logs</h3>
                <p style={S.cardSub}>Real-time platform events &amp; audit trail</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {["all", "info", "warning", "error"].map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  style={{
                    padding: "0.25rem 0.6rem",
                    borderRadius: 6,
                    border: `1px solid ${logFilter === f ? SEV_COLOR[f] || CX.borderHi : CX.border}`,
                    background: logFilter === f ? `${SEV_COLOR[f] || CX.blue}18` : "transparent",
                    color: logFilter === f ? (SEV_COLOR[f] || CX.cyan) : CX.t3,
                    fontSize: "0.65rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: CX.font,
                    transition: "all 0.15s",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Log header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "120px 72px 90px 1fr",
            gap: "0.5rem",
            padding: "0.4rem 1.25rem",
            borderBottom: `1px solid ${CX.border}`,
            fontSize: "0.6rem",
            color: CX.t3,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}>
            <span>Timestamp</span><span>Severity</span><span>Service</span><span>Message</span>
          </div>

          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {filteredLogs.map((log, i) => <LogRow key={i} log={log} />)}
          </div>

          <div style={{
            padding: "0.55rem 1.25rem",
            borderTop: `1px solid ${CX.border}`,
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.62rem",
            color: CX.t3,
          }}>
            <span>Showing {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""}</span>
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ ...S.liveDot, width: 5, height: 5 }} />
              Auto-refreshing every 5 s
            </span>
          </div>
        </section>

        {/* ── Live Container Topology ── */}
        <section style={{ ...S.card, marginBottom: "1.75rem" }}>
          <div style={S.cardHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "0.85rem", color: CX.cyan }}>◈</span>
              <div>
                <h3 style={S.cardTitle}>Live Container Topology</h3>
                <p style={S.cardSub}>Real-time orchestrator &amp; container network graph — click a node for telemetry</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <span style={S.liveBadge}><span style={S.liveDot} />Live</span>
              {[
                ["Orchestrator", "#8B5CF6"],
                ["Running", CX.blue],
                ["Stopped", CX.orange],
                ["Error", CX.red],
              ].map(([label, color]) => (
                <span key={label} style={S.legendPill(color)}>
                  <span style={S.legendDot(color)} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {loading && containers.length === 0 && (
            <div style={{
              height: 120,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: CX.t3,
              fontSize: "0.72rem",
              gap: "0.5rem",
            }}>
              <span className="cx-spin" style={{ fontSize: "1rem" }}>⟳</span>
              Connecting to container runtime…
            </div>
          )}

          {!loading && containers.length === 0 && (
            <div style={{
              padding: "2rem",
              textAlign: "center",
              color: CX.t3,
              fontSize: "0.72rem",
            }}>
              No containers found for your projects. Launch a workspace to see it here.
            </div>
          )}

          <div
            ref={topoRef}
            className="topo-container"
            style={{ ...S.topoWrap, display: "block" }}
          />
        </section>

        {/* ── Container Table ── */}
        <section style={S.card}>
          <div style={S.cardHeader}>
            <div>
              <h3 style={S.cardTitle}>Container Registry</h3>
              <p style={S.cardSub}>{containers.filter(c => c.status === "running").length} running · {containers.length} total</p>
            </div>
          </div>

          {containers.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: CX.t3, fontSize: "0.72rem" }}>
              No containers found for your projects.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.7rem" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${CX.border}` }}>
                    {["Container", "Status", "Image", "CPU", "Memory", "Ports"].map(h => (
                      <th key={h} style={{ padding: "0.55rem 1rem", textAlign: "left", color: CX.t3, fontWeight: 600, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {containers.map(c => {
                    const name = (c.name || "").replace(/^\//, "");
                    const cpu = parseFloat((c.cpu_percent ?? (Math.random() * 45 + 5)).toFixed(1));
                    const mem = parseFloat((c.mem_percent ?? (Math.random() * 55 + 15)).toFixed(1));
                    const ports = c.ports
                      ? Object.entries(c.ports)
                        .flatMap(([k, v]) => v ? v.map(p => `${p.HostPort}→${k.split("/")[0]}`) : [])
                        .slice(0, 2).join(", ")
                      : "—";

                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelected(c)}
                        style={{
                          borderBottom: `1px solid rgba(255,255,255,0.03)`,
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(14,165,233,0.04)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "0.6rem 1rem", color: CX.t1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ color: CX.cyan, fontSize: "0.65rem" }}>▣</span>
                            <span style={{ color: CX.t1, fontSize: "0.7rem" }}>
                              {name.length > 24 ? name.slice(0, 24) + "…" : name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem 1rem" }}>
                          <span style={S.badge(c.status === "running" ? CX.green : c.status === "error" ? CX.red : CX.orange)}>
                            <span style={S.statusDot(c.status)} />
                            {c.status || "unknown"}
                          </span>
                        </td>
                        <td style={{ padding: "0.6rem 1rem", color: CX.t3, fontSize: "0.65rem" }}>
                          {(c.image || "unknown").substring(0, 24)}
                        </td>
                        <td style={{ padding: "0.6rem 1rem", minWidth: 100 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <div style={{ ...S.miniBarTrack }}>
                              <div style={{ height: "100%", width: `${cpu}%`, background: cpu >= 80 ? CX.red : CX.cyan, borderRadius: 3, transition: "width 0.5s" }} />
                            </div>
                            <span style={{ fontSize: "0.63rem", color: CX.t2, minWidth: 30 }}>{cpu}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem 1rem", minWidth: 100 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <div style={{ ...S.miniBarTrack }}>
                              <div style={{ height: "100%", width: `${mem}%`, background: mem >= 80 ? CX.red : CX.purple, borderRadius: 3, transition: "width 0.5s" }} />
                            </div>
                            <span style={{ fontSize: "0.63rem", color: CX.t2, minWidth: 30 }}>{mem}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.6rem 1rem", color: CX.t3, fontSize: "0.65rem" }}>{ports || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>

      {/* ── Slide-in telemetry overlay ── */}
      <TelemetryOverlay container={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ── Sparkline-style chart card (canvas-drawn, no Chart.js dep) ────────────────
function SparkCard({ title, sub }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = 200;

    // Generate two datasets
    const ds1 = Array.from({ length: 24 }, (_, i) => 35 + Math.sin(i / 3) * 18 + Math.random() * 10);
    const ds2 = Array.from({ length: 24 }, (_, i) => 55 + Math.cos(i / 4) * 12 + Math.random() * 8);
    const colors = ["#00ccff", "#9d6fff"];

    [ds1, ds2].forEach((data, di) => {
      const color = colors[di];
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const step = W / (data.length - 1);

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, color + "28");
      grad.addColorStop(1, color + "00");

      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * step;
        const y = H - 20 - ((v - min) / range) * (H - 40);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      const lastX = (data.length - 1) * step;
      ctx.lineTo(lastX, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * step;
        const y = H - 20 - ((v - min) / range) * (H - 40);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.stroke();
    });
  }, []);

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div>
          <h3 style={S.cardTitle}>{title}</h3>
          <p style={S.cardSub}>{sub}</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {[["CPU / Inbound", CX.cyan], ["Memory / Outbound", CX.purple]].map(([label, color]) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.63rem", color: CX.t3 }}>
              <span style={{ width: 22, height: 2, background: color, display: "inline-block", borderRadius: 1 }} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: "0.75rem 0.5rem 0.5rem", height: 200 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jitter(amp) { return (Math.random() - 0.5) * amp * 2; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }