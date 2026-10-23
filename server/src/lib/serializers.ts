import { STATUS_LABELS, UNIT_LABELS, type OrderStatus, type PriceStatus, type ProductStatus, type Unit } from "../constants.js";
import { getSetting } from "./settings.js";
import { all, get } from "../db.js";

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */

export interface VariantDto {
  id: string;
  name: string;
  sizeNote: string;
  pricePkr: number | null;
  priceStatus: PriceStatus;
  stockStatus: "available" | "unavailable";
  sortOrder: number;
}

export interface ProductImageDto {
  id: string;
  path: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductDto {
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
  images: ProductImageDto[];
  variants: VariantDto[];
  available: boolean;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  unit: string;
  price_pkr: number | null;
  price_status: string;
  size_summary: string;
  status: string;
  preorder_only: number;
  art: string;
  category_id: string;
  category_slug: string;
  category_name: string;
  brand_id: string;
  brand_name: string;
  brand_is_store_brand: number;
}

const PRODUCT_SELECT = `
  SELECT p.id, p.slug, p.name, p.description, p.unit, p.price_pkr, p.price_status,
         p.size_summary, p.status, p.preorder_only, p.art,
         c.id AS category_id, c.slug AS category_slug, c.name AS category_name,
         b.id AS brand_id, b.name AS brand_name, b.is_store_brand AS brand_is_store_brand
    FROM products p
    JOIN categories c ON c.id = p.category_id
    JOIN brands b ON b.id = p.brand_id
`;

export const productSelect = PRODUCT_SELECT;

export function variantsFor(productId: string): VariantDto[] {
  return all<{
    id: string;
    name: string;
    size_note: string;
    price_pkr: number | null;
    price_status: string;
    stock_status: string;
    sort_order: number;
  }>(
    `SELECT id, name, size_note, price_pkr, price_status, stock_status, sort_order
       FROM product_variants WHERE product_id = ? ORDER BY sort_order, name`,
    productId,
  ).map((v) => ({
    id: v.id,
    name: v.name,
    sizeNote: v.size_note,
    pricePkr: v.price_pkr === null ? null : Number(v.price_pkr),
    priceStatus: v.price_status === "configured" ? "configured" : "tbc",
    stockStatus: v.stock_status === "unavailable" ? "unavailable" : "available",
    sortOrder: v.sort_order,
  }));
}

export function imagesFor(productId: string): ProductImageDto[] {
  return all<{ id: string; path: string; alt: string; is_primary: number }>(
    "SELECT id, path, alt, is_primary FROM product_images WHERE product_id = ? ORDER BY sort_order, created_at",
    productId,
  ).map((img) => ({ id: img.id, path: img.path, alt: img.alt, isPrimary: img.is_primary === 1 }));
}

export function rowToProduct(row: ProductRow): ProductDto {
  const variants = variantsFor(row.id);
  const images = imagesFor(row.id);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    unit: row.unit as Unit,
    unitLabel: UNIT_LABELS[row.unit as Unit] ?? "per piece",
    pricePkr: row.price_pkr === null ? null : Number(row.price_pkr),
    priceStatus: row.price_status === "configured" ? "configured" : "tbc",
    sizeSummary: row.size_summary,
    status: row.status as ProductStatus,
    preorderOnly: row.preorder_only === 1,
    art: row.art,
    categoryId: row.category_id,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    brandIsStoreBrand: row.brand_is_store_brand === 1,
    image: images[0]?.path ?? null,
    images,
    variants,
    available: row.status === "active" && variants.some((v) => v.stockStatus === "available"),
  };
}

/* ------------------------------------------------------------------ */
/* Pre-orders                                                          */
/* ------------------------------------------------------------------ */

export interface OrderItemDto {
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

export interface OrderDto {
  id: string;
  reference: string;
  status: OrderStatus;
  statusLabel: string;
  statusMessage: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
  };
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
  items: OrderItemDto[];
  history: Array<{ id: string; fromStatus: string | null; toStatus: string; note: string; actor: string; createdAt: string }>;
  contactLogs: Array<{ id: string; channel: string; direction: string; note: string; staffName: string; createdAt: string }>;
}

interface OrderRow {
  id: string;
  reference: string;
  tracking_token: string;
  user_id: string | null;
  is_guest: number;
  first_name: string;
  last_name: string;
  phone: string;
  phone_normalized: string;
  address: string;
  city: string;
  kite_size: string;
  kite_type: string;
  dor_type: string;
  brand_name: string;
  order_note: string;
  status: string;
  subtotal_pkr: number | null;
  price_status: string;
  items_count: number;
  admin_notes: string;
  created_at: string;
  updated_at: string;
  status_updated_at: string;
}

export function itemsForOrder(orderId: string): OrderItemDto[] {
  return all<{
    id: string;
    product_id: string | null;
    product_name: string;
    category_name: string;
    brand_name: string;
    variant_name: string;
    unit: string;
    quantity: number;
    unit_price_pkr: number | null;
    price_status: string;
    line_total_pkr: number | null;
    image_path: string;
  }>(
    `SELECT id, product_id, product_name, category_name, brand_name, variant_name, unit,
            quantity, unit_price_pkr, price_status, line_total_pkr, image_path
       FROM order_items WHERE order_id = ? ORDER BY created_at, rowid`,
    orderId,
  ).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    categoryName: row.category_name,
    brandName: row.brand_name,
    variantName: row.variant_name,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPricePkr: row.unit_price_pkr === null ? null : Number(row.unit_price_pkr),
    priceStatus: row.price_status === "configured" ? "configured" : "tbc",
    lineTotalPkr: row.line_total_pkr === null ? null : Number(row.line_total_pkr),
    imagePath: row.image_path,
  }));
}

export function historyForOrder(orderId: string) {
  return all<{ id: string; from_status: string | null; to_status: string; note: string; actor: string; created_at: string }>(
    `SELECT id, from_status, to_status, note, actor, created_at
       FROM order_status_history WHERE order_id = ? ORDER BY created_at, rowid`,
    orderId,
  ).map((row) => ({
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    actor: row.actor,
    createdAt: row.created_at,
  }));
}

export function contactLogsForOrder(orderId: string) {
  return all<{ id: string; channel: string; direction: string; note: string; staff_name: string; created_at: string }>(
    `SELECT id, channel, direction, note, staff_name, created_at
       FROM order_contact_logs WHERE order_id = ? ORDER BY created_at DESC, rowid DESC`,
    orderId,
  ).map((row) => ({
    id: row.id,
    channel: row.channel,
    direction: row.direction,
    note: row.note,
    staffName: row.staff_name,
    createdAt: row.created_at,
  }));
}

export function rowToOrder(row: OrderRow, options: { includePrivate: boolean }): OrderDto {
  const status = row.status as OrderStatus;
  return {
    id: row.id,
    reference: row.reference,
    status,
    statusLabel: STATUS_LABELS[status] ?? row.status,
    statusMessage: getSetting(`status_messages.${status}`, ""),
    customer: {
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      address: row.address,
      city: row.city,
    },
    preferences: {
      kiteSize: row.kite_size,
      kiteType: row.kite_type,
      dorType: row.dor_type,
      brandName: row.brand_name,
    },
    orderNote: row.order_note,
    subtotalPkr: row.subtotal_pkr === null ? null : Number(row.subtotal_pkr),
    priceStatus: row.price_status === "ok" ? "ok" : "tbc",
    itemsCount: Number(row.items_count),
    isGuest: row.is_guest === 1,
    userId: options.includePrivate ? row.user_id : null,
    adminNotes: options.includePrivate ? row.admin_notes : "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    statusUpdatedAt: row.status_updated_at,
    items: itemsForOrder(row.id),
    history: options.includePrivate ? historyForOrder(row.id) : [],
    contactLogs: options.includePrivate ? contactLogsForOrder(row.id) : [],
  };
}

/** Minimal, privacy-safe shape used on public tracking pages. */
export interface PublicTrackingDto {
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

export function rowToPublicTracking(row: OrderRow): PublicTrackingDto {
  const status = row.status as OrderStatus;
  const history = historyForOrder(row.id);
  const latest = history[history.length - 1];
  return {
    reference: row.reference,
    status,
    statusLabel: STATUS_LABELS[status] ?? row.status,
    statusMessage: getSetting(`status_messages.${status}`, ""),
    submittedAt: row.created_at,
    statusUpdatedAt: row.status_updated_at,
    itemCount: Number(row.items_count),
    items: itemsForOrder(row.id).map((item) => ({
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unit: item.unit,
    })),
    latestUpdate: latest
      ? {
          status: latest.toStatus as OrderStatus,
          statusLabel: STATUS_LABELS[latest.toStatus as OrderStatus] ?? latest.toStatus,
          at: latest.createdAt,
        }
      : null,
  };
}

export function findOrderByReference(reference: string): OrderRow | undefined {
  return get<OrderRow>(
    `SELECT id, reference, tracking_token, user_id, is_guest, first_name, last_name, phone, phone_normalized, address, city,
            kite_size, kite_type, dor_type, brand_name, order_note, status, subtotal_pkr, price_status,
            items_count, admin_notes, created_at, updated_at, status_updated_at
       FROM pre_orders WHERE reference = ?`,
    reference.trim().toUpperCase(),
  );
}

export function findOrderById(id: string): OrderRow | undefined {
  return get<OrderRow>(
    `SELECT id, reference, tracking_token, user_id, is_guest, first_name, last_name, phone, phone_normalized, address, city,
            kite_size, kite_type, dor_type, brand_name, order_note, status, subtotal_pkr, price_status,
            items_count, admin_notes, created_at, updated_at, status_updated_at
       FROM pre_orders WHERE id = ?`,
    id,
  );
}

export function listOrderRows(): OrderRow[] {
  return all<OrderRow>(
    `SELECT id, reference, tracking_token, user_id, is_guest, first_name, last_name, phone, phone_normalized, address, city,
            kite_size, kite_type, dor_type, brand_name, order_note, status, subtotal_pkr, price_status,
            items_count, admin_notes, created_at, updated_at, status_updated_at
       FROM pre_orders`,
  );
}

export async function findOrderByReferenceAsync(reference: string): Promise<OrderRow | undefined> {
  const norm = reference.trim().toUpperCase();
  const local = findOrderByReference(norm);
  if (local) return local;

  try {
    const { syncOrderFromMongo } = await import("./mongo.js");
    const synced = await syncOrderFromMongo("reference", norm);
    if (synced) return findOrderByReference(norm);
  } catch {
    /* fallback to local only */
  }
  return undefined;
}

export async function findOrderByIdAsync(id: string): Promise<OrderRow | undefined> {
  const local = findOrderById(id);
  if (local) return local;

  try {
    const { syncOrderFromMongo } = await import("./mongo.js");
    const synced = await syncOrderFromMongo("id", id);
    if (synced) return findOrderById(id);
  } catch {
    /* fallback to local only */
  }
  return undefined;
}
