/**
 * Products API Endpoints
 * RTK Query endpoints for products and categories
 */
import { baseApi } from "./baseApi";
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

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get paginated products list
    getProducts: builder.query<IProductsResponse, ProductQueryParams>({
      query: (params) => ({
        url: "/products",
        params,
      }),
      transformResponse: (response: IApiResponse<IProductsResponse>) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ _id }) => ({
                type: "Product" as const,
                id: _id,
              })),
              { type: "Products", id: "LIST" },
            ]
          : [{ type: "Products", id: "LIST" }],
    }),

    // Get featured products
    getFeaturedProducts: builder.query<IProductsResponse, number | void>({
      query: (limit = 8) => ({
        url: "/products/featured",
        params: { limit },
      }),
      transformResponse: (response: IApiResponse<IProductsResponse>) =>
        response.data,
      providesTags: [{ type: "Products", id: "FEATURED" }],
    }),

    // Get single product by slug
    getProduct: builder.query<IProduct, string>({
      query: (slug) => `/products/${slug}`,
      transformResponse: (response: IApiResponse<{ product: IProduct }>) =>
        response.data.product,
      providesTags: (result, error, slug) => [{ type: "Product", id: slug }],
    }),

    // Search products
    searchProducts: builder.query<
      IProductsResponse,
      { query: string } & ProductQueryParams
    >({
      query: ({ query, ...params }) => ({
        url: "/products",
        params: { search: query, ...params },
      }),
      transformResponse: (response: IApiResponse<IProductsResponse>) =>
        response.data,
      providesTags: [{ type: "Products", id: "SEARCH" }],
    }),

    // Get all categories
    getCategories: builder.query<ICategory[], void>({
      query: () => "/categories",
      transformResponse: (
        response: IApiResponse<{ categories: ICategory[] }>,
      ) => response.data.categories,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({
                type: "Category" as const,
                id: _id,
              })),
              { type: "Categories", id: "LIST" },
            ]
          : [{ type: "Categories", id: "LIST" }],
    }),

    // Get single category by slug
    getCategory: builder.query<ICategory, string>({
      query: (slug) => `/categories/${slug}`,
      transformResponse: (response: IApiResponse<{ category: ICategory }>) =>
        response.data.category,
      providesTags: (result, error, slug) => [{ type: "Category", id: slug }],
    }),

    // Get products by category
    getCategoryProducts: builder.query<
      IProductsResponse,
      { slug: string } & ProductQueryParams
    >({
      query: ({ slug, ...params }) => ({
        url: "/products",
        params: { category: slug, ...params },
      }),
      transformResponse: (response: IApiResponse<IProductsResponse>) =>
        response.data,
      providesTags: (result, error, { slug }) => [
        { type: "Products", id: `CATEGORY_${slug}` },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks for usage in components
export const {
  useGetProductsQuery,
  useGetFeaturedProductsQuery,
  useGetProductQuery,
  useSearchProductsQuery,
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryProductsQuery,
  // Lazy queries for imperative fetching
  useLazyGetProductsQuery,
  useLazySearchProductsQuery,
} = productsApi;
