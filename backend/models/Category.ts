import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { createSlug } from '../utils/helpers';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: {
    url: string;
    publicId: string;
  };
  parent: Types.ObjectId | ICategory | null;
  order: number;
  isActive: boolean;
  subcategories?: ICategory[];
  createdAt: Date;
  updatedAt: Date;
}

interface ICategoryModel extends Model<ICategory> {
  getTree(): Promise<ICategory[]>;
  findBySlug(slug: string): Promise<ICategory | null>;
}

const categorySchema = new Schema<ICategory, ICategoryModel>({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
        url: String,
        publicId: String,
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
    },
    order: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Indexes
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ order: 1 });

// Virtuals
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent',
});

// Middleware
categorySchema.pre('save', async function (next) {
    if (this.isModified('name')) {
        this.slug = createSlug(this.name);
    }
    next();
});

categorySchema.pre('deleteOne', { document: true }, async function (next) {
    await (this.constructor as ICategoryModel).updateMany(
        { parent: this._id },
        { parent: null }
    );
    next();
});

// Statics
categorySchema.statics.getTree = async function (this: ICategoryModel) {
    return this.find({ parent: null, isActive: true })
        .sort({ order: 1 })
        .populate({
            path: 'subcategories',
            match: { isActive: true },
            options: { sort: { order: 1 } },
        });
};

categorySchema.statics.findBySlug = function (this: ICategoryModel, slug: string) {
    return this.findOne({ slug, isActive: true })
        .populate({
            path: 'subcategories',
            match: { isActive: true },
        })
        .populate('parent', 'name slug');
};

const Category = mongoose.model<ICategory, ICategoryModel>('Category', categorySchema);

export default Category;
