---
description: How to deploy the Node.js backend to NestNepal (cPanel) using GitHub
---

# Deploying Backend to NestNepal (cPanel)

This guide walks you through deploying your Node.js backend to NestNepal's shared hosting using the "Setup Node.js App" feature and GitHub.

## Prerequisites
1.  **Direct GitHub Access**: Your project must be pushed to a GitHub repository.
2.  **NestNepal cPanel Access**: You must have login credentials for your cPanel.

## Step 1: Push Code to GitHub
Ensure your latest code is on GitHub.
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Step 2: Configure Node.js App in cPanel
1.  Log in to **cPanel**.
2.  Search for **"Setup Node.js App"** under the *Software* section.
3.  Click **Create Application**.
4.  **Configuration:**
    *   **Node.js Version**: Select **18.x** or **20.x** (Match your local version if possible).
    *   **Application Mode**: Select **Production**.
    *   **Application Root**: Enter `backend` (or `bivanhandicraft-backend`). This is the folder name where files will live.
    *   **Application URL**: Select your subdomain **`backend.nevanhandicraft.com.np`** from the dropdown.
    *   **Application Startup File**: Enter `dist/server.js` (the compiled output of `npm run build`).
5.  Click **Create**.

## Step 3: Get the Code on the Server
You have two options: **Git Clone (Recommended)** or **Manual Upload**.

### Option A: Using Git (Recommended)
1.  In cPanel, go to **Git™ Version Control**.
2.  Click **Create**.
3.  **Clone URL**: Paste your GitHub Repository URL (HTTPS).
4.  **Repository Path**: Enter the SAME path you used in "Application Root" (e.g., `backend`).
    *   *Note: If cPanel complains the directory exists, you might need to delete the empty folder created in Step 2 first using File Manager.*
5.  Click **Create**.

### Option B: Manual Upload (If Git fails)
1.  Zip your local `backend` folder (exclude `node_modules` and `.env`). Don't commit the zip.
2.  In cPanel **File Manager**, go to the "Application Root" folder (`backend` inside `backend.nevanhandicraft.com.np`'s root, usually).
3.  Upload and Extract the Zip.

## Step 4: Install Dependencies
1.  Go back to **Setup Node.js App**.
2.  Click the **Edit** (Pencil) icon for your app.
3.  Click the **Run NPM Install** button.
    *   *This will read your `package.json` and install libraries.*
4.  Build the TypeScript sources (cPanel **Terminal**, inside the application root, after entering the app's virtualenv command shown at the top of the Node.js App page):
    ```bash
    npm run build
    ```
    This produces `dist/server.js`. Re-run it after every code update.

## Step 5: Configure Environment Variables (.env)
1.  In the "Setup Node.js App" detail page, look for **Environment Variables**.
2.  Click **Add Variable**.
3.  Add every variable listed in `backend/env.production.example` (it lists the exact names the code reads), including:
    *   `NODE_ENV`: `production`
    *   `MONGODB_URI`: your production Atlas connection string
    *   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`: long random values, different from development
    *   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
    *   `ESEWA_MERCHANT_CODE`, `ESEWA_SECRET_KEY`, `KHALTI_SECRET_KEY`, `KHALTI_PUBLIC_KEY`
    *   `FRONTEND_URL` and `ALLOWED_ORIGINS`: comma-separated site origins, e.g. `https://nevanhandicraft.com.np,https://www.nevanhandicraft.com.np`
    *   `BACKEND_URL`: `https://backend.nevanhandicraft.com.np`
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`: required for password-reset emails
    *   Never upload or commit a `.env` file; set values here only.
4.  Click **Save**.

## Step 6: Start the Server
1.  In "Setup Node.js App", click **Restart Application**.
2.  Visit **`https://backend.nevanhandicraft.com.np/api/v1/health`** to verify it's running.

## Troubleshooting
*   **Error 500 / 503**: Check the **stderr.log** file in your Application Root folder via File Manager.
*   **"App updated but changes not showing"**: You MUST click **Restart Application** in cPanel after every code change.
