/**
 * Read-only health report of a database, used before and after a deploy:
 * - documents per collection
 * - every document validated against the current models (in memory, never saved)
 * - broken references (orders → users/products, carts → products, …)
 * - open orders and how many product photos still need the photo migration
 * - how many images the data refers to
 *
 *   npm run check-data                                  # backend/.env MONGODB_URI
 *   npm run check-data -- --env-file ../../backups/live.env --uri-var LIVE_MONGODB_URI
 *   npm run check-data -- --db nevan_clone              # another database, same cluster
 *   npm run check-data -- --out before.json             # save the report
 *   npm run check-data -- --compare before.json         # fail if anything went missing
 *
 * Exit code 1 when a document fails validation or a comparison finds fewer
 * documents or images than before.
 */
import fs from "fs";
import mongoose from "mongoose";
import { argValue, connectReadOnly, describe, resolveUri } from "./lib/scriptDb";
import { collectImageRefs } from "./lib/imageRefs";

import AdminLog from "../models/AdminLog";
import Campaign from "../models/Campaign";
import Cart from "../models/Cart";
import Category from "../models/Category";
import ChatRoom from "../models/ChatRoom";
import ContactMessage from "../models/ContactMessage";
import Message from "../models/Message";
import Notification from "../models/Notification";
import Order from "../models/Order";
import Payment from "../models/Payment";
import Product from "../models/Product";
import Review from "../models/Review";
import ShippingSettings from "../models/ShippingSettings";
import Subscriber from "../models/Subscriber";
import User from "../models/User";

/* eslint-disable @typescript-eslint/no-explicit-any */
const MODELS: mongoose.Model<any>[] = [
  AdminLog, Campaign, Cart, Category, ChatRoom, ContactMessage, Message,
  Notification, Order, Payment, Product, Review, ShippingSettings, Subscriber, User,
];

const FINISHED_ORDER = ["delivered", "cancelled"];
const ONLINE = ["esewa", "khalti"];

interface Report {
  target: string;
  generatedAt: string;
  counts: Record<string, number>;
  notUsedByApp: string[];
  validation: Record<string, { problems: Record<string, number>; sampleIds: string[] }>;
  references: Record<string, number>;
  orders: { open: number; byStatus: Record<string, number>; unpaidOnlineOpen: number };
  products: { photos: number; colourTaggedPhotos: number; variantsWithOwnPhoto: number; needPhotoMigration: number };
  images: { total: number; cloudinary: number; otherHttp: number; local: number };
}

const tally = (values: string[]): Record<string, number> =>
  values.reduce<Record<string, number>>((acc, v) => ((acc[v] = (acc[v] ?? 0) + 1), acc), {});

const buildReport = async (uri: string): Promise<Report> => {
  const db = mongoose.connection.db!;
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

  const counts: Record<string, number> = {};
  for (const name of names) counts[name] = await db.collection(name).countDocuments();

  const modelByCollection = new Map(MODELS.map((m) => [m.collection.collectionName, m]));
  const validation: Report["validation"] = {};
  for (const name of names) {
    const Model = modelByCollection.get(name);
    if (!Model) continue;
    const problems: string[] = [];
    const sampleIds: string[] = [];
    for await (const raw of db.collection(name).find({})) {
      // A plain copy goes through the model (defaults, derived fields, validators); nothing is saved
      const doc = new Model(JSON.parse(JSON.stringify(raw)));
      try {
        await doc.validate();
      } catch (error: any) {
        const errors = error?.errors ?? { document: error };
        for (const [field, err] of Object.entries<any>(errors)) {
          problems.push(`${field}: ${String(err?.kind ?? err?.message ?? "invalid").slice(0, 80)}`);
        }
        if (sampleIds.length < 5) sampleIds.push(String(raw._id));
      }
    }
    validation[name] = { problems: tally(problems), sampleIds };
  }

  const ids = async (name: string) =>
    new Set((await db.collection(name).find({}, { projection: { _id: 1 } }).toArray()).map((d) => String(d._id)));
  const userIds = await ids("users");
  const productIds = await ids("products");
  const orderIds = await ids("orders");
  const categoryIds = await ids("categories");
  const missing = (set: Set<string>, id: unknown) => id != null && !set.has(String(id));

  const orders = await db.collection("orders").find({}).toArray();
  const carts = await db.collection("carts").find({}).toArray();
  const payments = await db.collection("payments").find({}, { projection: { order: 1 } }).toArray();
  const products = await db.collection("products").find({}).toArray();

  const references = {
    "orders → missing user": orders.filter((o) => missing(userIds, o.user)).length,
    "order lines → missing product": orders.flatMap((o) => o.items ?? []).filter((i: any) => missing(productIds, i.product)).length,
    "carts → missing user": carts.filter((c) => missing(userIds, c.user)).length,
    "cart lines → missing product": carts.flatMap((c) => c.items ?? []).filter((i: any) => missing(productIds, i.product)).length,
    "payments → missing order": payments.filter((p) => missing(orderIds, p.order)).length,
    "products → missing category": products.filter((p) => missing(categoryIds, p.category)).length,
  };

  const open = orders.filter((o) => !FINISHED_ORDER.includes(o.status));
  const photos = products.flatMap((p) => p.images ?? []);
  const images = await collectImageRefs(db);

  return {
    target: describe(uri),
    generatedAt: new Date().toISOString(),
    counts,
    notUsedByApp: names.filter((n) => !modelByCollection.has(n)),
    validation,
    references,
    orders: {
      open: open.length,
      byStatus: tally(orders.map((o) => String(o.status))),
      unpaidOnlineOpen: open.filter((o) => ONLINE.includes(o.payment?.method) && o.payment?.status !== "paid").length,
    },
    products: {
      photos: photos.length,
      colourTaggedPhotos: photos.filter((i: any) => i.color).length,
      variantsWithOwnPhoto: products.flatMap((p) => p.variants ?? []).filter((v: any) => v.image).length,
      needPhotoMigration: products.filter(
        (p) => (p.variants ?? []).some((v: any) => v.image) && !(p.images ?? []).some((i: any) => i.color),
      ).length,
    },
    images: {
      total: images.length,
      cloudinary: images.filter((i) => i.kind === "cloudinary").length,
      otherHttp: images.filter((i) => i.kind === "http").length,
      local: images.filter((i) => i.kind === "local").length,
    },
  };
};

const print = (r: Report): number => {
  console.log(`\nDatabase ${r.target} — ${r.generatedAt}\n`);
  console.log("Documents:");
  for (const [name, n] of Object.entries(r.counts)) {
    console.log(`  ${name.padEnd(22)} ${String(n).padStart(6)}${r.notUsedByApp.includes(name) ? "   (not used by the app)" : ""}`);
  }

  let invalid = 0;
  console.log("\nValidation against the current models:");
  for (const [name, v] of Object.entries(r.validation)) {
    const total = Object.values(v.problems).reduce((a, b) => a + b, 0);
    invalid += total;
    if (total) console.log(`  ✗ ${name}: ${JSON.stringify(v.problems)} e.g. ${v.sampleIds.join(", ")}`);
  }
  if (!invalid) console.log("  ✓ every document is valid");

  console.log("\nReferences:");
  for (const [what, n] of Object.entries(r.references)) console.log(`  ${n ? "!" : "✓"} ${what}: ${n}`);

  console.log(`\nOrders: ${r.orders.open} open (${r.orders.unpaidOnlineOpen} unpaid eSewa/Khalti) — ${JSON.stringify(r.orders.byStatus)}`);
  console.log(
    `Products: ${r.products.photos} photos, ${r.products.colourTaggedPhotos} tagged with a colour, ` +
      `${r.products.variantsWithOwnPhoto} variants with their own photo, ${r.products.needPhotoMigration} product(s) need migrate-variant-media`,
  );
  console.log(
    `Images referenced: ${r.images.total} (${r.images.cloudinary} Cloudinary, ${r.images.otherHttp} other web, ${r.images.local} local /uploads)`,
  );
  return invalid;
};

const compare = (before: Report, after: Report): string[] => {
  const lost: string[] = [];
  for (const [name, n] of Object.entries(before.counts)) {
    const now = after.counts[name] ?? 0;
    if (now < n) lost.push(`${name}: ${n} → ${now}`);
  }
  if (after.images.total < before.images.total) lost.push(`images: ${before.images.total} → ${after.images.total}`);
  return lost;
};

const run = async () => {
  const uri = resolveUri();
  await connectReadOnly(uri);
  const report = await buildReport(uri);
  let failed = print(report) > 0;

  const out = argValue("--out");
  if (out) {
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nSaved report to ${out}`);
  }

  const comparePath = argValue("--compare");
  if (comparePath) {
    const before: Report = JSON.parse(fs.readFileSync(comparePath, "utf8"));
    const lost = compare(before, report);
    console.log(`\nCompared with ${comparePath} (${before.target}, ${before.generatedAt}):`);
    if (lost.length) {
      failed = true;
      for (const line of lost) console.log(`  ✗ fewer than before — ${line}`);
    } else {
      console.log("  ✓ nothing went missing (every collection and the image count are the same or higher)");
    }
  }

  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
};
/* eslint-enable @typescript-eslint/no-explicit-any */

run().catch(async (error) => {
  console.error("check-data failed:", error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exit(1);
});
