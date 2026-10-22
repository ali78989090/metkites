import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo } from "../components/Logo";
import { cn } from "../lib/format";

const nav = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/orders", label: "Pre-Orders" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/settings", label: "Settings" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mist/70">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo className="h-10" />
            <span className="hidden font-display text-sm font-black uppercase tracking-widest text-ink/50 sm:block">
              Admin
            </span>
          </Link>
          <nav className="ml-4 hidden gap-1 lg:flex" aria-label="Admin navigation">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    isActive ? "bg-brand-soft text-brand-dark" : "text-ink/70 hover:bg-mist",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/" target="_blank" className="btn-ghost hidden text-sm sm:inline-flex">
              View store ↗
            </Link>
            <span className="hidden text-sm text-ink/55 md:block">{user?.fullName}</span>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => navigate("/login", { replace: true }));
              }}
              className="btn-outline text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-ink/8 px-4 py-2 lg:hidden" aria-label="Admin navigation mobile">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold", isActive ? "bg-brand text-white" : "text-ink/70")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
