/**
 * Repair product stock totals: for products with variants, set `stock` to the sum
 * of the variants' stock. Safe to run more than once.
 *
 *   npm run sync-stock
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import Product from "../models/Product";

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(process.env.MONGODB_URI);
  const changed = await Product.syncVariantStock();
  console.log(`Updated stock totals on ${changed} product(s) with variants.`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("Stock sync failed:", error);
  await mongoose.disconnect();
  process.exit(1);
});
