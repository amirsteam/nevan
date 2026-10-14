/**
 * Stock filters shared by the admin dashboard and the admin product list, so a
 * dashboard count always matches the list it links to.
 */
import { LOW_STOCK_THRESHOLD } from "./constants";

/** In stock, but running low overall or in at least one size/colour */
export const LOW_STOCK_FILTER = {
  stock: { $gt: 0 },
  $or: [{ stock: { $lte: LOW_STOCK_THRESHOLD } }, { "variants.stock": { $lte: LOW_STOCK_THRESHOLD } }],
};

export const SOLD_OUT_FILTER = { stock: { $lte: 0 } };
