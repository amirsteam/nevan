/**
 * Every image a database refers to, found by scanning every field of every
 * document (so nothing is missed: product and variant photos, categories,
 * campaign banners, chat images, order-line snapshots, older fields).
 */
// The driver bundled with Mongoose (the top-level "mongodb" package is the test tooling's)
import type { mongo } from "mongoose";
type Db = mongo.Db;

export interface ImageRef {
  url: string;
  kind: "cloudinary" | "http" | "local";
  /** Where it was found, e.g. "products.images.url" (first few) */
  usedIn: string[];
  count: number;
}

const CLOUDINARY = /^https?:\/\/res\.cloudinary\.com\//i;
const IMAGE_FILE = /^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?\S*)?$/i;
const LOCAL_UPLOAD = /^\/?uploads\/\S+\.(jpe?g|png|gif|webp|avif|svg|bmp)$/i;

const kindOf = (value: string): ImageRef["kind"] | null => {
  if (CLOUDINARY.test(value)) return "cloudinary";
  if (IMAGE_FILE.test(value)) return "http";
  if (LOCAL_UPLOAD.test(value)) return "local";
  return null;
};

const walk = (value: unknown, at: string, found: (url: string, at: string) => void): void => {
  if (typeof value === "string") {
    if (kindOf(value)) found(value, at);
  } else if (Array.isArray(value)) {
    for (const item of value) walk(item, at, found);
  } else if (value && typeof value === "object" && !(value instanceof Date)) {
    // ObjectId, Decimal128 etc. have no plain string fields worth scanning
    if ((value as { _bsontype?: string })._bsontype) return;
    for (const [key, child] of Object.entries(value)) walk(child, at ? `${at}.${key}` : key, found);
  }
};

export const collectImageRefs = async (db: Db): Promise<ImageRef[]> => {
  const refs = new Map<string, ImageRef>();
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."));

  for (const name of collections) {
    for await (const doc of db.collection(name).find({})) {
      walk(doc, "", (url, at) => {
        const where = `${name}.${at}`;
        const ref = refs.get(url) ?? { url, kind: kindOf(url)!, usedIn: [], count: 0 };
        ref.count += 1;
        if (ref.usedIn.length < 3 && !ref.usedIn.includes(where)) ref.usedIn.push(where);
        refs.set(url, ref);
      });
    }
  }
  return [...refs.values()].sort((a, b) => a.url.localeCompare(b.url));
};
