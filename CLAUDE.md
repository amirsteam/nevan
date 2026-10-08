# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Full-stack e-commerce for the Nepal market (brand: Nevan, a baby-clothing store; "BivanHandicraft" in code). Three independent npm projects — no workspace tooling, run `npm install` in each:

- `backend/` — Express 5 + Mongoose REST API and Socket.IO server (TypeScript, CommonJS)
- `frontend/` — React 19 + Vite + Tailwind v4 web app (strict TypeScript), customer storefront **and** admin panel (`/admin`)
- `mobile/` — Expo SDK 54 React Native app (customer + admin tabs)
- `shared/types.ts` — interfaces shared by all three; frontend/mobile import via the `@shared/*` alias

## Commands

```bash
# Backend (port 5000, API prefix /api/v1)
cd backend
npm run dev                       # ts-node-dev --transpile-only (does NOT type-check)
npx tsc --noEmit                  # type-check (includes tests)
npm run build && npm start        # compile to dist/, run dist/server.js
npm test                          # Jest + mongodb-memory-server (no real DB needed)
npx jest tests/payment.test.ts    # single file
npx jest -t "replayed against"    # single test by name
npm run seed                      # seeder.ts
npm run migrate-variant-media     # preview moving older products to photos-per-colour (add -- --apply to save)

# Frontend (port 5173; Vite proxies /api and /socket.io -> http://localhost:5000)
cd frontend
npm run dev
npm run build
npm run lint                      # ESLint incl. typescript-eslint
npx tsc --noEmit
npx vitest run                    # all tests
npx vitest run src/utils/helpers.test.ts

# Mobile
cd mobile && npm start            # Expo; real devices: set EXPO_PUBLIC_DEV_HOST or EXPO_PUBLIC_API_URL in mobile/.env.local
npx tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs type-check, tests and build for backend, plus lint for frontend.

API docs (Swagger UI) are served at `http://localhost:5000/api/v1/docs` outside production (`API_DOCS=true` enables them in production). The spec is `backend/docs/openapi.ts` — update it when adding or changing routes.

Backend tests use test secrets set in `tests/setup.ts` (never the developer's `.env`) and fixtures from `tests/helpers.ts`; `tests/chat.test.ts` drives the real Socket.IO server from `config/socket.ts`. Rate limiters are skipped when `NODE_ENV=test`.

## Environment

- Backend reads `backend/.env` (templates: `backend/.env.example`, `backend/env.production.example`). `.env` files are gitignored.
- CORS allow-list = `FRONTEND_URL` (comma-separated) + `ADMIN_URL` + localhost defaults (`config/cors.ts`). Socket.IO uses `ALLOWED_ORIGINS` separately (`config/socket.ts`).
- Frontend uses `VITE_API_URL`; when unset, axios uses `/api/v1` and sockets use the page origin.
- Password-reset codes are emailed via SMTP (`SMTP_*`, `EMAIL_FROM`; `utils/email.ts`). Without `SMTP_HOST` they are logged to the console (and returned in the response when `NODE_ENV=development`); in production sending fails with 503.
- Error monitoring is Sentry, active only when `SENTRY_DSN` (backend, `utils/monitoring.ts`) / `VITE_SENTRY_DSN` (frontend, lazy-loaded chunk) is set.
- No `REDIS_URL` → Socket.IO runs single-instance (in-memory adapter).

## Backend architecture

Request flow: `server.ts` (HTTP + Socket.IO bootstrap, Sentry init) → `app.ts` (helmet, rate limiters, CORS, body limits, cookie-parser, NoSQL-key sanitizer for body and query, morgan, Swagger) → `routes/index.ts` → `routes/*Routes.ts` → `controllers/` (HTTP only) → `services/` (business logic) → `models/`.

- Wrap async handlers with `utils/asyncHandler`; throw `utils/AppError(message, statusCode)`. `middleware/errorHandler.ts` normalizes Mongoose/JWT errors and reports 5xx to Sentry.
- Response shape: `{ status: "success" | "fail" | "error", data: {...}, message?, results?, pagination? }` — list endpoints put `pagination` (`currentPage`, `itemsPerPage`, `totalPages`, `totalItems`) next to `data`, not inside it.
- Validation: express-validator chains in `middleware/validate.ts`, always ending with `handleValidationErrors`. Emails are `normalizeEmail()`-ed on every auth route (including password reset) so lookups match stored addresses.
- Rate limits: `config/rateLimit.ts` — generous per-IP `/api` limit (shared carrier NAT IPs are common in Nepal) plus per-route limiters on login (failures only), register, forgot-password and reset-code routes.

### Auth

- `middleware/auth.ts` (`protect`, `optionalAuth`) + `middleware/role.ts`. Short-lived access JWT in `Authorization: Bearer`.
- Refresh JWTs carry a random `jti` and are tracked per device as SHA-256 hashes in `User.refreshSessions` (max 5). `/auth/refresh-token` rotates them; the old token stays valid for a 60 s grace period so parallel refreshes don't log users out. Logout revokes one session (or all with `allDevices`); password change/reset revokes all.
- Transport (`controllers/authController.ts`): requests with an `Origin` header (browsers) get the refresh token only as an httpOnly cookie scoped to `/api/v1/auth`; requests without one (React Native) get it in the JSON body and send it back in the body.
- Password reset: 6-digit code from the crypto RNG, stored hashed, 10-minute expiry, invalidated after 5 wrong guesses. `forgot-password` responds the same whether or not the email exists.

### Products, sizes and colours

- Prices vary by size (optionally by colour); photos belong to colours. A product either has no variants (`price`, `comparePrice`, `stock`) or variants = size × colour combinations (`price` > 0, optional `comparePrice`, `stock`, `sku`). `sizes` / `colors` (name + swatch `hex`) hold the display order. Each photo in `images` may carry a `color`; untagged photos show for every colour.
- `utils/productVariants.ts` holds the rules, applied by the model's `pre("validate")` hook on every save. For products with variants it derives `price`/`comparePrice` (cheapest variant), `stock` (total), colour spelling and swatches (`COLOR_PALETTE`), size order (`SIZE_ORDER`: the age scale `PRODUCT_SIZES`, then older S–XXL names), each variant's `image` (first photo of its colour; client values are ignored), and `ageGroups` from the sizes (`SIZE_AGE_GROUPS`). Keep `backend/utils/constants.ts` and `frontend/src/utils/constants.ts` in sync.
- Older products stored one photo URL per variant. `adoptVariantImages` moves those into `images` tagged by colour (stable ids, Cloudinary `publicId` parsed from the URL). It runs automatically only while no photo has a colour, and explicitly before every admin write (so clients that don't send variant photos can't wipe them). `GET /admin/products/:id` returns products adopted in memory. `npm run migrate-variant-media` converts them all.
- Admin writes: `PUT /admin/products/:id` takes `images` = existing photos in order with `color`/`alt`/`isPrimary`. Photos left out are removed, and deleted from Cloudinary only after the save. Uploads take `meta` (JSON, per file: `color`, `isPrimary`). `GET /admin/products/options` lists sizes and colours. Variant prices must be > 0; without variants the product price is required.

### Orders, stock, payments

- `services/orderService.ts` builds orders from the user's server-side Cart; prices always come from the DB, never from the client. `reserveStock` decrements stock with conditional `$inc` updates (the filter requires enough stock) before the order is created and releases it if anything fails — this, not the earlier read check, prevents overselling. No transactions are used, so it also works on standalone MongoDB and mongodb-memory-server.
- Shipping cost is computed server-side (`calculateShippingCost` in `orderService.ts`); `frontend/src/utils/helpers.ts` has a copy used only for the checkout preview — change both together (both have tests with the same cases).
- Payment gateways use a strategy pattern in `services/payment/`: implement `IPaymentGateway`, register in `PaymentFactory.ts`. Gateways: COD, eSewa, Khalti (Khalti is hidden in the web checkout UI).
- `PaymentService.verifyPayment` is the security boundary for online payments: the gateway-verified reference (eSewa `transaction_uuid` / Khalti `pidx`) must match a `Payment` initiated for that same order (`gatewayResponse.referenceId`), the verified amount must equal `order.pricing.total`, and on the authenticated `/payments/verify` route the order must belong to the caller. Paid orders are never re-processed. `tests/payment.test.ts` covers the replay and amount attacks.
- Online-payment order lifecycle: eSewa/Khalti orders reserve stock at creation but keep the cart until payment is verified (then only the purchased lines are removed). Placing a new order cancels the customer's earlier pending unpaid online orders (e.g. Back from eSewa and retry); `expireUnpaidOrders` (run every 5 min from `server.ts`, window `ORDER_PAYMENT_TIMEOUT_MINUTES`, default 30) cancels abandoned ones. Both use a conditional update so stock is released once. A payment that arrives after cancellation reopens the order if stock can be re-reserved, otherwise the order stays cancelled, marked paid, with a "refund required" history note. `POST /payments/initiate` doubles as "retry payment" for a pending unpaid order with the same method. Any cancellation (customer, admin, expiry) returns stock; customers can't cancel paid online orders.
- Gateway return URLs (`/payments/esewa/success`, `/esewa/failure/:orderId`, `/khalti/callback`) always redirect to the storefront (`getFrontendUrl()` = first `FRONTEND_URL` entry), never return JSON.
- eSewa uses HMAC-signed base64 callback data plus a status-API lookup (amounts may arrive as `"1,000.0"`); Khalti uses its `lookup` API. Sandbox endpoints are used unless `NODE_ENV=production`.
- Admin dashboard stats (`Order.getDashboardStats`) include `ordersByStatus` and 7 days of `salesByDay` in Asia/Kathmandu time; revenue counts confirmed→delivered orders only.

### Festival/event campaigns

- `models/Campaign.ts` + `services/campaignService.ts`: admins schedule a campaign (festival preset from `utils/festivals.ts`, curated WCAG-AA palette, banners, Nepal-time dates) with an optional automatic sale (percent 1–70 or NPR off; all products, categories incl. subcategories, or chosen products; exclusions). Published campaigns may not overlap (409); state draft/scheduled/live/ended is derived, never stored.
- **Sale prices are never written to products.** `utils/campaignPricing.ts` `priceFor()` is the only pricing rule, used by public product responses (`decorateProducts` in `productController` adds `sale` / variant `salePrice` after any cache), `Cart.calculateTotal(campaign)` and `orderService.createOrder` (items store `originalPrice` + `campaign`, `pricing.savings`). Admin product endpoints return base prices. `getLiveCampaign()` is cached ≤60 s and never past the next start/end; admin writes clear it.
- Public: `GET /campaigns/live` (admins may pass `?preview=<id>`), `GET /campaigns/:slug`, `GET /products?campaign=<slug>`. Admin: `/admin/campaigns` CRUD, `/presets`, `/:id/duplicate` (draft, +1 year, banners not copied), `/:id/banner?variant=desktop|mobile`, `/:id/notify`, `/:id/stats`. `launchDueCampaigns()` runs with the 5-minute job in `server.ts` and claims each campaign atomically before sending the push (`data: { campaign: slug }`).
- Web: `context/CampaignContext.tsx` (fetched once), `components/campaign/AnnouncementBar.tsx`, campaign slide first in `HeroCarousel`, `/sale/:slug` (`pages/Sale.tsx`), prices via `utils/pricing.ts` (`displayPrice`/`cardPrice`); admin `pages/admin/{Campaigns,CampaignEditor}.tsx`, dashboard `components/admin/CampaignCard.tsx`. Mobile: `store/api/campaignsApi.ts`, `components/CampaignBanner.tsx`, `utils/pricing.ts`, ProductList `campaignSlug` param (deep link `nevanhandicraft://sale/:slug`).

### Realtime and notifications

- `config/socket.ts`: Socket.IO `/chat` namespace with JWT auth middleware. Signed-out visitors can chat as guests: `POST /chat/guest-session` (name, optional email; rate limited) returns a guest JWT (audience `chat-guest`, 30 days, not an account login) used as `auth: { guestToken }` in the handshake and the `X-Chat-Guest-Token` header for `/chat/upload`; guest sockets act as customers whose id is the guest id, and guest rooms store `guestId/guestName/guestEmail` instead of `customerId`. Offline guests with an email get at most one reply email per 30 minutes. `claim-guest-chat` (signed-in customer + guest token) moves or merges the guest conversation into the account. Each customer and each guest has at most one open `ChatRoom` (partial unique indexes; `config/db.ts` runs `ChatRoom.syncIndexes()` on startup, and `npm run fix-chat-rooms [-- --apply]` merges duplicate open rooms that block the customer index); all admins share the inbox and any admin can reply (`adminId` = last responder). Sockets join `user:<id>` (badge updates, forced disconnects via `config/socketRegistry.ts`), `admins` (admins only) and at most one `room:<id>` (`join-chat` leaves any previous room). Events: `join-chat`, `leave-chat`, `load-messages` (paged by `before`), `send-message` (text and/or Cloudinary image URLs from this account only; plain text stored as typed — clients render it escaped), `typing`/`stop-typing`, `message-read` (marks the other side's messages read and emits a receipt), `get-unread`, `get-rooms` (admin, `{status}`), `close-room` (admin; customer's next `join-chat` starts a new room). Server pushes `new-message`, `unread-updated`, `rooms-updated`, `room-closed`, `message-read`, `chat-history`. Ack handlers accept both `(cb)` and `(data, cb)`. **The `join-chat` ack carries the history (`messages`, `hasMore`)** — clients enter the room when the ack arrives and drop history for other rooms, so they must take history from the ack (the earlier `chat-history` event is still emitted for old app versions but arrives too early to rely on). Offline recipients get one bell entry per conversation (updated, not duplicated) plus a push. Deactivating a user or revoking all their sessions disconnects their sockets.
- `services/pushNotificationService.ts` sends Expo push notifications and persists `Notification` documents (types `order_update`, `chat_message`, `promotion`, `back_in_stock`, `general`; payload in `data`).
- Images go to Cloudinary through multer instances in `config/cloudinary.ts` (size/type limits defined there).

## Frontend architecture

- Routing: `src/routes/index.tsx` (data router) with `ProtectedRoute` / `AdminRoute` guards; admin pages in `src/pages/admin/` are lazy-loaded under `AdminLayout` so shoppers don't download them. The live admin orders page is `OrdersAdvanced.tsx` (TanStack Table).
- Chat: the floating `ChatWidget` is rendered by the router's root route (`components/layout/AppShell.tsx`), so chat UI can use links; never mount it outside `RouterProvider`. Admins handle chats on `/admin/chat` (`pages/admin/LiveChat.tsx`, the same `ChatWindow` with `embedded`; the floating bubble hides there); the sidebar "Live chat" badge and dashboard "Unread chats" come live from `chat.unreadCount`, and admins get a sound + toast when a customer writes. "Contact forms" (`/admin/messages`) is the contact page inbox, not chat.
- Chat: available to every visitor. Signed-out visitors start a guest chat (`components/chat/GuestChatStart.tsx`; session in `utils/guestChat.ts` — a chat-only token, unlike account tokens it is kept in localStorage); after login the hook claims the guest conversation. `hooks/useChatConnection.ts` (mounted by `components/chat/ChatWidget.tsx` for every visitor; reconnects whenever the identity — user or guest — changes) owns the socket listeners and feeds `store/chatSlice.ts`, so the unread badge works with the window closed; `services/socketService.ts` keeps one socket whose auth callback reads the current token, and `request()` never hangs (resolves with an error when offline). The slice ignores messages/history for rooms other than `activeRoomId`.
- Cart: `components/layout/CartSync.tsx` loads the server cart whenever a user is signed in (including full page loads such as Back from a payment gateway). `cart.hasLoaded` distinguishes "not fetched yet" from "empty" — check it before treating an empty cart as empty. Online payments start via `utils/payment.ts` (`startOnlinePayment`, `canPayOnline`) and `components/PayNowButton.tsx` (retry on order success/failed/detail pages).
- Auth state: `src/context/AuthContext.tsx`. Cart and chat state: Redux Toolkit slices in `src/store/`; use the typed `useAppDispatch` / `useAppSelector` from `store/hooks.ts`.
- Tokens: the access token lives in memory only (`getAccessToken`/`setAccessToken` in `src/api/axios.ts`); the refresh token is the httpOnly cookie. On load, `AuthContext` calls `refreshAccessToken()` to restore the session. `refreshAccessToken()` is single-flight and shared by axios and `services/socketService.ts`. Never store tokens in localStorage.
- HTTP: one axios instance (`withCredentials`) in `src/api/axios.ts` with transparent 401 → refresh → retry; per-domain API modules in `src/api/`; shapes in `src/types/index.ts` (`IApiResponse`, `IPagination`, …).
- Helpers in `src/utils/helpers.ts`: `getErrorMessage(err, fallback)` for API errors, `populated(ref)` for fields the API returns either populated or as an id.
- Store facts (contact details, free-shipping threshold, shipping zones, age groups) live in `shared/store.ts`, re-exported by `src/config/store.ts`; never hard-code them in pages. Every page sets its title with `hooks/usePageTitle`.
- Admin: product create/edit is a full page (`pages/admin/ProductEditor.tsx`, `/admin/products/new` and `/:id/edit`) wrapping `ProductForm`. That is a two-column editor whose state and rules live in `components/admin/product/editorState.ts` (pure, unit-tested): one version, or sizes (chips on the age scale) × colours (swatches, photos per colour), with prices per size (optionally per colour) and a stock grid. Every change, photo removals and order included, waits for Save. New products are created hidden and made visible once their photos have uploaded; if photos fail, the editor reopens on the saved product. Storefront: `utils/productOptions.ts` (sizes/colours in order, photos for a colour); the product page picks colour first (swatches, photos follow the colour), then size.
- Admin lists: list filters live in the URL (`/admin/orders?status=pending`, `?refund=1`, `?order=<id>` opens an order; `/admin/products?stock=low`), which the dashboard's "Needs attention" links rely on. `AdminLayout` polls `GET /admin/badges` and refreshes on the `admin-badges-refresh` window event. Contact-form messages and newsletter subscribers are in `pages/admin/Messages.tsx`.

## Mobile architecture

- Navigation: `RootNavigator` switches between auth stack and app tabs (`TabNavigator`, or `AdminTabNavigator` for admins); typed params in `navigation/types.ts`, deep links (`nevanhandicraft://`) in `navigation/linking.ts`.
- Data: RTK Query APIs in `src/store/api/` plus slices; tokens in `expo-secure-store` (`utils/storage.ts`). Mobile sends the refresh token in the request body (no cookies), including on logout.
- Tokens: `api/tokenRefresh.ts` is the single (single-flight) refresh used by axios, RTK Query and the chat socket. Chat: `screens/chat/ChatScreen.tsx` serves customers (own room) and admins (`roomId` param, from `AdminChatTab` → `AdminChatRoomsScreen`).
- Admin products: `AdminProductEditScreen` is a quick editor (visibility, featured, price/stock per variant, add photos). Creating products and changing sizes, colours or photo order link to the web admin.
- Payments: `screens/checkout/PaymentScreen.tsx` runs the gateway in a WebView and intercepts the storefront's `/order-success` / `/order-failed` redirect URLs to finish natively.
- Theme: colours in `src/theme/index.ts` (aligned with the web tokens; don't hard-code hex values). Metro doesn't bundle `../shared` at runtime, so store facts and the shipping-cost preview are a copy in `src/theme/store.ts` — keep it in sync with `shared/store.ts` and the backend.
- API base URL: `src/utils/config.ts` (`getApiUrl`/`getSocketUrl`), driven by `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_DEV_HOST` in development and the production URL in release builds.

## Deployment

Both apps deploy to NestNepal cPanel (see `.agent/workflows/deploy-*.md`): backend via "Setup Node.js App" (run `npm run build`; startup file `dist/server.js`), frontend as static `dist/` in `public_html`. Production API: `https://backend.nevanhandicraft.com.np/api/v1`. Browsers call it cross-origin from `nevanhandicraft.com.np` (same site), which the `SameSite=Lax` refresh cookie relies on.
