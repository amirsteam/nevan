/**
 * Copy a whole database (documents and indexes) into another one, e.g. the live
 * shop data into a test clone on the dev cluster, export it as EJSON files
 * (the nightly backup), or restore such an export into a database.
 * Prefer mongodump/mongorestore when MongoDB Database Tools are installed; this
 * does the same job with only Node.
 *
 *   npm run clone-db -- --source-env-file ../../backups/live.env --source-uri-var LIVE_MONGODB_URI \
 *                       --target-db nevan_clone [--drop-target]
 *   npm run clone-db -- --source-env-file ... --export-dir ../../backups/2026-10-15/ejson [--gzip]
 *   npm run clone-db -- --import-dir ../../backups/db-2026-10-15 --target-db nevan_restore
 *
 * The target defaults to backend/.env MONGODB_URI (the dev cluster) with --target-db
 * as the database (or --target-env-file / --target-uri-var). It refuses to write to
 * a live database or to the source, and to a target that already has data unless
 * --drop-target is given (which drops only that target database, and never the
 * database the env file itself points at). The source is only read.
 *
 * Exports are one <collection>.json (an EJSON array; .json.gz with --gzip) plus
 * <collection>.indexes.json per collection, written as a stream so memory stays
 * small however large a collection is.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import mongoose from "mongoose";
// The driver bundled with Mongoose (the top-level "mongodb" package is the test tooling's)
import type { mongo } from "mongoose";
type Db = mongo.Db;
type IndexDescription = mongo.IndexDescription;
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

type Doc = Record<string, unknown>;

/** Where documents come from: a database, or an export folder */
interface Source {
  label: string;
  collections(): Promise<string[]>;
  documents(name: string): AsyncIterable<Doc>;
  count(name: string): Promise<number>;
  indexes(name: string): Promise<Doc[]>;
}

const collectionsOf = async (db: Db): Promise<string[]> =>
  (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

const databaseSource = (db: Db, label: string): Source => ({
  label,
  collections: () => collectionsOf(db),
  documents: (name) => db.collection(name).find({}),
  count: (name) => db.collection(name).countDocuments(),
  indexes: (name) => db.collection(name).indexes() as Promise<Doc[]>,
});

const EXPORT_FILE = /^(.+?)\.json(\.gz)?$/;

const exportSource = (dir: string): Source => {
  if (!fs.existsSync(dir)) throw new Error(`Export folder not found: ${dir}`);
  const files = new Map<string, string>();
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(EXPORT_FILE);
    if (m && !m[1].endsWith(".indexes")) files.set(m[1], path.join(dir, file));
  }
  const loaded = new Map<string, Doc[]>();
  const load = (name: string): Doc[] => {
    if (!loaded.has(name)) {
      const file = files.get(name) as string;
      const raw = fs.readFileSync(file);
      const text = (file.endsWith(".gz") ? zlib.gunzipSync(raw) : raw).toString("utf8");
      loaded.clear(); // one collection in memory at a time
      loaded.set(name, BSON.EJSON.parse(text, { relaxed: false }) as Doc[]);
    }
    return loaded.get(name) as Doc[];
  };
  return {
    label: dir,
    collections: async () => [...files.keys()].sort(),
    documents: async function* (name) {
      yield* load(name);
    },
    count: async (name) => load(name).length,
    indexes: async (name) => {
      const file = path.join(dir, `${name}.indexes.json`);
      return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Doc[]) : [];
    },
  };
};

/** One collection as an EJSON array file, streamed (canonical EJSON keeps ObjectId, Date and number types exactly) */
const exportCollection = async (db: Db, name: string, dir: string, gzip: boolean): Promise<number> => {
  let count = 0;
  const lines = async function* () {
    yield "[\n";
    for await (const doc of db.collection(name).find({})) {
      yield `${count++ ? ",\n" : ""}${BSON.EJSON.stringify(doc, { relaxed: false })}`;
    }
    yield "\n]\n";
  };
  const file = path.join(dir, `${name}.json${gzip ? ".gz" : ""}`);
  if (gzip) await pipeline(lines, zlib.createGzip(), fs.createWriteStream(file));
  else await pipeline(lines, fs.createWriteStream(file));
  return count;
};

const exportTo = async (db: Db, dir: string, gzip: boolean) => {
  fs.mkdirSync(dir, { recursive: true });
  for (const name of await collectionsOf(db)) {
    const count = await exportCollection(db, name, dir, gzip);
    const indexes = await db.collection(name).indexes();
    fs.writeFileSync(path.join(dir, `${name}.indexes.json`), JSON.stringify(indexes, null, 2));
    console.log(`  exported ${name}: ${count}`);
  }
};

const copyIndexes = async (indexes: Doc[], target: Db, name: string) => {
  const specs: IndexDescription[] = indexes
    .filter((ix) => ix.name !== "_id_")
    .map((ix) => {
      // Keep every option (unique, sparse, partialFilterExpression, text weights, …) except server-managed ones
      const { v: _v, ns: _ns, key, ...options } = ix;
      return { key: key as IndexDescription["key"], ...options } as IndexDescription;
    });
  if (specs.length) await target.collection(name).createIndexes(specs);
  return specs.length;
};

const run = async () => {
  const importDir = argValue("--import-dir");
  const exportDir = argValue("--export-dir");
  const targetDb = argValue("--target-db");
  if (importDir && exportDir) throw new Error("--import-dir restores an export; it can't be combined with --export-dir");
  if (importDir && !targetDb) throw new Error("Pass --target-db <name> to restore the export into");
  if (!exportDir && !targetDb) throw new Error("Pass --target-db <name> to copy and/or --export-dir <folder> to export");

  let source: Source;
  let sourceUri: string | null = null;
  let client: InstanceType<typeof MongoClient> | null = null;
  if (importDir) {
    source = exportSource(importDir);
    console.log(`Source: export ${importDir}`);
  } else {
    sourceUri = resolveUri("source");
    client = new MongoClient(sourceUri, { readPreference: "secondaryPreferred", serverSelectionTimeoutMS: 20000 });
    await client.connect();
    const sourceDb = client.db(databaseName(sourceUri));
    source = databaseSource(sourceDb, describe(sourceUri));
    console.log(`Source: ${describe(sourceUri)} (read only)`);
    if (exportDir) {
      console.log(`Exporting to ${exportDir}`);
      await exportTo(sourceDb, exportDir, hasFlag("--gzip"));
    }
  }

  try {
    if (!targetDb) return;

    // backend/.env MONGODB_URI (or --target-env-file / --target-uri-var) with --target-db as the database
    const targetUri = resolveUri("target");
    if (isLiveDatabase(targetUri)) throw new Error(`Refusing to write to ${describe(targetUri)}: it is a live database`);
    if (sourceUri && describe(targetUri) === describe(sourceUri)) throw new Error("Source and target are the same database");

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
      for (const name of await source.collections()) {
        let copied = 0;
        let batch: Doc[] = [];
        await db.createCollection(name);
        for await (const doc of source.documents(name)) {
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
        const indexes = await copyIndexes(await source.indexes(name), db, name);
        const [from, to] = await Promise.all([source.count(name), db.collection(name).countDocuments()]);
        if (from !== to) mismatch = true;
        console.log(`  ${from === to ? "✓" : "✗"} ${name}: ${copied} copied (source ${from}, copy ${to}), ${indexes} index(es)`);
      }
      if (mismatch) throw new Error("Some collections have different counts — the copy is incomplete");
      console.log("✓ Copy complete");
    } finally {
      await target.close();
    }
  } finally {
    await client?.close();
  }
};

run().catch((error) => {
  console.error("clone-db failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
