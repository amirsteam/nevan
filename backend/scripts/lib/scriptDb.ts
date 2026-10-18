/**
 * Shared helpers for the maintenance scripts (check-data, backup-images, clone-db).
 *
 * Connection strings come from an env file, never from the command line, so they
 * stay out of shell history; only "host/database" is ever printed.
 *
 *   --env-file <path>   file with the connection string (default: backend/.env;
 *                       when that doesn't exist, the variable is read from the
 *                       environment, as on the live server)
 *   --uri-var <NAME>    variable in that file (default: MONGODB_URI)
 *   --db <name>         use this database on the same cluster instead
 */
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";

/** Databases that hold real shop data: scripts never write to these */
export const LIVE_DATABASES = ["bivanhandicraft"];

export const argValue = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

export const hasFlag = (name: string): boolean => process.argv.includes(name);

const URI_PATTERN = /^(mongodb(?:\+srv)?:\/\/)([^@/]*@)?([^/?]+)(\/[^?]*)?(\?.*)?$/;

/** Same cluster and options, another database */
export const withDatabase = (uri: string, db: string): string => {
  const m = uri.match(URI_PATTERN);
  if (!m) throw new Error("Not a MongoDB connection string");
  return `${m[1]}${m[2] ?? ""}${m[3]}/${db}${m[5] ?? ""}`;
};

export const databaseName = (uri: string): string => {
  const m = uri.match(URI_PATTERN);
  return (m?.[4] ?? "/").slice(1) || "test";
};

/** "cluster0.example.mongodb.net/shop" — never the user or password */
export const describe = (uri: string): string => {
  const m = uri.match(URI_PATTERN);
  return m ? `${m[3]}/${databaseName(uri)}` : "(unparseable connection string)";
};

export const isLiveDatabase = (uri: string): boolean => LIVE_DATABASES.includes(databaseName(uri));

/**
 * Read a connection string; `prefix` lets one script take two (e.g. --source-env-file).
 * `applyDb: false` ignores --db and returns the database named in the env file.
 */
export const resolveUri = (prefix = "", { applyDb = true } = {}): string => {
  const flag = (n: string) => argValue(prefix ? `--${prefix}-${n}` : `--${n}`);
  const explicitFile = flag("env-file");
  const envFile = explicitFile ?? path.join(__dirname, "..", "..", ".env");
  const varName = flag("uri-var") ?? "MONGODB_URI";
  if (explicitFile && !fs.existsSync(envFile)) throw new Error(`Env file not found: ${envFile}`);
  // Without a .env file (the live server keeps its settings in cPanel) the
  // variable comes from the environment, e.g. after activating the app's nodevenv
  const uri = (fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile))[varName] : undefined) ?? process.env[varName];
  if (!uri) throw new Error(`${varName} is not set in ${fs.existsSync(envFile) ? envFile : "the environment"}`);
  const db = applyDb ? flag("db") : undefined;
  return db ? withDatabase(uri, db) : uri;
};

/**
 * Connect without side effects: Mongoose would otherwise create collections and
 * build indexes for every model it knows when it connects.
 */
export const connectReadOnly = async (uri: string): Promise<typeof mongoose> => {
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  return mongoose.connect(uri, { readPreference: "secondaryPreferred", serverSelectionTimeoutMS: 20000 });
};
