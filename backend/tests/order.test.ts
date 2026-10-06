/**
 * Order service tests: pricing from the database and stock reservation
 */
import * as orderService from "../services/orderService";
import Product from "../models/Product";
import Order from "../models/Order";
import { createUser, createProduct, fillCart, shippingAddress } from "./helpers";

const placeOrder = (userId: unknown) =>
  orderService.createOrder(String(userId), {
    shippingAddress,
    paymentMethod: "cod",
  });

describe("createOrder", () => {
  it("prices items from the database, not the cart", async () => {
    const { user } = await createUser();
    const product = await createProduct({ price: 1200, stock: 3 });
    await fillCart(user._id, [{ product: { ...product.toObject(), price: 1 }, quantity: 2 }]);

    const order = await placeOrder(user._id);

    expect(order.items[0].price).toBe(1200);
    expect(order.pricing.subtotal).toBe(2400);
    expect(order.pricing.total).toBe(2400 + order.pricing.shippingCost);
  });

  it("decrements stock and rejects orders larger than the stock", async () => {
    const { user } = await createUser();
    const product = await createProduct({ stock: 2 });

    await fillCart(user._id, [{ product, quantity: 3 }]);
    await expect(placeOrder(user._id)).rejects.toThrow(/stock/i);

    await fillCart(user._id, [{ product, quantity: 2 }]);
    await placeOrder(user._id);

    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(0);
  });

  it("never oversells when orders for the last item are placed concurrently", async () => {
    const product = await createProduct({ stock: 1 });
    const buyers = await Promise.all([createUser(), createUser(), createUser(), createUser()]);
    await Promise.all(buyers.map(({ user }) => fillCart(user._id, [{ product, quantity: 1 }])));

    const results = await Promise.allSettled(buyers.map(({ user }) => placeOrder(user._id)));

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const updated = await Product.findById(product._id);
    expect(updated!.stock).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("reserves variant stock and releases earlier items when a later one is out of stock", async () => {
    const { user } = await createUser();
    const inStock = await createProduct({ stock: 5 });
    const variantProduct = await createProduct({
      stock: 0,
      variants: [{ size: "Small Size (0-1 yrs)", color: "White", price: 900, stock: 1 }],
    });
    const variantId = variantProduct.variants[0]._id;

    await fillCart(user._id, [
      { product: inStock, quantity: 2 },
      { product: variantProduct, quantity: 1, variantId },
    ]);
    await placeOrder(user._id);

    let variant = (await Product.findById(variantProduct._id))!.variants[0];
    expect(variant.stock).toBe(0);
    expect((await Product.findById(inStock._id))!.stock).toBe(3);

    // Second order: first item is available, the variant is not -> nothing is reserved
    await fillCart(user._id, [
      { product: inStock, quantity: 1 },
      { product: variantProduct, quantity: 1, variantId },
    ]);
    await expect(placeOrder(user._id)).rejects.toThrow(/stock|available/i);

    expect((await Product.findById(inStock._id))!.stock).toBe(3);
    variant = (await Product.findById(variantProduct._id))!.variants[0];
    expect(variant.stock).toBe(0);
  });
});
