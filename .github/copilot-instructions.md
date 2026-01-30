---
applyTo: "**"
---

# Bivan Handicraft E-commerce Platform

Full-stack e-commerce for Nepal with **backend** (Express/MongoDB), **frontend** (React/Vite), and **mobile** (Expo).

## Architecture Overview

```
backend/          → Express.js REST API (port 5000, prefix /api/v1)
frontend/         → React 19 + Vite web app
mobile/           → React Native Expo app (SDK 54)
shared/types.ts   → Shared TypeScript interfaces across all projects
```

**Data Flow**: Clients → Axios with JWT interceptors → Express routes → Controllers → Services → MongoDB

## Critical Commands

```bash
# Backend
cd backend && npm run dev          # ts-node-dev with hot reload
npm run build && npm start         # Production build
npm test                           # Jest tests with mongodb-memory-server

# Frontend
cd frontend && npm run dev         # Vite dev server
npm run build                      # Production build
npm test                           # Vitest

# Mobile
cd mobile && npm start             # Expo dev server
npx expo start --android           # Android emulator
```

## Backend Patterns

### Controller → Service Architecture

Controllers handle HTTP, services contain business logic:

```typescript
// controllers/productController.ts
const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const { products, pagination } = await productService.getProducts(req.query);
  res.status(200).json({ status: "success", data: { products }, pagination });
});
```

### Error Handling

- Use `AppError` class for operational errors: `throw new AppError('Not found', 404)`
- Wrap async handlers with `asyncHandler()` utility (auto-catches to error middleware)
- Global error handler in `middleware/errorHandler.ts` transforms Mongoose/JWT errors

### Payment Gateway (Strategy Pattern)

Add new payment gateways in `services/payment/`:

1. Implement `IPaymentGateway` interface
2. Register in `PaymentFactory.ts` gateways object
3. Currently: COD, eSewa, Khalti (Nepal-specific wallets)

### Validation

Use express-validator chains in `middleware/validate.ts`:

```typescript
const registerValidator = [
  body("email").isEmail().withMessage("Invalid email"),
  handleValidationErrors, // Always last in chain
];
```

## Frontend/Mobile Patterns

### Shared Types Import

Always import types from shared module:

```typescript
import type { IProduct, IUser, IOrder } from "@shared/types";
```

### Redux Typed Hooks

Use pre-typed hooks from `store/hooks.ts`:

```typescript
const dispatch = useAppDispatch();
const cart = useAppSelector((state) => state.cart);
```

### API Layer Structure

API modules in `src/api/` export typed functions:

```typescript
// api/products.ts
export const productsAPI = {
  getAll: (params: ProductQueryParams) =>
    api.get<IProductsResponse>("/products", { params }),
  getBySlug: (slug: string) => api.get<IProduct>(`/products/${slug}`),
};
```

### Auth Token Management

- Frontend: `localStorage` with axios interceptor auto-refresh
- Mobile: `expo-secure-store` via `utils/storage.ts`

## Mobile-Specific

### Navigation Structure

```
RootNavigator → Auth (Login/Register) | App (Tabs + Checkout flow)
TabNavigator  → HomeTab | Cart | ProfileTab
```

Navigation types defined in `navigation/types.ts` with proper typing for screen params.

### Base URL Configuration

Mobile uses dynamic base URL in `api/axios.ts` - update `LOCAL_IP` constant for development on real devices.

## Key Files Reference

| Purpose         | File                                                      |
| --------------- | --------------------------------------------------------- |
| Shared types    | `shared/types.ts`                                         |
| Backend entry   | `backend/app.ts`, `backend/server.ts`                     |
| Route registry  | `backend/routes/index.ts`                                 |
| Error handling  | `backend/utils/AppError.ts`, `middleware/errorHandler.ts` |
| Auth middleware | `backend/middleware/auth.ts` (protect, optionalAuth)      |
| Frontend auth   | `frontend/src/context/AuthContext.tsx`                    |
| Mobile auth     | `mobile/src/store/authSlice.ts`                           |

## Conventions

- **Responses**: Always `{ status: "success"|"fail"|"error", data: {...}, message?: string }`
- **Product sizes**: Use `PRODUCT_SIZES` constant from shared types
- **Slugs**: Auto-generated via `slugify` for products/categories
- **Images**: Cloudinary storage, `IImage` type with `url` and `publicId`
