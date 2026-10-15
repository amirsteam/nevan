/**
 * Copy a whole database (documents and indexes) into another one, e.g. the live
 * shop data into a test clone on the dev cluster, and/or export it as EJSON files.
 * Prefer mongodump/mongorestore when MongoDB Database Tools are installed; this
 * does the same job with only Node.
 *
 *   npm run clone-db -- --source-env-file ../../backups/live.env --source-uri-var LIVE_MONGODB_URI \
 *                       --target-db nevan_clone [--drop-target]
 *   npm run clone-db -- --source-env-file ... --export-dir ../../backups/2026-10-15/ejson
 *
 * The target defaults to backend/.env MONGODB_URI (the dev cluster) with --target-db
 * as the database (or --target-env-file / --target-uri-var). It refuses to write to
 * a live database or to the source, and to a target that already has data unless
 * --drop-target is given (which drops only that target database, and never the
 * database the env file itself points at). The source is only read.
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import type { Db, IndexDescription } from "mongodb";
import {
  argValue,
  databaseName,
  describe,
  hasFlag,
  isLiveDatabase,
  resolveUri,
} from "./lib/scriptDb";

// The driver that ships with Mongoose (not a separate dependency)
const { MongoClient, BSON } = mongoose.mongo;

const BATCH = 500;

const collectionsOf = async (db: Db): Promise<string[]> =>
  (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

const exportTo = async (db: Db, dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of await collectionsOf(db)) {
    const docs = await db.collection(name).find({}).toArray();
    // Canonical EJSON keeps ObjectId, Date and number types exactly
    fs.writeFileSync(path.join(dir, `${name}.json`), BSON.EJSON.stringify(docs, undefined, 1, { relaxed: false }));
    const indexes = await db.collection(name).indexes();
    fs.writeFileSync(path.join(dir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));
    console.log(`  exported ${name}: ${docs.length}`);
  }
};

const copyIndexes = async (source: Db, target: Db, name: string) => {
  const indexes = await source.collection(name).indexes();
  const specs: IndexDescription[] = indexes
    .filter((ix) => ix.name !== "_id_")
    .map((ix) => {
      // Keep every option (unique, sparse, partialFilterExpression, text weights, …) except server-managed ones
      const { v: _v, ns: _ns, key, ...options } = ix as Record<string, unknown>;
      return { key: key as IndexDescription["key"], ...options } as IndexDescription;
    });
  if (specs.length) await target.collection(name).createIndexes(specs);
  return specs.length;
};

const run = async () => {
  const sourceUri = resolveUri("source");
  const exportDir = argValue("--export-dir");
  const targetDb = argValue("--target-db");
  if (!exportDir && !targetDb) throw new Error("Pass --target-db <name> to copy and/or --export-dir <folder> to export");

  const source = new MongoClient(sourceUri, { readPreference: "secondaryPreferred", serverSelectionTimeoutMS: 20000 });
  await source.connect();
  const sourceDb = source.db(databaseName(sourceUri));
  console.log(`Source: ${describe(sourceUri)} (read only)`);

  try {
    if (exportDir) {
      console.log(`Exporting to ${exportDir}`);
      await exportTo(sourceDb, exportDir);
    }
    if (!targetDb) return;

    // backend/.env MONGODB_URI (or --target-env-file / --target-uri-var) with --target-db as the database
    const targetUri = resolveUri("target");
    if (isLiveDatabase(targetUri)) throw new Error(`Refusing to write to ${describe(targetUri)}: it is a live database`);
    if (describe(targetUri) === describe(sourceUri)) throw new Error("Source and target are the same database");

    const target = new MongoClient(targetUri, { serverSelectionTimeoutMS: 20000 });
    await target.connect();
    try {
      const db = target.db(targetDb);
      const existing = await collectionsOf(db);
      if (existing.length) {
        // --drop-target is for throwaway clones, never the database the env file normally points at
        if (databaseName(resolveUri("target", { applyDb: false })) === targetDb) {
          throw new Error(`${describe(targetUri)} is the working database from the env file; clone into a separate name such as nevan_clone`);
        }
        if (!hasFlag("--drop-target")) {
          throw new Error(`${describe(targetUri)} already has data (${existing.join(", ")}). Pass --drop-target to replace it.`);
        }
        console.log(`Dropping the old copy ${describe(targetUri)}`);
        await db.dropDatabase();
      }

      console.log(`Copying into ${describe(targetUri)}`);
      let mismatch = false;
      for (const name of await collectionsOf(sourceDb)) {
        let copied = 0;
        let batch: Record<string, unknown>[] = [];
        await db.createCollection(name);
        for await (const doc of sourceDb.collection(name).find({})) {
          batch.push(doc);
          if (batch.length === BATCH) {
            await db.collection(name).insertMany(batch, { ordered: true });
            copied += batch.length;
            batch = [];
          }
        }
        if (batch.length) {
          await db.collection(name).insertMany(batch, { ordered: true });
          copied += batch.length;
        }
        const indexes = await copyIndexes(sourceDb, db, name);
        const [from, to] = await Promise.all([
          sourceDb.collection(name).countDocuments(),
          db.collection(name).countDocuments(),
        ]);
        if (from !== to) mismatch = true;
        console.log(`  ${from === to ? "✓" : "✗"} ${name}: ${copied} copied (source ${from}, clone ${to}), ${indexes} index(es)`);
      }
      if (mismatch) throw new Error("Some collections have different counts — the clone is incomplete");
      console.log("✓ Clone complete");
    } finally {
      await target.close();
    }
  } finally {
    await source.close();
  }
};

run().catch((error) => {
  console.error("clone-db failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
