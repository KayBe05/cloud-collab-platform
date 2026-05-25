import { useState, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Code2,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Home,
  Zap,
  Bot,
  X,
  Menu,
} from "lucide-react";

import Workspace from "./views/Workspace";
import Analytics from "./views/Analytics";
import Login from "./views/auth/Login";
import Signup from "./views/auth/Signup";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", to: "/", icon: LayoutDashboard, end: true },
      { label: "Projects", to: "/projects", icon: FolderKanban },
      { label: "Analytics", to: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Developer",
    items: [
      { label: "Workspace", to: "/workspace?project=demo", icon: Code2, badge: "NEW" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-[1099] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          width: "var(--sidebar-width)",
          background: "var(--glass-sidebar)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid var(--border-color)",
          transform: open ? "translateX(0)" : "translateX(calc(-1 * var(--sidebar-width)))",
          transition: "transform 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.32s ease",
          boxShadow: open ? "4px 0 32px rgba(0,0,0,0.4)" : "none",
        }}
        className="fixed left-0 top-0 h-full flex flex-col z-[1100]"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 p-5"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              boxShadow: "0 4px 12px rgba(14,165,233,0.3)",
            }}
          >
            <Zap size={22} color="#fff" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-bold" style={{ color: "var(--cx-t1)", fontFamily: "var(--font-display)", letterSpacing: "0.5px" }}>
              CloudX
            </span>
            <span className="text-xs mt-0.5" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-mono)" }}>
              Control Plane v2
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 flex flex-col gap-7">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-0.5">
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2 px-3"
                style={{ color: "var(--cx-t2)", fontFamily: "var(--font-mono)" }}
              >
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "text-[color:var(--ai-cyan)] bg-[rgba(0,204,255,0.08)]"
                        : "text-[color:var(--cx-t2)] hover:text-[color:var(--cx-t1)] hover:bg-[rgba(0,204,255,0.05)]",
                    ].join(" ")
                  }
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: "var(--primary)", color: "#fff", fontFamily: "var(--font-mono)" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer — system status */}
        <div className="p-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "var(--success)", boxShadow: "0 0 8px var(--success)", animation: "cx-blink 2s ease-in-out infinite" }}
              />
              <div className="flex flex-col flex-1 leading-none gap-0.5">
                <span className="text-xs" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-mono)" }}>
                  System Status
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--cx-t1)" }}>
                  All Systems Normal
                </span>
              </div>
            </div>
          </div>
          <p className="text-center text-xs" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-mono)" }}>
            CloudX Platform © 2025
          </p>
        </div>
      </aside>
    </>
  );
}

function TopHeader({ sidebarOpen, onToggleSidebar, breadcrumb }) {
  return (
    <header
      style={{
        height: "var(--header-height)",
        background: "var(--glass-header)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.35)",
      }}
      className="sticky top-0 z-[200] flex items-center justify-between px-6"
    >
      {/* Left */}
      <div className="flex items-center gap-5">
        {/* Hamburger */}
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation"
          className={[
            "flex flex-col justify-center items-center gap-[5px] w-[38px] h-[38px] p-1.5 flex-shrink-0",
            "rounded-lg cursor-pointer transition-all duration-150",
            "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]",
            "hover:bg-[rgba(0,204,255,0.08)] hover:border-[rgba(0,204,255,0.3)]",
          ].join(" ")}
        >
          {sidebarOpen
            ? <X size={16} color="var(--ai-cyan)" />
            : <Menu size={16} color="var(--cx-t2)" />
          }
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm" style={{ fontFamily: "var(--font-mono)", color: "var(--cx-t2)" }}>
          <Home size={13} color="var(--ai-cyan)" />
          {breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5">
              <ChevronRight size={11} color="var(--cx-t3)" />
              <span style={{ color: i === breadcrumb.length - 1 ? "var(--cx-t1)" : "var(--cx-t2)" }}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl w-72 transition-all duration-150"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search size={14} color="var(--cx-t3)" />
          <input
            type="text"
            placeholder="Search anything..."
            className="flex-1 border-none bg-transparent outline-none text-sm"
            style={{ color: "var(--cx-t1)", fontFamily: "var(--font-mono)" }}
          />
        </div>

        {/* Connection pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium"
          style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "var(--success)" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)", animation: "cx-blink 2s ease-in-out infinite" }} />
          Connected
        </div>

        {/* Notifications */}
        <button
          className="relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--cx-t2)" }}
        >
          <Bell size={16} />
          <span
            className="absolute -top-1 -right-1 text-white text-xs min-w-[18px] text-center rounded-full px-1 font-semibold"
            style={{ background: "var(--error)", fontSize: "0.65rem" }}
          >
            3
          </span>
        </button>

        {/* AI button */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150"
          style={{ background: "var(--cyan-mid)", border: "1px solid rgba(0,204,255,0.22)", color: "var(--ai-cyan)", fontFamily: "var(--font-mono)" }}
        >
          <Bot size={15} />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>
    </header>
  );
}

function AppLayout({ children, breadcrumb }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cx-0)" }}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* Main column — shifts right on large screens when sidebar open */}
      <div
        className="flex flex-col flex-1 min-w-0 transition-[margin] duration-300"
        style={{ marginLeft: sidebarOpen ? "var(--sidebar-width)" : 0 }}
      >
        <TopHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={toggleSidebar}
          breadcrumb={breadcrumb}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}


function PageShell({ title, icon: Icon, color = "var(--ai-cyan)", children }) {
  return (
    <div className="p-6 max-w-[1600px] mx-auto w-full">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `rgba(0,204,255,0.08)`, border: `1px solid rgba(0,204,255,0.18)` }}
        >
          <Icon size={22} color={color} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold leading-tight"
            style={{ color: "var(--cx-t1)", fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-mono)" }}>
            CloudX Platform
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Reusable "under construction" card */
function WipCard({ label }) {
  return (
    <div
      className="cx-card cx-card-shimmer rounded-2xl p-12 flex flex-col items-center justify-center gap-4 text-center"
      style={{ minHeight: "480px" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
        style={{ background: "rgba(0,204,255,0.06)", border: "1px solid rgba(0,204,255,0.15)" }}
      >
        🚧
      </div>
      <h2
        className="text-xl font-bold"
        style={{ color: "var(--cx-t1)", fontFamily: "var(--font-display)" }}
      >
        {label}
      </h2>
      <p className="text-sm max-w-sm" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-mono)", lineHeight: 1.7 }}>
        This view is being built. Drop in your components here — the layout, routing, and design tokens are all wired up.
      </p>
      <div className="cx-live-badge mt-2">
        <span className="cx-live-dot" />
        Route active
      </div>
    </div>
  );
}

/* ── Dashboard ── */
function DashboardPage() {
  return (
    <AppLayout breadcrumb={["Dashboard"]}>
      <PageShell title="Dashboard" icon={LayoutDashboard}>
        {/* Quick-stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active Projects", value: "12", color: "var(--primary)", bg: "rgba(14,165,233,0.1)" },
            { label: "Running Deploys", value: "3", color: "var(--cx-green)", bg: "rgba(0,232,122,0.1)" },
            { label: "Total Requests", value: "84k", color: "var(--cx-purple)", bg: "rgba(157,111,255,0.1)" },
            { label: "Error Rate", value: "0.2%", color: "var(--warning)", bg: "rgba(245,158,11,0.1)" },
          ].map((s) => (
            <div
              key={s.label}
              className="cx-card rounded-2xl p-5 flex flex-col gap-1.5"
            >
              <span className="text-3xl font-bold" style={{ color: s.color, fontFamily: "var(--font-mono)" }}>
                {s.value}
              </span>
              <span className="text-xs" style={{ color: "var(--cx-t2)", fontFamily: "var(--font-mono)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <WipCard label="Dashboard Widgets" />
      </PageShell>
    </AppLayout>
  );
}

/* ── Projects ── */
function ProjectsPage() {
  return (
    <AppLayout breadcrumb={["Projects"]}>
      <PageShell title="Projects" icon={FolderKanban}>
        <WipCard label="Projects Grid" />
      </PageShell>
    </AppLayout>
  );
}

/* ── Analytics ── */
function AnalyticsPage() {
  return (
    <AppLayout breadcrumb={["Analytics"]}>
      {/* Rendering the new component directly inside the layout wrapper */}
      <Analytics />
    </AppLayout>
  );
}

/* ── 404 ── */
function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <AppLayout breadcrumb={["404"]}>
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center p-6">
        <p className="text-8xl font-black" style={{ color: "var(--cx-t3)", fontFamily: "var(--font-display)" }}>
          404
        </p>
        <p className="text-lg" style={{ color: "var(--cx-t2)", fontFamily: "var(--font-mono)" }}>
          Page not found
        </p>
        <button
          className="cx-btn-primary"
          onClick={() => navigate("/")}
        >
          Back to Dashboard
        </button>
      </div>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes (no sidebar) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Core routes */}
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/workspace" element={<Workspace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}