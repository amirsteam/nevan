---
description: Project Overview
---

Project Overview
This is a comprehensive full-stack e-commerce solution tailored for the Nepalese market. It consists of three main components:

Backend: A Node.js/Express REST API serving as the central logic and data handler.
Frontend: A modern, responsive React web application for customers and admins.
Mobile: A compiled React Native (Expo) mobile application for Android and iOS.

Tech Stack

1. Backend (Server)
   Core: Node.js, Express.js (v5), TypeScript
   Database: MongoDB with Mongoose ODM
   Authentication & Security: JSON Web Tokens (JWT), Bcryptjs, Helmet (security headers), Express Rate Limit (DDOS protection), Express Validator
   Storage: Cloudinary (for image hosting) via Multer
   Utilities: Slugify (URL generation), Dotenv

2. Frontend (Web Client)
   Core: React 19, Vite (Build tool), TypeScript
   State Management: Redux Toolkit, React Redux (with typed hooks)
   Styling: Tailwind CSS v4
   Routing: React Router v7
   UI Components: Lucide React, React Icons, React Hot Toast (Notifications), Recharts (Data visualization)
   Networking: Axios (with typed API modules)

3. Mobile (App)
   Framework: React Native with Expo (SDK 54), TypeScript
   Navigation: React Navigation (Stack & Bottom Tabs) with typed navigators
   State Management: Redux Toolkit (with typed hooks)
   Storage: Expo Secure Store (Encrypted local storage)
   UI: Lucide React Native, React Native SVG, React Native Safe Area Context

4. Shared Types
   Location: /shared/types.ts
   Contains: Common type definitions for User, Product, Category, Cart, Order, Payment, etc.
   Usage: Import types from '@shared/types' in both frontend and mobile

TypeScript Guidelines

- Always use strict typing - avoid 'any' type when possible
- Import shared types from '@shared/types' for consistency across projects
- Use typed Redux hooks: useAppDispatch and useAppSelector from store/hooks
- Define prop interfaces for all React components
- Use proper error typing with custom error interfaces

Code Style

- Use functional components with TypeScript
- Prefer named exports for utilities, default exports for components
- Use async/await for asynchronous operations
- Follow the existing folder structure conventions
