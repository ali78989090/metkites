import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Field, Input, Spinner } from "../components/ui";
import { Logo } from "../components/Logo";

export function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const next = params.get("next") || "/account";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const user = await login(email, password);
      push(`Welcome back, ${user.fullName.split(" ")[0]}.`, "success");
      navigate(user.role === "admin" && next === "/account" ? "/admin" : next, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (!error.details.length) setErrors({ form: error.message });
        push(error.message, "error");
      } else {
        setErrors({ form: "Could not reach the server. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x flex justify-center py-14">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-white p-2 shadow-sm ring-1 ring-ink/5">
            <Logo className="h-16" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-black">Client &amp; Pre-Order Sign In</h1>
          <p className="mt-1 text-sm text-ink/55">Optional — guest pre-orders never require an account.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {errors.form && (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark" role="alert">
              {errors.form}
            </p>
          )}
          <Field label="Email" htmlFor="email" required error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              invalid={Boolean(errors.email)}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password" required error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              invalid={Boolean(errors.password)}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <Spinner /> : "Sign in to Client Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create a customer account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/shop" className="text-ink/50 hover:text-brand">Continue shopping without an account →</Link>
        </p>

        <div className="mt-6 border-t border-ink/8 pt-4 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/45 transition-colors hover:text-amber-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 text-amber-600">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            Store Manager or Staff? Open Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  );
}
