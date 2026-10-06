/**
 * Test fixtures shared by the API/service tests
 */
import User from "../models/User";
import Category from "../models/Category";
import Product from "../models/Product";
import Cart from "../models/Cart";
import { generateTokenPair } from "../utils/tokenUtils";

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

export const createUser = async (overrides: Record<string, unknown> = {}) => {
  const user = await User.create({
    name: "Test User",
    email: `user-${unique()}@example.com`,
    password: "password123",
    ...overrides,
  });
  const { accessToken } = generateTokenPair(user);
  return { user, accessToken };
};

export const createProduct = async (overrides: Record<string, unknown> = {}) => {
  const category = await Category.create({ name: `Category ${unique()}` });
  return Product.create({
    name: `Product ${unique()}`,
    description: "A test product",
    price: 1000,
    stock: 5,
    category: category._id,
    images: [{ url: "https://example.com/image.jpg" }],
    ...overrides,
  });
};

export const fillCart = async (
  userId: unknown,
  items: { product: any; quantity: number; variantId?: unknown }[],
) => {
  return Cart.findOneAndUpdate(
    { user: userId } as Record<string, unknown>,
    {
      user: userId,
      items: items.map((i) => ({
        product: i.product._id,
        variantId: i.variantId ?? null,
        quantity: i.quantity,
        priceAtAdd: i.product.price,
      })),
    },
    { upsert: true, new: true },
  );
};

export const shippingAddress = {
  name: "Test User",
  phone: "9841234567",
  street: "Main Street",
  city: "Kathmandu",
  district: "Kathmandu",
  province: 3,
};
