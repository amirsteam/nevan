import api from "./axios";
import type {
  IApiResponse,
  IProduct,
  ICategory,
  IProductsResponse,
} from "@shared/types";

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
}

export const productsAPI = {
  getProducts: async (
    params: ProductQueryParams = {},
  ): Promise<IApiResponse<IProductsResponse>> => {
    const response = await api.get("/products", { params });
    return response.data;
  },

  getFeatured: async (
    limit: number = 8,
  ): Promise<IApiResponse<IProductsResponse>> => {
    const response = await api.get("/products/featured", { params: { limit } });
    return response.data;
  },

  getProduct: async (
    slug: string,
  ): Promise<IApiResponse<{ product: IProduct }>> => {
    const response = await api.get(`/products/${slug}`);
    return response.data;
  },

  searchProducts: async (
    query: string,
    params: ProductQueryParams = {},
  ): Promise<IApiResponse<IProductsResponse>> => {
    const response = await api.get("/products", {
      params: { search: query, ...params },
    });
    return response.data;
  },
};

export const categoriesAPI = {
  getCategories: async (): Promise<
    IApiResponse<{ categories: ICategory[] }>
  > => {
    const response = await api.get("/categories");
    return response.data;
  },

  getCategory: async (
    slug: string,
  ): Promise<IApiResponse<{ category: ICategory }>> => {
    const response = await api.get(`/categories/${slug}`);
    return response.data;
  },

  getCategoryProducts: async (
    slug: string,
    params: ProductQueryParams = {},
  ): Promise<IApiResponse<IProductsResponse>> => {
    const response = await api.get("/products", {
      params: { category: slug, ...params },
    });
    return response.data;
  },
};

export default { productsAPI, categoriesAPI };
