---
description: How to deploy the React frontend to NestNepal (cPanel) main domain
---

# Deploying Frontend to NestNepal (cPanel)

This guide walks you through deploying your React/Vite frontend to NestNepal's shared hosting on the main domain **https://nevanhandicraft.com.np**.

## Prerequisites

1. **Backend Already Deployed**: Backend is running at `https://backend.nevanhandicraft.com.np`
2. **NestNepal cPanel Access**: Login credentials for your cPanel
3. **Node.js Installed Locally**: To build the production bundle

## Current Configuration ✅

Your frontend is already configured correctly:

- **API URL**: `.env.production` points to `https://backend.nevanhandicraft.com.np/api/v1`

---

## Step 1: Build the Production Bundle

Open terminal in the `frontend` folder and run:

```bash
cd frontend
npm run build
```

This creates a `dist` folder containing:

- `index.html` - Main HTML file
- `assets/` - JS, CSS, and image files (hashed for caching)

---

## Step 2: Log in to cPanel

1. Go to your NestNepal cPanel login URL (usually `https://nevanhandicraft.com.np:2083` or provided by NestNepal)
2. Enter your username and password
3. You'll land on the cPanel dashboard

---

## Step 3: Upload Files to public_html

### Option A: Using File Manager (Recommended for first time)

1. In cPanel, click **File Manager**
2. Navigate to **public_html** folder (this is your main domain's root)
3. **Delete existing files** (if any old website exists):
   - Select all files EXCEPT `.htaccess` if it exists
   - Click **Delete**
4. Click **Upload** button (top menu)
5. Upload ALL contents from your local `frontend/dist` folder:
   - `index.html`
   - `assets/` folder (you may need to create this folder first, then upload files inside)
   - Any other files in dist (favicon, etc.)

### Option B: Using FTP Client (FileZilla)

1. Get FTP credentials from cPanel → **FTP Accounts**
2. Connect using FileZilla:
   - Host: `ftp.nevanhandicraft.com.np` or your server IP
   - Username: Your cPanel username
   - Password: Your cPanel password
   - Port: 21
3. Navigate to `public_html` on the remote side
4. Upload all contents from `frontend/dist` folder

### Option C: Using Git + Build Script (Advanced)

1. In cPanel, go to **Git™ Version Control**
2. Clone your repository
3. Use cPanel's **Terminal** or SSH to:
   ```bash
   cd ~/public_html
   git pull origin main
   cd frontend
   npm install
   npm run build
   cp -r dist/* ~/public_html/
   ```

---

## Step 4: Configure .htaccess for SPA Routing

React is a Single Page Application (SPA). Without proper configuration, refreshing on routes like `/products` will show a 404 error.

⚠️ **IMPORTANT**: Your `.htaccess` already contains CloudLinux environment variables. **DO NOT DELETE THEM!**

1. In **File Manager**, go to **public_html**
2. Right-click `.htaccess` → **Edit**
3. **ADD the following AFTER the existing CloudLinux section** (after the `# DO NOT REMOVE OR MODIFY. CLOUDLINUX ENV VARS CONFIGURATION END` line):

```apache
# ===== SPA ROUTING FOR REACT APP =====
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite everything else to index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Enable GZIP compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json
</IfModule>

# Set caching headers for assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

5. Click **Save Changes**

---

## Step 5: Update Backend CORS Settings

Make sure your backend allows requests from the frontend domain.

In cPanel for **backend.nevanhandicraft.com.np**:

1. Go to **Setup Node.js App**
2. Edit your backend app
3. In **Environment Variables**, update `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://nevanhandicraft.com.np
   ```
   Or if you need multiple origins:
   ```
   FRONTEND_URL=https://nevanhandicraft.com.np,https://www.nevanhandicraft.com.np
   ```
4. Click **Restart Application**

---

## Step 6: Test Your Deployment

1. Visit **https://nevanhandicraft.com.np**
2. Check these scenarios:
   - [ ] Homepage loads correctly
   - [ ] Products page loads with images
   - [ ] Login/Signup works
   - [ ] Add to cart works
   - [ ] Refresh on any page (e.g., `/products`) doesn't show 404
   - [ ] Checkout process works

---

## Updating the Website (Future Deployments)

Every time you make changes:

```bash
# 1. Build locally
cd frontend
npm run build

# 2. Upload to cPanel
# - Go to File Manager → public_html
# - Delete old assets/ folder
# - Upload new dist/* contents
# - (No need to touch .htaccess)
```

**Or create a simple deploy script:**

```bash
# deploy-frontend.sh (run from frontend folder)
npm run build
# Then use FTP/SCP to upload dist/* to public_html
```

---

## Troubleshooting

### "404 Not Found" on page refresh

- `.htaccess` file is missing or incorrect
- Check if `mod_rewrite` is enabled (contact NestNepal support)

### API calls failing (CORS errors)

- Check browser console for exact error
- Ensure `FRONTEND_URL` in backend includes your domain
- Make sure you're using `https://` not `http://`

### Blank white page

- Check browser console (F12) for JavaScript errors
- Verify all files from `dist/` were uploaded
- Check if `assets/` folder structure is correct

### Images not loading

- Check if image paths are correct
- Cloudinary images should work (external URLs)
- Local images in `assets/` need correct relative paths

### "Mixed Content" warnings

- Your site is HTTPS but loading HTTP resources
- Ensure all API calls use `https://`
- Check `.env.production` has `https://` URLs

---

## File Structure After Deployment

Your `public_html` folder should look like:

```
public_html/
├── index.html
├── .htaccess
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ... (other assets)
├── favicon.ico (if any)
└── ... (other static files)
```

---

## SSL Certificate

NestNepal typically provides free SSL (Let's Encrypt). If HTTPS is not working:

1. In cPanel, go to **SSL/TLS Status**
2. Check if certificate is installed for `nevanhandicraft.com.np`
3. If not, go to **AutoSSL** and run it
4. Or contact NestNepal support to enable SSL

---

## Summary

| Step | Action                                       |
| ---- | -------------------------------------------- |
| 1    | Run `npm run build` in frontend folder       |
| 2    | Log in to cPanel                             |
| 3    | Upload `dist/*` contents to `public_html`    |
| 4    | Create/update `.htaccess` for SPA routing    |
| 5    | Update backend CORS to allow frontend domain |
| 6    | Test all functionality                       |

Your frontend should now be live at **https://nevanhandicraft.com.np** 🎉
