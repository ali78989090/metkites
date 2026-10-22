import crypto from "node:crypto";
import { get, nowIso, run, all } from "../db.js";
import { hashPassword } from "./auth.js";
import { seedSettings } from "./settings.js";
import { config } from "../env.js";

interface SeedVariant {
  name: string;
  sizeNote?: string;
  stockStatus?: "available" | "unavailable";
}

interface SeedProduct {
  slug: string;
  name: string;
  category: string;
  description: string;
  unit: "piece" | "dozen" | "set" | "pair";
  sizeSummary: string;
  art: string;
  image: string;
  imageAlt: string;
  sortOrder: number;
  variants: SeedVariant[];
  /**
   * Publicly listed market prices observed during product research.
   * Indicative only — the storefront never publishes these as Metro Lahore
   * Kites prices; the business confirms real prices in the admin dashboard.
   */
  priceResearch?: string;
}

const RESEARCH_DATE = "2026-10-21";

const researchNote = (sources: Array<{ url: string; note: string }>): string =>
  JSON.stringify({
    observedOn: RESEARCH_DATE,
    currency: "PKR",
    kind: "indicative",
    note: "Observed on third-party Lahore kite retailers during market research. Not a Metro Lahore Kites price — final prices are set by the business owner.",
    sources,
  });

const categories: Array<{ slug: string; name: string; description: string; image: string; sortOrder: number }> = [
  {
    slug: "patang",
    name: "Patang",
    description: "Traditional single-line Lahore patang in classic and premium finishes.",
    image: "/img/categories/patang.webp",
    sortOrder: 1,
  },
  {
    slug: "gudda",
    name: "Gudda",
    description: "Bigger, steadier kites — from adda size up to 1.5 tawa.",
    image: "/img/categories/gudda.webp",
    sortOrder: 2,
  },
  {
    slug: "kite-dor-kits",
    name: "Kite & Dor Kits",
    description: "Ready-to-fly bundles pairing kites with a matching cotton pinna.",
    image: "/img/categories/kits.webp",
    sortOrder: 3,
  },
  {
    slug: "dor-pinna",
    name: "Dor / Pinna",
    description: "Plain cotton dor wound on pinna. No coated or metal strings.",
    image: "/img/categories/dor.webp",
    sortOrder: 4,
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Gloves, hand-protection tape and carrying bags for the roof.",
    image: "/img/categories/accessories.webp",
    sortOrder: 5,
  },
];

const products: SeedProduct[] = [
  {
    slug: "classic-patang",
    name: "Classic Patang",
    category: "patang",
    description:
      "Our everyday Lahore patang — light tissue paper on bamboo spine and bow, balanced for the rooftop winds of the old city. Available in the sizes flyers ask for most. Exact dimensions and colour mixes are confirmed with your order.",
    unit: "piece",
    sizeSummary: "Small · Standard · 4 Githi · 4.5 Githi",
    art: "patang-classic",
    image: "/img/products/patang-classic.webp",
    imageAlt: "Kites flying during Basant celebrations in Rawalpindi",
    sortOrder: 1,
    variants: [
      { name: "Small", sizeNote: "Compact patang for lighter winds and younger flyers." },
      { name: "Standard", sizeNote: "The everyday full-size patang." },
      { name: "4 Githi", sizeNote: "Larger githi-marked patang, heavier pull." },
      { name: "4.5 Githi", sizeNote: "Largest patang in the range; strong-wind days." },
    ],
    priceResearch: researchNote([
      { url: "https://kite.com.pk/", note: "Patang and gudda range listed; per-piece patang prices vary by size and design." },
      { url: "https://basantshop.com/", note: "1 Tawa Kite Rs 350, 1.5 Tawa Kite Rs 450, 1.5 Tawa Premium Rs 600 (kite listings, not patang-specific)." },
    ]),
  },
  {
    slug: "premium-patang",
    name: "Premium Tissue Patang",
    category: "patang",
    description:
      "Heavier-weight tissue with a reinforced border (kinara) and centre patch (tabee). Built for longer flights and sharper handling during the Basant days. Colour and print options are shared when your order is confirmed.",
    unit: "piece",
    sizeSummary: "Standard · 4 Githi · 4.5 Githi",
    art: "patang-premium",
    image: "/img/products/patang-premium.webp",
    imageAlt: "Boys flying a patang kite from a rooftop during a kite festival in Pushkar",
    sortOrder: 2,
    variants: [
      { name: "Standard", sizeNote: "Reinforced full-size premium patang." },
      { name: "4 Githi", sizeNote: "Larger premium patang." },
      { name: "4.5 Githi", sizeNote: "Largest premium patang; best in strong wind." },
    ],
    priceResearch: researchNote([
      { url: "https://basantshop.com/", note: "1.5 Tawa Premium listed at Rs 600 as an indicative premium-kite price point." },
    ]),
  },
  {
    slug: "gudda",
    name: "Gudda",
    category: "gudda",
    description:
      "The big kite of the season — steadier in gusty wind and built to hold a line. Sized in tawa units, from adda (0.5 tawa) up to 1.5 tawa. Festival guidance commonly cites a maximum of about 40 × 34 inches for gudda and about 35 × 30 inches for patang; please confirm the rules that apply to your flying days.",
    unit: "piece",
    sizeSummary: "Adda / 0.5 Tawa · 0.75 Tawa · 1 Tawa · 1.5 Tawa",
    art: "gudda",
    image: "/img/products/gudda.webp",
    imageAlt: "Huge show kites flying above crowds at an outdoor kite festival",
    sortOrder: 3,
    variants: [
      { name: "Adda / 0.5 Tawa", sizeNote: "Entry-size gudda; light and easy to handle." },
      { name: "0.75 Tawa", sizeNote: "Also called pona — a step up in pull." },
      { name: "1 Tawa", sizeNote: "Standard festival gudda." },
      { name: "1.5 Tawa", sizeNote: "Large festival gudda for experienced flyers." },
    ],
    priceResearch: researchNote([
      { url: "https://lahorekites.com/", note: "Adda 0.5 Tawa Rs 220; 0.75 Tawa (Pona) Rs 240; 1 Tawa from Rs 350; 1.5 Tawa from Rs 475." },
      { url: "https://basantshop.com/", note: "1 Tawa Kite Rs 350; 1.5 Tawa Kite Rs 450." },
    ]),
  },
  {
    slug: "cotton-dor-pinna",
    name: "Cotton Dor / Pinna",
    category: "dor-pinna",
    description:
      "Plain cotton dor wound on a pinna, sold by the piece. Cotton only — no glass-coated (sharp) manja, no chemical or metal coating, no nylon cutting string. Sizes run from half piece to two piece.",
    unit: "piece",
    sizeSummary: "0.5 Piece · 1 Piece · 1.5 Piece · 2 Piece",
    art: "dor-pinna",
    image: "/img/products/dor-pinna.webp",
    imageAlt: "Traditional wooden kite reel charkhi used to wind kite dor",
    sortOrder: 4,
    variants: [
      { name: "0.5 Piece", sizeNote: "Half piece — a light day on the roof." },
      { name: "1 Piece", sizeNote: "One full piece of cotton dor." },
      { name: "1.5 Piece", sizeNote: "One and a half pieces for a longer session." },
      { name: "2 Piece", sizeNote: "Two pieces — the Basant-day standard." },
    ],
    priceResearch: researchNote([
      { url: "https://kite.com.pk/", note: "1 Piece Pinna ₨ 6,500; 1.5 Piece ₨ 8,500; 2 Piece ₨ 15,000." },
      { url: "https://basantshop.com/", note: "Pinna, 2 piece Rs 8,000." },
      { url: "https://lahorekites.com/", note: "Kite String (Dor Pinna) 2 Pc from Rs 8,999." },
    ]),
  },
  {
    slug: "kite-dor-kit",
    name: "Kite & Dor Kit",
    category: "kite-dor-kits",
    description:
      "A ready-to-fly kit: kites plus a matching cotton pinna in one pack, sized for a family rooftop or a full mohalla day. Contents are itemised when your order is confirmed.",
    unit: "set",
    sizeSummary: "Small Kit · Standard Kit · Premium Kit",
    art: "kite-dor-kit",
    image: "/img/products/kite-dor-kit.webp",
    imageAlt: "Kite reel wound with nylon dor thread, part of a kite flying kit",
    sortOrder: 5,
    variants: [
      { name: "Small Kit", sizeNote: "A starter pack for a small rooftop." },
      { name: "Standard Kit", sizeNote: "The most requested family-sized kit." },
      { name: "Premium Kit", sizeNote: "Larger kite count and a heavier pinna." },
    ],
    priceResearch: researchNote([
      { url: "https://lahorekites.com/", note: "Basant 2 Day Bulk Kite Bundle, 42 pcs (gudda & pinna combo) listed at Rs 38,999 as an indicative bundle price point." },
    ]),
  },
  {
    slug: "flying-gloves",
    name: "Flying Gloves",
    category: "accessories",
    description:
      "Protective gloves that keep cotton dor from burning your hands during a long pull. Recommended for every flyer holding the pinna, and for children with adult supervision.",
    unit: "pair",
    sizeSummary: "One size",
    art: "gloves",
    image: "/img/products/gloves.webp",
    imageAlt: "Pairs of protective leather gloves for kite flying",
    sortOrder: 6,
    variants: [{ name: "One Size", sizeNote: "Sized to fit most adult hands." }],
    priceResearch: researchNote([{ url: "https://basantshop.com/", note: "Gloves listed at Rs 750." }]),
  },
  {
    slug: "hand-protection-tape",
    name: "Hand Protection Tape",
    category: "accessories",
    description:
      "Adhesive protection tape wrapped over the fingers and index finger — the standard defence against dor burns. One roll is enough for the season for a single flyer.",
    unit: "piece",
    sizeSummary: "One roll",
    art: "tape",
    image: "/img/products/tape.webp",
    imageAlt: "Rolls of clear hand protection adhesive tape",
    sortOrder: 7,
    variants: [{ name: "One Roll", sizeNote: "Single roll of protection tape." }],
    priceResearch: researchNote([
      { url: "https://lahorekites.com/", note: "Hand Protection Tape listed at Rs 300." },
      { url: "https://basantshop.com/", note: "Medical Tape listed at Rs 200." },
    ]),
  },
  {
    slug: "kite-carrying-bag",
    name: "Kite Carrying Bag",
    category: "accessories",
    description:
      "A sturdy bag that keeps kites flat and dry between the shop and the roof, and safe through the season. Sized for a personal stack or a full dozen.",
    unit: "piece",
    sizeSummary: "Standard · Large",
    art: "bag",
    image: "/img/products/bag.webp",
    imageAlt: "Long sports kit bag for carrying kite flying gear",
    sortOrder: 8,
    variants: [
      { name: "Standard", sizeNote: "Fits a personal stack of kites." },
      { name: "Large", sizeNote: "Holds a dozen-plus kites and a pinna." },
    ],
    priceResearch: researchNote([{ url: "https://lahorekites.com/", note: "Premium Kite Packing Bag from Rs 750." }]),
  },
];

function id(prefix: string, seed: string): string {
  // Deterministic-ish readable id, stable across re-seeds.
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 0xffffffff;
  }
  return `${prefix}_${hash.toString(36)}`;
}

export interface SeedResult {
  adminCreated: boolean;
  adminEmail: string;
  generatedPassword?: string;
}

function seedAdmin(): SeedResult {
  const existingAdmin = get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existingAdmin) return { adminCreated: false, adminEmail: config.admin.email };

  let password = config.admin.password;
  let generated = false;
  if (!password) {
    // No password configured: generate a strong one and print it once.
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.randomBytes(16);
    password = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    generated = true;
  }

  run(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`,
    id("usr", config.admin.email),
    config.admin.name,
    config.admin.email,
    null,
    hashPassword(password),
    nowIso(),
    nowIso(),
  );
  return { adminCreated: true, adminEmail: config.admin.email, generatedPassword: generated ? password : undefined };
}

export function seedCatalog(): void {
  const now = nowIso();
  const storeBrandId = id("brd", "metro-lahore-kites");
  if (!get("SELECT id FROM brands WHERE id = ?", storeBrandId)) {
    run(
      `INSERT INTO brands (id, slug, name, is_store_brand, active, created_at, updated_at)
       VALUES (?, 'metro-lahore-kites', 'Metro Lahore Kites', 1, 1, ?, ?)`,
      storeBrandId,
      now,
      now,
    );
  }

  for (const category of categories) {
    const categoryId = id("cat", category.slug);
    if (!get("SELECT id FROM categories WHERE id = ?", categoryId)) {
      run(
        `INSERT INTO categories (id, slug, name, description, image_path, sort_order, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        categoryId,
        category.slug,
        category.name,
        category.description,
        category.image,
        category.sortOrder,
        now,
        now,
      );
    } else {
      run("UPDATE categories SET image_path = COALESCE(image_path, ?) WHERE id = ?", category.image, categoryId);
    }
  }

  for (const product of products) {
    const categoryId = id("cat", product.category);
    const productId = id("prd", product.slug);
    if (!get("SELECT id FROM products WHERE id = ?", productId)) {
      run(
        `INSERT INTO products (id, slug, name, category_id, brand_id, description, unit, price_pkr, price_status,
                               price_research, status, preorder_only, size_summary, art, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'tbc', ?, 'active', 1, ?, ?, ?, ?, ?)`,
        productId,
        product.slug,
        product.name,
        categoryId,
        storeBrandId,
        product.description,
        product.unit,
        product.priceResearch ? product.priceResearch : null,
        product.sizeSummary,
        product.art,
        product.sortOrder,
        now,
        now,
      );
      product.variants.forEach((variant, index) => {
        run(
          `INSERT INTO product_variants (id, product_id, name, size_note, price_pkr, price_status, stock_status, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, NULL, 'tbc', ?, ?, ?, ?)`,
          id("var", `${product.slug}:${variant.name}`),
          productId,
          variant.name,
          variant.sizeNote ?? "",
          variant.stockStatus ?? "available",
          index,
          now,
          now,
        );
      });
      run(
        `INSERT INTO product_images (id, product_id, path, alt, sort_order, is_primary, created_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)`,
        id("img", product.slug),
        productId,
        product.image,
        product.imageAlt,
        now,
      );
    }
  }
}

let seeded = false;

/** Idempotent bootstrap: settings, catalog and the first admin account. */
export function seedAll(): SeedResult {
  if (seeded) return { adminCreated: false, adminEmail: config.admin.email };
  seeded = true;
  seedSettings();
  seedCatalog();
  const admin = seedAdmin();
  // Make sure an admin exists even if one was created earlier without the env address.
  const anyAdmin = all("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (anyAdmin.length === 0 && !admin.adminCreated) {
    return seedAdmin();
  }
  return admin;
}
