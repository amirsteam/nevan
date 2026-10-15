/**
 * Back up (or check) every image a database refers to — see lib/imageRefs.ts.
 *
 *   npm run backup-images -- --out ../../backups/2026-10-15/images   # download all + manifest.json
 *   npm run backup-images -- --check                                 # only check each URL still loads
 *   (same --env-file / --uri-var / --db options as check-data)
 *
 * Files keep their Cloudinary path under <out>/<host>/..., and manifest.json lists
 * url, file, bytes, sha256 and where each image is used. Local "/uploads/..."
 * paths can't be fetched without --base-url <https://site>. Exit code 1 if any
 * image could not be downloaded or checked.
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { argValue, connectReadOnly, describe, hasFlag, resolveUri } from "./lib/scriptDb";
import { collectImageRefs, type ImageRef } from "./lib/imageRefs";

const CONCURRENCY = 6;
const TIMEOUT_MS = 30_000;
const ATTEMPTS = 3;

interface Result {
  url: string;
  ok: boolean;
  status?: number;
  file?: string;
  bytes?: number;
  sha256?: string;
  error?: string;
  usedIn: string[];
}

const fetchWithRetry = async (url: string, method: "GET" | "HEAD"): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { method, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (response.ok || response.status === 404 || response.status === 410) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  throw lastError;
};

// res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg → <out>/res.cloudinary.com/<cloud>/image/upload/folder/name.jpg
const fileFor = (outDir: string, url: string): string => {
  const { hostname, pathname } = new URL(url);
  const clean = pathname
    .split("/")
    .filter((part) => part && !/^v\d+$/.test(part))
    .map((part) => decodeURIComponent(part).replace(/[<>:"|?*\\]/g, "_"));
  return path.join(outDir, hostname, ...clean);
};

const absolute = (ref: ImageRef, baseUrl?: string): string | null => {
  if (ref.kind !== "local") return ref.url;
  return baseUrl ? new URL(ref.url.replace(/^\/?/, "/"), baseUrl).toString() : null;
};

const handle = async (ref: ImageRef, outDir: string | undefined, baseUrl?: string): Promise<Result> => {
  const url = absolute(ref, baseUrl);
  const base = { url: ref.url, usedIn: ref.usedIn };
  if (!url) return { ...base, ok: false, error: "local /uploads path — pass --base-url to fetch it" };

  try {
    if (!outDir) {
      let response = await fetchWithRetry(url, "HEAD");
      // Some hosts don't answer HEAD; fall back to a normal request
      if (response.status === 405) response = await fetchWithRetry(url, "GET");
      return { ...base, ok: response.ok, status: response.status, error: response.ok ? undefined : `HTTP ${response.status}` };
    }

    const response = await fetchWithRetry(url, "GET");
    if (!response.ok) return { ...base, ok: false, status: response.status, error: `HTTP ${response.status}` };
    const data = Buffer.from(await response.arrayBuffer());
    const file = fileFor(outDir, url);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
    return {
      ...base,
      ok: true,
      status: response.status,
      file: path.relative(outDir, file),
      bytes: data.length,
      sha256: crypto.createHash("sha256").update(data).digest("hex"),
    };
  } catch (error) {
    return { ...base, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};

const run = async () => {
  const outDir = argValue("--out");
  const check = hasFlag("--check");
  if (!outDir && !check) throw new Error("Pass --out <folder> to download, or --check to only check the URLs");
  const baseUrl = argValue("--base-url");

  const uri = resolveUri();
  await connectReadOnly(uri);
  const refs = await collectImageRefs(mongoose.connection.db!);
  await mongoose.disconnect();

  console.log(`${describe(uri)}: ${refs.length} image(s) referenced — ${outDir ? `downloading to ${outDir}` : "checking"}`);
  if (outDir) fs.mkdirSync(outDir, { recursive: true });

  const results: Result[] = [];
  let next = 0;
  const worker = async () => {
    while (next < refs.length) {
      const ref = refs[next++];
      const result = await handle(ref, outDir, baseUrl);
      results.push(result);
      if (results.length % 25 === 0) console.log(`  ${results.length}/${refs.length}`);
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));

  const failed = results.filter((r) => !r.ok);
  if (outDir) {
    const manifest = {
      source: describe(uri),
      createdAt: new Date().toISOString(),
      total: results.length,
      failed: failed.length,
      bytes: results.reduce((n, r) => n + (r.bytes ?? 0), 0),
      images: results,
    };
    fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    console.log(`Saved ${results.length - failed.length} image(s), ${(manifest.bytes / 1048576).toFixed(1)} MB, manifest at ${path.join(outDir, "manifest.json")}`);
  }

  if (failed.length) {
    console.log(`\n✗ ${failed.length} image(s) failed:`);
    for (const r of failed) console.log(`  ${r.url} — ${r.error} (used in ${r.usedIn.join(", ")})`);
    process.exit(1);
  }
  console.log(`✓ all ${results.length} image(s) ${outDir ? "downloaded" : "load"}`);
};

run().catch(async (error) => {
  console.error("backup-images failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
