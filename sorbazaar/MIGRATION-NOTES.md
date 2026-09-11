# MongoDB Atlas Migration Notes — Sorbazaar Backend

The backend was migrated **from Prisma (PostgreSQL) → native MongoDB Atlas driver** while keeping the
Prisma-style method names in route code (so almost no route signatures changed).

## Connection (Atlas, db: `sorbazaar`) — reconnected cleanly ✅
- Credentials: `sourabhbhadouriya47_db_user` on `Cluster0`
  (`mongodb+srv://sourabhbhadouriya47_db_user:<PASSWORD>@cluster0.hs358qf.mongodb.net/sorbazaar?retryWrites=true&w=majority`)
- `config/db.js` connects with the `mongodb` package + `dotenv` (env loaded from `backend/.env`).
- `server.js` now calls `connectDB()` + a `ping` before `app.listen`, and disconnects on SIGINT/SIGTERM.

## Data-access layer (`prismaClient.js`)
- A `Proxy`: `prisma.<model>` returns a `MongoModel` exposing
  `findMany/findFirst/findUnique/create/update/delete/count/deleteMany/updateMany/createMany`.
- Relations are **EMBEDDED** (idiomatic MongoDB): `addresses`, `wishlist`, `recentlyViewed`, `reviews`,
  `promoUsages` live **inside the `users` doc**; `items` inside `orders`; `variants`, `images`, `faqs`,
  `amazonMeta` inside `products`. This removes fragile cross-collection JOIN emulation.
- `id` ↔ `ObjectId` mapping: stored `_id` is serialized back as a hex `id` string (`toApiDoc`); foreign keys
  are stored as that same hex string and matched by `buildFilter` (which converts to `ObjectId` only for `_id`).
- `buildFilter` maps Prisma `where` operators → Mongo: `OR/AND/NOT` (NOT uses `$nor`), `contains`→regex,
  `in/$in`, `notIn/$nin`, `not/$ne`, `has`, `some`→`$elemMatch`, `is`, `lte/lt/gte/gt`.
- `normalizeNested` unwraps Prisma relational `{ create: [...] }`/`{ set: [...] }` into plain embedded arrays.
- `applySelect` honors nested `select` (`{ src: true }`) and `take` (e.g. first product image).

## Routes rewritten for MongoDB
- `middleware/auth.js` — verifies JWT, loads user via `prisma.user.findFirst`.
- `routes/auth.js` — signup/login/forgot-password/reset-password (bcrypt + JWT + embedded arrays).
- `routes/profile.js` — addresses/wishlist/recently-viewed/reviews/notification-preferences on the user doc.
- `routes/products.js` — embedded `variants`/`images`/`faqs`/`amazonMeta`; price-range filtering applied
  in-memory against embedded variant prices (Mongo can't cheaply range-index inside embedded arrays).
- `routes/orders.js` — `items` embedded on the order doc; admin endpoints join minimal user info from `users`.
- `routes/notifications.js` — top-level collection; `createNotification/notifyAdmins/notifyUser` exported.
- `routes/promo.js` — per-user usage counted from embedded `user.promoUsages`.
- `routes/{users, categories, sliders, offers}.js` — work unchanged via the adapter.

## Env / deploy changes
- `.env`, `backend/.env`, `.env.example`, `render.yaml` → `DATABASE_URL`/`MONGODB_URI` point to Atlas (db: sorbazaar).
- `server.js` now uses `process.env.PORT` (was `parseInt(process.env.PORT || 5000)`).
- `JWT_SECRET` fallback added (warns when missing); `CORS_ORIGIN` supported.
- `ensure-indexes.js` no longer references PostgreSQL.

## Verification
Seed run connected to Atlas and inserted: `{ users: 3, products: 9, orders: 4 }`.
Product listing query
`findMany({ where:{ published:true, NOT:{ status:{ in:['draft','archived'] } } }, orderBy:{createdAt:'desc'}, take:5, select:{ id,title,handle,variants,images:{select:{src:true},take:1},badge,productCategory,navPage,rating,reviewCount } })`
returned 5 products (first: "Cotton Kurta Set") with image projection working — validating `$nor`,
operator mapping, and nested `select`/`take`.

## How to run
- Seed:  `node backend/seed.js`
- API:   `cd backend && node server.js`
- Health: `curl http://localhost:5001/api/health`
- Login:  `POST /api/auth/login { "login":"admin01", "password":"admin123" }`  → returns `{ token, user }`
</arg_value></tool_call>