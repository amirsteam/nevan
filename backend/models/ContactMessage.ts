/**
 * ContactMessage Model
 * Messages sent from the storefront contact form. Stored so nothing is lost
 * when email delivery fails; admins read them in the admin panel.
 */
import mongoose, { Schema, Document } from "mongoose";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  emailed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 20 },
    subject: { type: String, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
    // Whether the copy to the store inbox was sent
    emailed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ isRead: 1, createdAt: -1 });

const ContactMessage = mongoose.model<IContactMessage>("ContactMessage", contactMessageSchema);

export default ContactMessage;
