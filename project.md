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
Core: Node.js, Express.js (v5)
Database: MongoDB with Mongoose ODM
Authentication & Security: JSON Web Tokens (JWT), Bcryptjs, Helmet (security headers), Express Rate Limit (DDOS protection), Express Validator
Storage: Cloudinary (for image hosting) via Multer
Utilities: Slugify (URL generation), Dotenv
2. Frontend (Web Client)
Core: React 19, Vite (Build tool)
State Management: Redux Toolkit, React Redux
Styling: Tailwind CSS v4
Routing: React Router v7
UI Components: Lucide React, React Icons, React Hot Toast (Notifications), Recharts (Data visualization)
Networking: Axios
3. Mobile (App)
Framework: React Native with Expo (SDK 54)
Navigation: React Navigation (Stack & Bottom Tabs)
State Management: Redux Toolkit
Storage: Expo Secure Store (Encrypted local storage)
UI: Lucide React Native, React Native SVG, React Native Safe Area Context
Recommended Improvements
Here are some technical improvements to elevate the project's quality, maintainability, and performance:

Implement Automated Testing (High Priority)
Backend: The current test script is empty. Integrate Jest or Mocha to write unit tests for your controllers and models.
Frontend: Add Vitest and React Testing Library to ensure critical flows (like checkout or login) don't break during updates.
TypeScript Migration
The project is currently written in JavaScript. specific 
js
 files (axios.js, server.js). Migrating to TypeScript would add type safety, reduce runtime errors, and significantly improve the developer experience with better autocomplete.
API Documentation
Add Swagger/OpenAPI to the backend. This will generate an interactive documentation page for your API, making it much easier to sync development between the backend and the mobile/web clients.
