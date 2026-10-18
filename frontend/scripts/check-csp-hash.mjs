/**
 * The Content-Security-Policy in public/.htaccess allows the one inline script
 * in index.html (the theme script) by its sha256 hash. This checks that the
 * hash matches the script, and with --write puts the right hash in.
 *
 *   node scripts/check-csp-hash.mjs          # check (runs before every build)
 *   node scripts/check-csp-hash.mjs --write  # update public/.htaccess
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const htaccessPath = join(root, "public", ".htaccess");
const htaccess = readFileSync(htaccessPath, "utf8");

// Inline scripts without attributes are executable; JSON-LD (type=...) isn't
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (inline.length !== 1) {
  console.error(`✗ Expected exactly one inline <script> in index.html, found ${inline.length}. Update the CSP in public/.htaccess.`);
  process.exit(1);
}
const hash = `sha256-${createHash("sha256").update(inline[0], "utf8").digest("base64")}`;

const current = htaccess.match(/'(sha256-[^']+)'/)?.[1];
if (current === hash) {
  console.log(`✓ CSP hash for the inline theme script is current (${hash})`);
  process.exit(0);
}
if (process.argv.includes("--write")) {
  if (!current) {
    console.error("✗ No 'sha256-…' source found in public/.htaccess to replace");
    process.exit(1);
  }
  writeFileSync(htaccessPath, htaccess.replace(current, hash));
  console.log(`✓ Updated public/.htaccess: ${current} → ${hash}`);
  process.exit(0);
}
console.error(
  `✗ The inline script in index.html changed, so the CSP in public/.htaccess would block it.\n` +
    `  Run: npm run csp-hash   (expected ${hash}, found ${current ?? "none"})`,
);
process.exit(1);
