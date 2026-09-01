# Offer Maker

A mobile-first web app for creating clean, modern promotional offer sheets for
items — primarily **auto parts**. Add products (image, name, description, price,
and either a discount % or a net price), assemble them into an offer, and export
a beautiful **3-column grid** as a **PDF** or **PNG image**.

By default it runs 100% in the browser (IndexedDB). Add a Firebase config and
it syncs to **Cloud Firestore** so your catalog is shared across devices —
images and the logo are stored inline in Firestore too (no Firebase Storage).

## Features

- 📱 **Mobile-first** UI with bottom tab navigation
- 🖼️ Your **logo** at the top of every offer (upload in Settings)
- 📦 **Product library** — create products once, reuse them across offers
- 🧩 **Product → Variant** grouping — variants of the same product share one
  heading on the sheet (title shown once)
- ✅ **Multi-select** products to spin up a new offer instantly
- 💸 Pricing shows the **original price** with a small-caps **LESS x%** badge
  (net-price mode also available)
- 🧷 Product photos are never cropped or stretched (portraits get side fill)
- 🖼️ Export to **PDF** or **PNG** (crisp, print-friendly light layout)
- ♻️ **Past offers** list with **duplicate** and **edit**
- ☁️ Optional **Cloud Firestore** sync; JSON backup / restore

## Usage

1. **Products tab** → *Add Product* (image, name, description, price; pick
   Discount %, Net price, or No discount).
2. **Create tab** (or select products and tap *Make Offer*) → the offer title
   defaults to *New Arrivals Limited Stock Only*. Use **+ Add Product**, then
   **+ Variant** on a product to add variants (the product title is prefilled).
3. Tap **Preview & Export** → download as **PDF** or **PNG**.
4. **Offers tab** → **duplicate** (⧉) or **edit** (✎) any past offer.
5. **Settings (⚙)** → upload your **logo**, set the currency.

## Cloud Firestore (optional)

The app works offline out of the box. To sync across devices via Cloud
Firestore (this is also where images/logo are stored):

1. Create a project at <https://console.firebase.google.com>.
2. Add a **Web app** (`</>`) and copy its config into
   [`js/firebase-config.js`](js/firebase-config.js) (replace the `YOUR_…`
   placeholders — especially `projectId`).
3. **Build → Firestore Database → Create database**.
4. **Firestore → Rules** → paste the contents of
   [`firestore.rules`](firestore.rules) and **Publish**.

Once `projectId` is set, the app switches from on-device storage to Firestore
automatically (Settings shows which backend is active). Documents have a 1 MiB
limit — product/offer images are compressed to stay well under it.

> ⚠️ **Security:** the app has no sign-in, so the default rules allow public
> read/write. That's fine for a private catalog but not for sensitive data —
> for real protection, enable Firebase Authentication and use the
> *authenticated* rules included as comments in `firestore.rules`.

## Logo

Upload your logo in **Settings → Offer logo** (stored in your database and shown
on every offer). Alternatively, commit your logo as `assets/logo.png` and it is
used automatically when no logo has been uploaded.

## Deploying to GitHub Pages (deploy from a branch)

The app is a plain static site (`index.html`, `css/`, `js/`) served straight
from a branch — no build step, no GitHub Actions.

1. In your repository, go to **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **Deploy from a branch**.
3. Set **Branch** to the branch that holds this code (e.g. `main`) and the
   folder to **`/ (root)`**, then **Save**.
4. The site will be available at `https://<user>.github.io/<repo>/`.

The included `.nojekyll` file tells GitHub Pages to serve the files as-is
(no Jekyll processing). The app also works from any static host or by opening
`index.html` locally.

## Tech

- Vanilla JS, no build step
- [html2canvas](https://html2canvas.hertzen.com/) + [jsPDF](https://github.com/parallax/jsPDF) (via CDN) for export
- IndexedDB for local persistence
