# MW — MEASUREMENT WALLET
### COLLECT GROUP SIZES WITH CONFIDENCE.
A GEESKIT PRODUCT.

MW is a focused business + family tool for collecting group sizes and measurements from multiple people and organizing responses in one place.

**Workflow:** CREATE → SHARE → COLLECT → REVIEW → EXPORT

## Features (V1 Frontend)
- Landing / Product intro with MW official logo
- Admin Dashboard (campaigns, status, count, deadline, quick actions)
- Create Campaign / Create Family Group with use-type selector:
  - BUSINESS / FAMILY / TEAM / EVENT / OTHER
- Field library: Shirt, Pants, Jacket, Shoe, Waist, Inseam, Full Name, Email, Notes, Custom
- Campaign Detail with share link `mw.geeskit.com/c/{token}` + Copy + Share
- Public Participant Form (no account, mobile-first 52px inputs)
- Submission Confirmation
- Submissions View — desktop table → mobile stacked cards (no horizontal scroll)
- CSV Export with real current data, filename `{slug}-submissions.csv`
- Campaign Status OPEN/CLOSED
- Mobile-first responsive at 320 / 360 / 390 / 430 px — single column, 48px touch targets
- Future Billing UI (frontend-only placeholders, no Stripe):
  - Pricing / Plans, Upgrade, Payment, Payment Success, Subscription, Billing, Plan Limits

## Design Source of Truth
- Official logo: `src/assets/mw-logo.jpg` (original: Metallic Glowing MW Logo)
- Reference visual: `src/assets/mw-reference.jpg`
- Colors: bg #060608, card #101012, border #222, orange #FF7A18 → #FF9A3C, silver #E8E8EA
- No purple gradients, no glassmorphism, faceted angular geometry

## Tech Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Local state + localStorage (`mw_campaigns_v1`, `mw_billing_v1`)
- No backend, no Stripe, no auth (frontend-only V1)

## Data Model
```ts
Campaign { id, name, organization, description, deadline, status: 'OPEN'|'CLOSED', fields, createdAt, shareToken, context: 'BUSINESS'|'FAMILY'|'TEAM'|'EVENT'|'OTHER' }
Field { id, label, type, required, options?, placeholder? }
Submission { id, campaignId, submittedAt, values: Record<fieldId,string> }
Billing { plan: 'FREE'|'PRO'|'BUSINESS', interval: 'monthly'|'yearly' }
```

## Install & Run
```bash
npm install
npm run dev
# open http://localhost:5173
```

## Build
```bash
npm run build
npm run preview
```

## Export / Deploy
- Build output in `dist/`
- Deploy to Vercel, Netlify, Cloudflare Pages, or any static host
- No env vars required

## Structure
```
src/
  App.tsx          # Main app - all views, logic, billing placeholders
  main.tsx         # Entry
  index.css        # Tailwind + MW custom
  assets/
    mw-logo.jpg            # Official MW logo (source of truth)
    mw-reference.jpg       # Visual layout reference
public/
  mw-logo.jpg      # Favicon / public copy
```

## Future Backend Ready
Code is separated into: UI / application logic / data models / campaign logic / submission logic / export logic. Ready to plug real DB, auth, secure share links, team accounts, reminders, branded pages, Stripe billing.

## License
Private - GEESKIT PRODUCT - All rights reserved.