/** Shared domain constants. */

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending Review",
  confirmed: "Confirmed",
  preparing: "In Preparation",
  ready: "Ready for Dispatch",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Legal transitions from a given status (admin may also cancel from most states). */
export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["dispatched", "cancelled"],
  dispatched: ["delivered"],
  delivered: [],
  cancelled: ["pending"],
};

export const UNITS = ["piece", "dozen", "set", "pair"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<Unit, string> = {
  piece: "per piece",
  dozen: "per dozen",
  set: "per set",
  pair: "per pair",
};

export const PRODUCT_STATUSES = ["active", "inactive", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRICE_STATUSES = ["configured", "tbc"] as const;
export type PriceStatus = (typeof PRICE_STATUSES)[number];

/** Setting keys editable from the admin dashboard. */
export const SETTING_KEYS = [
  "business.name",
  "business.whatsapp",
  "business.phone",
  "business.email",
  "business.address",
  "business.deliveryCoverage",
  "business.logoPath",
  "preorders.enabled",
  "preorders.instructions",
  "preorders.terms",
  "legal.notice",
  "status_messages.pending",
  "status_messages.confirmed",
  "status_messages.preparing",
  "status_messages.ready",
  "status_messages.dispatched",
  "status_messages.delivered",
  "status_messages.cancelled",
  "options.kiteSizes",
  "options.guddaSizes",
  "options.dorTypes",
  "options.cities",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

/** Public subset returned to unauthenticated visitors. */
export const PUBLIC_SETTING_KEYS: SettingKey[] = [
  "business.name",
  "business.whatsapp",
  "business.phone",
  "business.email",
  "business.address",
  "business.deliveryCoverage",
  "business.logoPath",
  "preorders.enabled",
  "preorders.instructions",
  "preorders.terms",
  "legal.notice",
  "status_messages.pending",
  "status_messages.confirmed",
  "status_messages.preparing",
  "status_messages.ready",
  "status_messages.dispatched",
  "status_messages.delivered",
  "status_messages.cancelled",
  "options.kiteSizes",
  "options.guddaSizes",
  "options.dorTypes",
  "options.cities",
];

export const LOGO_PATH = "/img/logo/metrolahorekites.png";
