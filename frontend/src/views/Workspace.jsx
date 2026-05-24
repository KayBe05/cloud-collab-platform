import { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { io } from "socket.io-client";


const XTERM_THEME = {
  background: "transparent",
  foreground: "#dbeaff",
  cursor: "#00ccff",
  cursorAccent: "#060b12",
  selectionBackground: "rgba(0,204,255,0.18)",
  selectionForeground: "#dbeaff",
  black: "#0d1117",
  red: "#ef4444",
  green: "#00e87a",
  yellow: "#f59e0b",
  blue: "#3b82f6",
  magenta: "#8b5cf6",
  cyan: "#00ccff",
  white: "#dbeaff",
  brightBlack: "#4b5563",
  brightRed: "#f87171",
  brightGreen: "#34d399",
  brightYellow: "#fbbf24",
  brightBlue: "#60a5fa",
  brightMagenta: "#a78bfa",
  brightCyan: "#67e8f9",
  brightWhite: "#f0f9ff",
};

const DEFAULT_FILES = ["main.py", "index.js", "README.md"];

const LANG_MAP = {
  py: "python", js: "javascript", ts: "typescript",
  jsx: "javascript", tsx: "typescript", html: "html",
  css: "css", json: "json", yml: "yaml", yaml: "yaml",
  md: "markdown", sh: "shell", rs: "rust", go: "go",
  rb: "ruby", java: "java", cpp: "cpp", c: "c",
  txt: "plaintext", env: "shell", sql: "sql", xml: "xml",
};

function getLanguage(filename = "") {
  if (filename === "Dockerfile") return "dockerfile";
  const ext = filename.split(".").pop().toLowerCase();
  return LANG_MAP[ext] ?? "plaintext";
}

function getFileIcon(filename = "") {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    py: { icon: "🐍", color: "#3572A5" },
    js: { icon: "JS", color: "#f1e05a" },
    ts: { icon: "TS", color: "#3178c6" },
    jsx: { icon: "⚛", color: "#61dafb" },
    tsx: { icon: "⚛", color: "#61dafb" },
    html: { icon: "<>", color: "#e34c26" },
    css: { icon: "🎨", color: "#563d7c" },
    json: { icon: "{}", color: "#cbcb41" },
    yml: { icon: "⚙", color: "#ff7c42" },
    yaml: { icon: "⚙", color: "#ff7c42" },
    md: { icon: "✍", color: "#7b9db8" },
    sh: { icon: "$_", color: "#4eaa25" },
    sql: { icon: "DB", color: "#e38c00" },
  };
  if (filename === "Dockerfile") return { icon: "🐳", color: "#2496ed" };
  if (filename === ".env") return { icon: "🔒", color: "#00e87a" };
  return map[ext] ?? { icon: "📄", color: "#7b9db8" };
}

function StatusDot({ connected }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: connected ? "#00e87a" : "#ef4444",
        boxShadow: connected ? "0 0 6px #00e87a" : "0 0 6px #ef4444",
      }}
    />
  );
}

function Toolbar({ projectName, connected, onToggleAI, aiOpen, onSave, saving }) {
  return (
    <div
      className="flex items-center gap-2 px-3 flex-shrink-0 border-b"
      style={{
        height: 44,
        background: "rgba(6,11,18,0.95)",
        borderColor: "rgba(0,204,255,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <a
        href="/"
        className="flex items-center gap-1.5 pr-3 mr-1 font-black text-sm no-underline border-r"
        style={{ color: "#00ccff", borderColor: "rgba(0,204,255,0.2)", fontFamily: "'Syne', sans-serif" }}
      >
        ☁ CloudX
      </a>

      <div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border"
        style={{
          fontFamily: "monospace",
          background: "rgba(255,255,255,0.04)",
          borderColor: "rgba(255,255,255,0.08)",
          color: "#7b9db8",
        }}
      >
        <span style={{ color: "#00ccff" }}>📁</span>
        <span>{projectName}</span>
      </div>

      <div
        className="w-px h-5 mx-1 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />

      <div className="flex items-center gap-1.5 text-xs" style={{ fontFamily: "monospace", color: "#7b9db8" }}>
        <StatusDot connected={connected} />
        <span>{connected ? "Connected" : "Disconnected"}</span>
      </div>

      <div className="flex-1" />

      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border transition-all"
        style={{
          background: "rgba(0,204,255,0.08)",
          borderColor: "rgba(0,204,255,0.25)",
          color: "#00ccff",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "⏳ Saving…" : "💾 Save"}
      </button>

      <button
        onClick={onToggleAI}
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border transition-all"
        style={{
          background: aiOpen ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
          borderColor: aiOpen ? "rgba(139,92,246,0.35)" : "rgba(255,255,255,0.08)",
          color: aiOpen ? "#a78bfa" : "#7b9db8",
          cursor: "pointer",
        }}
      >
        🤖 AI
      </button>

      <a
        href="/dashboard"
        className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border no-underline transition-all"
        style={{
          background: "rgba(0,204,255,0.08)",
          borderColor: "rgba(0,204,255,0.2)",
          color: "#00ccff",
        }}
      >
        📊 Dashboard
      </a>
    </div>
  );
}

function FileTree({ files, activeFile, onSelectFile }) {
  return (
    <div
      className="flex flex-col flex-shrink-0 border-r overflow-y-auto"
      style={{
        width: 220,
        background: "rgba(6,11,18,0.8)",
        borderColor: "rgba(0,204,255,0.1)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b text-xs font-bold uppercase tracking-widest"
        style={{ color: "#3d5475", borderColor: "rgba(255,255,255,0.06)" }}
      >
        Explorer
      </div>

      <div className="py-1">
        <div
          className="px-3 py-1 text-xs uppercase tracking-widest flex items-center gap-1"
          style={{ color: "#3d5475" }}
        >
          <span style={{ fontSize: "0.6rem" }}>▼</span> Workspace
        </div>

        {files.map((f) => {
          const { icon, color } = getFileIcon(f);
          const isActive = f === activeFile;
          return (
            <button
              key={f}
              onClick={() => onSelectFile(f)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-all"
              style={{
                background: isActive ? "rgba(0,204,255,0.08)" : "transparent",
                color: isActive ? "#dbeaff" : "#7b9db8",
                borderLeft: isActive ? "2px solid #00ccff" : "2px solid transparent",
                fontFamily: "monospace",
                cursor: "pointer",
                border: "none",
                paddingLeft: isActive ? "calc(0.75rem - 2px)" : "0.75rem",
              }}
            >
              <span style={{ color, fontSize: "0.65rem", minWidth: 16, textAlign: "center" }}>
                {icon}
              </span>
              {f}
            </button>
          );
        })}
      </div>
    </div>
  );
}


function useTerminal({ mountRef, containerId, socketRef }) {
  const termRef = useRef(null);
  const fitAddonRef = useRef(null);
  const outputListenerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const BANNER = (term) => {
    term.writeln("\x1b[1;36m ██████╗██╗      ██████╗ ██╗   ██╗██████╗  \x1b[0m");
    term.writeln("\x1b[1;36m██╔════╝██║     ██╔═══██╗██║   ██║██╔══██╗ \x1b[0m");
    term.writeln("\x1b[1;36m██║     ██║     ██║   ██║██║   ██║██║  ██║ \x1b[0m");
    term.writeln("\x1b[1;36m╚██████╗███████╗╚██████╔╝╚██████╔╝██████╔╝ \x1b[0m");
    term.writeln("\x1b[1;36m ╚═════╝╚══════╝ ╚═════╝  ╚═════╝ ╚═════╝ \x1b[0m");
    term.writeln("");
    term.writeln("\x1b[2mCloudX Workspace Terminal\x1b[0m");
    term.writeln(`\x1b[2m${new Date().toLocaleString()}\x1b[0m`);
    term.writeln("");
  };

  useEffect(() => {
    if (!mountRef.current) return;

    let destroyed = false;

    // Dynamically import xterm (so bundle stays optional)
    Promise.all([
      import("@xterm/xterm"),
      import("@xterm/addon-fit"),
    ]).then(([{ Terminal }, { FitAddon }]) => {
      if (destroyed || !mountRef.current) return;

      const term = new Terminal({
        theme: XTERM_THEME,
        fontFamily: '"JetBrains Mono","DM Mono","Cascadia Code",monospace',
        fontSize: 13,
        lineHeight: 1.45,
        cursorBlink: true,
        cursorStyle: "bar",
        scrollback: 8000,
        convertEol: true,
        cols: 120,
        rows: 30,
        smoothScrollDuration: 125,
        allowProposedApi: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(mountRef.current);
      setTimeout(() => { try { fitAddon.fit(); } catch (_) { } }, 50);

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      BANNER(term);

      // Keyboard → socket
      term.onData((data) => {
        socketRef.current?.emit("terminal_input", { input: data });
      });

      // Paste support
      term.attachCustomKeyEventHandler((event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "v") {
          navigator.clipboard?.readText().then((text) => {
            if (text) socketRef.current?.emit("terminal_input", { input: text });
          }).catch(() => { });
          return false;
        }
        return true;
      });

      // Resize observer
      if (window.ResizeObserver && mountRef.current) {
        const ro = new ResizeObserver(() => {
          requestAnimationFrame(() => { try { fitAddon.fit(); } catch (_) { } });
        });
        ro.observe(mountRef.current);
        resizeObserverRef.current = ro;
      }

      // Connect terminal to container via socket
      if (containerId && socketRef.current) {
        term.writeln(`\x1b[33m⟳ Connecting to container \x1b[1m${containerId}\x1b[0m\x1b[33m…\x1b[0m`);
        socketRef.current.emit("terminal_join", { container_id: containerId });

        const listener = (data) => {
          const text = typeof data === "string" ? data : (data.output ?? "");
          if (text) term.write(text);
        };
        outputListenerRef.current = listener;
        socketRef.current.on("terminal_output", listener);
        term.writeln("\x1b[32m✓ Terminal attached — type to interact\x1b[0m\r\n");
      }
    }).catch((err) => {
      console.error("[Terminal] Failed to load xterm:", err);
    });

    return () => {
      destroyed = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (outputListenerRef.current && socketRef.current) {
        socketRef.current.off("terminal_output", outputListenerRef.current);
        outputListenerRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [mountRef, containerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const clear = useCallback(() => termRef.current?.clear(), []);
  const fit = useCallback(() => { try { fitAddonRef.current?.fit(); } catch (_) { } }, []);

  return { clear, fit };
}

function AIPanel({ editorContent, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "👋 Ready to help with your code! Enable **Include current file** to share the editor content with me.",
      isMarkdown: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [useContext, setUseContext] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const q = query.trim();
    if (!q || loading) return;

    const ts = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text: q, time: ts }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_query: q,
          code_context: useContext ? (editorContent ?? "") : "",
        }),
      });
      const data = await res.json();
      const replyTs = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.success ? data.suggestion : `⚠️ ${data.error || "Error"}`,
          isMarkdown: true,
          time: replyTs,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠️ Network error: ${e.message}`, time: "—" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col border-l flex-shrink-0"
      style={{
        width: 360,
        background: "rgba(6,11,18,0.9)",
        borderColor: "rgba(139,92,246,0.2)",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: "rgba(139,92,246,0.15)" }}
      >
        <span style={{ fontSize: "1.1rem" }}>🤖</span>
        <div className="flex-1">
          <div className="text-xs font-bold" style={{ color: "#a78bfa" }}>AI Assistant</div>
          <div className="text-xs" style={{ color: "#4b5563", fontFamily: "monospace" }}>Gemini · context-aware</div>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-1.5 py-0.5 rounded transition-all"
          style={{ color: "#4b5563", cursor: "pointer", background: "transparent", border: "none" }}
        >
          ✕
        </button>
      </div>

      {/* Context toggle */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-xs" style={{ color: "#7b9db8" }}>📎 Include current file</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only"
            checked={useContext}
            onChange={(e) => setUseContext(e.target.checked)}
          />
          <div
            className="w-8 h-4 rounded-full transition-all relative"
            style={{
              background: useContext ? "rgba(0,204,255,0.4)" : "rgba(255,255,255,0.1)",
              border: useContext ? "1px solid rgba(0,204,255,0.6)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
              style={{
                left: useContext ? "calc(100% - 14px)" : "2px",
                background: useContext ? "#00ccff" : "#4b5563",
              }}
            />
          </div>
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ minHeight: 0 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className="px-3 py-2 rounded-lg text-xs max-w-[90%]"
              style={{
                background:
                  msg.role === "user"
                    ? "rgba(0,204,255,0.12)"
                    : "rgba(255,255,255,0.05)",
                border:
                  msg.role === "user"
                    ? "1px solid rgba(0,204,255,0.2)"
                    : "1px solid rgba(255,255,255,0.06)",
                color: "#dbeaff",
                fontFamily: "monospace",
                lineHeight: 1.6,
                wordBreak: "break-word",
              }}
            >
              {msg.isMarkdown ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: typeof marked !== "undefined"
                      ? marked.parse(msg.text)
                      : msg.text.replace(/\n/g, "<br>"),
                  }}
                  style={{ lineHeight: 1.6 }}
                />
              ) : (
                msg.text
              )}
            </div>
            <span className="text-xs mt-0.5 px-1" style={{ color: "#3d5475" }}>{msg.time}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div
              className="px-3 py-2 rounded-lg text-xs"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#7b9db8",
              }}
            >
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "120ms" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "240ms" }}>●</span>
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="p-3 border-t flex-shrink-0"
        style={{ borderColor: "rgba(139,92,246,0.15)" }}
      >
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder="Ask about your code…"
          rows={3}
          className="w-full rounded text-xs p-2 resize-none outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#dbeaff",
            fontFamily: "monospace",
            lineHeight: 1.5,
          }}
        />
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-xs" style={{ color: "#3d5475" }}>Enter to send · Shift+Enter for newline</span>
          <button
            onClick={send}
            disabled={loading || !query.trim()}
            className="px-3 py-1 rounded text-xs font-bold transition-all"
            style={{
              background: "rgba(139,92,246,0.25)",
              border: "1px solid rgba(139,92,246,0.4)",
              color: "#a78bfa",
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            Send ✈
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Workspace() {
  // URL params
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("project") || "";
  const containerId = params.get("container") || "";

  // State
  const [projectName, setProjectName] = useState("Loading…");
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeFile, setActiveFile] = useState("main.py");
  const [fileContent, setFileContent] = useState("# Loading…");
  const [editorContent, setEditorContent] = useState("# Loading…");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [aiOpen, setAiOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(240);
  const [isTermMaximised, setIsTermMaximised] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const termMountRef = useRef(null);
  const dragRef = useRef(null);

  // ── Socket.IO setup ────────────────────────────────────────
  useEffect(() => {
    const sock = io({
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    sock.on("connect", () => setSocketConnected(true));
    sock.on("disconnect", () => setSocketConnected(false));

    socketRef.current = sock;

    return () => {
      sock.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Project name ───────────────────────────────────────────
  useEffect(() => {
    if (!projectId) { setProjectName("Untitled Workspace"); return; }
    fetch("/api/projects?limit=100")
      .then((r) => r.json())
      .then((d) => {
        const p = (d.data || []).find((x) => String(x.id) === projectId);
        setProjectName(p ? p.name : `Project ${projectId}`);
      })
      .catch(() => setProjectName(`Project ${projectId}`));
  }, [projectId]);

  // ── Load file on selection ─────────────────────────────────
  useEffect(() => {
    if (!projectId) {
      setFileContent(`# Select a project to load files.\n`);
      setEditorContent(`# Select a project to load files.\n`);
      return;
    }
    fetch(`/api/workspace/${projectId}/files?path=${encodeURIComponent(activeFile)}`)
      .then((r) => r.json())
      .then((d) => {
        const content = d.content ?? `# Could not load ${activeFile}`;
        setFileContent(content);
        setEditorContent(content);
      })
      .catch(() => {
        const fallback = `# Failed to fetch ${activeFile}`;
        setFileContent(fallback);
        setEditorContent(fallback);
      });
  }, [activeFile, projectId]);

  // ── Save (Ctrl+S) handler ──────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!projectId || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/workspace/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: activeFile, content: editorContent }),
      });
      const data = await res.json();
      setSaveMsg(data.success ? "✓ Saved" : `✗ ${data.error}`);
    } catch (e) {
      setSaveMsg(`✗ ${e.message}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  }, [projectId, activeFile, editorContent, saving]);

  // Global Ctrl+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  // ── Terminal ───────────────────────────────────────────────
  const { clear: clearTerm, fit: fitTerm } = useTerminal({
    mountRef: termMountRef,
    containerId,
    socketRef,
  });

  // Re-fit terminal when height changes
  useEffect(() => { fitTerm(); }, [terminalHeight, fitTerm]);

  // ── Vertical drag resize (editor ↔ terminal) ───────────────
  const startTermResize = useCallback((e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = terminalHeight;

    const onMove = (ev) => {
      const delta = startY - ev.clientY;
      setTerminalHeight(Math.max(80, Math.min(600, startH + delta)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      fitTerm();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [terminalHeight, fitTerm]);


  const termH = isTermMaximised ? "calc(100% - 44px)" : terminalHeight;

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        background: "#060b12",
        color: "#dbeaff",
        fontFamily: "'JetBrains Mono', monospace",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <Toolbar
        projectName={projectName}
        connected={socketConnected}
        onToggleAI={() => setAiOpen((v) => !v)}
        aiOpen={aiOpen}
        onSave={handleSave}
        saving={saving}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* File tree */}
        <FileTree
          files={DEFAULT_FILES}
          activeFile={activeFile}
          onSelectFile={setActiveFile}
        />

        {/* Center: editor + terminal */}
        <div className="flex flex-col flex-1 min-w-0" style={{ minHeight: 0 }}>
          {/* Monaco editor */}
          <div
            className="flex-1 relative"
            style={{ minHeight: 0, background: "#060b12" }}
          >
            <Editor
              key={activeFile}
              language={getLanguage(activeFile)}
              theme="vs-dark"
              value={fileContent}
              onChange={(val) => setEditorContent(val ?? "")}
              options={{
                fontFamily: '"JetBrains Mono","DM Mono",monospace',
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                cursorBlinking: "phase",
                cursorSmoothCaretAnimation: "on",
                smoothScrolling: true,
                folding: true,
                bracketPairColorization: { enabled: true },
                tabSize: 4,
                renderLineHighlight: "gutter",
                automaticLayout: true,
              }}
            />

            {/* Save notification */}
            {saveMsg && (
              <div
                className="absolute bottom-3 right-4 px-3 py-1.5 rounded text-xs font-bold"
                style={{
                  background: saveMsg.startsWith("✓")
                    ? "rgba(0,232,122,0.15)"
                    : "rgba(239,68,68,0.15)",
                  border: `1px solid ${saveMsg.startsWith("✓") ? "rgba(0,232,122,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: saveMsg.startsWith("✓") ? "#00e87a" : "#ef4444",
                }}
              >
                {saveMsg}
              </div>
            )}
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={startTermResize}
            className="flex-shrink-0 flex items-center justify-center cursor-ns-resize transition-all group"
            style={{
              height: 6,
              background: "rgba(0,204,255,0.06)",
              borderTop: "1px solid rgba(0,204,255,0.1)",
              borderBottom: "1px solid rgba(0,204,255,0.1)",
            }}
          >
            <div
              className="w-8 h-0.5 rounded-full transition-all group-hover:w-16"
              style={{ background: "rgba(0,204,255,0.3)" }}
            />
          </div>

          {/* Terminal */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              height: termH,
              background: "rgba(6,11,18,0.85)",
              backdropFilter: "blur(12px)",
              borderTop: "1px solid rgba(0,204,255,0.08)",
            }}
          >
            {/* Terminal header */}
            <div
              className="flex items-center gap-2 px-3 flex-shrink-0 border-b"
              style={{
                height: 32,
                background: "rgba(0,0,0,0.2)",
                borderColor: "rgba(0,204,255,0.08)",
              }}
            >
              <span style={{ color: "#00ccff", fontSize: "0.7rem" }}>⬛</span>
              <span className="text-xs font-bold" style={{ color: "#7b9db8" }}>Terminal</span>
              {containerId && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "rgba(0,204,255,0.08)",
                    color: "#00ccff",
                    fontFamily: "monospace",
                    fontSize: "0.65rem",
                  }}
                >
                  {containerId}
                </span>
              )}
              <div className="flex-1" />
              <button
                onClick={clearTerm}
                title="Clear terminal"
                className="text-xs px-2 py-0.5 rounded transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#7b9db8",
                  cursor: "pointer",
                }}
              >
                🗑 Clear
              </button>
              <button
                onClick={() => {
                  setIsTermMaximised((v) => !v);
                  setTimeout(fitTerm, 100);
                }}
                title={isTermMaximised ? "Restore" : "Maximise"}
                className="text-xs px-2 py-0.5 rounded transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#7b9db8",
                  cursor: "pointer",
                }}
              >
                {isTermMaximised ? "⊡" : "⊞"}
              </button>
            </div>

            {/* xterm.js mount */}
            <div
              ref={termMountRef}
              className="flex-1 overflow-hidden"
              style={{ padding: "2px 4px", background: "transparent" }}
            />
          </div>
        </div>

        {/* AI panel */}
        {aiOpen && (
          <AIPanel
            editorContent={editorContent}
            onClose={() => setAiOpen(false)}
          />
        )}
      </div>
    </div>
  );
}