import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/format";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Tags,
  Users,
  ShieldCheck,
  Settings,
  ExternalLink,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  Shield,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Operations",
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/orders", label: "Pre-Orders", icon: ShoppingBag },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/categories", label: "Categories & Brands", icon: Tags },
    ],
  },
  {
    label: "Management & Security",
    items: [
      { to: "/admin/customers", label: "Customers", icon: Users },
      { to: "/admin/audit", label: "Audit & Database", icon: ShieldCheck },
    ],
  },
  {
    label: "System",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings }],
  },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Desktop sidebar collapse state persisted in localStorage
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("mlk_admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Mobile drawer open state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Handle escape key to dismiss mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mlk_admin_sidebar_collapsed", String(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  // Find active item for breadcrumb
  let activeLabel = "Dashboard";
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) {
        activeLabel = item.label;
      }
    }
  }

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 space-y-6 px-3 py-4" aria-label="Admin Navigation">
      {navGroups.map((group) => (
        <div key={group.label} className="space-y-1">
          {(!collapsed || isMobile) && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {group.label}
            </p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = item.end
                ? location.pathname === item.to
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30 font-bold"
                      : "text-zinc-700 hover:bg-zinc-100/90 hover:text-zinc-950",
                    collapsed && !isMobile && "justify-center px-2",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
                      isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-900",
                    )}
                  />
                  {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* ============================================================== */}
      {/* 1. DESKTOP SIDEBAR (Visible on lg and larger)                   */}
      {/* ============================================================== */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-zinc-200/80 bg-white transition-all duration-300 ease-in-out lg:flex z-30",
          collapsed ? "w-20" : "w-64",
        )}
      >
        {/* Brand & Collapse Header */}
        <div className="flex h-16 items-center justify-between border-b border-zinc-200/80 px-4">
          <Link
            to="/admin"
            className={cn("flex items-center gap-2.5 overflow-hidden transition-all", collapsed && "justify-center")}
            title="Metro Lahore Kites Admin"
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-zinc-950 text-white shadow-sm">
              <Shield className="size-5 text-rose-500" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display text-sm font-black tracking-tight text-zinc-950">
                  MLK <span className="text-rose-600">Admin</span>
                </span>
                <span className="text-[10px] font-bold text-zinc-400">MANAGEMENT PORTAL</span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 lg:inline-flex"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">{renderNavLinks(false)}</div>

        {/* Footer: User profile & links */}
        <div className="border-t border-zinc-200/80 p-3 bg-zinc-50/50">
          <Link
            to="/"
            target="_blank"
            rel="noopener noreferrer"
            title="View Live Storefront"
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-colors mb-2",
              collapsed && "justify-center px-2",
            )}
          >
            <ExternalLink className="size-4 text-zinc-400" />
            {!collapsed && <span>View Storefront ↗</span>}
          </Link>

          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-white p-2.5 shadow-sm",
              collapsed && "justify-center p-2",
            )}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white shadow-sm">
              {user?.fullName?.trim().charAt(0).toUpperCase() ?? "A"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-bold text-zinc-900">{user?.fullName || "Administrator"}</p>
                <p className="truncate text-[10px] font-medium text-zinc-500">{user?.email || "Staff"}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MOBILE OFF-CANVAS DRAWER (< lg screens)                      */}
      {/* ============================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          {/* Backdrop blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            {/* Drawer Header */}
            <div className="flex h-16 items-center justify-between border-b border-zinc-200 px-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-zinc-950 text-white shadow-sm">
                  <Shield className="size-5 text-rose-500" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-sm font-black text-zinc-950">
                    MLK <span className="text-rose-600">Admin</span>
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400">MANAGEMENT PORTAL</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-y-auto">{renderNavLinks(true)}</div>

            {/* Mobile Footer */}
            <div className="border-t border-zinc-200 p-4 bg-zinc-50">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200/70 mb-3"
              >
                <ExternalLink className="size-4" />
                View Storefront ↗
              </Link>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                    {user?.fullName?.trim().charAt(0).toUpperCase() ?? "A"}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{user?.fullName}</p>
                    <p className="text-[10px] text-zinc-500">{user?.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label="Sign Out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN DASHBOARD CONTENT AREA                                  */}
      {/* ============================================================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="size-5" />
            </button>

            {/* Breadcrumb Indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 sm:text-sm">
              <span className="text-zinc-400 hidden sm:inline">Admin</span>
              <ChevronRight className="size-3.5 text-zinc-300 hidden sm:inline" />
              <span className="font-bold text-zinc-900">{activeLabel}</span>
            </div>
          </div>

          {/* Quick Right Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </div>

            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-950 transition-colors"
            >
              <ExternalLink className="size-3.5 text-zinc-400" />
              <span>Storefront</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-zinc-100/80 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
