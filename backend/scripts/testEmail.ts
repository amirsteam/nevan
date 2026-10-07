/**
 * Check the SMTP settings in .env by logging in and sending a test email.
 *
 *   npm run test-email -- you@example.com
 */
import dotenv from "dotenv";
dotenv.config();

import { isEmailConfigured, sendEmail, verifyEmailConnection } from "../utils/email";

const run = async () => {
  const to = process.argv[2];
  if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
    console.error("Usage: npm run test-email -- you@example.com");
    process.exit(1);
  }
  if (!isEmailConfigured()) {
    console.error("SMTP_HOST is not set in backend/.env — see the SMTP_* section of .env.example.");
    process.exit(1);
  }

  console.log(`Logging in to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER || "(no user)"}…`);
  await verifyEmailConnection();
  console.log("Login OK. Sending a test email…");

  await sendEmail({
    to,
    subject: "Nevan email test",
    text: "This is a test email from the Nevan backend. Password reset codes will arrive like this.",
  });
  console.log(`Sent to ${to}. Check the inbox (and Spam/Promotions).`);
};

run().catch((error) => {
  console.error(`Email test failed: ${error.message}`);
  if (/Username and Password not accepted|Invalid login|535/i.test(String(error.message))) {
    console.error("Gmail needs an App Password (not your normal password): Google Account → Security → 2-Step Verification → App passwords.");
  }
  process.exit(1);
});
