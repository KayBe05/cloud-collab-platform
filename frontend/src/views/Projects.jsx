import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen, Plus, Rocket, Trash2, GitBranch, Calendar,
  Clock, Tag, X, Loader2, History, ChevronRight, Home,
  ExternalLink, AlertTriangle, CheckCircle2, Globe, Code2
} from "lucide-react";

const STATUS_CONFIG = {
  active: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.22)" },
  running: { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.22)" },
  building: { bg: "rgba(0,204,255,0.10)", color: "#38bdf8", border: "rgba(0,204,255,0.20)" },
  pending: { bg: "rgba(0,204,255,0.10)", color: "#38bdf8", border: "rgba(0,204,255,0.20)" },
  failed: { bg: "rgba(239,68,68,0.10)", color: "#f87171", border: "rgba(239,68,68,0.20)" },
  inactive: { bg: "rgba(100,116,139,0.10)", color: "#94a3b8", border: "rgba(100,116,139,0.20)" },
};

function StatusDot({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? STATUS_CONFIG.inactive;
  const isPulsing = ["active", "running", "building", "pending"].includes(status?.toLowerCase());
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.45rem",
      padding: "0.28rem 0.75rem", borderRadius: "999px", fontSize: "0.7rem",
      fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}`,
        animation: isPulsing ? "cx-blink 2s ease-in-out infinite" : "none",
      }} />
      {status ?? "unknown"}
    </span>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", top: "1.25rem", right: "1.25rem", zIndex: 10000, display: "flex", flexDirection: "column", gap: "0.6rem", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: "0.875rem",
          padding: "0.875rem 1rem",
          background: "rgba(10,18,32,0.92)",
          backdropFilter: "blur(18px)",
          border: `1px solid ${t.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          borderLeft: `3px solid ${t.type === "success" ? "var(--success,#10b981)" : "var(--error,#ef4444)"}`,
          borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          minWidth: 280, pointerEvents: "auto",
          animation: "toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {t.type === "success"
            ? <CheckCircle2 size={18} style={{ color: "#10b981", flexShrink: 0 }} />
            : <AlertTriangle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />}
          <span style={{ fontSize: "0.875rem", color: "#dbeaff", fontWeight: 500, flex: 1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      background: "rgba(5,11,20,0.75)", backdropFilter: "blur(5px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "90%", maxWidth: 420,
        background: "rgba(15,23,42,0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontWeight: 700, color: "#dbeaff", fontSize: "0.95rem" }}>{title}</span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#3d5870", cursor: "pointer", padding: 4 }}><X size={16} /></button>
        </div>
        <div style={{ padding: "1.5rem", color: "#7b9db8", fontSize: "0.9rem", lineHeight: 1.65 }}>{message}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1rem 1.5rem", background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={onCancel} style={{
            padding: "0.55rem 1.2rem", borderRadius: 8,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#7b9db8", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "0.55rem 1.2rem", borderRadius: 8,
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600,
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function NewProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", repository_url: "", tags: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => { setForm({ name: "", description: "", repository_url: "", tags: "" }); setErr(""); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setErr("Project name is required."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), description: form.description.trim(), repository_url: form.repository_url.trim(), tags: form.tags.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to create project");
      reset();
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const inputStyle = {
    width: "100%", padding: "0.875rem 1rem",
    background: "rgba(8,14,28,0.6)", border: "1.5px solid rgba(255,255,255,0.08)",
    borderRadius: 10, color: "#dbeaff", fontSize: "0.9rem",
    fontFamily: "inherit", outline: "none", transition: "border-color 0.2s",
    boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#7b9db8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "0.5rem" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(5,11,20,0.82)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 520,
        background: "linear-gradient(145deg, rgba(17,30,46,0.98) 0%, rgba(12,22,36,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 20,
        boxShadow: "0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,204,255,0.05)",
        overflow: "hidden",
        animation: "slideUpModal 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1.5rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "linear-gradient(to bottom, rgba(0,204,255,0.04), transparent)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, rgba(0,204,255,0.18), rgba(157,111,255,0.12))",
              border: "1px solid rgba(0,204,255,0.2)", borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Plus size={18} style={{ color: "#00ccff" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontWeight: 700, color: "#dbeaff", fontSize: "0.95rem" }}>New Project</div>
              <div style={{ fontSize: "0.65rem", color: "#3d5870", letterSpacing: "0.03em" }}>Deploy to CloudX Platform</div>
            </div>
          </div>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "#3d5870", cursor: "pointer", padding: 4, borderRadius: 6, transition: "color 0.15s" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.75rem 2rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={labelStyle}>Project Name <span style={{ color: "#f87171" }}>*</span></label>
            <input style={inputStyle} placeholder="my-awesome-project" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(0,204,255,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,204,255,0.07)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label style={labelStyle}>Repository URL</label>
            <input style={inputStyle} placeholder="https://github.com/username/repo" value={form.repository_url}
              onChange={e => setForm(p => ({ ...p, repository_url: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(0,204,255,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,204,255,0.07)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label style={labelStyle}>Tags / Framework</label>
            <input style={inputStyle} placeholder="nodejs, react, python…" value={form.tags}
              onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(0,204,255,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,204,255,0.07)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder="A brief description of your project…" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onFocus={e => { e.target.style.borderColor = "rgba(0,204,255,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,204,255,0.07)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }} />
          </div>
          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#f87171", fontSize: "0.825rem", padding: "0.6rem 0.875rem", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
              <AlertTriangle size={14} /> {err}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", padding: "1.25rem 2rem", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.18)" }}>
          <button onClick={handleClose} style={{
            padding: "0.65rem 1.4rem", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#7b9db8", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem", fontFamily: "inherit",
            transition: "all 0.15s",
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: "0.65rem 1.6rem", borderRadius: 10,
            background: loading ? "rgba(0,204,255,0.12)" : "rgba(0,204,255,0.18)",
            border: "1px solid rgba(0,204,255,0.28)",
            color: "#00ccff", cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "0.875rem", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: "0.5rem",
            transition: "all 0.15s", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} /> : <Rocket size={15} />}
            {loading ? "Creating…" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete, onLaunched, onHistory }) {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [connDetails, setConnDetails] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/launch`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Launch failed");
      setConnDetails(data.connection);
      setLaunched(true);
      onLaunched("success", `Workspace for "${project.name}" is live!`);
      setTimeout(() => navigate(`/workspace?project=${project.id}`), 1400);
    } catch (e) {
      onLaunched("error", e.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Delete failed");
      onDelete(project.id);
    } catch (e) {
      onLaunched("error", e.message);
      setDeleting(false);
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{
      position: "relative",
      background: "rgba(15,23,42,0.45)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 20,
      padding: "1.75rem",
      boxShadow: "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)",
      transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s, box-shadow 0.3s",
      overflow: "hidden",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.borderColor = "rgba(0,204,255,0.22)";
        e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.36), 0 0 0 1px rgba(0,204,255,0.1), inset 0 1px 0 rgba(255,255,255,0.07)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)";
      }}>

      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(0,204,255,0.03) 0%, transparent 65%)", pointerEvents: "none", borderRadius: 20 }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.875rem", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
            <FolderOpen size={18} style={{ color: "#0ea5e9", flexShrink: 0 }} />
            <span style={{
              fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", fontWeight: 700,
              fontSize: "1.1rem", color: "#dbeaff", letterSpacing: "-0.3px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{project.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <StatusDot status={project.status} />
            {project.tags && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.25rem 0.65rem", borderRadius: "999px",
                background: "rgba(14,165,233,0.1)", color: "#38bdf8",
                border: "1px solid rgba(14,165,233,0.2)", fontSize: "0.68rem", fontWeight: 600,
              }}>
                <Code2 size={10} />{project.tags}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: 8,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(148,163,184,0.5)", cursor: deleting ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", opacity: deleting ? 0.4 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; e.currentTarget.style.color = "#f87171"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "rgba(148,163,184,0.5)"; }}
        >
          {deleting ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} /> : <Trash2 size={13} />}
        </button>
      </div>

      <p style={{
        color: "rgba(148,163,184,0.72)", fontSize: "0.875rem", lineHeight: 1.65,
        marginBottom: "1.125rem", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        minHeight: "2.8rem",
      }}>{project.description || "No description provided"}</p>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem", marginBottom: "1.25rem",
        padding: "1rem 1.125rem",
        background: "rgba(8,14,28,0.5)", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.65rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: "0.3rem" }}>
            <GitBranch size={10} /> Repository
          </div>
          <div style={{ fontSize: "0.78rem", color: "#dbeaff", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", wordBreak: "break-all", lineHeight: 1.4 }}>
            {project.repository_url
              ? project.repository_url.replace("https://github.com/", "").replace("https://gitlab.com/", "")
              : "Not set"}
          </div>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.65rem", color: "rgba(148,163,184,0.7)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700, marginBottom: "0.3rem" }}>
            <Calendar size={10} /> Created
          </div>
          <div style={{ fontSize: "0.78rem", color: "#dbeaff", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)" }}>
            {fmtDate(project.created_at)}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", paddingTop: "1.125rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <button
          onClick={() => onHistory(project.id)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            padding: "0.7rem 1rem", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#7b9db8", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", fontFamily: "inherit",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#dbeaff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#7b9db8"; }}
        >
          <History size={14} /> History
        </button>

        <button
          onClick={handleLaunch}
          disabled={launching || launched}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            padding: "0.7rem 1rem", borderRadius: 10,
            background: launched ? "rgba(16,185,129,0.12)" : "rgba(0,204,255,0.14)",
            border: launched ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(0,204,255,0.25)",
            color: launched ? "#34d399" : "#00ccff",
            cursor: (launching || launched) ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "0.8rem", fontFamily: "inherit",
            transition: "all 0.15s",
            opacity: (launching || launched) ? 0.85 : 1,
          }}
        >
          {launching
            ? <><Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Launching…</>
            : launched
              ? <><CheckCircle2 size={14} /> Redirecting…</>
              : <><Rocket size={14} /> Launch</>}
        </button>
      </div>

      {connDetails && (
        <div style={{
          marginTop: "1rem", padding: "1.125rem",
          background: "rgba(8,14,28,0.55)", backdropFilter: "blur(10px)",
          borderRadius: 12, border: "1px solid rgba(0,204,255,0.15)",
          animation: "slideDown 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Globe size={14} style={{ color: "#38bdf8" }} />
            <span style={{ fontWeight: 700, color: "#dbeaff", fontSize: "0.875rem" }}>Connection Details</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <a href={connDetails.web_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                padding: "0.6rem 1rem", borderRadius: 8,
                background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.25)",
                color: "#38bdf8", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600,
              }}>
              <ExternalLink size={13} /> Open Web IDE
            </a>
            <div style={{ fontSize: "0.75rem", color: "#7b9db8" }}>
              Password: <code style={{ color: "#fbbf24", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", marginLeft: 4 }}>{connDetails.password}</code>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.7rem", color: "rgba(100,116,139,0.7)" }}>
        <Clock size={11} />
        <span>Updated {fmtDate(project.updated_at)}</span>
      </div>
    </div>
  );
}

function DeploymentHistoryModal({ projectId, open, onClose }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redeploying, setRedeploying] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    setLoading(true);
    fetch(`/api/projects/${projectId}/deployments`)
      .then(r => r.json())
      .then(d => setDeployments(d.success ? d.deployments : []))
      .catch(() => setDeployments([]))
      .finally(() => setLoading(false));
  }, [open, projectId]);

  const handleRedeploy = async () => {
    setRedeploying(true);
    await new Promise(r => setTimeout(r, 1500));
    try {
      const res = await fetch("/api/deployments/redeploy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId }) });
      const data = await res.json();
      if (data.success) {
        const res2 = await fetch(`/api/projects/${projectId}/deployments`);
        const d2 = await res2.json();
        setDeployments(d2.success ? d2.deployments : []);
      }
    } finally {
      setRedeploying(false);
    }
  };

  const fmtAgo = (iso) => {
    if (!iso) return "N/A";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${d}d ago`;
  };

  const fmtDuration = (ms) => {
    if (!ms) return "N/A";
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9997,
      background: "rgba(5,11,20,0.82)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 660,
        background: "rgba(15,23,42,0.97)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", maxHeight: "80vh",
        overflow: "hidden",
        animation: "slideUpModal 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <History size={20} style={{ color: "#0ea5e9" }} />
            <span style={{ fontWeight: 700, color: "#dbeaff", fontSize: "1.1rem", letterSpacing: "-0.3px" }}>Deployment History</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#3d5870", cursor: "pointer", padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ padding: "1.25rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
          <button onClick={handleRedeploy} disabled={redeploying} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            padding: "0.875rem", borderRadius: 12,
            background: "linear-gradient(135deg, #0ea5e9, #06b6d4)",
            border: "none", color: "white", cursor: redeploying ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
            opacity: redeploying ? 0.7 : 1, transition: "all 0.2s",
          }}>
            {redeploying ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Building…</> : <><Rocket size={16} /> Redeploy Now</>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#3d5870" }}>
              <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite", marginBottom: "0.75rem" }} />
              <p style={{ margin: 0, fontSize: "0.9rem" }}>Loading deployments…</p>
            </div>
          ) : deployments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "#3d5870" }}>
              <History size={36} style={{ opacity: 0.3, marginBottom: "0.875rem" }} />
              <p style={{ margin: 0, fontSize: "0.9rem" }}>No deployments yet. Hit Redeploy to create one!</p>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: "1.75rem" }}>
              <div style={{ position: "absolute", left: "0.45rem", top: "0.5rem", bottom: "0.5rem", width: 2, background: "linear-gradient(180deg, rgba(0,204,255,0.6) 0%, rgba(14,165,233,0.15) 60%, transparent 100%)", borderRadius: 2 }} />
              {deployments.map((d, i) => {
                const statusCfg = STATUS_CONFIG[d.status?.toLowerCase()] ?? STATUS_CONFIG.inactive;
                return (
                  <div key={d.id} style={{ position: "relative", padding: "1.25rem 0", borderBottom: i < deployments.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "grid", gridTemplateColumns: "72px 1fr", gap: "1rem" }}>
                    <div style={{ position: "absolute", left: "-1.4rem", top: "1.75rem", width: 13, height: 13, borderRadius: "50%", background: statusCfg.color, border: "2.5px solid rgba(15,23,42,0.9)", boxShadow: `0 0 0 3px ${statusCfg.bg}, 0 0 10px ${statusCfg.color}`, zIndex: 1 }} />
                    <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(148,163,184,0.55)", textTransform: "uppercase", letterSpacing: "0.5px", paddingTop: "0.2rem", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", whiteSpace: "nowrap" }}>
                      {fmtAgo(d.deployed_at)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, color: "#dbeaff", fontSize: "0.95rem", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)" }}>{d.version || "v-unknown"}</span>
                        <span style={{ padding: "0.28rem 0.7rem", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>{d.status}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                        {[["Commit", (d.commit_hash || "N/A").substring(0, 8)], ["Env", d.environment || "production"], ["By", d.deployed_by || "system"], ["Duration", fmtDuration(d.duration_ms)]].map(([label, val]) => (
                          <div key={label}>
                            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#3d5870", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.2rem" }}>{label}</div>
                            <div style={{ fontSize: "0.8rem", color: "#dbeaff", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)", background: "rgba(8,14,28,0.5)", padding: "0.2rem 0.45rem", borderRadius: 5, border: "1px solid rgba(255,255,255,0.05)", display: "inline-block" }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [historyProject, setHistoryProject] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null, name: "" });

  const addToast = useCallback((type, msg) => {
    const id = Date.now();
    setToasts(p => [...p, { id, type, msg }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?limit=50");
      const data = await res.json();
      setProjects(data.data ?? []);
    } catch {
      addToast("error", "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const requestDelete = (id, name) => setConfirm({ open: true, id, name });

  const confirmDelete = () => {
    const { id, name } = confirm;
    setConfirm({ open: false, id: null, name: "" });
    setProjects(p => p.filter(x => x.id !== id));
    addToast("success", `"${name}" deleted.`);
  };

  return (
    <>
      <style>{`
        @keyframes cx-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slideUpModal { from{opacity:0;transform:translateY(36px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastSlideIn { from{opacity:0;transform:translateX(110%) scale(0.92)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
      `}</style>

      <Toast toasts={toasts} />

      <ConfirmModal
        open={confirm.open}
        title="Delete Project"
        message={`Are you sure you want to delete "${confirm.name}"? This will permanently remove the project and all its deployments.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm({ open: false, id: null, name: "" })}
      />

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => { setShowNew(false); addToast("success", "Project created!"); fetchProjects(); }}
      />

      <DeploymentHistoryModal
        projectId={historyProject}
        open={historyProject !== null}
        onClose={() => setHistoryProject(null)}
      />

      <div style={{ minHeight: "100vh", background: "var(--bg-secondary, #0f172a)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "2rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem", fontSize: "0.78rem", color: "#3d5870", fontFamily: "var(--cx-mono,'JetBrains Mono',monospace)" }}>
            <Home size={13} style={{ color: "#00ccff" }} />
            <ChevronRight size={11} />
            <span style={{ color: "#7b9db8" }}>Projects</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "2.25rem", fontWeight: 800, color: "#dbeaff", letterSpacing: "-1px", lineHeight: 1 }}>My Projects</h2>
              <p style={{ margin: "0.5rem 0 0", color: "#7b9db8", fontSize: "1rem" }}>Manage and deploy your cloud applications with ease</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem 1.5rem", borderRadius: 12,
                background: "rgba(0,204,255,0.16)", border: "1px solid rgba(0,204,255,0.28)",
                color: "#00ccff", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(0,204,255,0.15)",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,204,255,0.22)"; e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,204,255,0.25)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,204,255,0.16)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,204,255,0.15)"; }}
            >
              <Plus size={16} /> New Project
            </button>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 280, borderRadius: 20,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%)",
                  backgroundSize: "400px 100%",
                  animation: "shimmer 1.6s ease-in-out infinite",
                  border: "1px solid rgba(255,255,255,0.05)",
                }} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "5rem 2rem",
              background: "rgba(15,23,42,0.4)", backdropFilter: "blur(12px)",
              border: "2px dashed rgba(255,255,255,0.07)", borderRadius: 24,
              animation: "fadeInUp 0.5s ease-out",
            }}>
              <div style={{
                width: 100, height: 100, margin: "0 auto 1.75rem",
                background: "linear-gradient(135deg, rgba(14,165,233,0.1), rgba(6,182,212,0.08))",
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FolderOpen size={44} style={{ color: "#0ea5e9", opacity: 0.7 }} />
              </div>
              <h3 style={{ margin: "0 0 0.75rem", color: "#dbeaff", fontSize: "1.65rem", fontWeight: 700 }}>No projects yet</h3>
              <p style={{ color: "#7b9db8", fontSize: "1rem", maxWidth: 460, margin: "0 auto 2rem", lineHeight: 1.65 }}>
                Create your first project to start building and deploying your applications on CloudX Platform.
              </p>
              <button onClick={() => setShowNew(true)} style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.875rem 2rem", borderRadius: 12,
                background: "rgba(0,204,255,0.16)", border: "1px solid rgba(0,204,255,0.28)",
                color: "#00ccff", cursor: "pointer", fontWeight: 700, fontSize: "1rem", fontFamily: "inherit",
              }}>
                <Plus size={18} /> Create Your First Project
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
              {projects.map((p, i) => (
                <div key={p.id} style={{ animation: `fadeInUp 0.45s ease-out ${i * 0.06}s both` }}>
                  <ProjectCard
                    project={p}
                    onDelete={(id) => { requestDelete(id, p.name); }}
                    onLaunched={(type, msg) => addToast(type, msg)}
                    onHistory={(id) => setHistoryProject(id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}