Frontend UI/UX Audit — Baby Clothes E-commerce Focus
Current State Assessment
The About page beautifully describes Nevan as a baby clothing brand ("Nevan Sprouts — a baby clothing brand rooted in softness, comfort, and a mother's touch"), but the rest of the site presents as a generic Nepali handicraft store. This is the single biggest disconnect.

CRITICAL ISSUES
1. Brand Identity Mismatch
Page	Current Copy	Problem
Home hero	"Authentic Nepali Handicrafts"	No mention of baby clothes
Home features	"Free Shipping / Secure Payment / 24/7 Support"	Generic, no baby trust signals
Categories subtitle	"Explore our collection of authentic Nepali handicrafts"	Doesn't signal baby products
Footer tagline	"Authentic Nepali handicrafts crafted with love and tradition"	Generic
About page	"Nevan Sprouts" / "For Moms, By Moms" / Baby icon	This is correct — rest of site doesn't match
2. Missing Baby-Specific Filters
Products.jsx has search, category, and price range filters but is missing:

Shop by Age (0–3 mo, 3–6 mo, 6–12 mo, 1–2 yr, 2–3 yr)
Shop by Gender (Boy, Girl, Unisex)
Material filter (Cotton, Organic Cotton, Muslin, etc.)
3. No Size Guide
ProductDetail.jsx has variant selection (size/color) but no size guide modal. For baby clothes this is essential — parents need measurements-to-age mapping.

4. Color Palette Not Baby-Friendly
In index.css:

Primary #8b4513 (earthy brown) — feels like a furniture store, not baby clothes
Accent #daa520 (gold) — premium but not soft/nurturing
Missing soft pastel tones (mint, blush, lavender, soft blue) that signal baby products
HIGH-PRIORITY ISSUES
5. Home Page Gaps (Home.jsx)
No "New Arrivals" section (parents constantly need the next size up)
No "Bestsellers" / "Most Loved" section
No "Shop by Age" quick-links grid
No trust signals specific to baby products (baby-safe materials, 100% cotton, mom-approved)
No testimonials / social proof section
Newsletter form has no submit handler — it's decorative only
6. Wishlist Using localStorage Only
ProductDetail.jsx stores wishlist in localStorage instead of the backend wishlist API (/api/v1/wishlist). Not synced across devices, lost on clear.

7. No Review Submission UI
Product detail shows star ratings but there's no form to write/submit reviews. For baby clothes, parent reviews are a top trust driver.

8. Missing "Forgot Password"
Login.jsx has no forgot password link.

9. No Notification Bell on Web
Mobile has NotificationBell but the web Header.tsx has no notification icon — only cart and user menu.

10. Dead Footer Links
Footer.tsx links to /faq, /shipping, /returns, /privacy — none of these routes exist (404). Also, Profile route uses a placeholder component.

MEDIUM-PRIORITY ISSUES
11. Product Detail Missing Sections (ProductDetail.jsx)
No material/fabric composition display
No care instructions (wash, dry, iron)
No age recommendation badge
No "You Might Also Like" / related products
No "Recently Viewed" section
12. Cart UX (Cart.jsx)
No "Save for Later" feature
No product recommendations ("Complete the outfit")
No estimated delivery date
No gift message option (baby products are often gifts)
13. Checkout UX (Checkout.jsx)
No order notes / gift message field
Khalti payment is hidden (filtered out) — should either show it or remove from codebase
QR modal labeled "Pay via eSewa" appears on COD — confusing
No guest checkout (cart requires login)
14. Header UX (Header.tsx)
No wishlist icon
User dropdown doesn't close on outside click
Search bar invisible on mobile (only lg:flex)
Nav links don't include "Contact"
15. Accessibility Gaps
No skip-to-content link
User dropdown missing role="menu" and keyboard navigation
Modal focus trap missing on QR/auth prompt modals
LOW-PRIORITY ISSUES
No dark mode toggle (only prefers-color-scheme media query)
No "Back to Top" button on long pages
No breadcrumbs on Products, Cart, Categories pages
No empty state illustrations (text only)
No image srcset / responsive images
Categories page loads all categories at once (no pagination)
Implementation Plan
Phase 1 — Brand Alignment & Trust (Baby Identity) ⭐ Highest Impact
#	Task	Files Affected	Effort
1.1	Rebrand Home hero — Update copy to "Handcrafted Baby Clothing" / "Made with a Mother's Love". Add baby-relevant imagery/illustration.	Home.jsx	Small
1.2	Update color palette — Change primary to a softer tone (e.g., dusty rose #c1847b or sage green #8fae8b), add pastel accent palette	index.css	Small
1.3	Add trust badges on Home — Replace generic features bar with: "Baby-Safe Fabrics", "Handmade in Nepal", "Mom-Approved Quality", "Eco-Friendly"	Home.jsx	Small
1.4	Add "New Arrivals" section on Home	Home.jsx	Small
1.5	Add "Shop by Age" quick-links grid on Home page	Home.jsx	Medium
1.6	Update Footer tagline to reflect baby brand	Footer.tsx	Small
1.7	Update Categories subtitle	Categories.jsx	Small
Phase 2 — Critical Baby Shopping Features
#	Task	Files Affected	Effort
2.1	Size Guide modal — Create SizeGuide component with baby measurements table (age-to-size mapping), trigger from ProductDetail	New component + ProductDetail.jsx	Medium
2.2	Age & Gender filters — Add age range and gender filter to product listing sidebar	Products.jsx, backend product model (if ageRange/gender fields needed)	Medium–Large
2.3	Material/Care info — Display fabric, care instructions, and age recommendation on product detail	ProductDetail.jsx	Medium
2.4	Connect Wishlist to backend API — Replace localStorage with /api/v1/wishlist endpoints	ProductDetail.jsx, new wishlistApi.ts	Medium
2.5	Review submission form — Add star rating + text review form on product detail	ProductDetail.jsx, new ReviewForm component	Medium
Phase 3 — Conversion & Engagement
#	Task	Files Affected	Effort
3.1	Notification bell on web — Port NotificationBell from mobile, add to Header	Header.tsx, new Web NotificationBell component	Medium
3.2	"You Might Also Like" related products on product detail	ProductDetail.jsx	Medium
3.3	Gift message option in checkout	Checkout.jsx	Small
3.4	Testimonials section on Home page	Home.jsx	Small
3.5	Fix newsletter submit — Wire to backend or email service	Home.jsx	Small
3.6	Forgot password flow	Login.jsx, backend endpoint	Medium
3.7	Wishlist icon in Header with count badge	Header.tsx	Small
Phase 4 — Polish & Missing Pages
#	Task	Files Affected	Effort
4.1	Build Profile page (currently placeholder)	placeholders.jsx → new Profile.jsx	Medium
4.2	Create FAQ, Shipping, Returns, Privacy pages (resolve dead footer links)	4 new page files, routes/index.tsx	Medium
4.3	Fix Header dropdown — close on outside click	Header.tsx	Small
4.4	Fix Checkout QR modal — COD order shouldn't show "Pay via eSewa"	Checkout.jsx	Small
4.5	Breadcrumbs on Products, Cart, Categories pages	Multiple pages	Small
4.6	Accessibility — Skip-to-content link, keyboard nav on dropdown, modal focus traps	Header.tsx, Layout.tsx	Medium
4.7	Add Wishlist page — dedicated page to view saved items	New Wishlist.jsx, routes update	Medium
