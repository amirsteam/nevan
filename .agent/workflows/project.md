---
description: Project Overview
---

# Project Overview

Full-stack e-commerce for Nevan, a Nepali baby-clothing brand. Three parts:

- **Backend** — Node.js / Express 5 REST API + Socket.IO chat (TypeScript)
- **Frontend** — React 19 web app: storefront and admin panel (TypeScript)
- **Mobile** — React Native (Expo SDK 54) app for Android and iOS (TypeScript)

For commands, architecture and conventions, see `CLAUDE.md` at the repository root.

## Tech stack

**Backend:** Express 5, MongoDB + Mongoose, JWT (access token + rotating refresh sessions), bcrypt, Helmet, express-rate-limit, express-validator, Cloudinary via Multer, Nodemailer (password-reset email), Socket.IO, Expo push notifications, Swagger UI (`/api/v1/docs`), optional Sentry. Payments: Cash on Delivery, eSewa, Khalti.

**Frontend:** React 19, Vite, Redux Toolkit, Tailwind CSS v4, React Router v7, Axios, TanStack Table, Recharts, Lucide icons, React Hot Toast, optional Sentry.

**Mobile:** Expo SDK 54, React Navigation (stack + tabs), Redux Toolkit / RTK Query, Expo Secure Store, expo-notifications.

## Quality

- Backend: Jest + mongodb-memory-server tests for auth/sessions, password reset, order stock reservation, payment verification (incl. replay/amount attacks), chat sockets, admin endpoints.
- Frontend: Vitest + Testing Library; ESLint with typescript-eslint.
- GitHub Actions CI runs type-checks, lint, tests and builds on every push and pull request.

## Known gaps

- Newsletter signup and the Contact form only simulate success; nothing is stored or sent.
- The shop's age and gender filters are UI-only: products have no age/gender fields and the API ignores those parameters.
- Shipping policy copy (FAQ, Shipping Info, product badge) says shipping is always free, while the API charges NPR 100–300 below NPR 5,000.
- Mobile app has no crash reporting.
