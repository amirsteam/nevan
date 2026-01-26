/**
 * Global Type Definitions
 */

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin';
  isActive: boolean;
  avatar?: {
    url: string;
    publicId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: {
    url: string;
    publicId: string;
  };
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: string | ICategory;
  images: {
    url: string;
    publicId: string;
  }[];
  stock: number;
  ratings?: number;
  numReviews?: number;
  isFeatured?: boolean;
}

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
