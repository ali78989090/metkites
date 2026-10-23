# METRO LAHORE KITES — VERCEL MULTI-SERVICE DEPLOYMENT AUDIT

**Date:** 2026-10-22  
**Repo:** https://github.com/ali78989090/metkites  
**Local Path:** `C:\Users\IDS EDITOR 2\Desktop\metrolahorekites`  
**Branch:** `main` (tracking `origin/main`)  
**Status:** Clean working tree (per `git status -sb`)  
**Commits:** `2b6fda5 Include client source files in main repository`, `01fa9cf fifth commit`  

## PHASE 0 — REPOSITORY INSPECTION

### Structure
```text
.
├── client/        # Vite + React 18 frontend
├── server/        # Express 4 + TypeScript backend
├── scripts/       # Utility scripts
├── node_modules/  # Installed
├── .env.example
├── .gitignore
├── package.json   # Root workspace config
├── package-lock.json
├── README.md
├── RESEARCH.md
├── VERIFICATION.md
├── NOTICES.md
└── metrolahorekites.png
```

### Notes
- `client/` is a **normal directory** (contains `src/`, `package.json`, `vite.config.ts`, `node_modules/`). Not a git submodule.
- `server/` is normal directory.
- Root uses **npm workspaces**: `["server", "client"]`
- **No existing `vercel.json`** found in repo root.
- No `.vercel/` directory present.
- Recent user work: frontend polish (shadcn-like cleanup, product/cart UI), product images swapped to real Commons photos, router future flags added, build fixes for TS/node types.

### Root package.json (relevant)
```json
{
  "name": "metrolahorekites",
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently -n server,client -c red,cyan \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w client && npm run build -w server",
    "start": "npm run start -w server",
    "test": "npm run test -w server",
    "typecheck": "npm run typecheck -w server && npm run typecheck -w client"
  },
  "devDependencies": { "concurrently": "^9.1.2", "sharp": "^0.34.2" },
  "engines": { "node": ">=22.5" }
}
```

### Client package.json (key)
- React 18.3.1, react-router-dom 6.30.1, Vite 6.3.5, Tailwind CSS 4.1.11
- Build: `tsc -b && vite build`
- Output: `dist/` (standard Vite)

### Server package.json (key)
- Express 4.21.2, NodeNext ESM, TypeScript 5.8.3
- Build: `tsc -p tsconfig.build.json` -> outputs to `dist/`
- Start: `node dist/index.js`
- Dev: `tsx watch src/index.ts`
- Has multer, bcryptjs, cookie-parser, zod
- Uses `node:sqlite` (built-in) – no external Postgres/MySQL required

## PHASE 1 — VERCEL DOCS REFERENCE (to verify)
Will validate against:
- https://vercel.com/docs/services
- https://vercel.com/docs/projects/project-configuration
- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/functions/runtimes

Note: For multi-service projects on Vercel, `services` + `rewrites` with `destination.service` is the intended pattern. `framework: "express"` can work in some setups, but we must ensure the server entrypoint is compatible with Vercel Functions/Serverless. We'll verify code before committing.

## NEXT STEPS
- Read `server/src/index.ts` (entrypoint), routes, CORS/cookie handling
- Read `client/vite.config.ts`, `client/src/lib/api.ts` (API base/paths)
- Read server route mounting (where `/api/*` is registered)
- Check for `vercel.json` history? (none now)
- Design minimal safe `vercel.json`

Status: PHASE 0 COMPLETE. Moving to PHASE 2.
## PHASE 2 — ARCHITECTURE UNDERSTANDING

### Frontend (client)
- **Framework:** Vite 6 + React 18 + React Router 6 + Tailwind v4
- **Build:** 	sc -b && vite build → outputs to client/dist/
- **API calls:** All via client/src/lib/api.ts using etch(path, { credentials: ""include"", ... }) with **relative paths** like /api/... - no hardcoded localhost URLs in production code
- **Dev:** Vite proxies /api and /uploads to http://localhost:4000 (configurable via VITE_API_TARGET)
- **Routing:** SPA with React Router - needs fallback to index.html
- **Assets:** Static files in client/public/ copied as-is

### Backend (server)
- **Framework:** Express 4, TypeScript ESM (NodeNext)
- **Entry:** server/src/index.ts creates app via uildApp(), calls pp.listen(), does seeding, handles shutdown
- **App:** server/src/app.ts mounts routes at /api/*, serves /uploads statically, serves client/dist with SPA fallback in production
- **Routes:** /api/health, /api/settings, /api/categories, /api/brands, /api/products*, /api/track*, /api/auth/*, /api/preorders/*, /api/admin/*
- **Database:** 
ode:sqlite (built-in DatabaseSync), file-based by default at server/data/metrolahorekites.db, WAL mode, migrations run on boot, seeding on boot
- **Uploads:** Multer-based uploads to config.uploadsDir (default server/uploads), served at /uploads
- **Auth:** Cookie-based sessions (HttpOnly, SameSite=Lax), CSRF origin checks, bcrypt, rate limiting
- **Config:** Loads .env from repo root, validates via env module

### API path compatibility
- Frontend uses relative /api/... paths ✓
- Server mounts all routes under /api ✓
- Same-origin in production when served together ✓
- Cookies require same-origin or proper CORS/origins configured

### Service-to-service calls
- Searched for inter-service calls - **none found**. Frontend calls backend via HTTP, backend is standalone.
- No bindings needed.

## PHASE 3 — MULTI-SERVICE DESIGN (Proposed)

**Services:**
1. client - Vite frontend (static build)
2. server - Express API backend

**Routing:**
- /api/* → server
- /uploads/* → server
- /* → client (SPA fallback)

**Bindings:** None required.

## CRITICAL BLOCKERS

### BLOCKER 1: Server not serverless-compatible
server/src/index.ts does pp.listen() - Vercel Functions require exporting the app/handler, not calling listen(). Needs adaptation.

### BLOCKER 2: Database persistence (CRITICAL)
- Uses 
ode:sqlite with file-based database at server/data/metrolahorekites.db
- **Vercel serverless has ephemeral filesystem** - /tmp is writable but files lost between invocations and not shared across instances
- **Cannot use persistent disk** in serverless functions
- Instruction says: ""Do not replace the existing database, authentication system, or application data"" - cannot switch to Postgres/Turso/etc.
- App **not deployable as-is on Vercel serverless** without data loss on every cold start

### BLOCKER 3: File uploads
- Uploads go to filesystem, served at /uploads - ephemeral in serverless, no cloud storage integration

### BLOCKER 4: Server serves static files
- App serves client/dist and does SPA fallback - would conflict with split services

### BLOCKER 5: Module load side effects
- DB init, migrations, seeding run at import time - problematic in serverless

## FEASIBILITY ASSESSMENT

**The two-service multi-service architecture on Vercel is NOT FEASIBLE with the current application architecture.**

These are fundamental incompatibilities requiring either:
- Converting to external database (violates ""do not replace existing database"")
- Using cloud storage for uploads (major changes)
- Major architectural rewrite

Per instructions: ""If the two-service architecture is not feasible with the existing application, stop and document the specific blocker before implementing a potentially destructive architectural change.""

## STOPPING POINT
I am **stopping implementation** as instructed. I cannot create a working multi-service Vercel configuration without making destructive architectural changes that violate the constraints.
## PHASE 1 — BASELINE (COMPLETED)

**Commands executed:**
- 
pm run typecheck - **PASS** (server + client, no errors)
- 
pm test - **PASS** (74/74 tests, 10 suites, 6398ms)
- 
pm run build - **PASS** (client Vite build + server tsc build)

**Baseline state:**
- Working tree: ## main...origin/main, ?? VERCEL_DEPLOYMENT_AUDIT.md (untracked)
- Database exists: server/data/metrolahorekites.db (4KB) + WAL files present
- Uploads directory exists: server/uploads/
- All existing functionality working
- No pre-existing build/test failures

**Architecture confirmed:**
- Frontend: Vite + React 18, uses relative /api/* calls via pi.ts, SPA routing
- Backend: Express 4 ESM, routes mounted at /api/*, serves /uploads and client/dist in prod, uses pp.listen() in server/src/index.ts
- Database: 
ode:sqlite file-based with migrations + seeding at boot
- Auth: Cookie-based sessions (HttpOnly, SameSite=Lax), CSRF/origin checks, bcrypt
## PHASE 3 — DATABASE INVENTORY
**Tables & row counts (local SQLite):**
- brands: 1, categories: 5, products: 8, product_variants: 22, product_images: 8
- users: 1 (admin), sessions: 0, settings: 22
- pre_orders: 0, order_items: 0, order_status_history: 0, order_contact_logs: 0
- schema_meta: 1

**Data preservation required:** ALL of these tables/records must be preserved in production. DB is at server/data/metrolahorekites.db with WAL files.
## PHASE 2 — VERCEL ARCHITECTURE ANALYSIS (DETAILED)

### Server entrypoint issues
- server/src/index.ts calls pp.listen() - incompatible with Vercel Functions
- Needs to export handler/app for serverless
- In Vercel, for Node.js functions, can export default with (req, res) => {} or use @vercel/node pattern

### Database issues  
- Uses 
ode:sqlite DatabaseSync with file-based DB
- File at server/data/metrolahorekites.db is NOT durable in serverless (ephemeral FS)
- WAL files also problematic
- Need to migrate to durable DB (Vercel Postgres, Neon, Supabase, Turso, etc.)
- Must preserve all schema and data

### Upload issues
- Uses multer to write to filesystem (server/uploads)
- Served via express.static('/uploads')
- Need durable storage (Vercel Blob, Cloudflare R2, S3, etc.)
- Must preserve existing uploads and references

### Session storage
- Uses cookie-based sessions stored in SQLite sessions table
- In serverless with multiple instances, file DB won't be shared
- Also sessions table exists - need durable shared storage

### Current state assessment
- DB has real data: 1 user (admin), 1 brand, 5 categories, 8 products, 22 variants, 8 images, 22 settings, 0 orders
- Uploads directory exists
- All tests pass currently
## PLAN (AWAITING APPROVAL)

### Architecture change needed:
1. **Frontend (client)**: Deploy as Vercel static site with Vite - should work fine
2. **Backend (server)**: Convert to Vercel Serverless Function - need to adapt entrypoint
3. **Database**: Migrate from 
ode:sqlite to **Neon PostgreSQL** (free tier, compatible, Vercel-integrated) or **Vercel Postgres** - need to check latest options
4. **Uploads**: Migrate to **Vercel Blob** or similar durable storage
5. **Sessions**: Move to database-backed sessions in new durable DB

### Required changes:
- Create/adapt server entrypoint for serverless (export handler)
- Replace 
ode:sqlite with PostgreSQL client (pg/neon)
- Rewrite all SQL queries for Postgres compatibility (different syntax in places)
- Migrate schema and all data
- Update upload handling to use Vercel Blob
- Update static file serving
- Create proper ercel.json for multi-service
- Handle environment variables

### Risks:
- Major refactoring of database layer
- SQL dialect differences between SQLite and Postgres
- Data migration complexity
- Session/auth compatibility

**I need explicit approval before making ANY of these changes.** I will first present the full plan and ask for confirmation.
## COMPREHENSIVE DEPLOYMENT PLAN (READ-ONLY ANALYSIS)

### Current State Summary
- **Baseline:** typecheck ✓, tests 74/74 ✓, build ✓
- **DB:** SQLite with 1 admin user, 8 products, 5 categories, full schema (13 tables)
- **Uploads:** Local filesystem (products subfolder)
- **Auth:** Cookie sessions in SQLite + bcrypt + CSRF/origin checks + rate limiting
- **Server:** Express with app.listen() - needs serverless adaptation
- **Frontend:** Vite SPA with relative /api calls

### Vercel Architecture (RECOMMENDED APPROACH)
**Use Vercel Services (multi-service):**
1. **client** service - Vite frontend (static/SSR)
2. **server** service - Node.js serverless function (Express adapted)

**Routing:**
- /api/* → server service
- /uploads/* → Need durable storage (see below)
- /* → client service (SPA fallback)

### Database Migration Plan
**Recommended: Neon PostgreSQL (free tier)**
- Vercel-integrated, serverless-friendly
- PostgreSQL compatible with most SQL
- Free tier available
- Good for this app size

**Migration steps (NO DATA MOVED YET - REQUIRES APPROVAL):**
1. Export full SQLite schema and data
2. Convert SQLite syntax to PostgreSQL (AUTOINCREMENT→SERIAL/IDENTITY, datetime functions, etc.)
3. Create Neon DB and run schema
4. Import data with FK ordering
5. Verify counts and integrity
6. Update server to use pg/Neon client

**Files to change:** server/src/db.ts, all route files using SQL, server/package.json (add pg/@neondatabase/serverless), tests may need adjustment

### Upload Storage Plan
**Recommended: Vercel Blob**
- Integrated with Vercel
- Simple API
- Free tier available

**Migration:**
1. Inventory all files in server/uploads/
2. Upload to Vercel Blob
3. Update DB references (product_images.path, etc.)
4. Update upload handling in admin routes
5. Update serving logic

### Serverless Adaptation
- Convert server/src/index.ts to export handler (no app.listen())
- Make DB init/migrations lazy/idempotent for serverless
- Handle cold starts
- Adjust for ephemeral filesystem

### Required Approvals
Before proceeding I need approval for:
1. **Database provider** (Neon vs Supabase vs Vercel Postgres)
2. **Storage provider** (Vercel Blob vs others)
3. **Production migration** of DB and uploads
4. **Creating external resources** (may incur costs)
5. **Environment variables** setup
6. **Actual deployment**

**This is a massive refactoring. All changes would be reversible in theory but complex.**
## PHASE 0 CONTINUED — VERIFIED VERCEL SERVICES CONFIGURATION
### Vercel Services (Multi-Service) - Verified Research Notes
Based on current Vercel documentation patterns:
- Multi-service projects allow multiple services in one Vercel project
- Each service can have its own root directory, framework, build config
- Routing via ewrites with destination.service is supported
- Services can communicate via service bindings (if needed) but not required here
- Framework detection: Vite for frontend is well-supported
- For Express backends, need to adapt to serverless functions (export handler, no listen())

**Potential vercel.json structure (to be validated):**
`json
{
  "services": {
    "client": {
      "root": "client",
      "framework": "vite"
    },
    "server": {
      "root": "server"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "server", "path": "/api/" } },
    { "source": "/uploads/(.*)", "destination": { "service": "server", "path": "/uploads/" } },
    { "source": "/(.*)", "destination": { "service": "client" } }
  ]
}
`
*Note: Exact schema needs verification against current docs - path handling may vary.*

### Database Comparison (Neon vs Supabase)

**Neon PostgreSQL:**
- Serverless PostgreSQL, Vercel-integrated
- Free tier: 0.5GB storage, autoscaling, branching
- Good for serverless (connection pooling via Neon Proxy)
- Prisma/Drizzle/pg compatible
- Pricing: pay per compute/storage after free tier

**Supabase PostgreSQL:**
- Full backend-as-a-service (auth, storage, etc.)
- Free tier: 500MB DB, 2GB bandwidth
- Has connection pooling
- More features but app already has auth system
- Pricing varies

**Recommendation: Neon PostgreSQL**
- More focused on database, less chance of conflicts with existing auth system
- Better serverless connection handling
- Vercel integration is smooth
- Easier to do direct SQL migration matching current approach

### Complete Change Inventory (READ-ONLY ANALYSIS)

**Database Layer (server/src/db.ts):**
- Replace DatabaseSync from 
ode:sqlite with PostgreSQL client
- Change SQL syntax: INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY, TEXT datetime handling, PRAGMA statements removed
- All ? placeholders → $1, , ... or use parameterized queries differently
- INSERT OR REPLACE, INSERT OR IGNORE → ON CONFLICT DO UPDATE/NOTHING
- LIKE behavior differs slightly
- Transactions work differently in some clients

**Migrations (server/src/db.ts lines 72-246):**
- All CREATE TABLE statements need Postgres syntax
- CHECK constraints syntax similar
- Indexes similar
- Need to handle migration tracking

**All route files using SQL:**
- server/src/routes/public.ts - uses ll(), get(), template literals with params
- server/src/routes/auth.ts - sessions, users
- server/src/routes/preorders.ts - complex transactions
- server/src/routes/admin/*.ts - all CRUD operations
- server/src/lib/auth.ts - session operations
- server/src/lib/serializers.ts - queries
- server/src/lib/seed.ts - seeding logic
- server/src/lib/settings.ts - settings

**Session handling:**
- Currently in SQLite sessions table
- With multiple serverless instances, need shared DB (Postgres solves this)
- Cookie settings need review for cross-domain? (if frontend/backend on same domain via Vercel rewrites, same-origin)

**Uploads:**
- server/src/routes/admin/products.ts - multer diskStorage to filesystem
- server/src/app.ts - serves /uploads as static
- Need to switch to Vercel Blob or similar
- Update all references to image paths

**Server entrypoint:**
- server/src/index.ts - remove app.listen(), export handler
- Need to adapt for Vercel Functions

**Tests:**
- server/tests/api.test.ts uses in-memory SQLite - will need significant changes for Postgres

### Migration Plan (PRESERVES ALL DATA)

**Step 1: Export (safe, local only)**
`ash
# Create consistent backup
sqlite3 server/data/metrolahorekites.db ".backup /tmp/mlk_backup.db"
`

**Step 2: Schema conversion**
- Convert SQLite schema to PostgreSQL compatible
- Handle data type mappings
- Preserve all constraints

**Step 3: Data export/import**
- Export each table in dependency order (respect FKs)
- Transform data as needed
- Import to Neon with verification

**Step 4: Verification**
- Row counts match
- Foreign key integrity
- Admin user can authenticate
- All products/settings intact

**Rollback:** Keep original SQLite backup, can revert code changes via git

### Upload Migration Plan
1. Inventory all files: ind server/uploads -type f
2. Record mappings (filename -> DB references)
3. Upload to Vercel Blob
4. Update DB paths
5. Verify all images load
6. Only delete originals after full verification

### Environment Variables Needed (names only)
**Server:**
- DATABASE_URL (Postgres connection)
- SESSION_SECRET
- ALLOWED_ORIGINS
- SECURE_COOKIES
- ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD
- BUSINESS_WHATSAPP, BUSINESS_PHONE, BUSINESS_EMAIL
- BLOB_READ_WRITE_TOKEN (Vercel Blob)
- NODE_ENV
- PORT (may not be needed in serverless)

**Client:**
- VITE_API_TARGET (not needed in production with rewrites)

### Security Configuration
- Cookies: HttpOnly, Secure (production), SameSite=Lax
- CSRF: origin checks already implemented
- Sessions: in Postgres, shared across instances
- Rate limiting: in-memory (Map) won't work across instances - need to consider Redis/upstash or accept limitation
- Secrets only server-side

### Phased Implementation Plan

**PHASE A: Setup & Preparation (LOCAL ONLY - NO DESTRUCTIVE CHANGES)**
- [ ] Create database abstraction layer
- [ ] Add Postgres dependencies
- [ ] Create conversion utilities
- Acceptance: Code compiles, existing tests still pass

**PHASE B: Schema & Migration Tools (LOCAL ONLY)**
- [ ] Create Postgres schema
- [ ] Create migration/export scripts
- [ ] Test conversion on copy of DB
- Acceptance: Can convert schema and data successfully

**PHASE C: Server Adaptation (LOCAL ONLY)**
- [ ] Create serverless entrypoint
- [ ] Make DB init lazy
- [ ] Adapt for serverless
- Acceptance: Can run in serverless mode locally with Postgres

**PHASE D: Upload Migration (REQUIRES APPROVAL)**
- [ ] Inventory and migrate to Vercel Blob
- [ ] Update references
- Acceptance: All images accessible

**PHASE E: Deployment Config (REQUIRES APPROVAL)**
- [ ] Create vercel.json
- [ ] Configure services
- Acceptance: Valid config

**PHASE F: Testing (PREVIEW ONLY)**
- [ ] Deploy to preview
- [ ] Smoke test all flows
- Acceptance: All tests pass

**PHASE G: Production (EXPLICIT APPROVAL REQUIRED)**
- [ ] Migrate production DB
- [ ] Deploy
- Acceptance: App fully functional

### Local-Only Changes Possible Now
- Database abstraction layer
- Postgres schema definitions
- Migration scripts (testing on copies)
- Serverless entrypoint wrapper
- vercel.json (can be created but not deployed)
- Environment variable documentation

**NONE of these touch production data or create external resources.**
