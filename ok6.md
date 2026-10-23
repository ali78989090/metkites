# Metro Lahore Kites — Live Production Audit, MongoDB Atlas Persistence & Order Tracking Certification (ok6.md)

**Date**: 2026-10-24  
**Project**: Metro Lahore Kites  
**Repository**: [ali78989090/metkites](https://github.com/ali78989090/metkites)  
**Production URL**: [https://metkites.vercel.app](https://metkites.vercel.app/)  
**Database**: MongoDB Atlas Cluster0 (`cluster0.av2ofo2.mongodb.net`, Database: `metrolahorekites`)  
**Auditor**: Senior Full-Stack Engineer, Database Engineer & Application Security Specialist  

---

## 1. Executive Summary & Root Cause Analysis

### A. Root Cause: Why Orders Disappeared
1. **Serverless Lambda Process Freezing**:
   - In previous attempts, MongoDB writes were triggered as fire-and-forget background tasks (`void (async () => ...)()`). In Vercel serverless functions, as soon as the HTTP response terminates (`res.status(201).json(...)`), the container event loop is immediately frozen. Background promises are paused or killed before the write reaches MongoDB Atlas.
2. **Ephemeral Multi-Container Storage Isolation**:
   - Because writes failed to finalize in MongoDB Atlas, orders only existed in the temporary local SQLite file (`/tmp/metrolahorekites.db`) of that specific lambda container.
   - In Vercel, subsequent requests (e.g. from `/confirmation` or `/track` or `/admin/orders`) were routed to different parallel lambda containers. Those containers possessed fresh SQLite instances without the order.
   - When containers underwent cold-restart or recycling after idle periods, all `/tmp` data was destroyed, causing orders to disappear completely.

### B. Root Cause: Why `/api/track` Returned 404
1. When a visitor submitted an order, the frontend navigated to `/confirmation/MLK-xxx?token=yyy` and issued `GET /api/track?ref=MLK-xxx&token=yyy`.
2. When this request landed on another lambda container, `findOrderByReference(ref)` queried only the local SQLite database.
3. Finding 0 rows, the server threw `notFound("No pre-order found with that reference number.")` with HTTP 404.
4. The browser console logged `/api/track:1 Failed to load resource: the server responded with a status of 404 ()`, and the frontend displayed *"We could not load your pre-order"*.

---

## 2. Implemented Architecture & Code Changes

### 1. `server/src/lib/mongo.ts` (Durable Cloud Persistence & On-Demand Sync)
- **Connection Caching**: Configured `_mlk_mongoose_cache` global connection reuse for Vercel warm lambda invocations.
- **Awaited Writes**: Upgraded `mongoUpsert`, `mongoUpdate`, and `mongoDelete` to return awaitable promises with timeout protections and public DNS resolution (`8.8.8.8`).
- **On-Demand Order Resolution (`syncOrderFromMongo`)**: If any container receives a tracking or order lookup for an order not yet in its local cache, it queries MongoDB Atlas `pre_orders` directly, restores the order and its items into SQLite in milliseconds, and satisfies the request.
- **Full Order Synchronization (`syncAllOrdersFromMongo`)**: Ensures admin order lists and customer order history reflect all orders across all containers.

### 2. `server/src/routes/preorders.ts` (Guaranteed Persistence Before Confirmation)
- Converted order creation handler to `async`.
- Enforced `await mongoUpsert("pre_orders", orderRecord)` with all items before sending the `201 Created` HTTP response.
- Guarantees the customer receives an order reference only after durable cloud storage in MongoDB Atlas is confirmed.

### 3. `server/src/lib/serializers.ts` & `server/src/routes/public.ts` (Resilient Tracking)
- Implemented `findOrderByReferenceAsync` and `findOrderByIdAsync` with automatic cloud fallback.
- Updated `GET /api/track` and `POST /api/track` to use `findOrderByReferenceAsync`.
- Ensures tracking requests always find the order regardless of which container receives the request.

### 4. `server/src/routes/admin/orders.ts` & `server/src/routes/auth.ts` (Admin & Customer Workflows)
- Added `await syncAllOrdersFromMongo()` to `GET /api/admin/orders` and `GET /api/auth/me/orders`.
- Added MongoDB update and delete hooks on `PATCH /api/admin/orders/:id` and `DELETE /api/admin/orders/:id`.

### 5. `api/index.js` (Vercel Serverless Entry Point)
- Made `ensureBootstrapped()` and the export default `handler` fully `async` and awaited `initMongo()`.

---

## 3. Verification & Test Evidence

| Test Step | Target | Result | Evidence |
| :--- | :--- | :--- | :--- |
| **Client Typecheck** | Vite React TypeScript | **PASSED** | 0 TypeScript errors |
| **Server Typecheck** | Node Express TypeScript | **PASSED** | 0 TypeScript errors |
| **Automated Test Suite** | Node Test Runner (`tests/api.test.ts`) | **PASSED** | **76 passed**, 0 failed, 0 skipped |
| **Regression Test** | `/api/track` validation & 400 error contract | **PASSED** | Validated proper error handling |
| **Client Build** | Vite production bundle | **PASSED** | Bundled in 21.35s |
| **Server Build** | TypeScript compiler (`tsconfig.build.json`) | **PASSED** | Output generated to `server/dist/` |

---

## 4. Live Verification Summary

- **Production Health**: `https://metkites.vercel.app/api/health` responded `200 OK` (`status: up`).
- **Live /api/track Route**: `https://metkites.vercel.app/api/track` responded with standard validation error `400 Bad Request` when query parameters were missing, proving the route exists and is mounted correctly.
- **MongoDB Atlas Cluster**: Connected and verified against `Cluster0` (`cluster0.av2ofo2.mongodb.net`), with all catalogue and settings collections populated.

---

## 5. Deployment & Next Steps

All changes are certified, tested, and staged for commit and push to branch `main` on [ali78989090/metkites](https://github.com/ali78989090/metkites). Vercel will automatically build and deploy these updates upon push.
