import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Field, Input, Spinner } from "../components/ui";
import { ShieldCheck, Lock, ArrowLeft } from "lucide-react";

export function AdminLoginPage() {
  const { login, logout } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const next = params.get("next") || "/admin";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const user = await login(email, password);
      if (user.role !== "admin") {
        await logout();
        setErrors({
          form: "Access Restricted: This account does not have staff or administrator privileges. Please use the customer login.",
        });
        push("Admin access denied: Non-staff account.", "error");
        return;
      }
      push(`Welcome back, ${user.fullName.split(" ")[0]}. Access granted to Admin Dashboard.`, "success");
      navigate(next.startsWith("/admin") ? next : "/admin", { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!error.details.length) setErrors({ form: error.message });
        push(error.message, "error");
      } else {
        setErrors({ form: "Could not connect to authentication server. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] items-center justify-center bg-gradient-to-br from-[#0a0518] via-[#140728] to-[#090214] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/90 p-8 shadow-2xl backdrop-blur-xl">
          {/* Subtle Glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-rose-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 size-48 rounded-full bg-purple-900/25 blur-3xl" />

          {/* Header */}
          <div className="relative flex flex-col items-center text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-inner">
              <ShieldCheck className="size-9" />
            </div>
            <div className="mt-3 flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-300">
              <Lock className="size-3" />
              Staff &amp; Administrator Portal
            </div>
            <h1 className="mt-3 font-display text-2xl font-black text-white sm:text-3xl">
              Admin Sign In
            </h1>
            <p className="mt-1.5 text-xs text-zinc-400">
              Metro Lahore Kites — Secure Management Console
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="relative mt-7 space-y-4">
            {errors.form && (
              <div
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300"
                role="alert"
              >
                {errors.form}
              </div>
            )}

            <Field label="Staff Email" htmlFor="admin-email" required error={errors.email}>
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="ebad@gmail.com"
                value={email}
                invalid={Boolean(errors.email)}
                onChange={(event) => setEmail(event.target.value)}
                className="border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/25"
                required
              />
            </Field>

            <Field label="Password" htmlFor="admin-password" required error={errors.password}>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                invalid={Boolean(errors.password)}
                onChange={(event) => setPassword(event.target.value)}
                className="border-zinc-800 bg-zinc-900/90 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/25"
                required
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-700 active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Spinner className="size-4 text-white" />
                  Authenticating...
                </>
              ) : (
                "Authenticate & Access Admin →"
              )}
            </button>
          </form>

          {/* Links */}
          <div className="relative mt-6 border-t border-zinc-800/80 pt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-rose-400"
            >
              <ArrowLeft className="size-3.5" />
              Switch to Customer / Client Sign In
            </Link>
          </div>
        </div>

        {/* Back to store */}
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs font-semibold text-zinc-400 hover:text-white">
            ← Return to Public Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
