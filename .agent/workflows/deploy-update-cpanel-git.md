---
description: Release an update to the live site with cPanel Git™ Version Control, with backups and a tested data check
---

# Releasing an update (cPanel Git)

The live backend runs as a cPanel **Setup Node.js App** (`backend.nevanhandicraft.com.np`), the storefront is the static build in `public_html`. The repository is cloned on the server at `~/repositories/nevan`; `deploy/cpanel-deploy.sh` builds there and copies the results into the app root and `public_html`.

MongoDB Atlas free tier (M0) has **no backups**: the dump in step 2 is the only one. Never run `npm run seed` against live (it refuses, but don't try).

## One-time setup
1. **Deploy key (the repository is private).** cPanel Terminal; no passphrase, because cPanel Git can't use passphrase-protected keys:
   ```bash
   ssh-keygen -t ed25519 -C "nestnepal-nevan-deploy" -f ~/.ssh/github_nevan -N ""
   printf 'Host github.com\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/github_nevan\n  IdentitiesOnly yes\n' >> ~/.ssh/config
   chmod 700 ~/.ssh; chmod 600 ~/.ssh/config ~/.ssh/github_nevan
   cat ~/.ssh/github_nevan.pub
   ```
   GitHub → repository → Settings → Deploy keys → Add deploy key, with that public key and **write access off**. Then `ssh -T git@github.com`, answer `yes` (this records GitHub's host key, which cPanel needs); expect "successfully authenticated".
2. **cPanel → Git™ Version Control → Create:**
   - *Clone a Repository* on;
   - Clone URL `git@github.com:amirsteam/nevan.git`;
   - Repository Path `/home/<user>/repositories/nevan`. Never the app root or `public_html`.
3. **Terminal:** `cp ~/repositories/nevan/deploy/nevan-deploy.env.example ~/.nevan-deploy.env && chmod 600 ~/.nevan-deploy.env`, then fill in `APP_ROOT`, `NODEVENV_ACTIVATE` and `WEB_ROOT` from the Setup Node.js App page.
4. **Environment variables** of the Node app: every name in `backend/env.production.example`, except:
   - **`PORT`**: leave it unset; the Node.js Selector (Passenger) assigns it.
   - **`FRONTEND_URL`**: put the bare domain first; payment redirects use the first entry.
5. **Dry run:** `bash ~/repositories/nevan/deploy/cpanel-deploy.sh --dry-run`, and read the output.
6. **Build test inside the clone only** (copies nothing to live):
   ```bash
   source <NODEVENV_ACTIVATE>
   cd ~/repositories/nevan/backend && npm ci && npm run build
   cd ../frontend && npm ci && npm run build
   ```
   If the shared host's memory limit kills the frontend build, retry with `NODE_OPTIONS=--max-old-space-size=1024`. If that also fails, build the frontend on a PC and upload `frontend/dist` as a zip into `public_html`, extracting over the existing files so `.htaccess` stays.

## Every release
1. Push to `main` (tests and builds pass locally).
2. **Back up** (on your PC, files kept outside the repo, e.g. `F:\nevan2\backups\<date>\`; the live connection string is in `F:\nevan2\backups\live.env` as `LIVE_MONGODB_URI`):
   ```bash
   mongodump --uri="<live uri>" --gzip --archive=live.archive.gz     # MongoDB Database Tools
   cd backend
   npm run check-data -- --env-file ../../backups/live.env --uri-var LIVE_MONGODB_URI --out ../../backups/<date>/before.json
   npm run backup-images -- --env-file ../../backups/live.env --uri-var LIVE_MONGODB_URI --out ../../backups/<date>/images
   ```
   Server files: `tar czf ~/pre-deploy-$(date +%F).tgz <app root> public_html` (cPanel Terminal).
3. **If the release changes data** (a migration script): rehearse on a clone first:
   ```bash
   mongorestore --uri="<dev cluster uri>" --gzip --archive=live.archive.gz --nsFrom="bivanhandicraft.*" --nsTo="nevan_clone.*" --drop
   #   (or: npm run clone-db -- --source-env-file ../../backups/live.env --source-uri-var LIVE_MONGODB_URI --target-db nevan_clone --drop-target)
   npm run check-data -- --db nevan_clone --compare ../../backups/<date>/before.json
   # run the migration against nevan_clone, then check-data --compare again and backup-images --db nevan_clone --check
   ```
   Run the app locally against `nevan_clone` and click through before touching live.
4. **cPanel → Git™ Version Control → Manage → Pull or Deploy → Update from Remote**, then **Deploy HEAD Commit** (runs `.cpanel.yml` → `deploy/cpanel-deploy.sh`; the log is in `~/.cpanel/logs/`), or in Terminal: `bash ~/repositories/nevan/deploy/cpanel-deploy.sh` (`--backend-only` / `--frontend-only`). Deploy HEAD Commit needs a clean clone, so never edit files inside `~/repositories/nevan`.
5. Data migration (if any) against live: preview, compare with the clone run, then apply.
6. **Check:** `npm run check-data -- … --compare before.json` (nothing missing), `npm run backup-images -- … --check` (every image loads), browse the site, sign in to the admin, watch `stderr.log` in the app root.

## Server notes
- The backend's app root is also its subdomain's web folder, so files in it could be downloaded directly. The end of its `.htaccess` keeps a `<FilesMatch "\.(zip|log|txt|md|js|cjs|mjs|ts|map|json|lock|yml|yaml|example|bak|sql|sh|env)$"> Require all denied </FilesMatch>` block: only the API is public. Keep it, and never leave zips or dumps in the app root or `public_html`. Archive them in `~/archive`.
- Env vars live in the CloudLinux block of that `.htaccess`, written by cPanel → Node.js. Anything outside the CloudLinux blocks survives cPanel edits.
- The Node version comes from the app's nodevenv (`~/nodevenv/<app>/<version>/bin/activate`). The deploy script uses it for builds too.

## Rollback
- Code: restore `dist/` (app root) and `public_html` from `~/pre-deploy-<date>.tgz`, restore old environment variables, restart (`touch <app root>/tmp/restart.txt`).
- Data: never overwrite live. `mongorestore` the dump into a new database (`--nsTo="bivanhandicraft_restored.*"`), compare with `check-data`, copy back only what's wrong.
