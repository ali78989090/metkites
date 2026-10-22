import crypto from "node:crypto";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Human-readable, copy-friendly random code, e.g. `7K4M2Q`. */
export function randomCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CROCKFORD[bytes[i] % CROCKFORD.length];
  }
  return out;
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** `MLK-261021-7K4M2Q` — brand, date, random suffix. */
export function generateReference(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `MLK-${yy}${mm}${dd}-${randomCode(6)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Normalises Pakistani mobile numbers to a comparable form.
 * `+92 300 1234567` -> `03001234567`
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || "").replace(/\D+/g, "");
  if (digits.startsWith("0092")) digits = `0${digits.slice(4)}`;
  if (digits.startsWith("92") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("3") && digits.length === 10) digits = `0${digits}`;
  return digits;
}

/** Pakistani mobile number: 03XXXXXXXXX (11 digits) after normalisation. */
export function isValidPakMobile(raw: string): boolean {
  const normalized = normalizePhone(raw);
  return /^03\d{9}$/.test(normalized);
}
