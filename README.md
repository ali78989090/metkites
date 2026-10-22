# Metro Lahore Kites — Pre-Order Management System

A complete, production-ready pre-order system for a Lahore kite business.
Visitors browse the catalogue, pick sizes and quantities, and submit a
**pre-order with no login and no advance payment**. Staff manage the
catalogue, pre-orders, customers and settings from a secure admin dashboard.

> **Logo:** `metrolahorekites.png` in the repository root is the official brand
> asset. It is used as-is in the navbar, footer, login and register screens
> (served from `client/public/img/metrolahorekites.png`). Never rename,
> overwrite or regenerate it.

---

## What's included

### Storefront (guest-first)
- **Home, Shop, Product pages** — five seeded categories (Patang, Gudda,
  Kite & Dor Kits, Dor / Pinna, Accessories) with eight products and real
  size variants (githi sizes, tawa sizes, pinna piece sizes).
- **Prices are deliberately "Price to be confirmed"** — the catalogue ships
  with no invented prices. Staff set real prices in Admin → Products at any
  time; the storefront then shows them and computes subtotals automatically.
- **Pre-order cart** that persists across refreshes (localStorage).
- **Guest checkout is mandatory-capable** — no account, no payment. The
  customer form (name, mobile, address, city, note) plus conditional order
  preferences (kite size/type for kite lines, dor type for dor lines, brand
  always) are enforced **server-side**, not just in the UI.
- **Idempotent submission** — a client-generated idempotency key means a
  double-click or network retry never creates a duplicate order; the original
  reference and tracking token are returned.
- **Confirmation page** with a unique reference (`MLK-YYMMDD-XXXXXX`) and a
  private tracking link.
- **Public tracking** by reference + token or reference + phone. The public
  payload contains **no personal data** — no name, phone or address is ever
  exposed.
- **WhatsApp button only when a number is configured** — hidden by default;
  staff set the number in Admin → Settings. Nothing is ever invented.
- Optional accounts (customers can register to see their own orders — and
  only their own).

### Admin dashboard (server-side protected)
- **Overview** — totals, per-status counts, unique customers, recent orders.
- **Pre-orders** — search, status/date filters, pagination, full customer
  context, per-line snapshots, status history, staff notes, contact logs,
  CSV export of orders and of the customer directory.
- **Status workflow** — `pending → confirmed → preparing → ready →
  dispatched → delivered` (plus `cancelled`, with a documented transition
  graph enforced on the server; the UI only offers legal moves).
- **Products** — create/edit with variants, per-variant pricing, image
  upload (webp/png/jpg/avif/svg, size-limited), deactivate, and
  archive-not-delete when an order references the product.
- **Settings** — WhatsApp number, pre-order on/off pause, configurable legal
  notice, per-status customer messages, size/type option lists — all
  whitelisted keys, sanitised on write.
- **Accounts** — session cookies (HttpOnly, SameSite=Lax, secure in
  production), CSRF origin checks on state-changing requests, login rate
  limiting, bcrypt password hashing. Admin routes reject anonymous visitors
  with 401 and signed-in customers with 403.

### Compliance & safety
- Cotton dor only — the catalogue and the configurable legal notice
  explicitly exclude glass-coated / metal-coated / nylon cutting strings.
- Tracking never leaks PII; admin endpoints are protected server-side.
- No static mockups: every success state is rendered only after the backend
  confirms it. No hardcoded secrets.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Server | Node.js ≥ 22.5 (uses built-in `node:sqlite`), Express 4, TypeScript (ESM), Zod, bcryptjs, multer |
| Client | Vite 6, React 18, React Router 6, Tailwind CSS v4 |
| Database | SQLite file (`server/data/metrolahorekites.db`) — migrations run on boot |
| Tests | `node:test` + tsx against the real app on an in-memory database |

No native compilation is required.

---

## Quick start

```bash
# 1. Install dependencies (npm workspaces: server + client)
npm install

# 2. Configure the environment
cp .env.example .env
#    then edit .env — at minimum set ADMIN_PASSWORD and SESSION_SECRET

# 3. Generate product imagery (already committed under client/public/img,
#    re-run only if you change scripts/generate-images.mjs)
npm run generate:images

# 4. Develop (API on :4000, Vite dev server on :5173 proxying /api)
npm run dev
```

**First run** creates the database, seeds the catalogue and bootstraps the
admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. If no password is set, a
strong random one is generated and **printed once** to the server console —
sign in at `/admin` and change it immediately.

### Production

```bash
npm run build     # client → client/dist, server → server/dist
npm start         # single Node process serving the API + built SPA + uploads
```

---

## Environment variables

See `.env.example` for the annotated source of truth. Summary:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port |
| `DATABASE_PATH` | `server/data/metrolahorekites.db` | SQLite file (`:memory:` for ephemeral) |
| `UPLOADS_DIR` | `server/uploads` | Admin-uploaded product images (served at `/uploads`) |
| `ADMIN_EMAIL` | `admin@metrolahorekites.pk` | First admin login |
| `ADMIN_NAME` | `Metro Lahore Kites Admin` | Admin display name |
| `ADMIN_PASSWORD` | *(generated, printed once)* | First admin password |
| `SESSION_SECRET` | *(required in production)* | Signs session cookies |
| `ALLOWED_ORIGINS` | *(request host)* | Extra origins allowed for cookie-authenticated mutations |
| `SECURE_COOKIES` | on in production | HTTPS-only cookies |
| `BUSINESS_WHATSAPP` | *(empty — button hidden)* | International format, no `+`, e.g. `923001234567` |
| `BUSINESS_PHONE` / `BUSINESS_EMAIL` | *(empty)* | Contact details, also editable in Admin → Settings |

All of these (except secrets) are editable afterwards in **Admin →
Settings**, which writes to the database rather than the environment.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (:4000) + Vite dev server (:5173) together |
| `npm run build` | Type-check and build client and server |
| `npm start` | Run the production server (serves `client/dist`) |
| `npm test` | API test suite (74 tests, in-memory SQLite) |
| `npm run typecheck` | `tsc --noEmit` for both workspaces |
| `npm run generate:images` | Regenerate WebP product/category art from SVG sources |

---

## Verification status

Run on Node 24.16 / Windows:

| Check | Result |
| --- | --- |
| `npm test` | ✅ 74/74 passing (catalogue, auth + CSRF + rate limits, product CRUD + media, settings whitelist, guest checkout incl. idempotency and conditional preferences, tracking privacy, order lifecycle, CSV exports, archive rules, ownership) |
| `npm run typecheck` | ✅ clean (server + tests + client) |
| `npm run build` | ✅ clean (Vite production bundle + server `tsc`) |
| Browser smoke test | ✅ full guest checkout → reference issued → admin status change → public tracking reflects it with zero PII |

Notes carried from research (see `RESEARCH.md`):

- Every catalogue price ships as **"Price to be confirmed"** — no prices are
  invented anywhere in the product.
- The WhatsApp button stays hidden until a real number is entered in
  Admin → Settings.
- The legal notice text is configurable in Admin → Settings so the business
  can re-check Punjab kite-flying rules each season before publishing.
- Basant 2027 festival dates were **not** claimed anywhere in the UI — the
  sources disagree, and dates are authority-set each season.

---

## Project layout

```
├── client/                  # Vite + React storefront and admin SPA
│   ├── public/img/          # metrolahorekites.png + generated WebP artwork
│   └── src/
│       ├── pages/           # Public pages (home, shop, cart, checkout, …)
│       ├── admin/           # Admin dashboard pages
│       ├── components/      # Shared UI
│       └── lib/             # api client, cart store, formatting
├── server/
│   ├── src/
│   │   ├── routes/          # public, auth, preorders, admin/*
│   │   ├── lib/             # db, auth, settings, serializers, seed
│   │   ├── app.ts           # Express app (SPA fallback, /uploads, /api)
│   │   └── index.ts         # boot + first-run seeding
│   ├── tests/api.test.ts    # end-to-end API suite
│   └── data/                # SQLite database (gitignored)
├── scripts/generate-images.mjs
├── RESEARCH.md              # market research notes and sources
└── .env.example
```
