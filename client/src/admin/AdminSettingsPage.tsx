import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { Skeleton } from "../components/ui";

/** Mirrors SETTING_KEYS on the server; the server ignores any key not listed there. */
const FIELDS: Array<{
  key: string;
  label: string;
  hint?: string;
  type?: "text" | "textarea" | "checkbox";
}> = [
  { key: "business.name", label: "Business name" },
  { key: "business.whatsapp", label: "WhatsApp number", hint: "Digits only, international format without “+”, e.g. 923001234567. The floating WhatsApp button stays hidden until a number is set." },
  { key: "business.phone", label: "Phone number", hint: "Shown in the footer and contact page." },
  { key: "business.email", label: "Email address" },
  { key: "business.address", label: "Address" },
  { key: "business.deliveryCoverage", label: "Delivery coverage note", type: "textarea" },
  { key: "preorders.enabled", label: "Pre-orders enabled", hint: "Turn off to pause all new pre-orders site-wide.", type: "checkbox" },
  { key: "preorders.instructions", label: "How pre-orders work", hint: "Shown on the how-it-works page and checkout.", type: "textarea" },
  { key: "preorders.terms", label: "Pre-order terms", hint: "Customers must accept this at checkout.", type: "textarea" },
  { key: "legal.notice", label: "Legal notice", hint: "Shown in the footer and checkout. Configurable — edit to match your lawyer’s wording.", type: "textarea" },
  { key: "status_messages.pending", label: "Message: Pending review" },
  { key: "status_messages.confirmed", label: "Message: Confirmed" },
  { key: "status_messages.preparing", label: "Message: In preparation" },
  { key: "status_messages.ready", label: "Message: Ready for dispatch" },
  { key: "status_messages.dispatched", label: "Message: Dispatched" },
  { key: "status_messages.delivered", label: "Message: Delivered" },
  { key: "status_messages.cancelled", label: "Message: Cancelled" },
  { key: "options.kiteSizes", label: "Kite size options", hint: "Comma-separated list offered in the preference dropdown." },
  { key: "options.guddaSizes", label: "Gudda size options", hint: "Comma-separated list." },
  { key: "options.dorTypes", label: "Dor type options", hint: "Comma-separated list. Cotton dor/pinna only." },
  { key: "options.cities", label: "Delivery cities", hint: "Comma-separated list." },
];

export function AdminSettingsPage() {
  const { push } = useToast();
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is401, setIs401] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = () => {
    setLoading(true);
    setError(null);
    setIs401(false);
    api<{ ok: true; settings: Record<string, string> }>("/api/admin/settings")
      .then((data) => {
        setSettings(data.settings);
        setError(null);
      })
      .catch((err) => {
        const msg = err instanceof ApiError ? err.message : "Could not load settings.";
        setError(msg);
        if (err instanceof ApiError && err.status === 401) setIs401(true);
        push(msg, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const setValue = (key: string, value: string) => {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const data = await api<{ ok: true; settings: Record<string, string> }>("/api/admin/settings", {
        method: "PUT",
        body: { settings },
      });
      setSettings(data.settings);
      push("Settings saved. Changes are live across the site.", "success");
    } catch (error) {
      push(error instanceof ApiError ? error.message : "Could not save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="max-w-3xl rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="text-base font-bold text-red-900">Failed to load system settings</h2>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={loadSettings} className="btn-primary text-xs">
            Retry loading
          </button>
          {is401 && (
            <Link to="/admin/login" className="btn-dark text-xs">
              Sign In to Admin →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-black">Settings</h1>
      <p className="mt-1 text-sm text-ink/60">
        Everything here is editable by you — including the legal notice and pre-order terms.
      </p>

      <form onSubmit={(event) => void save(event)} className="mt-6 space-y-6">
        <section className="card divide-y divide-ink/8">
          <header className="px-6 py-4">
            <h2 className="font-display text-lg font-black">Business &amp; contact</h2>
            <p className="text-xs text-ink/55">The WhatsApp button stays hidden until a number is configured here.</p>
          </header>
          {FIELDS.filter((field) => field.key.startsWith("business.")).map((field) => (
            <div key={field.key} className="px-6 py-4">
              <label htmlFor={field.key} className="field-label">
                {field.label}
              </label>
              <input
                id={field.key}
                className="field-input"
                value={settings[field.key] ?? ""}
                onChange={(event) => setValue(field.key, event.target.value)}
              />
              {field.hint ? <p className="mt-1.5 text-xs text-ink/50">{field.hint}</p> : null}
            </div>
          ))}
        </section>

        <section className="card divide-y divide-ink/8">
          <header className="px-6 py-4">
            <h2 className="font-display text-lg font-black">Pre-orders</h2>
          </header>
          {FIELDS.filter((field) => field.key.startsWith("preorders.") || field.key.startsWith("legal.")).map((field) => (
            <div key={field.key} className="px-6 py-4">
              {field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-[#e30613]"
                    checked={(settings[field.key] ?? "false") === "true"}
                    onChange={(event) => setValue(field.key, event.target.checked ? "true" : "false")}
                  />
                  {field.label}
                </label>
              ) : (
                <>
                  <label htmlFor={field.key} className="field-label">
                    {field.label}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      id={field.key}
                      className="field-input min-h-28"
                      value={settings[field.key] ?? ""}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={field.key}
                      className="field-input"
                      value={settings[field.key] ?? ""}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  )}
                </>
              )}
              {field.hint ? <p className="mt-1.5 text-xs text-ink/50">{field.hint}</p> : null}
            </div>
          ))}
        </section>

        <section className="card divide-y divide-ink/8">
          <header className="px-6 py-4">
            <h2 className="font-display text-lg font-black">Status messages</h2>
            <p className="text-xs text-ink/55">Shown to customers on the tracking page for each status.</p>
          </header>
          {FIELDS.filter((field) => field.key.startsWith("status_messages.")).map((field) => (
            <div key={field.key} className="px-6 py-4">
              <label htmlFor={field.key} className="field-label">
                {field.label}
              </label>
              <input
                id={field.key}
                className="field-input"
                value={settings[field.key] ?? ""}
                onChange={(event) => setValue(field.key, event.target.value)}
              />
            </div>
          ))}
        </section>

        <section className="card divide-y divide-ink/8">
          <header className="px-6 py-4">
            <h2 className="font-display text-lg font-black">Dropdown options</h2>
          </header>
          {FIELDS.filter((field) => field.key.startsWith("options.")).map((field) => (
            <div key={field.key} className="px-6 py-4">
              <label htmlFor={field.key} className="field-label">
                {field.label}
              </label>
              <input
                id={field.key}
                className="field-input"
                value={settings[field.key] ?? ""}
                onChange={(event) => setValue(field.key, event.target.value)}
              />
              {field.hint ? <p className="mt-1.5 text-xs text-ink/50">{field.hint}</p> : null}
            </div>
          ))}
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          <span className="text-xs text-ink/50">Changes apply immediately across the site.</span>
        </div>
      </form>
    </div>
  );
}
