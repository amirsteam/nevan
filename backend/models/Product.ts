import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { createSlug } from "../utils/helpers";
import { PRODUCT_SIZES } from "../../shared/types";

// Re-export for backward compatibility
export const VALID_SIZES = PRODUCT_SIZES;

export interface IVariant {
  _id: Types.ObjectId;
  size: string;
  color: string;
  price: number;
  stock: number;
  image?: string;
  sku?: string;
}

export interface IProductImage {
  _id: Types.ObjectId;
  url: string;
  publicId?: string;
  alt?: string;
  isPrimary: boolean;
}

export interface IProductMethods {
  reduceStock(
    items: { variantId?: string | Types.ObjectId; quantity: number }[],
  ): Promise<void>;
  getVariant(variantId: string | Types.ObjectId): IVariant | undefined;
  findVariant(size: string, color: string): IVariant | undefined;
}

export interface IProduct extends Document, IProductMethods {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  comparePrice?: number;
  category: Types.ObjectId;
  images: IProductImage[];
  variants: IVariant[];
  stock: number;
  sku?: string;
  isFeatured: boolean;
  isActive: boolean;
  ratings: {
    average: number;
    count: number;
  };
  metaTitle?: string;
  metaDescription?: string;
  soldCount: number;
  discountPercentage: number;
  displayPrice: number;
  primaryImage: IProductImage | null;
  totalStock: number;
  inStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IProductModel extends Model<IProduct> {
  search(query: string, options?: any): any;
  getFeatured(limit?: number): any;
}

const variantSchema = new Schema<IVariant>(
  {
    size: {
      type: String,
      required: true,
      enum: {
        values: VALID_SIZES,
        message: "Invalid size. Must be one of: " + VALID_SIZES.join(", "),
      },
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Variant price is required"],
      min: [0, "Price cannot be negative"],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    image: {
      type: String,
      default: null,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
  },
  { _id: true },
);

const imageSchema = new Schema<IProductImage>(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

const productSchema = new Schema<IProduct, IProductModel>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    shortDescription: {
      type: String,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    comparePrice: {
      type: Number,
      min: [0, "Compare price cannot be negative"],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    images: [imageSchema],
    variants: [variantSchema],
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    metaTitle: String,
    metaDescription: String,
    soldCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ price: 1 });
productSchema.index({ "ratings.average": -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ soldCount: -1 });
productSchema.index(
  { name: "text", description: "text", shortDescription: "text" },
  { weights: { name: 10, shortDescription: 5, description: 1 } },
);
// Compound index for variant SKU uniqueness (sparse to allow null/undefined)
productSchema.index(
  { "variants.sku": 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { "variants.sku": { $exists: true, $ne: null } },
  },
);

// Virtuals
productSchema.virtual("discountPercentage").get(function (this: IProduct) {
  const displayPrice =
    this.variants.length > 0 ? this.variants[0].price : this.price;
  if (this.comparePrice && this.comparePrice > displayPrice) {
    return Math.round(
      ((this.comparePrice - displayPrice) / this.comparePrice) * 100,
    );
  }
  return 0;
});

productSchema.virtual("displayPrice").get(function (this: IProduct) {
  if (this.variants.length > 0) {
    return this.variants[0].price;
  }
  return this.price;
});

productSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (this.images.length === 0) return null;
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0];
});

productSchema.virtual("totalStock").get(function (this: IProduct) {
  if (this.variants.length === 0) return this.stock;
  return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

productSchema.virtual("inStock").get(function (this: IProduct) {
  return this.totalStock > 0;
});

// Middleware
productSchema.pre("save", async function (this: IProduct) {
  if (this.isModified("name")) {
    let slug = createSlug(this.name);
    const existingProduct = await (this.constructor as IProductModel).findOne({
      slug,
      _id: { $ne: this._id },
    });
    if (existingProduct) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    this.slug = slug;
  }
});

// Statics
productSchema.statics.search = function (
  this: IProductModel,
  query: string,
  options: any = {},
) {
  const {
    limit = 20,
    page = 1,
    category,
    minPrice,
    maxPrice,
    sort = "-createdAt",
  } = options;
  const filter: any = { isActive: true };

  if (query) filter.$text = { $search: query };
  if (category) filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  return this.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("category", "name slug");
};

productSchema.statics.getFeatured = function (
  this: IProductModel,
  limit: number = 8,
) {
  return this.find({ isFeatured: true, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("category", "name slug");
};

// Instance methods
/**
 * Reduce stock atomically to prevent race conditions
 * Uses MongoDB $inc operator for atomic updates
 */
productSchema.methods.reduceStock = async function (
  this: IProduct,
  items: { variantId?: string | Types.ObjectId; quantity: number }[],
) {
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

  for (const item of items) {
    if (item.variantId) {
      // Atomic update for variant stock
      const result = await mongoose.model("Product").findOneAndUpdate(
        {
          _id: this._id,
          "variants._id": item.variantId,
          "variants.stock": { $gte: item.quantity }, // Ensure sufficient stock
        },
        {
          $inc: {
            "variants.$.stock": -item.quantity,
            soldCount: item.quantity,
          },
        },
        { new: true },
      );

      if (!result) {
        throw new Error(`Insufficient stock for variant ${item.variantId}`);
      }
    } else {
      // Atomic update for base product stock
      const result = await mongoose.model("Product").findOneAndUpdate(
        {
          _id: this._id,
          stock: { $gte: item.quantity }, // Ensure sufficient stock
        },
        {
          $inc: {
            stock: -item.quantity,
            soldCount: item.quantity,
          },
        },
        { new: true },
      );

      if (!result) {
        throw new Error("Insufficient stock for product");
      }
    }
  }
};

productSchema.methods.getVariant = function (
  this: IProduct,
  variantId: string | Types.ObjectId,
) {
  return (this.variants as any).id(variantId);
};

productSchema.methods.findVariant = function (
  this: IProduct,
  size: string,
  color: string,
) {
  return this.variants.find(
    (v) => v.size === size && v.color.toLowerCase() === color.toLowerCase(),
  );
};

const Product = mongoose.model<IProduct, IProductModel>(
  "Product",
  productSchema,
);

export default Product;
