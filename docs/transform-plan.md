# Invendex Global — Transformation Master Plan

Owner: Noah (Boss). Executor: Jarvis (Vibe Code, Mistral Large 4) working in three named
workstreams: **Albert** (backend/architecture), **Sarah** (frontend/UX/branding),
**Ralph** (AI/data). Workstreams are executed sequentially in phases, each delivered
as its own PR with CI green.

## 1. Research basis (completed)

- Competitor benchmark: NetSuite/SAP (enterprise), Cin7/Linnworks/TradeGecko
  ($129–999/mo, USD-priced, channel-sync strong), Zoho/inFlow/Sortly/Odoo/Katana
  (free–$60/mo, weak offline, barcode gated, no local tax/payment hooks),
  Africa-tailored locals (Ezeemanager, POSRocket, Klakpad, BrandDrive, MyTreda,
  UgaPOS, Enquest) — offline + MoMo + local support, but shallow analytics/AI.
- Market pain: $1.73T/yr global inventory distortion (IHL 2025); 42% of mid-market
  e-commerce brands lose ≥3.1% GMV to inventory inaccuracy (Manhattan 2025).
- Uganda/Africa target-market facts: MSMEs = 90%+ of private firms; wholesale/retail
  #1 sector (31.7%); >80% of SMEs still manual; 36.3M mobile-money accounts;
  >80% of transactions by phone; unreliable connectivity → offline-first is baseline;
  URA EFRIS mandatory (VAT since 2021; 12 gazetted sectors from 1 Jul 2025, General
  Notice No. 2218; UGX 10M/yr exemption; FDN + verification code + QR);
  WhatsApp per-message pricing since Jul 2025; SMS via Africa's Talking/Termii; USSD
  for feature phones.
- Winning gaps for Invendex: true offline-first, UGX/local-currency pricing, native
  MTN MoMo + Airtel Money, built-in EFRIS e-invoicing, AI that cuts manual entry
  (vision stocktake, NL queries, auto reorder), WhatsApp/SMS/USSD channels, tiny
  footprint (bundle budgets, lazy chunks, quantized on-device AI).

## 2. Approved stack

- Backend: NestJS v11 + TypeScript (strict), modular monolith, Zod validation,
  OpenAPI auto-gen, BullMQ + Redis jobs, REST public + versioned `/api/v1` contract
  kept stable. MongoDB stays; tenantId-first compound indexes; TTL/rollup archival.
- Frontend: Vite + React 19 (compiler) + TypeScript, TanStack Router + Query,
  Zustand, Tailwind CSS v4 + shadcn-style owned components (Radix/Base UI),
  Biome, Vitest + MSW + Playwright. Local-first: Dexie/IndexedDB + outbox +
  Background Sync (sync-on-focus fallback). Phone-camera barcode scanning.
- AI (Ralph): quantile GBM + Prophet seasonality + promo uplift forecasting with
  cold-start fallback; on-device ONNX YOLO vision stocktake (offline); "Jarvis"
  copilot = small open-weight SLM (1–4B, GGUF Q4 via llama.cpp sidecar, cloud
  fallback) + RAG over tenant data (Mongo embeddings) + tool-calling actions;
  anomaly detection v2.
- Size: lazy-load heavy backend deps into worker; Brotli; pagination; tighten
  bundle budgets; WebP/AVIF; virtualized tables; LCP < 2.5s target on cheap Android.

## 3. Workstreams

### Albert — Backend & Architecture
1. TS migration + NestJS module structure; `/api/v1` contract stable; Zod DTOs.
2. Multi-tenant hardening: org-first indexes; middleware that rejects queries
   missing the tenant filter; data-residency ready.
3. Size/perf: worker-side heavy deps (xlsx, pdfkit, bwip-js); compression;
   archival of snapshots/audit/metrics; replace deprecated `xss-clean`.
4. New modules: EFRIS e-invoicing (UG), mobile-money payments (aggregator + direct
   MoMo/Airtel), WhatsApp/SMS/USSD channel abstraction, multi-currency incl. UGX,
   i18n expansion (Luganda/Runyankole + more African languages + locales).
5. Event-driven internals: domain events on BullMQ replace scattered crons.

### Sarah — Frontend, UX & Branding
1. Re-platform to the approved frontend stack; keep TanStack Query; tighten budgets.
2. Local-first data layer (Dexie + outbox + Background Sync); offline stocktake/sales.
3. Branding from Noah's design-base file: inspiration (godly, Mobbin, Layers, Savee,
   Cosmos, Inspora, SiteReel, Visuelle, Fonts In Use); component kits to evaluate
   (shadcn/ui base, Watermelon, Componentry, Skiper, Aceternity, Smooth UI, Cult UI,
   Hero UI, Hyper UI, Preline, PrebuiltUI, 21st.dev, React Bits incl. background/
   shape/sound studios); design systems (UI/UX Pro Max skill, awesome-design-md);
   colors/gradients (Coolors, Realtime Colors, mesh/shader gradients, Haikei,
   Pattern Monster); motion (GSAP/Motion, Unicorn Studio, Lottie via React Bits);
   icons (Lucide base + Phosphor/Iconify/Heroicons); fonts (Fontshare/Bunny/Google);
   logo generation via React Bits Shape Magic; verify licenses per asset.
4. UX: mobile-first, command palette, AI chat panel, camera barcode scan, EFRIS
   receipt preview w/ QR, WhatsApp share, upgraded onboarding, WCAG AA.
5. Charts: lightweight (uPlot or own SVG) to protect bundle budget.

### Ralph — AI & Data
1. Forecasting v2 (quantile GBM + Prophet + promo uplift + cold-start rules),
   forecast-trust scoring, one-click auto-PO suggestions.
2. Vision stocktake: on-device ONNX YOLO (SKU110k/Grozi-style fine-tune), server
   provider fallback (existing stocktakeVision seam).
3. Jarvis copilot: quantized SLM + RAG + tool-calling; chat UI in web app.
4. Anomaly detection v2 (shrinkage, pricing errors, supplier delays).
5. Rollup jobs to keep operational DB small (with Albert).

## 4. Workflow between Noah and Jarvis

1. Jarvis proposes a phase plan (scope, files, tests, risks) for the active workstream.
2. Noah approves / adjusts (one decision point per phase).
3. Jarvis implements on a `vibe/<slug>-a2e139` branch, commits focused units.
4. PR opened (draft) → CI runs (hygiene, lint, tests, build, bundle budgets).
5. Noah reviews; Jarvis fixes CI; merge to main when green. Repeat.

## 5. Rebuild strategy (DECIDED by Noah)

**B — Parallel rebuild + staged cutover.** New stack built fresh (nothing old
carried by default); proven domain logic ported module-by-module with old tests as
the executable spec; legacy `/api` alias retained for cutover; old code deleted
after cutover. Option A (full delete now) and C (in-place) were considered and
rejected.

## 6. Execution order (DECIDED by Noah)

Sarah (frontend/UX/branding) builds first on a parallel layout; Albert (backend)
and Ralph (AI) follow. Old `frontend/` and `backend/` remain untouched and running
until staged cutover.

## 5b. Strategy analysis (kept for the record)

Options analyzed:
- A. Full delete & rewrite now: cleanest slate, but discards hardened auth/RBAC,
  43 models of domain knowledge and 40 test suites; nothing shippable for a long
  time; highest regression risk; still needs data migration for existing tenants.
- B. Parallel rebuild + staged cutover (recommended): new stack built fresh in a
  new layout; proven domain logic ported deliberately module-by-module with tests
  as executable spec; old app keeps running; `/api` legacy alias already exists for
  cutover; old code deleted after cutover. Honors "start again" in spirit (nothing
  old carried by default) while staying shippable and safe.
- C. In-place modification: fastest, but keeps Express 4/JS debt; contradicts the
  approved stack change.

## 7. Success metrics

Initial JS ≤ 330 KiB (target lower), LCP < 2.5s on 3G-profile, full offline
stocktake+sales, EFRIS-compliant receipts, MoMo/Airtel checkout, AI reorder
approval rate, forecast MAPE improvement vs current moving-average, zero
tenant-isolation regressions (existing access-guardrail tests ported).

## 8. Open items

- Phase-level approvals from Noah per the workflow in Section 4.
- Any further asset links from Noah beyond design_base.md.
