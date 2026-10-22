/* Shared API response types — mirrors of the server DTOs. */

export type PriceStatus = "configured" | "tbc";
export type Unit = "piece" | "dozen" | "set" | "pair";
export type ProductStatus = "active" | "inactive" | "archived";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "dispatched"
  | "delivered"
  | "cancelled";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending Review",
  confirmed: "Confirmed",
  preparing: "In Preparation",
  ready: "Ready for Dispatch",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "dispatched",
  "delivered",
];

export interface Variant {
  id: string;
  name: string;
  sizeNote: string;
  pricePkr: number | null;
  priceStatus: PriceStatus;
  stockStatus: "available" | "unavailable";
  sortOrder: number;
}

export interface ProductImage {
  id: string;
  path: string;
  alt: string;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  unit: Unit;
  unitLabel: string;
  pricePkr: number | null;
  priceStatus: PriceStatus;
  sizeSummary: string;
  status: ProductStatus;
  preorderOnly: boolean;
  art: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  brandIsStoreBrand: boolean;
  image: string | null;
  images: ProductImage[];
  variants: Variant[];
  available: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  productCount: number;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  isStoreBrand: boolean;
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

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "admin";
}

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  categoryName: string;
  brandName: string;
  variantName: string;
  unit: string;
  quantity: number;
  unitPricePkr: number | null;
  priceStatus: PriceStatus;
  lineTotalPkr: number | null;
  imagePath: string;
}

export interface Order {
  id: string;
  reference: string;
  status: OrderStatus;
  statusLabel: string;
  statusMessage: string;
  customer: { firstName: string; lastName: string; phone: string; address: string; city: string };
  preferences: { kiteSize: string; kiteType: string; dorType: string; brandName: string };
  orderNote: string;
  subtotalPkr: number | null;
  priceStatus: "ok" | "tbc";
  itemsCount: number;
  isGuest: boolean;
  userId: string | null;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  items: OrderItem[];
  history: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string; actor: string; createdAt: string }>;
  contactLogs: Array<{ id: string; channel: string; direction: string; note: string; staffName: string; createdAt: string }>;
}

export interface TrackingOrder {
  reference: string;
  status: OrderStatus;
  statusLabel: string;
  statusMessage: string;
  submittedAt: string;
  statusUpdatedAt: string;
  itemCount: number;
  items: Array<{ productName: string; variantName: string; quantity: number; unit: string }>;
  latestUpdate: { status: OrderStatus; statusLabel: string; at: string } | null;
}

export interface PreorderSubmissionResult {
  reference: string;
  trackingToken: string;
  trackingPath: string;
  status: OrderStatus;
  submittedAt: string;
  itemsCount: number;
  subtotalPkr: number | null;
  priceStatus: "ok" | "tbc";
  duplicate: boolean;
  whatsapp: { enabled: boolean; number: string; message: string };
}
