/**
 * Email Utility
 * Sends transactional email over SMTP (configure SMTP_* env vars).
 * Without SMTP_HOST, emails are logged to the console outside production
 * and sending fails in production.
 */
import nodemailer, { Transporter } from "nodemailer";
import AppError from "./AppError";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!process.env.SMTP_HOST) return null;

  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  return transporter;
};

export const isEmailConfigured = (): boolean => !!process.env.SMTP_HOST;

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transport = getTransporter();

  if (!transport) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError("Email service is not configured", 503);
    }
    if (process.env.NODE_ENV !== "test") {
      console.log(
        `📧 [email not configured] To: ${options.to} | ${options.subject}\n${options.text}`,
      );
    }
    return;
  }

  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    replyTo: options.replyTo,
  });
};

export const sendPasswordResetEmail = async (
  to: string,
  name: string,
  otp: string,
): Promise<void> => {
  await sendEmail({
    to,
    subject: "Your password reset code",
    text: `Hi ${name},\n\nYour password reset code is ${otp}. It expires in 10 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your password reset code is <strong style="font-size:20px;letter-spacing:4px">${otp}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
};

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
