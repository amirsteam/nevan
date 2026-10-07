/**
 * Campaign sale page (/sale/:slug)
 * The products a festival/event campaign covers, under its themed header.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { campaignsAPI } from "../api/campaigns";
import { productsAPI } from "../api";
import ProductCard from "../components/ProductCard";
import Countdown from "../components/campaign/Countdown";
import { EmptyState, Pagination } from "../components/ui";
import { ProductGridSkeleton, Skeleton } from "../components/ui/Skeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { saleText } from "../utils/campaign";
import { getErrorMessage } from "../utils/helpers";
import type { IPagination, IProduct, IPublicCampaign } from "../types";

const PAGE_SIZE = 24;

const Sale = () => {
  const { slug = "" } = useParams();
  const [campaign, setCampaign] = useState<IPublicCampaign | null>(null);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [pagination, setPagination] = useState<IPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(campaign?.name || "Sale", campaign ? saleText(campaign) || campaign.subheadline : null);

  // Start again from page 1 when moving between campaigns (adjusted during render)
  const [lastSlug, setLastSlug] = useState(slug);
  if (lastSlug !== slug) {
    setLastSlug(slug);
    setPage(1);
    setLoading(true);
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      campaignsAPI.getBySlug(slug),
      productsAPI.getProducts({ campaign: slug, page, limit: PAGE_SIZE, sort: "-soldCount" }),
    ])
      .then(([c, res]) => {
        if (cancelled) return;
        setCampaign(c);
        setProducts(res.data.products || []);
        setPagination(res.pagination ?? null);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, "This sale could not be found"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, page]);

  if (error) {
    return (
      <div className="container-app py-16">
        <EmptyState
          type="search"
          headingLevel="h1"
          title="Sale not found"
          description="This sale may have been removed. Browse the shop for today's prices."
          actionLabel="Shop all products"
          actionLink="/products"
        />
      </div>
    );
  }

  const theme = campaign?.theme;
  const offer = campaign ? saleText(campaign) : null;
  const ended = campaign?.state === "ended";
  const upcoming = campaign?.state === "scheduled";

  return (
    <div>
      {/* Themed header */}
      <section
        className="relative overflow-hidden"
        style={theme ? { backgroundColor: theme.bg, color: theme.text } : undefined}
      >
        {theme && (
          <>
            <span aria-hidden="true" className="absolute -left-24 -top-24 w-72 h-72 rounded-full opacity-25" style={{ backgroundColor: theme.highlight }} />
            <span aria-hidden="true" className="absolute -right-20 -bottom-32 w-80 h-80 rounded-full opacity-20" style={{ backgroundColor: theme.accent }} />
          </>
        )}
        <div className="container-app relative py-10 md:py-14 text-center">
          {!campaign ? (
            <div className="flex flex-col items-center gap-3" aria-hidden="true">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-48" />
            </div>
          ) : (
            <>
              {campaign.emoji && (
                <p className="text-5xl mb-2" aria-hidden="true">
                  {campaign.emoji}
                </p>
              )}
              {campaign.greeting && <p className="font-medium opacity-90 mb-1">{campaign.greeting}</p>}
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{campaign.headline}</h1>
              {offer && !ended && (
                <p
                  className="inline-block text-lg md:text-xl font-bold rounded-full px-5 py-1.5 mb-3"
                  style={{ backgroundColor: campaign.theme.accent, color: campaign.theme.onAccent }}
                >
                  {offer}
                </p>
              )}
              {campaign.subheadline && <p className="max-w-2xl mx-auto opacity-90 mb-3">{campaign.subheadline}</p>}
              <p className="text-sm font-medium">
                {ended ? (
                  "This sale has ended — prices are back to normal."
                ) : upcoming ? (
                  `Starts ${new Date(campaign.startsAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kathmandu",
                  })} (Nepal time)`
                ) : (
                  <Countdown endsAt={campaign.endsAt} />
                )}
              </p>
            </>
          )}
        </div>
      </section>

      <div className="container-app py-8 md:py-12">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <EmptyState
            type="products"
            title={ended ? "This sale has ended" : "No products in this sale yet"}
            description="Browse the full shop for more soft, handmade clothing."
            actionLabel="Shop all products"
            actionLink="/products"
          />
        ) : (
          <>
            <p className="text-sm text-[var(--color-text-muted)] mb-4" aria-live="polite">
              {pagination?.totalItems ?? products.length} products
            </p>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
              {products.map((product, i) => (
                <li key={product._id}>
                  <ProductCard product={product} priority={i < 4} />
                </li>
              ))}
            </ul>
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-10">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    setLoading(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            )}
            {ended && (
              <p className="mt-8 text-center">
                <Link to="/products" className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline">
                  Shop all products <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sale;
