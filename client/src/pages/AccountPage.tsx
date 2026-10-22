import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useToast } from "../components/Toast";
import { EmptyState, Field, Input, Skeleton, Spinner, StatusBadge } from "../components/ui";
import { formatDate, formatPkr } from "../lib/format";
import type { Order, User } from "../lib/types";

export function AccountPage() {
  const { user, loading, setUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "profile" ? "profile" : "orders";

  if (loading) {
    return (
      <div className="container-x py-16">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-3xl font-black">Sign in to view your account</h1>
        <p className="mt-3 text-ink/60">Guest pre-orders can always be tracked with the reference number.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login?next=/account" className="btn-primary">Login</Link>
          <Link to="/register" className="btn-outline">Create account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x max-w-4xl py-12">
      <p className="section-eyebrow">My account</p>
      <h1 className="mt-2 font-display text-3xl font-black">{user.fullName}</h1>
      <p className="mt-1 text-sm text-ink/60">{user.email}</p>

      <div className="mt-6 flex gap-2 border-b border-ink/10">
        {(["orders", "profile"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setParams(key === "orders" ? {} : { tab: key }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${
              tab === key ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
            }`}
          >
            {key === "orders" ? "My Orders" : "Profile"}
          </button>
        ))}
      </div>

      {tab === "orders" ? <OrdersTab userId={user.id} /> : <ProfileTab user={user} onSaved={setUser} />}
    </div>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    api<{ items: Order[] }>("/api/auth/me/orders")
      .then((data) => setOrders(data.items))
      .catch(() => setOrders([]));
  }, [userId]);

  if (orders === null) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="No pre-orders yet"
          description="When you submit a pre-order while signed in, it appears here."
          icon="🪁"
          action={
            <Link to="/shop" className="btn-primary">Explore Collection</Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {orders.map((order) => (
        <article key={order.id} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-black">{order.reference}</p>
              <p className="text-xs text-ink/55">Submitted {formatDate(order.createdAt)}</p>
            </div>
            <StatusBadge status={order.status} label={order.statusLabel} />
          </div>
          <ul className="mt-3 space-y-1 text-sm text-ink/70">
            {order.items.slice(0, 4).map((item) => (
              <li key={item.id}>
                {item.productName} — {item.variantName} <span className="text-ink/45">× {item.quantity}</span>
              </li>
            ))}
            {order.items.length > 4 && <li className="text-xs text-ink/45">+ {order.items.length - 4} more</li>}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-3">
            <p className="text-sm font-semibold">
              {order.subtotalPkr !== null ? formatPkr(order.subtotalPkr) : "Final price to be confirmed"}
            </p>
            <Link to={`/track?ref=${order.reference}`} className="text-sm font-semibold text-brand hover:underline">
              Track this order →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProfileTab({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const { push } = useToast();
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const body: Record<string, string> = { fullName, phone };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const data = await api<{ user: User }>("/api/auth/me/profile", { method: "PUT", body });
      onSaved(data.user);
      setCurrentPassword("");
      setNewPassword("");
      push("Profile updated.", "success");
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        push(error.message, "error");
      } else {
        push("Could not update your profile. Please try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="card mt-6 max-w-lg space-y-4 p-6">
      <Field label="Full Name" htmlFor="fullName" required error={errors.fullName}>
        <Input id="fullName" value={fullName} invalid={Boolean(errors.fullName)} onChange={(event) => setFullName(event.target.value)} />
      </Field>
      <Field label="Mobile / WhatsApp" htmlFor="phone" hint="e.g. 0300 1234567" error={errors.phone}>
        <Input id="phone" type="tel" value={phone} invalid={Boolean(errors.phone)} onChange={(event) => setPhone(event.target.value)} />
      </Field>

      <div className="border-t border-ink/10 pt-4">
        <p className="text-sm font-semibold text-ink/70">Change password</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Current password" htmlFor="currentPassword" hint="Required to change password">
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              invalid={Boolean(errors.currentPassword)}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </Field>
          <Field label="New password" htmlFor="newPassword" hint="At least 8 characters">
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              invalid={Boolean(errors.newPassword)}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary px-6">
        {saving ? <Spinner /> : "Save changes"}
      </button>
    </form>
  );
}
