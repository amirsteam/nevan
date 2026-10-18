import fs from "fs";
import os from "os";
import path from "path";
import Product from "../models/Product";
import Campaign from "../models/Campaign";
import Category from "../models/Category";
import { createProduct } from "./helpers";
import {
  buildSitemap,
  cloudinaryVariant,
  firstShownPhoto,
  renderPage,
  shortText,
  STATIC_PAGES,
  writeSeoPages,
} from "../services/seoPagesService";

const SITE = "https://shop.example";
const PHOTO = "https://res.cloudinary.com/demo/image/upload/v1/products/romper.jpg";
// The storefront's real index.html is the template
const TEMPLATE = fs.readFileSync(path.join(__dirname, "..", "..", "frontend", "index.html"), "utf8");

const headOf = (html: string) => html.slice(0, html.indexOf("</head>"));
const metaContent = (html: string, attr: string, key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const jsonLdBlocks = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const ofType = (html: string, type: string) => jsonLdBlocks(html).find((b) => b["@type"] === type);

describe("cloudinaryVariant", () => {
  it("adds a transformation to plain Cloudinary photos only", () => {
    expect(cloudinaryVariant(PHOTO, "w_720")).toBe("https://res.cloudinary.com/demo/image/upload/w_720/v1/products/romper.jpg");
    const transformed = "https://res.cloudinary.com/demo/image/upload/c_fill,w_200/v1/a.jpg";
    expect(cloudinaryVariant(transformed, "w_720")).toBe(transformed);
    expect(cloudinaryVariant("https://example.com/a.jpg", "w_720")).toBe("https://example.com/a.jpg");
  });
});

describe("firstShownPhoto (same rule as the product page)", () => {
  const variant = (size: string, color: string, stock: number) => ({ size, color, stock, price: 500 });
  const images = [
    { url: "red-1", color: "Red", isPrimary: true },
    { url: "blue-1", color: "Blue" },
    { url: "any", color: undefined },
  ];

  it("starts on the primary photo's colour when it is in stock", () => {
    expect(firstShownPhoto({ images, variants: [variant("Small", "Blue", 3), variant("Small", "Red", 1)] })).toBe("red-1");
  });

  it("moves to the first colour in stock when the primary photo's colour is sold out", () => {
    const product = { images, colors: [{ name: "Red" }, { name: "Blue" }], variants: [variant("Small", "Red", 0), variant("Small", "Blue", 2)] };
    expect(firstShownPhoto(product)).toBe("blue-1");
  });

  it("uses the primary photo for products without colour photos", () => {
    expect(firstShownPhoto({ images: [{ url: "a" }, { url: "b", isPrimary: true }], variants: [] })).toBe("b");
  });
});

describe("shortText", () => {
  it("strips tags, joins lines and cuts at a word", () => {
    expect(shortText("<p>Soft\n\n cotton</p>")).toBe("Soft cotton");
    const long = shortText("word ".repeat(60));
    expect(long.length).toBeLessThanOrEqual(160);
    expect(long.endsWith("word…")).toBe(true);
  });
});

describe("renderPage", () => {
  it("replaces the page's head tags and escapes text", () => {
    const html = renderPage(TEMPLATE, SITE, {
      path: "/products/romper",
      title: 'Romper "Tiny" <b>',
      description: "Soft & warm",
      image: "https://img.example/a.jpg",
      imageAlt: "Romper",
      imageSize: { width: 1200, height: 630 },
      type: "product",
      structuredData: [{ "@type": "Product", name: "</script><script>alert(1)</script>" }],
      preload: { href: "https://img.example/720.jpg", srcset: "https://img.example/720.jpg 1x" },
    });
    const head = headOf(html);
    expect(head).toContain("<title>Romper &quot;Tiny&quot; &lt;b&gt; · Nevan Handicraft</title>");
    expect(head.match(/<title>/g)).toHaveLength(1);
    expect(metaContent(head, "name", "description")).toBe("Soft &amp; warm");
    expect(head).toContain(`<link rel="canonical" href="${SITE}/products/romper" />`);
    expect(head.match(/rel="canonical"/g)).toHaveLength(1);
    expect(metaContent(head, "property", "og:url")).toBe(`${SITE}/products/romper`);
    expect(metaContent(head, "property", "og:type")).toBe("product");
    expect(metaContent(head, "property", "og:image")).toBe("https://img.example/a.jpg");
    expect(head.match(/property="og:image"/g)).toHaveLength(1);
    expect(head).toContain('rel="preload" as="image" href="https://img.example/720.jpg"');
    // Structured data can't close its script tag early
    expect(head).not.toContain("</script><script>alert(1)");
    const blocks = jsonLdBlocks(head);
    expect(blocks.some((b) => b.name === "</script><script>alert(1)</script>")).toBe(true);
    // The app itself is untouched
    expect(html).toContain('<div id="root"></div>');
  });
});

describe("buildSitemap", () => {
  it("lists addresses with escaped URLs, dates and photos", () => {
    const xml = buildSitemap(SITE, [{ path: "/products?category=a&b", lastmod: "2026-10-01", images: [PHOTO] }]);
    expect(xml).toContain(`<loc>${SITE}/products?category=a&amp;b</loc>`);
    expect(xml).toContain("<lastmod>2026-10-01</lastmod>");
    expect(xml).toContain(`<image:loc>${PHOTO}</image:loc>`);
  });
});

describe("writeSeoPages", () => {
  let webRoot: string;

  beforeEach(() => {
    webRoot = fs.mkdtempSync(path.join(os.tmpdir(), "seo-pages-"));
    fs.writeFileSync(path.join(webRoot, "index.html"), TEMPLATE);
  });

  afterEach(() => {
    fs.rmSync(webRoot, { recursive: true, force: true });
  });

  it("refuses to run without the storefront's index.html", async () => {
    fs.rmSync(path.join(webRoot, "index.html"));
    await expect(writeSeoPages(webRoot, SITE)).rejects.toThrow(/index\.html/);
  });

  it("writes product, sale and information pages, the sitemap and the catalog feed", async () => {
    const romper = await createProduct({
      name: "Muslin Romper",
      description: "A soft muslin romper for warm days.",
      price: 1000,
      images: [{ url: PHOTO, isPrimary: true }],
    });
    const category = await Category.findById(romper.category);
    await createProduct({ name: "Hidden Frock", isActive: false });
    await createProduct({ name: "Sold Out Bib", stock: 0 });
    await Campaign.create({
      name: "Tihar Sale",
      slug: "tihar-sale",
      festival: "tihar",
      headline: "Tihar Sale",
      subheadline: "15% off everything",
      palette: "diyo",
      status: "published",
      startsAt: new Date(Date.now() - 60 * 60 * 1000),
      endsAt: new Date("2030-01-31T00:00:00Z"),
      sale: { type: "percent", value: 15, scope: "all" },
    });
    // A page left over from a product that was since hidden
    fs.mkdirSync(path.join(webRoot, "_seo", "products"), { recursive: true });
    fs.writeFileSync(path.join(webRoot, "_seo", "products", "hidden-frock.html"), "old");

    const result = await writeSeoPages(webRoot, SITE);
    expect(result).toMatchObject({ products: 2, pages: STATIC_PAGES.length, sale: 1, removed: 1 });

    const productDir = path.join(webRoot, "_seo", "products");
    expect(fs.readdirSync(productDir).sort()).toEqual(["muslin-romper.html", "sold-out-bib.html"]);

    const page = headOf(fs.readFileSync(path.join(productDir, "muslin-romper.html"), "utf8"));
    expect(page).toContain("<title>Muslin Romper · Nevan Handicraft</title>");
    // Short descriptions get the price and the shop's promise
    expect(metaContent(page, "name", "description")).toBe(
      "A soft muslin romper for warm days. NPR 850. Handmade by Nevan Handicraft in Panauti, Nepal; cash on delivery or eSewa.",
    );
    expect(metaContent(page, "property", "og:image")).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_pad,b_white,f_jpg,q_auto/v1/products/romper.jpg",
    );
    // Preloads exactly the photo the product page shows first
    expect(page).toContain(
      'href="https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_720/v1/products/romper.jpg"',
    );

    const product = ofType(page, "Product");
    const breadcrumb = ofType(page, "BreadcrumbList");
    expect(product).toMatchObject({
      "@type": "Product",
      name: "Muslin Romper",
      brand: { name: "Nevan Handicraft" },
      offers: {
        "@type": "Offer",
        price: 850, // 15% festival sale
        priceCurrency: "NPR",
        availability: "https://schema.org/InStock",
        priceValidUntil: "2030-01-31",
      },
    });
    expect(breadcrumb.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      "Home",
      category!.name,
      "Muslin Romper",
    ]);

    const soldOut = ofType(fs.readFileSync(path.join(productDir, "sold-out-bib.html"), "utf8"), "Product");
    expect(soldOut.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(metaContent(fs.readFileSync(path.join(productDir, "sold-out-bib.html"), "utf8"), "name", "description")).toMatch(
      /^A test product\. NPR 850 \(sold out\)\. /,
    );
    // No photo of its own on Cloudinary: still a valid absolute preview image
    expect(soldOut.image[0]).toBe("https://example.com/image.jpg");

    const sale = fs.readFileSync(path.join(webRoot, "_seo", "sale", "tihar-sale.html"), "utf8");
    expect(metaContent(sale, "property", "og:image")).toBe(`${SITE}/og-image.jpg`);
    expect(metaContent(sale, "name", "description")).toBe("15% off everything");

    const shipping = fs.readFileSync(path.join(webRoot, "_seo", "pages", "shipping.html"), "utf8");
    expect(metaContent(shipping, "name", "description")).toMatch(/^Delivery times .* NPR [\d,]+ or more\.$/);
    expect(shipping).toContain(`<link rel="canonical" href="${SITE}/shipping" />`);

    const sitemap = fs.readFileSync(path.join(webRoot, "sitemap.xml"), "utf8");
    expect(sitemap).toContain(`<loc>${SITE}/products/muslin-romper</loc>`);
    expect(sitemap).toContain(`<loc>${SITE}/sale/tihar-sale</loc>`);
    expect(sitemap).toContain(`<loc>${SITE}/products?category=${category!.slug}</loc>`);
    expect(sitemap).not.toContain("hidden-frock");

    const feed = fs.readFileSync(path.join(webRoot, "feeds", "catalog.xml"), "utf8");
    expect(feed).toContain("<g:title>Muslin Romper</g:title>");
    expect(feed).toContain("<g:price>1000.00 NPR</g:price>");
    expect(feed).toContain("<g:sale_price>850.00 NPR</g:sale_price>");
    expect(feed).not.toContain("Hidden Frock");

    // No temporary files left behind
    const leftovers = fs.readdirSync(productDir).filter((f) => f.includes(".tmp-"));
    expect(leftovers).toEqual([]);
  });

  it("removes the sale page once the sale is over", async () => {
    await createProduct({ name: "Bib" });
    fs.mkdirSync(path.join(webRoot, "_seo", "sale"), { recursive: true });
    fs.writeFileSync(path.join(webRoot, "_seo", "sale", "dashain-sale.html"), "old");

    const result = await writeSeoPages(webRoot, SITE);
    expect(result.sale).toBe(0);
    expect(fs.readdirSync(path.join(webRoot, "_seo", "sale"))).toEqual([]);
  });

  it("uses a range of prices for products sold in several sizes", async () => {
    await createProduct({
      name: "Flannel Set",
      variants: [
        { size: "Small (0-12 months)", price: 900, stock: 2 },
        { size: "Medium (1-3 years)", price: 1200, stock: 0 },
      ],
    });
    await writeSeoPages(webRoot, SITE);
    const product = ofType(fs.readFileSync(path.join(webRoot, "_seo", "products", "flannel-set.html"), "utf8"), "Product");
    expect(product.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: 900,
      highPrice: 1200,
      offerCount: 2,
      availability: "https://schema.org/InStock",
    });
    expect(await Product.countDocuments()).toBe(1);
  });
});
