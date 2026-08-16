# DealLakay — PRD

## Original Problem Statement
Build DealLakay, a professional technology marketplace for Haiti (tagline: "Achte. Vann. Fè bon Deal."). Anyone can sell phones, laptops/computers, parts & components, accessories, and repair equipment. Default language Haitian Creole (Kreyòl), second French; currency HTG. Must have original branding (not an eBay/FB/Amazon clone), centralized SITE_CONFIG for branding, real auth with email verification, seller system, messaging, admin dashboard, and production-quality working features.

## Architecture
- **Backend**: FastAPI + MongoDB (motor). All routes under `/api`. JWT auth (Bearer token, bcrypt hashing, token_version for logout-all). WebSocket at `/api/ws?token=` for real-time messaging.
- **Frontend**: React 19 + react-router + Tailwind + shadcn/ui. Contexts: AppContext (site config/i18n ht+fr/categories/locations), AuthContext (JWT in localStorage `dl_token`).
- **Email**: SendGrid integration in `email_service.py`. Currently DEMO mode (no SENDGRID_API_KEY) — verification/reset links returned in API responses and shown on Register/Forgot pages. Add SENDGRID_API_KEY + SENDER_EMAIL to backend/.env to enable real emails.
- **Images**: base64 (client-compressed via canvas), up to 10 per listing.
- **Branding**: centralized in `settings.site_branding` (DB) + `/api/config`; editable from Admin → Paramèt. Logo/favicon at /public/deallakay-icon.png.

## User Personas
- **Buyer**: browse, search, filter, favorite, contact seller (message/WhatsApp/call), review sellers.
- **Seller** (anyone can become one): become-seller flow, dashboard, add/edit/mark-sold products, verification request, store settings.
- **Admin**: moderation, users, reports, seller verifications, category CRUD, site settings.

## Implemented (2026-06)
- Auth: register + real email-verification gate, login (username OR email), verify-email, resend, forgot/reset password, logout-all, phone verify (demo).
- Categories (5 seeded, admin CRUD + subcategories), Haiti locations (10 departments + cities).
- Products: category-specific spec forms (phone/laptop/parts/accessories/tools), IMEI private (admin-only), drafts, edit, mark-sold/restore, delete, views/favorites counters, SEO slugs.
- Listings: search, filters (category/subcategory/department/city/condition/price/verified-seller), sort (6 modes), pagination.
- Favorites, real-time messaging (WebSocket + REST + polling fallback), notifications, reviews (verified-transaction flag), reports.
- Seller: become-seller, dashboard (6 stats + tabs), public seller profile with reviews, verification request, store settings, WhatsApp/privacy toggles.
- Admin dashboard: 7 stat cards + tabs (moderation, users suspend/ban/restore, reports, verifications, category CRUD, settings incl. branding + listing mode auto/approval).
- Branding config system, i18n (ht/fr), mobile bottom nav with prominent Sell button, How It Works + Safety pages, HTG formatting.
- Testing: 30/30 backend pytest pass, frontend smoke 100%.

## Backlog / Remaining (P1/P2)
- P1: Enable real SendGrid emails (add keys), real IMEI verification integration, real phone (SMS) verification.
- P2: Featured/sponsored/promoted listings, seller subscriptions, MonCash/NatCash payments, escrow, delivery (pickup/seller/3rd-party), price-change notifications for favorites, English language, brute-force login lockout, seller "stores" with followers.

## Next Tasks
- Wire SendGrid keys when provided; add price-drop favorite alerts; add featured listings + admin banners.
