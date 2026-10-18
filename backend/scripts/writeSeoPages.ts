/**
 * Write the search and link-preview copies of the storefront's pages, the
 * sitemap and the catalog feed (services/seoPagesService.ts) now. The running
 * backend does this on its own when WEB_ROOT is set; this is for a first run,
 * a check, or a local preview.
 *
 *   npm run write-seo-pages -- --web-root ../frontend/dist
 *   node dist/scripts/writeSeoPages.js --web-root /home/nevanhan/public_html
 *
 * Reads the database only (connection string as in scripts/lib/scriptDb.ts:
 * --env-file, --uri-var, --db). The site address is FRONTEND_URL's first entry.
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { argValue, connectReadOnly, describe, resolveUri } from "./lib/scriptDb";
import { writeSeoPages } from "../services/seoPagesService";

const run = async () => {
  const webRoot = argValue("--web-root") || process.env.WEB_ROOT;
  if (!webRoot) throw new Error("Pass --web-root <folder with the storefront's index.html> or set WEB_ROOT");
  const uri = resolveUri();
  await connectReadOnly(uri);
  console.log(`${describe(uri)} → ${webRoot}`);
  const result = await writeSeoPages(webRoot);
  console.log(
    `Wrote ${result.products} product page(s), ${result.pages} information page(s), ${result.sale} sale page(s); ` +
      `removed ${result.removed} old page(s); sitemap has ${result.sitemapUrls} address(es).`,
  );
};

run()
  .catch((error) => {
    console.error(`✗ ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
