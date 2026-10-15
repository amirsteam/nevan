/**
 * Move products to the client's size scale (up to 7 years):
 *   Small Size (0-1 yrs)  → Small (0-12 months)
 *   Medium Size (1-4 yrs) → Medium (1-3 years)
 *   Large Size (4-6 yrs)  → Large (3-5 years)
 *   XL Size (6-8 yrs)     → XL (5-7 years)
 *   Standard Size         → One Size
 * XXL (8-10 yrs) and custom sizes stay as they are. Age-group tags from the
 * older bands move to the new ones, and derived fields (size order, age
 * groups) are recomputed. Variant ids, prices, stock and photos don't change,
 * so carts keep working; orders are not touched (they record what was bought).
 *
 *   npm run migrate-size-scale            # preview only
 *   npm run migrate-size-scale -- --apply # save the changes
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product from "../models/Product";
import { applySizeRenames, syncDerivedFields } from "../utils/productVariants";
import { describe } from "./lib/scriptDb";

/* eslint-disable @typescript-eslint/no-explicit-any */
const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`${describe(process.env.MONGODB_URI)} — ${apply ? "APPLYING" : "preview"}\n`);

  let checked = 0;
  let changed = 0;
  const skipped: string[] = [];
  const kept = new Map<string, number>();

  for await (const product of Product.find({}).cursor()) {
    checked += 1;
    const doc: any = product;
    const before = JSON.stringify({
      sizes: [...(doc.sizes || [])],
      variants: (doc.variants || []).map((v: any) => v.size),
      ageGroups: [...(doc.ageGroups || [])],
    });
    const oldAges = [...(doc.ageGroups || [])].join(", ") || "none";

    const { renamed, conflict } = applySizeRenames(doc);
    if (conflict) {
      skipped.push(`${doc.name} (${doc._id}): ${conflict}`);
      continue;
    }
    syncDerivedFields(doc);

    for (const size of doc.sizes || []) {
      if (!renamed.some((r) => r.to === size)) kept.set(size, (kept.get(size) ?? 0) + 1);
    }

    const after = JSON.stringify({
      sizes: [...(doc.sizes || [])],
      variants: (doc.variants || []).map((v: any) => v.size),
      ageGroups: [...(doc.ageGroups || [])],
    });
    if (after === before) continue;

    changed += 1;
    const notes = [
      ...renamed.map((r) => `${r.from} → ${r.to}`),
      `age groups ${oldAges} → ${[...doc.ageGroups].join(", ") || "none"}`,
    ];
    console.log(`• ${doc.name} (${doc._id})\n    ${notes.join("\n    ")}`);
    if (apply) await product.save();
  }

  console.log(`\nChecked ${checked} product(s); ${changed} need updating.`);
  if (kept.size) {
    console.log("Sizes left as they are (not on the new scale, or already on it):");
    for (const [size, n] of [...kept.entries()].sort((a, b) => b[1] - a[1])) console.log(`    ${size}: ${n} product(s)`);
  }
  if (skipped.length) {
    console.log(`\n✗ Skipped ${skipped.length} product(s) — fix them in the admin, then run again:`);
    skipped.forEach((line) => console.log(`    ${line}`));
  }
  console.log(apply ? `\nSaved ${changed} product(s).` : "\nPreview only. Run with --apply to save these changes.");
  await mongoose.disconnect();
  if (skipped.length) process.exitCode = 1;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

run().catch(async (error) => {
  console.error("Size-scale migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
