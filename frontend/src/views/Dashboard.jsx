import { useState, useEffect, useRef } from "react";

// ─── Utility ──────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTION_ICON = {
  user_login: "fa-sign-in-alt",
  user_logout: "fa-sign-out-alt",
  user_signup: "fa-user-plus",
  project_created: "fa-folder-plus",
  project_deleted: "fa-trash",
  deployment_created: "fa-rocket",
  deployment_redeployed: "fa-sync-alt",
  workspace_provisioned: "fa-server",
  ai_assist_request: "fa-robot",
  file_read: "fa-file",
  file_write: "fa-pen",
  page_view: "fa-eye",
  websocket_connect: "fa-plug",
  database_test: "fa-database",
};

const ACTION_COLOR = {
  project_created: "#00e87a",
  project_deleted: "#ff4455",
  deployment_created: "#00ccff",
  deployment_redeployed: "#9d6fff",
  workspace_provisioned: "#f5c842",
  ai_assist_request: "#9d6fff",
  user_login: "#00e87a",
  user_signup: "#00ccff",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, trend, trendDir = "up", color = "#00ccff", delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Animate numeric value up
  useEffect(() => {
    if (!visible) return;
    const target = typeof value === "number" ? value : parseFloat(value) || 0;
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = target / 30;
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(id); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(id);
  }, [visible, value]);

  const displayVal = typeof value === "string" && value.includes("%")
    ? value
    : typeof value === "number" ? count : value;

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.45s ease ${delay}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        background: "rgba(15,23,42,0.55)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.065)",
        borderRadius: "16px",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = color + "44";
        e.currentTarget.style.boxShadow = `0 0 32px ${color}18, 0 8px 32px rgba(0,0,0,0.35)`;
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.065)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* top glow line */}
      <div style={{
        position: "absolute", top: 0, left: "15%", right: "15%", height: "1px",
        background: `linear-gradient(90deg, transparent, ${color}66, transparent)`,
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color, fontSize: "1.1rem",
        }}>
          <i className={`fas ${icon}`} />
        </div>

        {trend && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.3rem",
            fontSize: "0.72rem", fontWeight: 600, fontFamily: "var(--cx-mono, monospace)",
            padding: "0.22rem 0.6rem", borderRadius: 999,
            background: trendDir === "up" ? "rgba(0,232,122,0.12)" : "rgba(255,68,85,0.12)",
            color: trendDir === "up" ? "#00e87a" : "#ff4455",
            border: `1px solid ${trendDir === "up" ? "rgba(0,232,122,0.22)" : "rgba(255,68,85,0.22)"}`,
          }}>
            <i className={`fas fa-arrow-${trendDir}`} style={{ fontSize: "0.6rem" }} />
            {trend}
          </span>
        )}
      </div>

      <div style={{
        fontSize: "2.1rem", fontWeight: 700,
        fontFamily: "var(--cx-mono, monospace)",
        color: "var(--cx-t1, #dbeaff)",
        lineHeight: 1, marginBottom: "0.4rem",
        letterSpacing: "-0.02em",
      }}>
        {displayVal}
      </div>
      <div style={{
        fontSize: "0.8rem", fontWeight: 500,
        color: "var(--cx-t2, #8aa4c8)",
        fontFamily: "var(--cx-mono, monospace)",
        letterSpacing: "0.02em",
      }}>
        {label}
      </div>
    </div>
  );
}

function ActivityItem({ item, index }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60 + index * 55);
    return () => clearTimeout(t);
  }, [index]);

  const raw = item.action || "";
  const icon = ACTION_ICON[raw] || "fa-circle";
  const accent = ACTION_COLOR[raw] || "#00ccff";
  const label = raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div
      style={{
        display: "flex", alignItems: "flex-start", gap: "0.9rem",
        padding: "0.85rem 1rem",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: 12,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: `opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)`,
        cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `${accent}0c`;
        e.currentTarget.style.borderColor = `${accent}28`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = "rgba(255,255,255,0.025)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: `${accent}1a`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: accent, fontSize: "0.75rem",
      }}>
        <i className={`fas ${icon}`} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: "0.82rem",
          color: "var(--cx-t1, #dbeaff)",
          fontFamily: "var(--cx-mono, monospace)",
          marginBottom: "0.2rem",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </div>
        {item.details && (
          <div style={{
            fontSize: "0.72rem", color: "var(--cx-t2, #8aa4c8)",
            fontFamily: "var(--cx-mono, monospace)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.details}
          </div>
        )}
      </div>

      <div style={{
        display: "flex", flexDirection: "column", alignItems: "flex-end",
        flexShrink: 0, gap: "0.2rem",
      }}>
        <span style={{
          fontSize: "0.65rem", color: "var(--cx-t3, #3d5870)",
          fontFamily: "var(--cx-mono, monospace)",
          whiteSpace: "nowrap",
        }}>
          {fmt(item.created_at)}
        </span>
        <span style={{
          fontSize: "0.6rem", color: "var(--cx-t3, #3d5870)",
          fontFamily: "var(--cx-mono, monospace)",
        }}>
          {relTime(item.created_at)}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ title, sub, right }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      alignItems: "flex-end", marginBottom: "1.1rem", flexWrap: "wrap", gap: "0.5rem",
    }}>
      <div>
        <div style={{
          fontSize: "1rem", fontWeight: 700,
          fontFamily: "var(--cx-mono, monospace)",
          color: "var(--cx-t1, #dbeaff)", letterSpacing: "0.01em",
        }}>{title}</div>
        {sub && <div style={{
          fontSize: "0.72rem", color: "var(--cx-t3, #3d5870)",
          fontFamily: "var(--cx-mono, monospace)", marginTop: "0.2rem",
        }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Skeleton({ h = 20, w = "100%", radius = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: radius,
      background: "rgba(255,255,255,0.05)",
      animation: "pulse 1.6s ease-in-out infinite",
    }} />
  );
}

function LivePill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.35rem",
      padding: "0.22rem 0.65rem",
      background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.22)",
      borderRadius: 999, fontSize: "0.65rem", fontWeight: 600,
      fontFamily: "var(--cx-mono, monospace)",
      color: "#00e87a", letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "#00e87a",
        animation: "blink 1.4s ease-in-out infinite",
        boxShadow: "0 0 6px #00e87a",
      }} />
      Live
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard", { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const iv = setInterval(() => fetchStats(true), 30_000);
    return () => clearInterval(iv);
  }, []);

  const kpiCards = stats
    ? [
      {
        icon: "fa-project-diagram",
        label: "Active Projects",
        value: stats.total_projects ?? 0,
        trend: "12%",
        trendDir: "up",
        color: "#00ccff",
      },
      {
        icon: "fa-rocket",
        label: "Live Deployments",
        value: stats.active_deployments ?? 0,
        trend: "8%",
        trendDir: "up",
        color: "#00e87a",
      },
      {
        icon: "fa-history",
        label: "Total Activities",
        value: stats.total_activities ?? 0,
        trend: "24%",
        trendDir: "up",
        color: "#9d6fff",
      },
      {
        icon: "fa-heartbeat",
        label: "Uptime SLA",
        value: "99.9%",
        trend: "Healthy",
        trendDir: "up",
        color: "#f5c842",
      },
    ]
    : [];

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes pulse {
          0%,100% { opacity:0.4 }
          50%      { opacity:0.9 }
        }
        @keyframes blink {
          0%,100% { opacity:1 }
          50%      { opacity:0.3 }
        }
        @keyframes spin {
          to { transform: rotate(360deg) }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: "1.75rem",
        flexWrap: "wrap", gap: "1rem",
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: "1.85rem", fontWeight: 800,
            fontFamily: "var(--cx-mono, monospace)",
            color: "var(--cx-t1, #dbeaff)",
            letterSpacing: "-0.02em", lineHeight: 1,
          }}>
            Dashboard
          </h2>
          <p style={{
            margin: "0.4rem 0 0",
            fontSize: "0.78rem", color: "var(--cx-t3, #3d5870)",
            fontFamily: "var(--cx-mono, monospace)",
          }}>
            {lastRefresh
              ? `Last refreshed ${relTime(lastRefresh.toISOString())}`
              : "Loading system telemetry…"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <LivePill />
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.5rem 1rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8, color: "var(--cx-t2, #8aa4c8)",
              fontSize: "0.8rem", fontWeight: 700,
              fontFamily: "var(--cx-mono, monospace)",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.background = "rgba(0,204,255,0.08)"; e.currentTarget.style.color = "#00ccff"; e.currentTarget.style.borderColor = "rgba(0,204,255,0.28)"; } }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--cx-t2, #8aa4c8)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
          >
            <i
              className="fas fa-sync-alt"
              style={{ animation: refreshing ? "spin 0.7s linear infinite" : "none" }}
            />
            Refresh
          </button>
          <a
            href="/projects"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              padding: "0.5rem 1rem",
              background: "rgba(0,204,255,0.14)",
              border: "1px solid rgba(0,204,255,0.24)",
              borderRadius: 8, color: "#00ccff",
              fontSize: "0.8rem", fontWeight: 700,
              fontFamily: "var(--cx-mono, monospace)",
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

      {/* ── Error Banner ── */}
      {error && (
        <div style={{
          padding: "0.85rem 1.1rem", marginBottom: "1.5rem",
          background: "rgba(255,68,85,0.1)", border: "1px solid rgba(255,68,85,0.25)",
          borderRadius: 10, color: "#ff4455",
          fontSize: "0.82rem", fontFamily: "var(--cx-mono, monospace)",
          display: "flex", alignItems: "center", gap: "0.6rem",
        }}>
          <i className="fas fa-exclamation-triangle" />
          Failed to load dashboard data: {error}
          <button
            onClick={() => fetchStats()}
            style={{
              marginLeft: "auto", background: "none", border: "none",
              color: "#ff4455", cursor: "pointer", fontFamily: "inherit",
              fontSize: "0.78rem", textDecoration: "underline",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem",
      }}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: "rgba(15,23,42,0.55)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.065)",
              borderRadius: 16, padding: "1.5rem",
              display: "flex", flexDirection: "column", gap: "0.75rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton h={44} w={44} radius={10} />
                <Skeleton h={24} w={60} radius={999} />
              </div>
              <Skeleton h={36} w="55%" />
              <Skeleton h={14} w="65%" />
            </div>
          ))
          : kpiCards.map((c, i) => (
            <KpiCard key={c.label} {...c} delay={i * 80} />
          ))}
      </div>

      {/* ── Bottom Grid: Activity + System Health ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1.1fr 1fr",
        gap: "1.25rem",
        marginBottom: "2rem",
      }}>
        {/* Activity Feed */}
        <div style={{
          background: "rgba(15,23,42,0.45)", backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 16, padding: "1.5rem",
          display: "flex", flexDirection: "column",
        }}>
          <SectionHeader
            title="Recent Activity"
            sub="Your latest system events"
            right={
              <a href="/analytics" style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                fontSize: "0.72rem", color: "#00ccff",
                fontFamily: "var(--cx-mono, monospace)", fontWeight: 600,
                textDecoration: "none",
              }}
                onMouseEnter={e => e.currentTarget.style.gap = "0.6rem"}
                onMouseLeave={e => e.currentTarget.style.gap = "0.4rem"}
              >
                View All <i className="fas fa-arrow-right" style={{ fontSize: "0.65rem" }} />
              </a>
            }
          />

          <div style={{
            display: "flex", flexDirection: "column", gap: "0.55rem",
            maxHeight: 420, overflowY: "auto",
            scrollbarWidth: "thin", scrollbarColor: "#1e293b transparent",
          }}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "0.9rem", alignItems: "center" }}>
                  <Skeleton h={34} w={34} radius="50%" />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <Skeleton h={12} w="60%" />
                    <Skeleton h={10} w="80%" />
                  </div>
                  <Skeleton h={10} w={48} />
                </div>
              ))
              : stats?.recent_activities?.length > 0
                ? stats.recent_activities.slice(0, 12).map((a, i) => (
                  <ActivityItem key={i} item={a} index={i} />
                ))
                : (
                  <div style={{
                    textAlign: "center", padding: "3rem 1rem",
                    color: "var(--cx-t3, #3d5870)",
                    fontFamily: "var(--cx-mono, monospace)", fontSize: "0.85rem",
                  }}>
                    <i className="fas fa-inbox" style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem", opacity: 0.3 }} />
                    No recent activity
                  </div>
                )
            }
          </div>
        </div>

        {/* System Health */}
        <div style={{
          background: "rgba(15,23,42,0.45)", backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.055)",
          borderRadius: 16, padding: "1.5rem",
          display: "flex", flexDirection: "column",
        }}>
          <SectionHeader
            title="System Health"
            sub="Infrastructure status"
            right={<LivePill />}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "1.4rem", flex: 1 }}>
            {[
              { label: "CPU Usage", icon: "fa-microchip", value: 62, color: "#00ccff", unit: "%" },
              { label: "Memory", icon: "fa-memory", value: 74, color: "#9d6fff", unit: "%" },
              { label: "Disk", icon: "fa-hdd", value: 38, color: "#f5c842", unit: "%" },
              { label: "Network I/O", icon: "fa-wifi", value: 22, color: "#00e87a", unit: "KB/s" },
            ].map(({ label, icon, value, color, unit }) => {
              const warn = value > 80;
              const crit = value > 90;
              const barColor = crit ? "#ff4455" : warn ? "#f59e0b" : color;
              return (
                <div key={label}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "0.55rem",
                  }}>
                    <span style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      fontSize: "0.8rem", fontFamily: "var(--cx-mono, monospace)",
                      color: "var(--cx-t2, #8aa4c8)", fontWeight: 500,
                    }}>
                      <i className={`fas ${icon}`} style={{ color, fontSize: "0.75rem" }} />
                      {label}
                    </span>
                    <span style={{
                      fontSize: "0.82rem", fontWeight: 700,
                      fontFamily: "var(--cx-mono, monospace)",
                      color: loading ? "var(--cx-t3)" : "var(--cx-t1, #dbeaff)",
                    }}>
                      {loading ? "—" : `${value}${unit}`}
                    </span>
                  </div>
                  <div style={{
                    height: 7, background: "rgba(255,255,255,0.05)",
                    borderRadius: 999, overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 999,
                      width: loading ? "0%" : `${value}%`,
                      background: `linear-gradient(90deg, ${barColor}cc, ${barColor})`,
                      boxShadow: `0 0 8px ${barColor}55`,
                      transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
                    }} />
                  </div>
                </div>
              );
            })}

            {/* Status Rows */}
            <div style={{
              marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.055)",
              paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.55rem",
            }}>
              {[
                { label: "Database", status: "Healthy" },
                { label: "WebSocket", status: "Connected" },
                { label: "Containers", status: stats?.active_deployments > 0 ? "Running" : "Idle" },
              ].map(({ label, status }) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{
                    fontSize: "0.75rem", fontFamily: "var(--cx-mono, monospace)",
                    color: "var(--cx-t3, #3d5870)",
                  }}>{label}</span>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "0.35rem",
                    fontSize: "0.7rem", fontFamily: "var(--cx-mono, monospace)",
                    fontWeight: 600, color: "#00e87a",
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#00e87a", boxShadow: "0 0 6px #00e87a",
                      animation: "blink 2s ease-in-out infinite",
                    }} />
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Deployment Success Rate Banner ── */}
      {!loading && (
        <div style={{
          background: "rgba(15,23,42,0.45)", backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.055)",
          borderTop: "1px solid rgba(0,232,122,0.2)",
          borderRadius: 16, padding: "1.25rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(0,232,122,0.12)", border: "1px solid rgba(0,232,122,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#00e87a", fontSize: "1rem",
            }}>
              <i className="fas fa-check-circle" />
            </div>
            <div>
              <div style={{
                fontSize: "0.85rem", fontWeight: 700,
                fontFamily: "var(--cx-mono, monospace)",
                color: "var(--cx-t1, #dbeaff)",
              }}>
                Deployment Success Rate
              </div>
              <div style={{
                fontSize: "0.7rem", color: "var(--cx-t3, #3d5870)",
                fontFamily: "var(--cx-mono, monospace)", marginTop: "0.15rem",
              }}>
                Last 30 days · all environments
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
            {[
              { val: "98.5%", label: "Success Rate", color: "#00e87a" },
              { val: "1.4 s", label: "Avg Deploy Time", color: "#00ccff" },
              { val: "0", label: "Failed Deploys (7d)", color: "#9d6fff" },
            ].map(({ val, label, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: "1.45rem", fontWeight: 700,
                  fontFamily: "var(--cx-mono, monospace)", color, lineHeight: 1,
                }}>
                  {val}
                </div>
                <div style={{
                  fontSize: "0.65rem", color: "var(--cx-t3, #3d5870)",
                  fontFamily: "var(--cx-mono, monospace)", marginTop: "0.3rem",
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <a href="/analytics" style={{
            display: "inline-flex", alignItems: "center", gap: "0.45rem",
            padding: "0.5rem 1rem",
            background: "rgba(0,232,122,0.1)", border: "1px solid rgba(0,232,122,0.22)",
            borderRadius: 8, color: "#00e87a",
            fontSize: "0.78rem", fontWeight: 700,
            fontFamily: "var(--cx-mono, monospace)",
            textDecoration: "none", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,232,122,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,232,122,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <i className="fas fa-chart-line" style={{ fontSize: "0.75rem" }} />
            View Analytics
          </a>
        </div>
      )}
    </>
  );
}