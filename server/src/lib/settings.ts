import { all, get, nowIso, run } from "../db.js";
import { ORDER_STATUSES, SETTING_KEYS, type SettingKey } from "../constants.js";
import { config } from "../env.js";

export const DEFAULT_SETTINGS: Record<SettingKey, string> = {
  "business.name": "Metro Lahore Kites",
  "business.whatsapp": config.business.whatsapp,
  "business.phone": config.business.phone,
  "business.email": config.business.email,
  "business.address": "Lahore, Pakistan",
  "business.deliveryCoverage":
    "Delivery across Lahore. Requests for other cities are considered case by case — coverage, timing and charges are confirmed by our team before dispatch.",
  "business.logoPath": "/img/logo/metrolahorekites.png",
  "preorders.enabled": "true",
  "preorders.instructions":
    "1. Choose your kites, sizes and dor and add them to your pre-order cart — no login or advance payment needed.\n2. Submit the pre-order form with your delivery details.\n3. You receive a unique pre-order reference number — keep it safe.\n4. Our team reviews availability and contacts you on WhatsApp or call to confirm the final price and delivery arrangement.\n5. Pay only when your order is confirmed and ready — never in advance through this website.",
  "preorders.terms":
    "A pre-order is a request, not a confirmed sale. Stock, final prices and delivery are confirmed by Metro Lahore Kites after your request is reviewed. No advance payment is collected through this website and no payment details are ever requested. Kite flying is permitted only on officially allowed days and in permitted areas — customers are responsible for following the rules that apply to them. Metro Lahore Kites does not sell glass-coated (sharp), chemical-coated or metal-coated strings.",
  "legal.notice":
    "Fly responsibly. Metro Lahore Kites offers cotton dor/pinna only — glass-coated (manja), chemical-coated, metal-coated strings and nylon cutting strings are not sold. Kite-flying days, permitted areas and seller/registration requirements in Punjab are set by the authorities and change every season; our team re-checks the current requirements before confirming orders. Any listing on this website is a product catalogue entry, not a claim of government approval or certification.",
  "status_messages.pending":
    "Your pre-order has been received and is waiting for review. Our team will contact you to confirm availability, final price and delivery.",
  "status_messages.confirmed":
    "Your pre-order is confirmed. Our team will share the delivery arrangement and payment details with you shortly.",
  "status_messages.preparing":
    "Your confirmed order is being prepared and packed.",
  "status_messages.ready": "Your order is packed and ready for dispatch.",
  "status_messages.dispatched": "Your order has been dispatched. Please keep your reference number available.",
  "status_messages.delivered": "Your order has been delivered. Thank you for flying with Metro Lahore Kites.",
  "status_messages.cancelled":
    "This pre-order has been cancelled. If you believe this is a mistake, please contact us with your reference number.",
  "options.kiteSizes": "Small, Standard, 4 Githi, 4.5 Githi",
  "options.guddaSizes": "Adda / 0.5 Tawa, 0.75 Tawa, 1 Tawa, 1.5 Tawa",
  "options.dorTypes": "0.5 Piece, 1 Piece, 1.5 Piece, 2 Piece",
  "options.cities": "Lahore",
};

export function seedSettings(): void {
  for (const key of SETTING_KEYS) {
    const existing = get("SELECT value FROM settings WHERE key = ?", key);
    if (!existing) {
      run("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)", key, DEFAULT_SETTINGS[key], nowIso());
    }
  }
}

export function getSetting(key: SettingKey | string, fallback = ""): string {
  const row = get("SELECT value FROM settings WHERE key = ?", key) as { value?: string } | undefined;
  return row?.value ?? fallback;
}

export function getSettingBool(key: SettingKey | string, fallback = false): boolean {
  const value = getSetting(key, fallback ? "true" : "false");
  return value === "true" || value === "1";
}

export function getAllSettings(): Record<string, string> {
  const rows = all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const out: Record<string, string> = {};
  for (const row of rows) out[row.key] = row.value;
  return out;
}

export function saveSettings(entries: Record<string, string>): void {
  const allowed = new Set<string>(SETTING_KEYS);
  for (const [key, value] of Object.entries(entries)) {
    if (!allowed.has(key)) continue;
    run(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      String(value),
      nowIso(),
    );
  }
}

export interface PublicSettings {
  business: {
    name: string;
    whatsapp: string;
    phone: string;
    email: string;
    address: string;
    deliveryCoverage: string;
    logoPath: string;
  };
  preorders: { enabled: boolean; instructions: string; terms: string };
  legal: { notice: string };
  statusMessages: Record<string, string>;
  options: { kiteSizes: string[]; guddaSizes: string[]; dorTypes: string[]; cities: string[] };
}

function csvList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function publicSettings(): PublicSettings {
  const all_ = getAllSettings();
  const read = (key: SettingKey, fallback = "") => all_[key] ?? fallback;
  const statusMessages: Record<string, string> = {};
  for (const status of ORDER_STATUSES) {
    statusMessages[status] = read(`status_messages.${status}`, DEFAULT_SETTINGS[`status_messages.${status}`]);
  }
  return {
    business: {
      name: read("business.name", "Metro Lahore Kites"),
      whatsapp: read("business.whatsapp").replace(/[^0-9]/g, ""),
      phone: read("business.phone"),
      email: read("business.email"),
      address: read("business.address"),
      deliveryCoverage: read("business.deliveryCoverage"),
      logoPath: read("business.logoPath", "/img/logo/metrolahorekites.png"),
    },
    preorders: {
      enabled: read("preorders.enabled", "true") === "true",
      instructions: read("preorders.instructions", DEFAULT_SETTINGS["preorders.instructions"]),
      terms: read("preorders.terms", DEFAULT_SETTINGS["preorders.terms"]),
    },
    legal: { notice: read("legal.notice", DEFAULT_SETTINGS["legal.notice"]) },
    statusMessages,
    options: {
      kiteSizes: csvList(read("options.kiteSizes", DEFAULT_SETTINGS["options.kiteSizes"])),
      guddaSizes: csvList(read("options.guddaSizes", DEFAULT_SETTINGS["options.guddaSizes"])),
      dorTypes: csvList(read("options.dorTypes", DEFAULT_SETTINGS["options.dorTypes"])),
      cities: csvList(read("options.cities", DEFAULT_SETTINGS["options.cities"])),
    },
  };
}
