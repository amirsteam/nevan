# Releasing an update to the live site (the two-click routine)

How to get a change from your PC onto **https://nevanhandicraft.com.np** using cPanel's Git™ Version Control on NestNepal. A normal release takes about 10 minutes: 5 of them are the server building the site.

**Use this routine for ordinary changes:** pages, styling, text, images in the code, new features, bug fixes.
**Don't use it alone when a release changes existing data** (a migration script, renamed or reshaped fields). See [When a release changes data](#when-a-release-changes-data) first.

---

## Before you start (once per computer)

- You can push to `github.com/amirsteam/nevan` (VS Code is signed in to GitHub).
- You can log in to cPanel at NestNepal.
- The server setup is already done and doesn't need repeating. For reference, it consists of:
  - the repository clone at `/home/nevanhan/repositories/nevan`;
  - the read-only deploy key (`~/.ssh/github_nevan`);
  - the settings file `~/.nevan-deploy.env`;
  - the backend's environment variables in cPanel → Node.js.

---

## Step 1: Check the change on your PC

From the project folder (`F:\nevan2\nevan`):

```bash
# Backend (only if you changed backend/)
cd backend
npx tsc --noEmit
npm test
npm run build

# Frontend (only if you changed frontend/)
cd ../frontend
npm run lint
npx vitest run
npm run build
```

Everything must pass. Open the site locally (`npm run dev` in both folders) and click through what you changed.

## Step 2: Commit and push

**VS Code:**
1. Open the Source Control panel (`Ctrl+Shift+G`).
2. Write a message describing the change, e.g. `Contact page: add opening hours`.
3. Click **Commit**.
4. Click **Sync Changes** (or ··· → **Push**).

**Or in a terminal:**
```bash
git add -A
git commit -m "Contact page: add opening hours"
git push origin main
```

Only what is pushed to `main` reaches the live site. Note the short commit id (e.g. `a1b2c3d`) that VS Code or `git log --oneline -1` shows; you'll check for it in Step 3.

## Step 3: Click 1, Update from Remote

1. Log in to **cPanel**.
2. Search for **Git™ Version Control** and open it.
3. On the `nevan` row (path `/home/nevanhan/repositories/nevan`), click **Manage**.
4. Open the **Pull or Deploy** tab.
5. Click **Update from Remote**.
6. Check **HEAD Commit** on that page. It must show **your** commit message and id from Step 2. If it still shows an older one, the push didn't reach GitHub: go back to Step 2.

## Step 4: Click 2, Deploy HEAD Commit

1. On the same **Pull or Deploy** tab, click **Deploy HEAD Commit**.
2. cPanel runs the deploy in the background (`.cpanel.yml` → `deploy/cpanel-deploy.sh`). It:
   1. builds the backend and the storefront inside the repository clone;
   2. copies the backend build into `/home/nevanhan/backend` and restarts it, then checks `/api/v1/health`;
   3. copies the storefront build into `/home/nevanhan/public_html`. Nothing there is deleted, so `.htaccess` and `.well-known` stay.
3. Wait **3–5 minutes**. The **Last Deployment** section shows when it ran.

If the build fails, nothing is copied and the live site stays on the previous version.

## Step 5: Check the live site

1. Open https://nevanhandicraft.com.np and press **Ctrl+F5** (a hard refresh), then look at what you changed. Check on a phone too.
2. Backend health: https://backend.nevanhandicraft.com.np/api/v1/health should show `"status":"success"` and `"environment":"production"`.
3. If something seems off, read the deploy log (cPanel → **Terminal**):
   ```bash
   ls -t ~/.cpanel/logs/*git_deploy* | head -1 | xargs tail -40
   ```
   The last lines should end with `==> Done`. npm's `deprecated` and `install-scripts` warnings are normal.
4. After a backend change, glance at the app log for a few minutes:
   ```bash
   tail -30 ~/backend/stderr.log
   ```

Done.

---

## Alternative to Step 4: deploy from Terminal

This does exactly the same as the Deploy HEAD Commit button, but shows the output live. It's useful the first few times, or when the button seems to do nothing. Do Step 3 (Update from Remote) first, then in cPanel → **Terminal**:

```bash
git -C ~/repositories/nevan log --oneline -1                       # must show your commit
bash ~/repositories/nevan/deploy/cpanel-deploy.sh                  # both apps
bash ~/repositories/nevan/deploy/cpanel-deploy.sh --frontend-only  # only the storefront changed (faster)
bash ~/repositories/nevan/deploy/cpanel-deploy.sh --backend-only   # only the backend changed
bash ~/repositories/nevan/deploy/cpanel-deploy.sh --dry-run        # show what would happen, change nothing
```

---

## If something goes wrong

| What you see | What it means / what to do |
|---|---|
| HEAD Commit in cPanel is still the old one | The push didn't reach GitHub. Push again (Step 2), then Update from Remote. |
| Deploy HEAD Commit is greyed out, or says the repository isn't clean | Someone edited files inside `~/repositories/nevan` on the server. Never edit there. Check with `git -C ~/repositories/nevan status`, and ask before discarding anything. |
| The log shows a build error (`error TS…`, `vite` error) | The code doesn't build. Fix it on your PC (Step 1 should have caught it), push, and deploy again. The live site wasn't changed. |
| The log shows `Resource temporarily unavailable`, `Killed` or `Fatal process out of memory` | The hosting account's memory limit was hit while building. It counts every app in the account, so it depends on what else is busy. The script already retries the storefront build once. Nothing on the live site was changed, so just run the Terminal alternative (`--frontend-only` if the backend part finished). If it keeps happening, build the storefront on your PC and upload `frontend/dist` as a zip into `public_html` (extract over the existing files). |
| `The API did not answer at …/health` | The new backend didn't start. Run `tail -60 ~/backend/stderr.log` to see why (often a missing environment variable in cPanel → Node.js → backend app). Fix it, or roll back (below). |
| The site looks unchanged | Your browser cached the old version: press Ctrl+F5, or try a private window. |

### Rollback (put the previous version back)

1. On your PC, undo the bad commit (`git revert <commit id>`) and push.
2. Do Steps 3 and 4 again. The previous code is built and deployed.

In an emergency, restore `~/backend/dist` and `public_html` from a cPanel backup, then run `touch ~/backend/tmp/restart.txt`.

---

## When a release changes data

The database is on MongoDB Atlas **free tier, which has no automatic backups**. Before a release that changes existing data:

1. **Back up live** (on the PC, from `backend/`, using `F:\nevan2\backups\live.env`):
   ```bash
   npm run check-data -- --env-file ../../backups/live.env --uri-var LIVE_MONGODB_URI --out ../../backups/<date>/before.json
   npm run clone-db -- --source-env-file ../../backups/live.env --source-uri-var LIVE_MONGODB_URI --target-db bivanhandicraft_backup_<date> --export-dir ../../backups/<date>/ejson
   ```
2. **Rehearse on a copy** (`clone-db … --target-db nevan_clone --drop-target`), run the migration there, and click through the site locally against that copy.
3. Release with the two-click routine, then run the migration against live (preview first, then `--apply`).
4. Check: `npm run check-data -- … --compare ../../backups/<date>/before.json`, and `npm run backup-images -- … --check`.

The full runbook is in `.agent/workflows/deploy-update-cpanel-git.md`.

---

## Never

- Never run `npm run seed` against the live database (it refuses, but don't try).
- Never edit files inside `~/repositories/nevan` on the server; change code on your PC and push.
- Never put `.env` files, zips or database dumps in `public_html` or `~/backend`. Those folders are reachable from the web; archive such files in `~/archive`.
- Never paste passwords, the database connection string or `~/.ssh/github_nevan` (the private key) into chats, tickets or commits.
