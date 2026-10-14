/**
 * One product row in search suggestions (thumbnail, name, price). Rendered
 * inside a link (search overlay) or a listbox option (header search).
 */
import { formatPrice } from "../../utils/helpers";
import { imageUrl } from "../../utils/image";
import type { IProduct } from "../../types";

const ProductSuggestion = ({ product }: { product: IProduct }) => (
  <>
    <img
      src={imageUrl(product.images?.[0]?.url, 96)}
      alt=""
      className="w-12 h-12 rounded-lg object-cover bg-[var(--color-surface-muted)] shrink-0"
    />
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium truncate">{product.name}</span>
      <span className="block text-sm text-[var(--color-primary)] font-semibold">{formatPrice(product.price)}</span>
    </span>
  </>
);

export default ProductSuggestion;
