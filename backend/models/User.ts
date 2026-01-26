import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: 'customer' | 'admin';
    isActive: boolean;
    refreshToken?: string;
    lastLogin?: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(this: any) {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err: any) {
        throw new Error(err);
    }
});

userSchema.methods.comparePassword = async function(this: any, candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
