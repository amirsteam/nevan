---
description: Release an update to the live site with cPanel Git™ Version Control, with backups and a tested data check
---

# Releasing an update (cPanel Git)

The live backend runs as a cPanel **Setup Node.js App** (`backend.nevanhandicraft.com.np`), the storefront is the static build in `public_html`. The repository is cloned on the server at `~/repositories/nevan`; `deploy/cpanel-deploy.sh` builds there and copies the results into the app root and `public_html`.

MongoDB Atlas free tier (M0) has **no backups**: the dump in step 2 is the only one. Never run `npm run seed` against live (it refuses, but don't try).

## One-time setup
1. **cPanel → Git™ Version Control → Create**: Clone URL `https://github.com/amirsteam/nevan.git` (private repo: add a cPanel SSH key as a read-only GitHub *Deploy key* and use `git@github.com:amirsteam/nevan.git`), Repository Path `/home/<user>/repositories/nevan`. Never clone into the app root or `public_html`.
2. **Terminal:** `cp ~/repositories/nevan/deploy/nevan-deploy.env.example ~/.nevan-deploy.env` and fill in `APP_ROOT`, `NODEVENV_ACTIVATE`, `WEB_ROOT` from the Setup Node.js App page.
3. **Environment variables** of the Node app: every name in `backend/env.production.example`.
4. `bash ~/repositories/nevan/deploy/cpanel-deploy.sh --dry-run` and read the output.

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
4. **cPanel → Git → Manage → Update from Remote**, then **Deploy HEAD Commit** (runs `.cpanel.yml` → `deploy/cpanel-deploy.sh`), or in Terminal: `bash ~/repositories/nevan/deploy/cpanel-deploy.sh` (`--backend-only` / `--frontend-only`).
5. Data migration (if any) against live: preview, compare with the clone run, then apply.
6. **Check:** `npm run check-data -- … --compare before.json` (nothing missing), `npm run backup-images -- … --check` (every image loads), browse the site, sign in to the admin, watch `stderr.log` in the app root.

## Rollback
- Code: restore `dist/` (app root) and `public_html` from `~/pre-deploy-<date>.tgz`, restore old environment variables, restart (`touch <app root>/tmp/restart.txt`).
- Data: never overwrite live. `mongorestore` the dump into a new database (`--nsTo="bivanhandicraft_restored.*"`), compare with `check-data`, copy back only what's wrong.
