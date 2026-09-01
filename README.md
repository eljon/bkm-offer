# Offer Maker

A mobile-first web app for creating clean, modern promotional offer sheets for
items — primarily **auto parts**. Add products (image, name, description, price,
and either a discount % or a net price), assemble them into an offer, and export
a beautiful **3-column grid** as a **PDF** or **PNG image**.

Everything runs 100% in the browser and is stored locally (IndexedDB) — no
backend, no accounts. Perfect for GitHub Pages.

## Features

- 📱 **Mobile-first** UI with bottom tab navigation
- 📦 **Product library** — create products once, reuse them across offers
- ✅ **Multi-select** products to spin up a new offer instantly
- 🧾 **Offer builder** — pick from the library or add new items inline
- 🎨 Custom **accent color**, store header, and footer note per offer
- 💸 Flexible pricing — enter a **discount %** or a **net price**; savings and
  percentages are computed automatically
- 🖼️ Export to **PDF** or **PNG** (crisp, print-friendly light layout)
- ♻️ **Past offers** list with **duplicate** and **edit**
- 💾 Backup / restore all data as JSON

## Usage

1. **Products tab** → *Add Product*. Fill in image, name, description, price,
   and pick a pricing mode (Discount %, Net price, or No discount).
2. **Create tab** (or select products and tap *Make Offer*) → give the offer a
   title, store header, and accent color; add items from your library or inline.
3. Tap **Preview & Export** → download as **PDF** or **PNG**.
4. **Offers tab** → **duplicate** (⧉) or **edit** (✎) any past offer.

Tip: on a product card, tap to **select** (for multi-offer creation) and tap the
✎ button to **edit**.

## Deploying to GitHub Pages

This repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
publishes the site automatically.

1. In your repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually). The
   site will be available at `https://<user>.github.io/<repo>/`.

The app is a static site — `index.html`, `css/`, and `js/` — so it also works
from any static host or by opening `index.html` locally.

## Tech

- Vanilla JS, no build step
- [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF) (via CDN) for export
- IndexedDB for local persistence
