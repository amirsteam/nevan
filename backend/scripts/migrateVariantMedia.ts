/**
 * Move products with sizes/colours to the current model:
 * - photos stored per variant move into the product's photos, tagged with
 *   the variant's colour (each colour's first photo becomes its variant photo)
 * - option order, colour swatches, price/compare price/stock from variants
 * - a product-wide compare price moves onto each size it was higher than
 * - age groups follow the sizes
 *
 * Products are also moved one at a time whenever an admin saves them; this
 * does all of them at once.
 *
 *   npm run migrate-variant-media            # preview only
 *   npm run migrate-variant-media -- --apply # save the changes
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product from "../models/Product";
import { adoptVariantImages, syncDerivedFields } from "../utils/productVariants";

/* eslint-disable @typescript-eslint/no-explicit-any */
const snapshot = (product: any) =>
  JSON.stringify({
    images: product.images.map((img: any) => [img.url, img.color ?? null, img.isPrimary]),
    sizes: [...product.sizes],
    colors: product.colors.map((c: any) => [c.name, c.hex ?? null]),
    price: product.price,
    comparePrice: product.comparePrice ?? null,
    stock: product.stock,
    ageGroups: [...product.ageGroups],
    variants: product.variants.map((v: any) => [v.size, v.color, v.comparePrice ?? null, v.image ?? null]),
  });

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGODB_URI);

  let checked = 0;
  let changed = 0;
  for await (const product of Product.find({ "variants.0": { $exists: true } }).cursor()) {
    checked += 1;
    const doc: any = product;
    const before = snapshot(doc);
    const oldPrice = doc.price;
    const oldAgeGroups = [...doc.ageGroups].join(", ") || "none";
    const adopted = adoptVariantImages(doc);
    syncDerivedFields(doc);
    if (snapshot(doc) === before) continue;

    changed += 1;
    const notes = [
      adopted ? `${adopted} variant photo(s) now colour photos` : null,
      doc.price !== oldPrice ? `price ${oldPrice} → ${doc.price} (cheapest size)` : null,
      `age groups ${oldAgeGroups} → ${[...doc.ageGroups].join(", ") || "none"}`,
      `colours: ${doc.colors.map((c: any) => c.name).join(", ")}; sizes: ${doc.sizes.join(", ")}`,
    ].filter(Boolean);
    console.log(`• ${doc.name} (${doc._id})\n    ${notes.join("\n    ")}`);
    if (apply) await product.save();
  }

  console.log(`\nChecked ${checked} product(s) with variants; ${changed} need updating.`);
  console.log(apply ? `Saved ${changed} product(s).` : "Preview only. Run with --apply to save these changes.");
  await mongoose.disconnect();
};
/* eslint-enable @typescript-eslint/no-explicit-any */

run().catch(async (error) => {
  console.error("Variant media migration failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
