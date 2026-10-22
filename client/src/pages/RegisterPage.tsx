import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { Field, Input, Spinner } from "../components/ui";
import { Logo } from "../components/Logo";

export function RegisterPage() {
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      await register({ fullName, email, phone, password });
      push("Account created — welcome to Metro Lahore Kites.", "success");
      navigate("/account", { replace: true });
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
          <h1 className="mt-4 font-display text-2xl font-black">Create an account</h1>
          <p className="mt-1 text-center text-sm text-ink/55">
            Optional — you can place a pre-order without signing in.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {errors.form && (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark" role="alert">
              {errors.form}
            </p>
          )}
          <Field label="Full Name" htmlFor="fullName" required error={errors.fullName}>
            <Input
              id="fullName"
              autoComplete="name"
              value={fullName}
              invalid={Boolean(errors.fullName)}
              onChange={(event) => setFullName(event.target.value)}
            />
          </Field>
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
          <Field label="Mobile / WhatsApp" htmlFor="phone" hint="Optional — e.g. 0300 1234567" error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              invalid={Boolean(errors.phone)}
              onChange={(event) => setPhone(event.target.value)}
            />
          </Field>
          <Field label="Password" htmlFor="password" required hint="At least 8 characters" error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              invalid={Boolean(errors.password)}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? <Spinner /> : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
