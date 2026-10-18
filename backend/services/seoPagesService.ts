/**
 * Search-engine and link-preview copies of the storefront's pages.
 *
 * The storefront is a single-page app: every address serves the same
 * index.html, and Facebook/WhatsApp/Messenger link previews don't run its
 * JavaScript. So the backend (same hosting account, same files) writes, into
 * the storefront's web root (WEB_ROOT):
 *   _seo/products/<slug>.html   each visible product: its own title, description,
 *                               1200×630 preview photo, Product + Offer and
 *                               breadcrumb structured data, and a preload of
 *                               the photo the page shows first
 *   _seo/sale/<slug>.html       the live sale page
 *   _seo/pages/<name>.html      the shop's information pages
 *   sitemap.xml                 every page above, with photos and dates
 *   feeds/catalog.xml           a product feed for Facebook/Instagram shops
 * Each copy IS the app (the deployed index.html) with page-specific <head>
 * tags, so people get the normal app; frontend/public/.htaccess serves the
 * copy for its address when one exists.
 *
 * Kept fresh by the running backend (startSeoPageUpkeep): after product and
 * campaign changes (debounced), when a sale starts or ends, after each
 * storefront release (the template's asset links change with every build),
 * and hourly. scripts/writeSeoPages.ts writes them by hand. Does nothing
 * unless WEB_ROOT is set.
 */
import fs from "fs";
import path from "path";
import Product from "../models/Product";
import Category from "../models/Category";
import { getLiveCampaign } from "./campaignService";
import { priceFor, type PricingCampaign } from "../utils/campaignPricing";
import { getFrontendUrl } from "../utils/helpers";
import { sortSizes } from "../utils/productVariants";
import { getShippingSettings } from "./shippingService";

export const SEO_DIR = "_seo";
const STORE_NAME = "Nevan Handicraft";
const DEFAULT_IMAGE = "/og-image.jpg";
/** The product page's main photo width (frontend ProductDetail MAIN_IMAGE_WIDTH) */
const PRODUCT_PAGE_IMAGE_WIDTH = 720;
const REFRESH_DELAY_MS = 10 * 1000;
const CHECK_EVERY_MS = 60 * 1000;

/**
 * Information pages. Titles and descriptions match each page's usePageTitle
 * in the frontend; change them together.
 */
export const STATIC_PAGES: { name: string; path: string; title: string; description: string }[] = [
  {
    name: "products",
    path: "/products",
    title: "All products",
    description: "Soft, handmade 100% cotton baby and kids clothing for ages 0–7 years, made in Panauti, Nepal. Cash on delivery and eSewa.",
  },
  {
    name: "categories",
    path: "/categories",
    title: "Shop by category",
    description: "Browse Nevan Handicraft's handmade baby and kids clothing by collection.",
  },
  {
    name: "about",
    path: "/about",
    title: "About us",
    description:
      "Meet Anjana Shrestha, the mother behind Nevan Handicraft's handmade 100% cotton baby clothing in Panauti, Nepal — winner of the Outstanding Entrepreneur Award 2082.",
  },
  {
    name: "contact",
    path: "/contact",
    title: "Contact us",
    description:
      "Questions about sizes, orders or delivery? WhatsApp, call, chat or message Nevan Handicraft — we usually reply within a few hours.",
  },
  {
    name: "faq",
    path: "/faq",
    title: "FAQ",
    description: "Answers about delivery, shipping costs, sizes, payments and returns at Nevan Handicraft.",
  },
  {
    name: "shipping",
    path: "/shipping",
    title: "Shipping information",
    // The free-shipping amount is filled in from the admin's shipping settings
    description: "Delivery times and costs across Nepal. Free shipping on orders of NPR {threshold} or more.",
  },
  {
    name: "returns",
    path: "/returns",
    title: "Returns & exchanges",
    description: "How to return or exchange a Nevan Handicraft order within 7 days of delivery.",
  },
  {
    name: "privacy",
    path: "/privacy",
    title: "Privacy policy",
    description: "What Nevan Handicraft collects, why, and how long it is kept.",
  },
];

// ==================== HTML helpers ====================

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A description for <meta>: plain text, one line, at most 160 characters */
export const shortText = (value: string | undefined, max = 160): string => {
  const text = (value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20))}…`;
};

/** Cloudinary URL with a transformation inserted (other URLs unchanged) */
export const cloudinaryVariant = (url: string, transform: string): string => {
  const match = url.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!match) return url;
  // Already transformed: leave it
  if (/^(?:[a-z]{1,3}_[^/,]+,?)+\//.test(match[2])) return url;
  return `${match[1]}${transform}/${match[2]}`;
};

/** The same URL the storefront's imageUrl(url, width) builds (frontend utils/image.ts) */
const pageImageUrl = (url: string, width: number) => cloudinaryVariant(url, `f_auto,q_auto,c_limit,w_${width}`);

/** 1200×630 JPEG with the whole photo on white: what Facebook and WhatsApp previews want */
const previewImageUrl = (url: string) => cloudinaryVariant(url, "w_1200,h_630,c_pad,b_white,f_jpg,q_auto");

const jsonLd = (data: unknown): string =>
  `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;

export interface PageMeta {
  /** Path on the site, e.g. /products/muslin-romper */
  path: string;
  /** Page title without the store name (null: the store's own title, for the home page) */
  title: string | null;
  description: string;
  /** Absolute image URL */
  image: string;
  imageAlt: string;
  /** Known only for images made 1200×630 */
  imageSize?: { width: number; height: number };
  type?: "website" | "product";
  structuredData?: unknown[];
  /** Photo the page shows first: { href, srcset } */
  preload?: { href: string; srcset?: string };
}

/**
 * The app's index.html with this page's <head> tags. Tags missing from the
 * template are added before </head>.
 */
export const renderPage = (template: string, site: string, meta: PageMeta): string => {
  let html = template;
  const set = (pattern: RegExp, tag: string) => {
    html = pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
  };
  const metaTag = (attr: "name" | "property", key: string, value: string) =>
    set(
      new RegExp(`<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*/?>`),
      `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`,
    );

  const title = meta.title ? `${meta.title} · ${STORE_NAME}` : `${STORE_NAME} · Soft, handmade baby clothing from Nepal`;
  const url = `${site}${meta.path}`;
  set(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  metaTag("name", "description", meta.description);
  set(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${escapeHtml(url)}" />`);
  metaTag("property", "og:type", meta.type || "website");
  metaTag("property", "og:url", url);
  metaTag("property", "og:title", meta.title || title);
  metaTag("property", "og:description", meta.description);
  metaTag("property", "og:image", meta.image);
  metaTag("property", "og:image:alt", meta.imageAlt);
  if (meta.imageSize) {
    metaTag("property", "og:image:width", String(meta.imageSize.width));
    metaTag("property", "og:image:height", String(meta.imageSize.height));
  } else {
    html = html.replace(/\s*<meta\s+property="og:image:(?:width|height)"\s+content="[^"]*"\s*\/?>/g, "");
  }

  const extra: string[] = [];
  if (meta.preload) {
    extra.push(
      `<link rel="preload" as="image" href="${escapeHtml(meta.preload.href)}"${
        meta.preload.srcset ? ` imagesrcset="${escapeHtml(meta.preload.srcset)}"` : ""
      } fetchpriority="high" />`,
    );
  }
  for (const data of meta.structuredData || []) extra.push(jsonLd(data));
  if (extra.length) html = html.replace("</head>", `    ${extra.join("\n    ")}\n  </head>`);
  return html;
};

// ==================== Page data ====================

const primaryImage = (product: any): string | undefined =>
  product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url;

const sameName = (a: unknown, b: unknown) =>
  String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * The photo the product page shows first, so the preload is the request the
 * page makes (frontend ProductDetail: defaultVariant + photosForColor, and
 * utils/productOptions productSizes/productColors; change them together).
 * With photos tagged by colour, that is the first photo of the default
 * variant's colour: the first in-stock size × colour, trying the primary
 * photo's colour first. Otherwise the primary photo.
 */
export const firstShownPhoto = (product: any): string | undefined => {
  const images: any[] = product.images || [];
  const variants: any[] = product.variants || [];
  if (!images.some((img) => img.color) || !variants.length) return primaryImage(product);

  const usedSizes = [...new Set(variants.map((v) => v.size))];
  const listedSizes = (product.sizes || []).filter((s: string) => usedSizes.some((u) => sameName(u, s)));
  const sizes = [...listedSizes, ...sortSizes(usedSizes.filter((u) => !listedSizes.some((s: string) => sameName(s, u))))];
  const usedColors = [...new Set(variants.map((v) => v.color))];
  const listedColors = (product.colors || [])
    .map((c: any) => c.name)
    .filter((name: string) => usedColors.some((u) => sameName(u, name)));
  const colors = [...listedColors, ...usedColors.filter((u) => !listedColors.some((name: string) => sameName(name, u)))];
  const primaryColor = images.find((img) => img.isPrimary)?.color;
  const byColor = primaryColor ? [primaryColor, ...colors.filter((c) => !sameName(c, primaryColor))] : colors;

  let color: string | undefined = variants[0].color;
  search: for (const c of byColor) {
    for (const size of sizes) {
      const variant = variants.find((v) => sameName(v.color, c) && sameName(v.size, size));
      if (variant && variant.stock > 0) {
        color = variant.color;
        break search;
      }
    }
  }
  if (!color) return images[0]?.url;
  const own = images.filter((img) => sameName(img.color, color));
  const general = images.filter((img) => !img.color);
  return (own.length || general.length ? [...own, ...general] : images)[0]?.url;
};

/** Current prices (festival sale included) and stock of a product */
export const offerFor = (product: any, pricing: PricingCampaign | null) => {
  const variants: any[] = product.variants || [];
  const prices = variants.length
    ? variants.map((v) => priceFor(product, v, pricing))
    : [priceFor(product, null, pricing)];
  const current = prices.map((p) => p.price).filter((p) => p > 0);
  const stock = variants.length ? variants.reduce((n, v) => n + (v.stock || 0), 0) : product.stock || 0;
  return {
    low: current.length ? Math.min(...current) : product.price,
    high: current.length ? Math.max(...current) : product.price,
    onSale: prices.some((p) => p.campaignId),
    inStock: stock > 0,
    count: Math.max(variants.length, 1),
  };
};

const formatNpr = (amount: number) => `NPR ${amount.toLocaleString("en-US")}`;

/**
 * Search/preview description. Most of the shop's descriptions are a few words
 * ("for styling"), so short ones get the price and the shop's promise added.
 */
export const productDescription = (product: any, offer: ReturnType<typeof offerFor>): string => {
  const own = [product.shortDescription, product.description]
    .map((text) => shortText(text, 400))
    .sort((a, b) => b.length - a.length)[0];
  if (own.length >= 110) return shortText(own);
  const price = `${offer.low === offer.high ? "" : "From "}${formatNpr(offer.low)}${offer.inStock ? "" : " (sold out)"}`;
  const lead = own ? `${own.charAt(0).toUpperCase()}${own.slice(1).replace(/[\s.!?…]+$/, "")}. ` : `${product.name}. `;
  return shortText(`${lead}${price}. Handmade by ${STORE_NAME} in Panauti, Nepal; cash on delivery or eSewa.`);
};

const productMeta = (product: any, site: string, pricing: PricingCampaign | null, saleEnds?: Date): PageMeta => {
  const path = `/products/${product.slug}`;
  const photo = primaryImage(product);
  const shownFirst = firstShownPhoto(product);
  const category = product.category && typeof product.category === "object" ? product.category : null;
  const offer = offerFor(product, pricing);
  const description = productDescription(product, offer);
  const images = (product.images || []).slice(0, 5).map((img: any) => pageImageUrl(img.url, 1200));

  const offers: Record<string, unknown> = {
    "@type": offer.count > 1 && offer.low !== offer.high ? "AggregateOffer" : "Offer",
    priceCurrency: "NPR",
    availability: offer.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    url: `${site}${path}`,
    seller: { "@id": `${site}/#organization` },
  };
  if (offers["@type"] === "AggregateOffer") {
    offers.lowPrice = offer.low;
    offers.highPrice = offer.high;
    offers.offerCount = offer.count;
  } else {
    offers.price = offer.low;
  }
  if (offer.onSale && saleEnds) offers.priceValidUntil = new Date(saleEnds).toISOString().slice(0, 10);

  const breadcrumb = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${site}/` },
    ...(category
      ? [{ "@type": "ListItem", position: 2, name: category.name, item: `${site}/products?category=${encodeURIComponent(category.slug)}` }]
      : []),
    { "@type": "ListItem", position: category ? 3 : 2, name: product.name, item: `${site}${path}` },
  ];

  return {
    path,
    title: product.name,
    description,
    image: photo ? previewImageUrl(photo) : `${site}${DEFAULT_IMAGE}`,
    imageAlt: product.name,
    imageSize: { width: 1200, height: 630 },
    type: "product",
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description,
        image: images,
        sku: product.sku || String(product._id),
        brand: { "@type": "Brand", name: STORE_NAME },
        ...(category ? { category: category.name } : {}),
        offers,
      },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: breadcrumb },
    ],
    preload: shownFirst
      ? {
          href: pageImageUrl(shownFirst, PRODUCT_PAGE_IMAGE_WIDTH),
          srcset: `${pageImageUrl(shownFirst, PRODUCT_PAGE_IMAGE_WIDTH)} 1x, ${pageImageUrl(shownFirst, PRODUCT_PAGE_IMAGE_WIDTH * 2)} 2x`,
        }
      : undefined,
  };
};

const xmlEscape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const day = (date?: Date) => (date ? new Date(date).toISOString().slice(0, 10) : undefined);

export const buildSitemap = (
  site: string,
  entries: { path: string; lastmod?: string; images?: string[] }[],
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
  entries
    .map(
      (e) =>
        `  <url>\n    <loc>${xmlEscape(site + e.path)}</loc>\n` +
        (e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : "") +
        (e.images || []).map((img) => `    <image:image><image:loc>${xmlEscape(img)}</image:loc></image:image>\n`).join("") +
        `  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

/** Facebook/Instagram catalog feed (RSS 2.0 with Google product fields) */
export const buildCatalogFeed = (site: string, products: any[], pricing: PricingCampaign | null): string => {
  const items = products
    .filter((p) => primaryImage(p))
    .map((p) => {
      const offer = offerFor(p, pricing);
      const regular = (() => {
        const variants: any[] = p.variants || [];
        const base = variants.length ? Math.min(...variants.map((v) => v.price).filter((x: number) => x > 0)) : p.price;
        return Number.isFinite(base) ? base : p.price;
      })();
      const category = p.category && typeof p.category === "object" ? p.category.name : "";
      return [
        "    <item>",
        `      <g:id>${xmlEscape(String(p._id))}</g:id>`,
        `      <g:title>${xmlEscape(p.name)}</g:title>`,
        `      <g:description>${xmlEscape(shortText(p.description, 4000) || p.name)}</g:description>`,
        `      <g:link>${xmlEscape(`${site}/products/${p.slug}`)}</g:link>`,
        `      <g:image_link>${xmlEscape(cloudinaryVariant(primaryImage(p) as string, "w_1080,c_limit,f_jpg,q_auto"))}</g:image_link>`,
        `      <g:availability>${offer.inStock ? "in stock" : "out of stock"}</g:availability>`,
        "      <g:condition>new</g:condition>",
        `      <g:price>${regular.toFixed(2)} NPR</g:price>`,
        offer.onSale ? `      <g:sale_price>${offer.low.toFixed(2)} NPR</g:sale_price>` : "",
        `      <g:brand>${STORE_NAME}</g:brand>`,
        category ? `      <g:product_type>${xmlEscape(category)}</g:product_type>` : "",
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n  <channel>\n` +
    `    <title>${STORE_NAME}</title>\n    <link>${xmlEscape(site)}/</link>\n    <description>Handmade baby clothing from Nepal</description>\n` +
    `${items.join("\n")}\n  </channel>\n</rss>\n`
  );
};

// ==================== Writing ====================

/** Write a file via a temporary name, so visitors never get half a page */
const writeAtomic = (file: string, content: string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
};

/** Remove .html files in a folder that aren't in `keep` (products hidden or deleted) */
const removeStale = (dir: string, keep: Set<string>): number => {
  if (!fs.existsSync(dir)) return 0;
  let removed = 0;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".html") && !keep.has(file)) {
      fs.rmSync(path.join(dir, file), { force: true });
      removed++;
    }
  }
  return removed;
};

export interface SeoWriteResult {
  products: number;
  pages: number;
  sale: number;
  removed: number;
  sitemapUrls: number;
}

/** Write every page copy, the sitemap and the catalog feed into webRoot */
export const writeSeoPages = async (webRoot: string, site = getFrontendUrl()): Promise<SeoWriteResult> => {
  const templatePath = path.join(webRoot, "index.html");
  if (!fs.existsSync(templatePath)) throw new Error(`No index.html in ${webRoot} (deploy the storefront first)`);
  const template = fs.readFileSync(templatePath, "utf8");

  const [products, categories, live, shipping] = await Promise.all([
    Product.find({ isActive: true })
      .select("name slug description shortDescription images price stock variants sizes colors sku category updatedAt")
      .populate("category", "name slug")
      .lean(),
    Category.find({ isActive: true }).select("slug updatedAt").lean(),
    getLiveCampaign(),
    getShippingSettings(),
  ]);
  const pricing = live?.pricing ?? null;
  const saleEnds = live?.campaign?.endsAt;
  const seoRoot = path.join(webRoot, SEO_DIR);

  // Products
  const productDir = path.join(seoRoot, "products");
  const productFiles = new Set<string>();
  for (const product of products as any[]) {
    if (!product.slug || !/^[a-z0-9-]+$/i.test(product.slug)) continue;
    const file = `${product.slug}.html`;
    writeAtomic(path.join(productDir, file), renderPage(template, site, productMeta(product, site, pricing, saleEnds)));
    productFiles.add(file);
  }
  let removed = removeStale(productDir, productFiles);

  // The live sale (only while a campaign with a sale is live)
  const saleDir = path.join(seoRoot, "sale");
  const saleFiles = new Set<string>();
  const campaign: any = live?.campaign;
  if (campaign?.slug && /^[a-z0-9-]+$/i.test(campaign.slug) && live?.pricing.type !== "none") {
    const banner = campaign.bannerDesktop?.url || campaign.bannerMobile?.url;
    const file = `${campaign.slug}.html`;
    writeAtomic(
      path.join(saleDir, file),
      renderPage(template, site, {
        path: `/sale/${campaign.slug}`,
        title: campaign.name,
        description: shortText(campaign.subheadline || campaign.headline || `${campaign.name} at ${STORE_NAME}`),
        image: banner ? previewImageUrl(banner) : `${site}${DEFAULT_IMAGE}`,
        imageAlt: campaign.name,
        imageSize: { width: 1200, height: 630 },
      }),
    );
    saleFiles.add(file);
  }
  removed += removeStale(saleDir, saleFiles);

  // Information pages
  for (const page of STATIC_PAGES) {
    writeAtomic(
      path.join(seoRoot, "pages", `${page.name}.html`),
      renderPage(template, site, {
        path: page.path,
        title: page.title,
        description: shortText(page.description.replace("{threshold}", shipping.freeShippingThreshold.toLocaleString("en-US"))),
        image: `${site}${DEFAULT_IMAGE}`,
        imageAlt: `${STORE_NAME}: soft, handmade baby clothing from Nepal`,
        imageSize: { width: 1200, height: 630 },
      }),
    );
  }

  // Sitemap
  const entries = [
    { path: "/" },
    ...STATIC_PAGES.map((p) => ({ path: p.path })),
    ...(categories as any[]).map((c) => ({ path: `/products?category=${encodeURIComponent(c.slug)}`, lastmod: day(c.updatedAt) })),
    ...(products as any[])
      .filter((p) => productFiles.has(`${p.slug}.html`))
      .map((p) => ({
        path: `/products/${p.slug}`,
        lastmod: day(p.updatedAt),
        images: (p.images || []).slice(0, 5).map((img: any) => img.url),
      })),
    ...[...saleFiles].map((f) => ({ path: `/sale/${f.replace(/\.html$/, "")}` })),
  ];
  writeAtomic(path.join(webRoot, "sitemap.xml"), buildSitemap(site, entries));
  writeAtomic(path.join(webRoot, "feeds", "catalog.xml"), buildCatalogFeed(site, products as any[], pricing));

  return { products: productFiles.size, pages: STATIC_PAGES.length, sale: saleFiles.size, removed, sitemapUrls: entries.length };
};

// ==================== Scheduling ====================

let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let again = false;

const run = async () => {
  const webRoot = process.env.WEB_ROOT;
  if (!webRoot) return;
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    const result = await writeSeoPages(webRoot);
    console.log(`🔎 SEO pages: ${result.products} products, ${result.pages} pages, ${result.sale} sale, ${result.removed} removed`);
  } catch (error) {
    console.error("SEO pages could not be written:", (error as Error).message);
  } finally {
    running = false;
    if (again) {
      again = false;
      scheduleSeoRefresh();
    }
  }
};

/**
 * Refresh the copies soon (after product or campaign changes). Many changes in
 * a row cause one refresh. No-op without WEB_ROOT (development, tests).
 */
export const scheduleSeoRefresh = (delayMs = REFRESH_DELAY_MS): void => {
  if (!process.env.WEB_ROOT) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void run();
  }, delayMs);
  timer.unref?.();
};

/** Refresh now */
export const refreshSeoPagesNow = (): Promise<void> => run();

/** What the copies were last written from: the live sale and the app's index.html */
const currentInputs = async (webRoot: string): Promise<string> => {
  const live = await getLiveCampaign();
  let template = 0;
  try {
    template = fs.statSync(path.join(webRoot, "index.html")).mtimeMs;
  } catch {
    // No storefront deployed yet
  }
  return `${live ? String(live.campaign._id) : "-"}|${template}`;
};

/**
 * Keep the copies fresh (server.ts): at startup, hourly, and within a minute of
 * a storefront release (new index.html, whose asset links the copies must use)
 * or a sale starting or ending. Saves to products and campaigns refresh them
 * through the models. No-op without WEB_ROOT.
 */
export const startSeoPageUpkeep = (): void => {
  const webRoot = process.env.WEB_ROOT;
  if (!webRoot) return;
  let seen: string | null = null;
  const check = () =>
    currentInputs(webRoot)
      .then((inputs) => {
        if (seen !== null && inputs !== seen) scheduleSeoRefresh(0);
        seen = inputs;
      })
      .catch((error) => console.error("SEO pages check failed:", (error as Error).message));

  setTimeout(() => {
    void check();
    void run();
  }, 20 * 1000).unref();
  setInterval(check, CHECK_EVERY_MS).unref();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
};
