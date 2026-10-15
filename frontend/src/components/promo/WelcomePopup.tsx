/**
 * Welcome popup (see utils/welcomePopup.ts for who gets which, and when):
 * the live sale with 4 of its products (Featured ones first, then the sale's
 * best sellers), or — when no sale is on — 4 Featured products. Each visitor
 * sees it once; it opens as soon as its products are known (the Featured list
 * is requested at once, alongside the campaign check) and the photos fill in
 * their tiles as they arrive, never on
 * quiet pages (cart, checkout, sign-in …), and never over the sign-in prompt.
 *
 * Admins previewing a campaign (?preview=<id>) always see its popup.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import Modal from "../ui/Modal";
import Countdown from "../campaign/Countdown";
import { useCampaign } from "../../context/CampaignContext";
import { usePendingCart } from "../../context/PendingCartContext";
import { productsAPI } from "../../api/products";
import { cardPrice } from "../../utils/pricing";
import { formatPrice } from "../../utils/helpers";
import { imageUrl, onImageError } from "../../utils/image";
import { saleText } from "../../utils/campaign";
import { canShowPopup, isQuietPage, markPopupSeen, popupPlan, type PopupPlan } from "../../utils/welcomePopup";
import type { IProduct } from "../../types";
// The store's logo, cropped from the 1024px app icon (mobile/assets/icon.png)
import storeLogo from "../../assets/nevan-handicraft-logo.webp";

// Same size as the product cards (ProductCard CARD_IMAGE_WIDTH), so the popup and the
// page share the browser's copy and Cloudinary's already-made resize of each photo
const TILE_IMAGE_WIDTH = 360;
const PRODUCT_COUNT = 4;

const unique = (lists: IProduct[][]): IProduct[] => {
  const seen = new Set<string>();
  return lists.flat().filter((p) => (seen.has(p._id) ? false : (seen.add(p._id), true)));
};

const loadFeatured = async (): Promise<IProduct[]> => {
  const featured = await productsAPI.getFeatured(PRODUCT_COUNT);
  return (featured.data.products || []).slice(0, PRODUCT_COUNT);
};

const loadSaleProducts = async (slug: string): Promise<IProduct[]> => {
  const [featured, bestSellers] = await Promise.all([
    productsAPI.getProducts({ campaign: slug, isFeatured: true, limit: PRODUCT_COUNT }),
    productsAPI.getProducts({ campaign: slug, sort: "-soldCount", limit: PRODUCT_COUNT * 2 }),
  ]);
  return unique([featured.data.products || [], bestSellers.data.products || []]).slice(0, PRODUCT_COUNT);
};

const tilePhoto = (product: IProduct) => product.images?.find((img) => img.isPrimary) || product.images?.[0];


const ProductTile = ({ product, onPick }: { product: IProduct; onPick: () => void }) => {
  const photo = tilePhoto(product);
  const { price, was, from } = cardPrice(product);
  return (
    <Link
      to={`/products/${product.slug}`}
      onClick={onPick}
      className="group flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-[var(--shadow-md)] md:w-auto"
    >
      <div className="aspect-square overflow-hidden bg-[var(--color-surface-muted)]">
        {photo && (
          <img
            src={imageUrl(photo.url, TILE_IMAGE_WIDTH)}
            alt=""
            fetchPriority="high"
            decoding="async"
            onError={onImageError}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="p-2.5 text-center">
        <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline justify-center gap-x-1.5 text-sm">
          {was !== null && (
            <span className="text-xs text-[var(--color-text-muted)] line-through">{formatPrice(was)}</span>
          )}
          <span className="font-semibold text-[var(--color-primary)]">
            {from ? "From " : ""}
            {formatPrice(price)}
          </span>
        </p>
      </div>
    </Link>
  );
};

const WelcomePopup = () => {
  const { campaign, loading, isPreview } = useCampaign();
  const { isModalOpen: signInPromptOpen } = usePendingCart();
  const { pathname } = useLocation();
  const [ready, setReady] = useState<{ plan: PopupPlan; products: IProduct[] } | null>(null);
  const [status, setStatus] = useState<"waiting" | "open" | "closed">("waiting");

  const plan = useMemo(() => (loading ? null : popupPlan(campaign)), [campaign, loading]);

  // The Featured list is asked for straight away, in parallel with the campaign check
  // (it's the popup most visits get), instead of waiting for the campaign first
  const featuredRequest = useRef<Promise<IProduct[]> | null>(null);
  useEffect(() => {
    if (featuredRequest.current || !canShowPopup(popupPlan(null))) return;
    featuredRequest.current = loadFeatured();
    featuredRequest.current.catch(() => {
      // Handled where it's used
    });
  }, []);

  // Pick the popup once the campaign is known, then open as soon as it's ready
  useEffect(() => {
    if (!plan) return;
    if (!(isPreview && plan.kind === "campaign") && !canShowPopup(plan)) return;

    let cancelled = false;
    const products =
      plan.kind === "campaign" ? loadSaleProducts(plan.campaign.slug) : (featuredRequest.current ?? loadFeatured());
    products
      .then((list) => {
        // Open straight away; photos fill their tiles as they arrive (Cloudinary is ~0.3-1 s from Nepal)
        if (!cancelled && list.length > 0) setReady({ plan, products: list });
      })
      .catch(() => {
        // A failed popup must never affect the page
      });
    return () => {
      cancelled = true;
    };
  }, [plan, isPreview]);

  // Open on the first page where it won't get in the way (adjusted during render)
  if (ready && status === "waiting" && !isQuietPage(pathname) && !signInPromptOpen) {
    setStatus("open");
  }

  // Once shown, this visitor won't see it again (an admin preview doesn't count)
  const previewing = Boolean(ready && isPreview && ready.plan.kind === "campaign");
  useEffect(() => {
    if (status === "open" && ready && !previewing) markPopupSeen(ready.plan);
  }, [status, ready, previewing]);

  if (!ready) return null;
  const open = status === "open";
  const close = () => setStatus("closed");
  const sale = ready.plan.kind === "campaign" ? ready.plan.campaign : null;

  return (
    <Modal
      isOpen={open}
      onClose={close}
      ariaLabel={sale ? `${sale.name}: ${saleText(sale) || sale.headline}` : "Featured products"}
      showCloseButton={false}
      variant="sheet"
      size="full"
      bodyClassName="!p-0"
    >
      <div className="relative grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <button
          type="button"
          onClick={close}
          data-modal-close="true"
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface)]/90 text-[var(--color-text)] shadow-[var(--shadow-md)] hover:bg-[var(--color-surface)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {/* The offer */}
        <div
          className={`flex flex-col justify-center gap-2 px-5 pb-5 pt-6 pr-14 md:gap-3 md:p-8 text-center md:text-left ${
            sale ? "" : "bg-[var(--color-primary-soft)]"
          }`}
          style={sale ? { backgroundColor: sale.theme.bg, color: sale.theme.text } : undefined}
        >
          {/* Drawn on white, so it keeps its colours on any sale palette and in dark mode */}
          <span className="mb-1 inline-flex self-center rounded-2xl bg-white px-3 py-2 shadow-[var(--shadow-md)] md:mb-2 md:self-start md:px-4">
            <img src={storeLogo} alt="Nevan Handicraft" width={640} height={342} className="h-12 w-auto md:h-24" />
          </span>
          {sale ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-wide opacity-90">
                {[sale.emoji, sale.name].filter(Boolean).join(" ")}
              </p>
              <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight">{saleText(sale) || sale.headline}</h2>
              {(sale.subheadline || sale.greeting) && <p className="opacity-90">{sale.subheadline || sale.greeting}</p>}
              <Countdown endsAt={sale.endsAt} className="justify-center md:justify-start text-sm opacity-90" />
              <Link
                to={`/sale/${sale.slug}`}
                onClick={close}
                className="btn mt-1 md:mt-2 self-center md:self-start px-6 py-2.5 md:py-3 font-semibold"
                style={{ backgroundColor: sale.theme.accent, color: sale.theme.onAccent }}
              >
                {sale.ctaLabel || "Shop the sale"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="space-y-2 md:space-y-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-primary-dark)]">Handmade in Nepal</p>
              <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight">Our favourites</h2>
              <p className="text-sm md:text-base text-[var(--color-text-muted)]">Soft, handmade clothes for little ones, picked by the Nevan team.</p>
              <Link to="/products" onClick={close} className="btn btn-primary mt-1 md:mt-2 px-6 py-2.5 md:py-3 font-semibold">
                Shop now
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* The products */}
        <div
          className="flex snap-x scroll-px-4 gap-3 overflow-x-auto bg-[var(--color-bg)] p-4 scrollbar-none md:grid md:grid-cols-2 md:overflow-visible md:p-6"
        >
          {ready.products.map((product) => (
            <ProductTile key={product._id} product={product} onPick={close} />
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default WelcomePopup;
