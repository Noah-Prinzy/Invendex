# Invendex frontend-v2 — asset & license log

| Asset | Source | License | Used in |
|---|---|---|---|
| Logo mark (Ledger Cube, option A) | Generated in-repo (`public/logo.svg`, `src/components/Logo.tsx`) | Project-owned | App shell, auth, welcome, favicon, PWA icons |
| PWA icons (192/512/maskable/apple-touch) | Derived from logo via sharp | Project-owned | `public/icons/*`, manifest |
| Sora Variable font | @fontsource-variable/sora (Google Fonts) | OFL-1.1 | UI text (`--font-sans`) |
| Space Grotesk Variable font | @fontsource-variable/space-grotesk (Google Fonts) | OFL-1.1 | Headings/logo wordmark (`--font-heading`) |
| Lucide icons | lucide-react | ISC | All UI icons |
| unDraw illustrations (planned: welcome/auth empty states) | undraw.co | Custom permissive (commercial use OK, no attribution) | Welcome/auth pages |
| shadcn/ui (Radix) components | ui.shadcn.com | MIT | `src/components/ui/*` |

Design inspiration references (not shipped as assets): see Noah's design_base.md
(godly, Mobbin, Layers, Savee, Cosmos, Fonts In Use, etc.).
