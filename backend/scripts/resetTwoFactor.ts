/**
 * Turn off an admin's two-step login when nobody can sign in to reset it on the
 * website (every admin lost their phone and backup codes). The admin is signed
 * out everywhere and sets up a new authenticator app at their next sign-in.
 *
 *   npm run reset-two-factor -- --email owner@example.com            # preview
 *   npm run reset-two-factor -- --email owner@example.com --apply    # reset
 *
 * On the server (after activating the app's nodevenv):
 *   node ~/backend/dist/scripts/resetTwoFactor.js --env-file ~/.nevan-backup.env --email … --apply
 *
 * Connection string as in scripts/lib/scriptDb.ts (--env-file, --uri-var, --db).
 * This writes to the database it points at, the live one included: that is its job.
 */
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import validator from "validator";
import User from "../models/User";
import { resetState } from "../services/twoFactorService";
import { argValue, describe, hasFlag, resolveUri } from "./lib/scriptDb";

const run = async () => {
  const rawEmail = argValue("--email");
  if (!rawEmail) throw new Error("Pass --email <the admin's email address>");
  // Same normalization as sign-in, so the stored address matches
  const email = validator.normalizeEmail(rawEmail) || rawEmail.toLowerCase();
  const apply = hasFlag("--apply");

  const uri = resolveUri();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });
  console.log(`${describe(uri)} — ${apply ? "APPLYING" : "preview (add --apply to reset)"}`);

  const user = await User.findOne({ email }).select("+twoFactor +refreshSessions");
  if (!user) throw new Error(`No account with the email ${email}`);
  console.log(
    `${user.name} <${user.email}>: role ${user.role}, two-step login ${user.twoFactorEnabled ? "on" : "off"}, ` +
      `${user.refreshSessions?.length || 0} signed-in device(s)`,
  );
  if (user.role !== "admin") console.log("Note: this account is not an admin.");

  if (!apply) return;
  resetState(user);
  user.refreshSessions = [];
  await user.save({ validateBeforeSave: false });
  console.log("✓ Two-step login reset. They set up their authenticator app again at their next sign-in.");
};

run()
  .catch((error) => {
    console.error(`✗ ${(error as Error).message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
