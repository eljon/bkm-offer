/* Offer Maker — main app */
(() => {
  'use strict';

  // Apply saved theme ASAP (before render) to avoid a flash of the wrong theme.
  // Default is light; only go dark if the user explicitly chose it.
  try { document.documentElement.setAttribute('data-theme', localStorage.getItem('om_theme') === 'dark' ? 'dark' : 'light'); } catch (e) {}

  // ---------- State ----------
  const state = {
    products: [],
    offers: [],
    settings: { currency: '$', logo: null, theme: 'light' },
    selectedProductIds: new Set(),   // products view multi-select
    productQuery: '',                // library search text
    offerQuery: '',                  // offers-tab search text
    pickerQuery: '',                 // picker (from-library) search text
    pickerSelected: new Set(),       // picker modal selection
    editingProductId: null,          // product modal target
    currentImage: null,              // data URL in product modal
    fileLogo: null,                  // logo loaded from assets/logo.png (fallback)
    offer: null,                     // offer being built
  };

  const DEFAULT_TITLE = 'New Arrivals Limited Stock Only';
  // Layout DESIGNS (structure/typography) — color is chosen separately below.
  // Each id maps to a renderer in SHEET_DESIGNS.
  const OFFER_DESIGNS = [
    { id: 'classic',  name: 'Classic' },
    { id: 'brochure', name: 'Brochure' },
    { id: 'promo',    name: 'Promo' },
    { id: 'garage',   name: 'Garage' },
    { id: 'ledger',   name: 'Ledger' },
    { id: 'track',    name: 'Track' },
    { id: 'bulletin', name: 'Bulletin' },
    { id: 'showroom', name: 'Showroom' },
    { id: 'chevron',  name: 'Chevron' },
    { id: 'blueprint',name: 'Blueprint' },
  ];
  const DEFAULT_DESIGN = 'classic';
  // Color schemes (palette only) — accent + a deeper shade for gradients/depth.
  const COLOR_SCHEMES = [
    { id: 'crimson', name: 'Crimson', accent: '#e11d48', deep: '#9f1239' },
    { id: 'indigo',  name: 'Indigo',  accent: '#4f46e5', deep: '#3730a3' },
    { id: 'sky',     name: 'Sky',     accent: '#0284c7', deep: '#075985' },
    { id: 'emerald', name: 'Emerald', accent: '#059669', deep: '#065f46' },
    { id: 'amber',   name: 'Amber',   accent: '#d97706', deep: '#b45309' },
    { id: 'plum',    name: 'Plum',    accent: '#7c3aed', deep: '#5b21b6' },
    { id: 'slate',   name: 'Slate',   accent: '#475569', deep: '#1e293b' },
    { id: 'ink',     name: 'Ink',     accent: '#18181b', deep: '#000000' },
  ];
  const DEFAULT_COLOR = 'crimson';
  const DEFAULT_COLS = 3;
  function resolveDesign(offer) {
    offer = offer || {};
    return OFFER_DESIGNS.find(d => d.id === offer.designId) || OFFER_DESIGNS.find(d => d.id === DEFAULT_DESIGN);
  }
  function resolveColor(offer) {
    offer = offer || {};
    const byId = COLOR_SCHEMES.find(c => c.id === offer.colorId);
    if (byId) return byId;
    const acc = offer.accent;
    if (acc) {
      const m = COLOR_SCHEMES.find(c => c.accent.toLowerCase() === String(acc).toLowerCase());
      if (m) return m;
      return { id: 'custom', name: 'Custom', accent: acc, deep: shade(acc, -0.4) };
    }
    return COLOR_SCHEMES.find(c => c.id === DEFAULT_COLOR);
  }
  // Grayscale wireframe thumbnails for the design picker (layout, not color)
  function designThumb(id) {
    const T = {
      classic: "<rect width='100' height='74' fill='#fff'/><path d='M0 0h100v26q-50 8-100 0z' fill='#c7cbd4'/><rect x='6' y='6' width='15' height='11' rx='2' fill='#fff'/><rect x='40' y='9' width='34' height='4' rx='1' fill='#eef1f6'/><path d='M6 32h30v9H6z' fill='#9aa0ad'/><path d='M6 41l0 4 4-4z' fill='#5b6472'/><g fill='#e7e9ef'><rect x='6' y='46' width='26' height='21' rx='2'/><rect x='37' y='46' width='26' height='21' rx='2'/><rect x='68' y='46' width='26' height='21' rx='2'/></g>",
      brochure: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='23' fill='#c7cbd4'/><rect x='6' y='6' width='15' height='11' rx='2' fill='#fff'/><rect x='40' y='8' width='30' height='3' rx='1' fill='#8991a1'/><rect x='40' y='14' width='20' height='3' rx='1' fill='#8991a1'/><g fill='#e7e9ef'><rect x='6' y='31' width='26' height='36' rx='3'/><rect x='37' y='31' width='26' height='36' rx='3'/><rect x='68' y='31' width='26' height='36' rx='3'/></g><g fill='#9aa0ad'><rect x='10' y='58' width='13' height='5' rx='2.5'/><rect x='41' y='58' width='13' height='5' rx='2.5'/><rect x='72' y='58' width='13' height='5' rx='2.5'/></g>",
      promo: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='27' fill='#9aa0ad'/><path d='M78 0h22v27H68z' fill='#5b6472'/><rect x='6' y='7' width='48' height='13' rx='1.5' fill='#c7cbd4'/><g fill='#e7e9ef'><rect x='6' y='33' width='26' height='34' rx='2'/><rect x='37' y='33' width='26' height='34' rx='2'/><rect x='68' y='33' width='26' height='34' rx='2'/></g><g fill='#5b6472'><rect x='10' y='55' width='17' height='7' rx='1'/><rect x='41' y='55' width='17' height='7' rx='1'/><rect x='72' y='55' width='17' height='7' rx='1'/></g>",
      garage: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='24' fill='#2b303c'/><rect x='6' y='6' width='15' height='11' rx='1' fill='#fff'/><rect x='40' y='9' width='38' height='6' rx='1' fill='#8b93a4'/><rect x='0' y='24' width='100' height='4' fill='#9aa0ad'/><g fill='#e7e9ef'><rect x='6' y='34' width='26' height='33' rx='1'/><rect x='37' y='34' width='26' height='33' rx='1'/><rect x='68' y='34' width='26' height='33' rx='1'/></g><g fill='#5b6472'><rect x='6' y='34' width='26' height='3'/><rect x='37' y='34' width='26' height='3'/><rect x='68' y='34' width='26' height='3'/></g>",
      ledger: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='3' fill='#9aa0ad'/><rect x='6' y='9' width='15' height='8' rx='1' fill='#e7e9ef'/><rect x='6' y='23' width='88' height='6' fill='#2b303c'/><g><rect x='6' y='31' width='88' height='11' fill='#f2f4f7'/><rect x='6' y='53' width='88' height='11' fill='#f2f4f7'/></g><g fill='#c7cbd4'><rect x='9' y='33' width='8' height='7' rx='1'/><rect x='9' y='44' width='8' height='7' rx='1'/><rect x='9' y='55' width='8' height='7' rx='1'/></g><g fill='#d6d9e0'><rect x='21' y='35' width='40' height='3' rx='1'/><rect x='21' y='46' width='40' height='3' rx='1'/><rect x='21' y='57' width='40' height='3' rx='1'/></g><g fill='#9aa0ad'><rect x='78' y='35' width='14' height='4' rx='1'/><rect x='78' y='46' width='14' height='4' rx='1'/><rect x='78' y='57' width='14' height='4' rx='1'/></g>",
      track: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='26' fill='#9aa0ad'/><path d='M72 0h28v26H58z' fill='#5b6472'/><rect x='6' y='6' width='15' height='11' rx='1' fill='#fff'/><rect x='40' y='9' width='30' height='7' rx='1' fill='#e7e9ef'/><g fill='#2b303c'><rect x='0' y='26' width='7' height='4'/><rect x='14' y='26' width='7' height='4'/><rect x='28' y='26' width='7' height='4'/><rect x='42' y='26' width='7' height='4'/><rect x='56' y='26' width='7' height='4'/><rect x='70' y='26' width='7' height='4'/><rect x='84' y='26' width='7' height='4'/></g><g fill='#e7e9ef'><rect x='6' y='36' width='26' height='31' rx='2'/><rect x='37' y='36' width='26' height='31' rx='2'/><rect x='68' y='36' width='26' height='31' rx='2'/></g><g fill='#5b6472'><rect x='6' y='47' width='26' height='2'/><rect x='37' y='47' width='26' height='2'/><rect x='68' y='47' width='26' height='2'/></g>",
      bulletin: "<rect width='100' height='74' fill='#fff'/><rect x='6' y='6' width='88' height='3' fill='#1a1d24'/><rect x='6' y='13' width='15' height='9' rx='1' fill='#e7e9ef'/><rect x='40' y='14' width='42' height='8' rx='1' fill='#3a3f4a'/><rect x='6' y='25' width='88' height='2' fill='#1a1d24'/><rect x='6' y='32' width='30' height='4' fill='#3a3f4a'/><rect x='6' y='38' width='88' height='1.5' fill='#1a1d24'/><g fill='none' stroke='#c7cbd4' stroke-width='1'><rect x='6' y='43' width='26' height='24'/><rect x='37' y='43' width='26' height='24'/><rect x='68' y='43' width='26' height='24'/></g>",
      showroom: "<rect width='100' height='74' fill='#fff'/><rect x='4' y='4' width='92' height='66' rx='2' fill='none' stroke='#9aa0ad' stroke-width='1.5'/><rect x='42' y='11' width='16' height='7' rx='1' fill='#c7cbd4'/><rect x='34' y='21' width='32' height='4' rx='1' fill='#9aa0ad'/><rect x='45' y='28' width='10' height='1.5' fill='#c7cbd4'/><g fill='#e7e9ef'><rect x='11' y='36' width='24' height='27' rx='2'/><rect x='38' y='36' width='24' height='27' rx='2'/><rect x='65' y='36' width='24' height='27' rx='2'/></g><g fill='#c7cbd4'><rect x='11' y='57' width='24' height='6'/><rect x='38' y='57' width='24' height='6'/><rect x='65' y='57' width='24' height='6'/></g>",
      chevron: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='25' fill='#9aa0ad'/><g fill='#5b6472'><path d='M60 0l12 12l-12 13h9l12-13l-12-12z'/><path d='M74 0l12 12l-12 13h9l12-13l-12-12z'/></g><rect x='6' y='7' width='15' height='11' rx='1' fill='#fff'/><rect x='30' y='9' width='24' height='7' rx='1' fill='#e7e9ef'/><g fill='#5b6472'><path d='M6 31h26l4 5l-4 5H6z'/></g><g fill='#e7e9ef'><rect x='6' y='45' width='26' height='22' rx='1'/><rect x='37' y='45' width='26' height='22' rx='1'/><rect x='68' y='45' width='26' height='22' rx='1'/></g>",
      blueprint: "<rect width='100' height='74' fill='#fff'/><g stroke='#e4e8ef' stroke-width='0.6'><path d='M13 0V74M26 0V74M39 0V74M52 0V74M65 0V74M78 0V74M91 0V74M0 13H100M0 26H100M0 39H100M0 52H100M0 65H100'/></g><rect x='6' y='8' width='15' height='9' rx='1' fill='#e7e9ef'/><rect x='52' y='9' width='42' height='7' rx='1' fill='#8b93a4'/><rect x='6' y='23' width='88' height='2' fill='#2b6cb0'/><rect x='6' y='30' width='6' height='4' fill='#2b6cb0'/><rect x='15' y='30' width='30' height='4' rx='1' fill='#9aa0ad'/><g fill='#fff' stroke='#c2c9d6' stroke-width='1'><rect x='6' y='40' width='26' height='27'/><rect x='37' y='40' width='26' height='27'/><rect x='68' y='40' width='26' height='27'/></g>",
    };
    return `<svg viewBox='0 0 100 74' preserveAspectRatio='xMidYMid meet' xmlns='http://www.w3.org/2000/svg'>${T[id] || ''}</svg>`;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Money helpers ----------
  const cur = () => state.settings.currency || '$';
  // Logo shown on offers: uploaded logo wins, else committed assets/logo.png,
  // else the logo embedded in js/logo.js (always available).
  const currentLogo = () => state.settings.logo || state.fileLogo || window.DEFAULT_LOGO || null;
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    const v = Math.round(n * 100) / 100;
    return cur() + v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  // Resolve the listed price. Returns { price: Number|null }
  function computePricing(p) {
    const price = parseFloat(p.price);
    return { price: isNaN(price) ? null : price };
  }
  // Discount % → rounded number, or null (blank / "net" / non-numeric = NET price)
  function lessPct(p) {
    const d = parseFloat(p.discount);
    return (!isNaN(d) && d > 0) ? Math.round(d) : null;
  }
  // Badge markup for a given context's class names
  function badgeHTML(p, lessCls, netCls, accent) {
    const less = lessPct(p);
    return less != null
      ? `<span class="${lessCls}"${accent ? ` style="background:${accent}"` : ''}>LESS ${less}%</span>`
      : `<span class="${netCls}">NET</span>`;
  }

  // ---------- Toast ----------
  let toastT;
  function toast(msg, danger) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast' + (danger ? ' danger' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.add('hidden'), 2400);
  }

  // ---------- Navigation ----------
  function goto(tab) {
    $$('.view').forEach(v => v.classList.add('hidden'));
    $('#view-' + tab).classList.remove('hidden');
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    if (tab === 'offers') renderOffers();
    if (tab === 'products') renderProducts();
    if (tab === 'build' && !state.offer) newOffer();
    window.scrollTo(0, 0);
  }

  // ---------- Image handling ----------
  function fileToResizedDataURL(file, maxDim = 1000, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          if (w > maxDim || h > maxDim) {
            if (w >= h) { h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          const isPng = /png/i.test(file.type);
          resolve(c.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // =========================================================
  //  PRODUCTS
  // =========================================================
  function renderProducts() {
    const grid = $('#productsGrid');
    const empty = $('#productsEmpty');
    const q = (state.productQuery || '').trim().toLowerCase();
    let list = [...state.products].sort((a, b) => b.createdAt - a.createdAt);
    if (q) list = list.filter(p =>
      ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    if (!state.products.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      $('#productsToolbar').classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:40px 10px"><p>No products match “${esc(q)}”.</p></div>`;
      updateProductsToolbar();
      return;
    }
    grid.innerHTML = list.map(p => productCardHTML(p, state.selectedProductIds.has(p.id), true)).join('');
    $$('.pcard', grid).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.pedit')) {
          const p = state.products.find(x => x.id === el.dataset.id);
          if (p) openProductModal(p);
          return;
        }
        toggleProductSelect(el.dataset.id);
      });
    });
    updateProductsToolbar();
  }

  function productCardHTML(p, selected, showEdit) {
    const pr = computePricing(p);
    const img = p.image
      ? `<img class="pimg" src="${p.image}" alt="">`
      : `<div class="pimg ph">📦</div>`;
    let priceLine = '';
    if (pr.price != null) {
      priceLine = `<span class="pp"><b>${fmt(pr.price)}</b> ${badgeHTML(p, 'pless', 'pnet')}</span>`;
    }
    const editBtn = showEdit ? `<button class="pedit" data-act="edit" aria-label="Edit">✎</button>` : '';
    const desc = p.description ? `<p class="pd">${esc(p.description)}</p>` : '';
    return `<div class="pcard ${selected ? 'selected' : ''}" data-id="${p.id}">
      <div class="check">✓</div>${editBtn}
      ${img}
      <div class="pbody">
        <p class="pn">${esc(p.name) || 'Untitled'}</p>
        ${desc}
        ${priceLine}
      </div>
    </div>`;
  }

  function toggleProductSelect(id) {
    if (state.selectedProductIds.has(id)) state.selectedProductIds.delete(id);
    else state.selectedProductIds.add(id);
    renderProducts();
  }

  function updateProductsToolbar() {
    const tb = $('#productsToolbar');
    const n = state.selectedProductIds.size;
    if (n === 0) { tb.classList.add('hidden'); return; }
    tb.classList.remove('hidden');
    $('#selCount').textContent = n + ' selected';
  }

  // Configure modal for library-product vs offer-item (variant) editing.
  // Variants have no name field — the product title is the group heading and
  // the description carries the variant detail.
  function setModalMode(isItem) {
    $('#productField').classList.toggle('hidden', !isItem);
    $('#nameField').classList.toggle('hidden', isItem);
  }

  // ----- Product modal -----
  function openProductModal(product) {
    setModalMode(false);
    state.editingProductId = product ? product.id : null;
    state.currentImage = product ? product.image : null;
    $('#productModalTitle').textContent = product ? 'Edit Product' : 'Add Product';
    $('#pProduct').value = '';
    $('#pName').value = product ? product.name || '' : '';
    $('#pDesc').value = product ? product.description || '' : '';
    $('#pPrice').value = product ? (product.price ?? '') : '';
    $('#pDiscount').value = product ? (product.discount ?? '') : '';
    updateImagePreview();
    updatePriceHint();
    $('#deleteProductBtn').classList.toggle('hidden', !product);
    openModal('productModal');
  }

  function updateImagePreview() {
    const prev = $('#imgPreview');
    const ph = $('#imgPlaceholder');
    if (state.currentImage) {
      prev.src = state.currentImage;
      prev.classList.remove('hidden');
      ph.classList.add('hidden');
    } else {
      prev.classList.add('hidden');
      ph.classList.remove('hidden');
    }
  }

  function readProductForm() {
    return {
      product: $('#pProduct').value.trim(),
      name: $('#pName').value.trim(),
      description: $('#pDesc').value.trim(),
      price: $('#pPrice').value,
      discount: $('#pDiscount').value,
      image: state.currentImage,
    };
  }

  function updatePriceHint() {
    const form = readProductForm();
    const pr = computePricing(form);
    const hint = $('#priceHint');
    if (pr.price == null) { hint.textContent = ''; return; }
    const less = lessPct(form);
    hint.innerHTML = less != null
      ? `Shows <b>${fmt(pr.price)}</b> · <b>LESS ${less}%</b> badge`
      : `Shows <b>${fmt(pr.price)}</b> · <b>NET</b> badge`;
  }

  async function saveProduct() {
    const data = readProductForm();
    if (!data.name) { toast('Please enter a product name', true); return; }
    if (data.price === '' || isNaN(parseFloat(data.price))) { toast('Please enter a valid price', true); return; }
    let prod;
    if (state.editingProductId) {
      prod = state.products.find(p => p.id === state.editingProductId);
      Object.assign(prod, data, { updatedAt: Date.now() });
    } else {
      prod = { id: uid(), ...data, createdAt: Date.now(), updatedAt: Date.now() };
      state.products.push(prod);
    }
    await DB.put('products', prod);
    closeModal('productModal');
    toast('Product saved');
    renderProducts();
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product? It will remain in existing offers.')) return;
    state.products = state.products.filter(p => p.id !== id);
    state.selectedProductIds.delete(id);
    await DB.del('products', id);
    renderProducts();
    toast('Product deleted');
  }

  // =========================================================
  //  OFFERS (list)
  // =========================================================
  function renderOffers() {
    const list = $('#offersList');
    const empty = $('#offersEmpty');
    $('#offerSearchWrap').classList.toggle('hidden', state.offers.length === 0);
    if (!state.offers.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    const q = (state.offerQuery || '').trim().toLowerCase();
    let offers = [...state.offers].sort((a, b) => b.updatedAt - a.updatedAt);
    if (q) offers = offers.filter(o => {
      const hay = (o.name || '') + ' ' + (o.title || '') + ' ' +
        (o.items || []).map(i => (i.product || '') + ' ' + (i.description || '')).join(' ');
      return hay.toLowerCase().includes(q);
    });
    if (!offers.length) {
      list.innerHTML = `<div class="empty" style="padding:36px 10px"><p>No offers match “${esc(q)}”.</p></div>`;
      return;
    }
    list.innerHTML = offers.map(o => {
      const items = o.items || [];
      const withImg = items.filter(i => i.image).slice(0, 4);
      const thumbs = withImg.length
        ? withImg.map(i => `<img src="${i.image}" alt="">`).join('')
        : '<div class="oc-noimg">🧾</div>';
      const date = new Date(o.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `<div class="offer-card" data-id="${o.id}">
        <div class="oc-top" data-act="edit">
          <div class="oc-thumbs">${thumbs}</div>
          <div class="oc-main">
            <h3>${esc(o.name) || esc(o.title) || 'Untitled offer'}</h3>
            <div class="oc-meta">${items.length} item${items.length === 1 ? '' : 's'} · ${date}</div>
          </div>
        </div>
        <div class="oc-actions">
          <button class="oc-pdf" data-act="preview" title="Preview & export PDF">⬇ PDF</button>
          <button class="icon-btn" data-act="dup" title="Duplicate">⧉</button>
          <button class="icon-btn" data-act="edit" title="Edit">✎</button>
        </div>
      </div>`;
    }).join('');
    $$('.offer-card', list).forEach(el => {
      const id = el.dataset.id;
      el.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'preview') previewOffer(id);
        else if (act === 'dup') duplicateOffer(id);
        else if (act === 'del') deleteOffer(id);
        else editOffer(id);
      });
    });
  }

  async function deleteOffer(id) {
    if (!confirm('Delete this offer?')) return;
    state.offers = state.offers.filter(o => o.id !== id);
    await DB.del('offers', id);
    renderOffers();
    toast('Offer deleted');
  }

  function duplicateOffer(id) {
    const o = state.offers.find(x => x.id === id);
    if (!o) return;
    state.offer = {
      id: uid(),
      name: (o.name || o.title || 'Offer') + ' (copy)',
      title: o.title || '',
      footer: o.footer, accent: o.accent,
      designId: o.designId || DEFAULT_DESIGN, colorId: o.colorId || DEFAULT_COLOR,
      cols: o.cols || DEFAULT_COLS,
      items: (o.items || []).map(i => ({ ...i, _iid: uid() })),
      createdAt: Date.now(), updatedAt: Date.now(),
      _isNew: true,
    };
    loadOfferIntoBuilder();
    goto('build');
    toast('Duplicated — edit & save');
  }

  function editOffer(id) {
    const o = state.offers.find(x => x.id === id);
    if (!o) return;
    state.offer = {
      ...o,
      items: (o.items || []).map(i => ({ ...i, _iid: i._iid || uid() })),
      _isNew: false,
    };
    loadOfferIntoBuilder();
    goto('build');
  }

  // =========================================================
  //  OFFER BUILDER
  // =========================================================
  function newOffer() {
    state.offer = {
      id: uid(),
      name: '',
      title: DEFAULT_TITLE,
      footer: '',
      designId: DEFAULT_DESIGN,
      colorId: DEFAULT_COLOR,
      cols: DEFAULT_COLS,
      accent: '#e11d48',
      items: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      _isNew: true,
    };
    loadOfferIntoBuilder();
  }

  function loadOfferIntoBuilder() {
    const o = state.offer;
    $('#buildTitle').textContent = o._isNew ? 'New Offer' : 'Edit Offer';
    $('#offerName').value = o.name || '';
    $('#offerTitle').value = o.title || '';
    if (!o.designId) o.designId = resolveDesign(o).id;
    if (!o.colorId) o.colorId = resolveColor(o).id;
    if (![1, 2, 3].includes(o.cols)) o.cols = DEFAULT_COLS;
    renderDesignPicker();
    renderColorPicker();
    renderColsPicker();
    updateThemeSummary();
    renderOfferItems();
  }

  // Compact summary shown on the "Choose theme" trigger button
  function updateThemeSummary() {
    if (!state.offer) return;
    const d = resolveDesign(state.offer);
    const c = resolveColor(state.offer);
    const cols = state.offer.cols || DEFAULT_COLS;
    const thumb = $('#ttThumb'); if (thumb) thumb.innerHTML = designThumb(d.id);
    const t = $('#ttTitle'); if (t) t.textContent = d.name;
    const s = $('#ttSub'); if (s) s.textContent = `${c.name} · ${cols} column${cols > 1 ? 's' : ''}`;
  }

  function renderDesignPicker() {
    const host = $('#designPicker');
    if (!host || !state.offer) return;
    const cur = state.offer.designId || DEFAULT_DESIGN;
    host.innerHTML = OFFER_DESIGNS.map(d => `
      <button type="button" class="design-swatch${d.id === cur ? ' active' : ''}" data-design-id="${d.id}" aria-label="${d.name} design">
        <span class="ds-thumb">${designThumb(d.id)}</span>
        <span class="ds-name">${d.name}</span>
      </button>`).join('');
    $$('.design-swatch', host).forEach(b => b.addEventListener('click', () => {
      state.offer.designId = b.dataset.designId;
      $$('.design-swatch', host).forEach(x => x.classList.toggle('active', x === b));
      updateThemeSummary();
    }));
  }

  const COLS_OPTS = [1, 2, 3];
  function renderColsPicker() {
    const host = $('#colsPicker');
    if (!host || !state.offer) return;
    const cur = [1, 2, 3].includes(state.offer.cols) ? state.offer.cols : DEFAULT_COLS;
    host.innerHTML = COLS_OPTS.map(n => `
      <button type="button" class="cols-swatch${n === cur ? ' active' : ''}" data-cols="${n}" aria-label="${n} column${n > 1 ? 's' : ''}">
        <span class="colsicon">${'<i></i>'.repeat(n)}</span>
        <span class="cols-name">${n} col${n > 1 ? 's' : ''}</span>
      </button>`).join('');
    $$('.cols-swatch', host).forEach(b => b.addEventListener('click', () => {
      state.offer.cols = +b.dataset.cols;
      $$('.cols-swatch', host).forEach(x => x.classList.toggle('active', x === b));
      updateThemeSummary();
    }));
  }

  function renderColorPicker() {
    const host = $('#colorPicker');
    if (!host || !state.offer) return;
    const cur = state.offer.colorId || DEFAULT_COLOR;
    const isCustom = !COLOR_SCHEMES.some(c => c.id === cur);
    const customVal = (isCustom && state.offer.accent) || '#334155';
    const presets = COLOR_SCHEMES.map(c => `
      <button type="button" class="color-swatch${c.id === cur ? ' active' : ''}" data-color-id="${c.id}" aria-label="${c.name}" title="${c.name}">
        <span class="cs-chip" style="background:linear-gradient(135deg, ${c.accent}, ${c.deep})"></span>
      </button>`).join('');
    const custom = `
      <label class="color-swatch color-custom${isCustom ? ' active' : ''}" title="Custom color">
        <span class="cs-chip cs-rainbow"${isCustom ? ` style="background:${customVal}"` : ''}></span>
        <span class="cs-plus">+</span>
        <input type="color" id="customColor" value="${customVal}" aria-label="Pick a custom color" />
      </label>`;
    host.innerHTML = presets + custom;
    $$('.color-swatch[data-color-id]', host).forEach(b => b.addEventListener('click', () => {
      const c = COLOR_SCHEMES.find(x => x.id === b.dataset.colorId);
      if (!c) return;
      state.offer.colorId = c.id;
      state.offer.accent = c.accent;
      $$('.color-swatch', host).forEach(x => x.classList.toggle('active', x === b));
      updateThemeSummary();
    }));
    const ci = $('#customColor', host);
    if (ci) ci.addEventListener('input', () => {
      state.offer.colorId = 'custom';
      state.offer.accent = ci.value;
      const chip = ci.closest('.color-custom').querySelector('.cs-chip');
      chip.style.background = ci.value;
      $$('.color-swatch', host).forEach(x => x.classList.toggle('active', x.classList.contains('color-custom')));
      updateThemeSummary();
    });
  }

  // Group key = product title (falls back to legacy name)
  function groupKey(it) { return (it.product || '').trim() || (it.name || '').trim(); }
  // Preserve first-appearance order of products
  function groupItems(items) {
    const map = new Map();
    items.forEach(it => {
      const k = groupKey(it);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(it);
    });
    return [...map.entries()];
  }

  function renderOfferItems() {
    const host = $('#offerItems');
    const items = state.offer.items;
    if (!items.length) {
      host.innerHTML = `<div class="empty" style="padding:24px"><p>No products yet. Add a product or pick from library.</p></div>`;
      return;
    }
    const groups = groupItems(items);
    host.innerHTML = groups.map(([title, gitems]) => {
      const rows = gitems.map(it => {
        const pr = computePricing(it);
        const img = it.image ? `<img src="${it.image}" alt="">` : `<div class="oi-ph">📦</div>`;
        const price = pr.price != null
          ? `<span class="oi-price"><b>${fmt(pr.price)}</b> ${badgeHTML(it, 'oi-less', 'oi-net')}</span>` : '';
        const label = esc(it.description) || 'Variant';
        return `<div class="oitem" data-iid="${it._iid}">
          ${img}
          <div class="oi-main"><h4>${label}</h4>${price}</div>
          <button class="icon-btn" data-act="edit">✎</button>
          <button class="icon-btn" data-act="rm">✕</button>
        </div>`;
      }).join('');
      return `<div class="ogroup">
        <div class="ogroup-title">${esc(title) || 'Untitled product'}</div>
        <div class="ogroup-items">${rows}</div>
        <button class="ogroup-add" data-product="${esc(title)}">+ Variant</button>
      </div>`;
    }).join('');
    $$('.oitem', host).forEach(el => {
      const iid = el.dataset.iid;
      el.querySelector('[data-act="rm"]').addEventListener('click', () => {
        state.offer.items = state.offer.items.filter(i => i._iid !== iid);
        renderOfferItems();
      });
      el.querySelector('[data-act="edit"]').addEventListener('click', () => editOfferItem(iid));
    });
    $$('.ogroup-add', host).forEach(el =>
      el.addEventListener('click', () => addVariant(el.dataset.product)));
  }

  // Editing an item inside the offer reuses the product modal, but saves to the offer item
  let editingItemIid = null;
  // Reset the modal into offer-item (variant) mode with the given values
  function openItemModal(titleText, values) {
    state.editingProductId = '__offerItem__';
    state.currentImage = values.image || null;
    setModalMode(true);
    $('#productModalTitle').textContent = titleText;
    $('#pProduct').value = values.product || '';
    $('#pName').value = '';
    $('#pDesc').value = values.description || '';
    $('#pPrice').value = values.price ?? '';
    $('#pDiscount').value = values.discount ?? '';
    updateImagePreview(); updatePriceHint();
    $('#deleteProductBtn').classList.add('hidden');
    openModal('productModal');
  }

  function editOfferItem(iid) {
    const it = state.offer.items.find(i => i._iid === iid);
    if (!it) return;
    editingItemIid = iid;
    openItemModal('Edit Variant', { product: groupKey(it), description: it.description, price: it.price, discount: it.discount, image: it.image });
  }

  // "+ Add Product" — new product group, product title editable
  function addInlineItem() {
    editingItemIid = null;
    openItemModal('Add Product', {});
  }

  // "+ Variant" — product title prefilled from the group
  function addVariant(product) {
    editingItemIid = null;
    openItemModal('Add Variant', { product });
  }

  // Override save when in offer-item mode
  async function saveProductOrItem() {
    if (state.editingProductId === '__offerItem__') {
      const data = readProductForm();
      if (!data.product) { toast('Please enter a product', true); return; }
      if (data.price === '' || isNaN(parseFloat(data.price))) { toast('Please enter a valid price', true); return; }
      if (editingItemIid) {
        const it = state.offer.items.find(i => i._iid === editingItemIid);
        Object.assign(it, data);
      } else {
        // Save the variant to the library first, then reference it (pid) so the
        // offer stores the image once (on the product), not duplicated per offer.
        const prod = {
          id: uid(), name: data.product, description: data.description,
          price: data.price, discount: data.discount, image: data.image,
          createdAt: Date.now(), updatedAt: Date.now(),
        };
        state.products.push(prod);
        state.offer.items.push({ _iid: uid(), pid: prod.id, ...data });
        await DB.put('products', prod);
      }
      closeModal('productModal');
      renderOfferItems();
      return;
    }
    await saveProduct();
  }

  function syncOfferFromForm() {
    if (!state.offer) return;
    state.offer.name = $('#offerName').value.trim();
    state.offer.title = $('#offerTitle').value.trim();
  }

  async function saveOffer() {
    syncOfferFromForm();
    state.offer.updatedAt = Date.now();
    const existing = state.offers.find(o => o.id === state.offer.id);
    const prodImg = new Map(state.products.map(p => [p.id, p.image]));
    // In-memory copy keeps images (for thumbnails/preview)
    const memItems = state.offer.items.map(({ _iid, pid, product, description, price, discount, image }) => ({
      _iid: _iid || uid(), pid: pid || '', product: product || '', name: '',
      description: description || '', price: price == null ? '' : price,
      discount: discount == null ? '' : discount, image: image || null,
    }));
    const clean = {
      id: state.offer.id, name: state.offer.name || '', title: state.offer.title || '',
      footer: state.offer.footer || '', accent: state.offer.accent || '#e11d48',
      designId: state.offer.designId || DEFAULT_DESIGN, colorId: state.offer.colorId || DEFAULT_COLOR,
      cols: [1, 2, 3].includes(state.offer.cols) ? state.offer.cols : DEFAULT_COLS,
      items: memItems,
      createdAt: state.offer.createdAt || Date.now(), updatedAt: state.offer.updatedAt || Date.now(),
    };
    if (existing) Object.assign(existing, clean); else state.offers.push(clean);
    state.offer._isNew = false;
    // Firestore copy: drop the image when it can be resolved from its product,
    // so the offer document stays tiny (Firestore caps a doc at ~1 MB).
    const forDb = {
      ...clean,
      items: memItems.map(it => {
        const resolvable = it.pid && prodImg.get(it.pid) && prodImg.get(it.pid) === it.image;
        return { ...it, image: resolvable ? null : (it.image || null) };
      }),
    };
    await DB.put('offers', forDb);
  }

  // ----- Product picker (from library) -----
  function openPicker() {
    state.pickerSelected = new Set();
    state.pickerQuery = '';
    $('#pickerSearch').value = '';
    renderPicker();
    openModal('pickerModal');
  }
  function renderPicker() {
    const grid = $('#pickerGrid');
    const empty = $('#pickerEmpty');
    const q = (state.pickerQuery || '').trim().toLowerCase();
    let list = [...state.products].sort((a, b) => b.createdAt - a.createdAt);
    if (q) list = list.filter(p => ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    if (!state.products.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
    if (!list.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:30px 10px"><p>No products match “${esc(q)}”.</p></div>`; return; }
    grid.innerHTML = list.map(p => productCardHTML(p, state.pickerSelected.has(p.id))).join('');
    $$('.pcard', grid).forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (state.pickerSelected.has(id)) state.pickerSelected.delete(id);
        else state.pickerSelected.add(id);
        renderPicker();
      });
    });
  }
  // Library product -> offer item: the product's name becomes the group title.
  // Keep `pid` so the image can be stored once (on the product) and resolved,
  // instead of duplicated into the offer document.
  function libToItem(p) {
    return {
      _iid: uid(), pid: p.id || '', product: p.name || '', name: '', description: p.description,
      price: p.price, discount: p.discount, image: p.image,
    };
  }
  function addPickedToOffer() {
    const picked = state.products.filter(p => state.pickerSelected.has(p.id));
    picked.forEach(p => state.offer.items.push(libToItem(p)));
    closeModal('pickerModal');
    renderOfferItems();
    if (picked.length) toast(picked.length + ' item(s) added');
  }

  // Build an offer directly from products-view selection
  function offerFromSelection() {
    const picked = state.products.filter(p => state.selectedProductIds.has(p.id));
    if (!picked.length) return;
    newOffer();
    picked.forEach(p => state.offer.items.push(libToItem(p)));
    state.selectedProductIds.clear();
    loadOfferIntoBuilder();
    goto('build');
  }

  // =========================================================
  //  OFFER SHEET (preview + export)
  // =========================================================
  // Shade a hex color toward black (p<0) or white (p>0)
  function shade(hex, p) {
    const n = parseInt((hex || '#e11d48').replace('#', ''), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(p < 0 ? c * (1 + p) : c + (255 - c) * p);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }

  // ---- Shared sheet atoms (used by every design) ----
  const s_img = (it) => it.image
    ? `<div class="s-imgwrap"><img src="${it.image}" alt=""></div>`
    : `<div class="s-imgwrap"><span class="s-noimg">📦</span></div>`;
  const s_desc = (it) => it.description ? `<p class="s-desc">${esc(it.description)}</p>` : '';
  const s_price = (it) => {
    const pr = computePricing(it);
    if (pr.price == null) return '';
    return `<div class="s-price"><span class="s-price-val"><span class="s-cur">${cur()}</span><span class="s-amt">${fmt(pr.price).replace(cur(), '')}</span></span>${badgeHTML(it, 's-badge', 's-badge s-badge-net', null)}</div>`;
  };
  const s_card = (it) => `<article class="scard"><div class="s-imgbox">${s_img(it)}</div><div class="s-body">${s_desc(it)}${s_price(it)}</div></article>`;
  const s_logo = (c) => c.logo
    ? `<img class="hero-logo-img" src="${c.logo}" alt="logo">`
    : `<div class="hero-wordmark">BJ Auto Parts Supply</div>`;
  const s_grid = (g) => `<div class="sheet-grid">${g.items.map(s_card).join('')}</div>`;
  const s_sections = (c) => c.groups.map((g) => {
    const banner = g.title ? `<div class="s-banner"><span class="s-btxt">${esc(g.title)}</span></div>` : '';
    return `<section class="sgroup">${banner}${s_grid(g)}</section>`;
  }).join('');
  const s_body = (c) => `<div class="sheet-body">${s_sections(c)}</div>`;
  const s_foot = (c) => `<footer class="sheet-footer"><span>${c.footer}</span></footer>`;

  // ---- Five designs for the auto-supply niche. Layout only — color comes from vars. ----
  const SHEET_DESIGNS = {
    classic:   (c) => `<header class="hero"><span class="hero-c1"></span><span class="hero-c2"></span><span class="hero-ray"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-cut"></span></header>${s_body(c)}${s_foot(c)}`,
    brochure:  (c) => `<header class="hero"><span class="hero-orb"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-cut"></span></header>${s_body(c)}${s_foot(c)}`,
    promo:     (c) => `<header class="hero"><span class="hero-stripe"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    garage:    (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-hazard"></span></header>${s_body(c)}${s_foot(c)}`,
    ledger:    (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    track:     (c) => `<header class="hero"><span class="hero-diag"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-check"></span></header>${s_body(c)}${s_foot(c)}`,
    bulletin:  (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    showroom:  (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><h1 class="hero-title">${c.title}</h1><span class="hero-rule"></span></header>${s_body(c)}${s_foot(c)}`,
    chevron:   (c) => `<header class="hero"><span class="hero-stripe"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    blueprint: (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
  };

  function sheetCtx(offer) {
    const design = resolveDesign(offer);
    const groups = groupItems(offer.items || []).map(([title, items]) => ({ title, items }));
    return {
      design, color: resolveColor(offer), groups, logo: currentLogo(),
      title: esc(offer.title) || DEFAULT_TITLE,
      footer: esc(offer.footer) || 'LIMITED STOCK ONLY',
    };
  }

  function buildSheet(offer) {
    const c = sheetCtx(offer);
    const id = SHEET_DESIGNS[c.design.id] ? c.design.id : DEFAULT_DESIGN;
    const cols = [1, 2, 3].includes(offer.cols) ? offer.cols : DEFAULT_COLS;
    const vars = `--accent:${c.color.accent};--deep:${c.color.deep}`;
    return `<div class="sheet d-${id} cols-${cols}" style="${vars}">${SHEET_DESIGNS[id](c)}</div>`;
  }

  // Render the current state.offer into the preview modal and open it
  function showPreview() {
    const host = $('#sheetHost');
    host.innerHTML = buildSheet(state.offer);
    requestAnimationFrame(() => {
      const sheet = host.querySelector('.sheet');
      const avail = host.parentElement.clientWidth - 32;
      const scale = Math.min(1, avail / 794);
      host.style.transform = `scale(${scale})`;
      host.style.height = (sheet.offsetHeight * scale) + 'px';
    });
    openModal('previewModal');
  }

  // From the builder: render the preview first (never blocked by saving),
  // then persist in the background so a save failure can't stop the preview.
  async function openPreview() {
    syncOfferFromForm();
    if (!state.offer.items.length) { toast('Add at least one item first', true); return; }
    showPreview();
    try {
      await saveOffer();
      renderOffers();
    } catch (e) {
      console.error('Save failed:', e);
      toast('Preview ready — save failed: ' + ((e && (e.code || e.message)) || 'unknown'), true);
    }
  }

  // From the Offers list: preview a saved offer without entering the builder
  function previewOffer(id) {
    const o = state.offers.find(x => x.id === id);
    if (!o) return;
    if (!(o.items || []).length) { toast('This offer has no items', true); return; }
    state.offer = {
      ...o,
      items: (o.items || []).map(i => ({ ...i, _iid: i._iid || uid() })),
      _isNew: false,
    };
    showPreview();
  }

  function offscreenSheet() {
    // Render at full size offscreen for crisp export
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-10000px;top:0;';
    wrap.innerHTML = buildSheet(state.offer);
    document.body.appendChild(wrap);
    return wrap;
  }

  function safeName() {
    return (state.offer.name || state.offer.title || 'offer').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'offer';
  }

  async function exportPNG() {
    const wrap = offscreenSheet();
    try {
      toast('Rendering image…');
      const canvas = await html2canvas(wrap.querySelector('.sheet'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = safeName() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast('PNG downloaded');
    } catch (e) {
      console.error(e); toast('Export failed', true);
    } finally { wrap.remove(); }
  }

  async function exportPDF() {
    const wrap = offscreenSheet();
    try {
      toast('Rendering PDF…');
      const sheet = wrap.querySelector('.sheet');

      // Collect clean page-break points (px, relative to the sheet) so a
      // page never cuts through a card: sheet-top bottom, each card-row
      // bottom, and each section start.
      const sheetRect = sheet.getBoundingClientRect();
      const top = (el) => el.getBoundingClientRect().top - sheetRect.top;
      const bottom = (el) => el.getBoundingClientRect().bottom - sheetRect.top;
      const breaks = new Set([0]);
      const topEl = sheet.querySelector('.sheet-top'); if (topEl) breaks.add(bottom(topEl));
      sheet.querySelectorAll('.sgroup').forEach(g => breaks.add(top(g)));
      // group cards into rows by their top offset
      const rows = new Map();
      sheet.querySelectorAll('.scard').forEach(c => {
        const k = Math.round(top(c));
        rows.set(k, Math.max(rows.get(k) || 0, bottom(c)));
      });
      rows.forEach(b => breaks.add(b));
      const foot = sheet.querySelector('.sheet-footer'); if (foot) breaks.add(bottom(foot));

      const canvas = await html2canvas(sheet, { scale: 2, useCORS: true, backgroundColor: null });
      const factor = canvas.width / sheetRect.width;         // css px -> canvas px
      const cuts = [...breaks].map(v => Math.round(v * factor))
        .filter(v => v >= 0 && v <= canvas.height).sort((a, b) => a - b);
      cuts.push(canvas.height);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'letter' });
      const pageWmm = pdf.internal.pageSize.getWidth();       // 215.9
      const pageHmm = pdf.internal.pageSize.getHeight();      // 279.4
      const pageHpx = Math.floor(pageHmm * canvas.width / pageWmm);

      // Greedily pack rows into Letter pages, breaking only at clean cuts.
      let start = 0, first = true;
      while (start < canvas.height - 1) {
        const limit = start + pageHpx;
        let end = cuts.filter(c => c > start + 4 && c <= limit).pop();
        if (end === undefined) end = Math.min(limit, canvas.height); // block taller than a page → hard cut
        const sliceH = end - start;
        const slice = document.createElement('canvas');
        slice.width = canvas.width; slice.height = sliceH;
        const ctx = slice.getContext('2d');
        ctx.fillStyle = '#f9f9f9'; ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, start, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const imgH = sliceH * pageWmm / canvas.width;
        if (!first) pdf.addPage();
        pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWmm, imgH);
        first = false;
        start = end;
      }
      pdf.save(safeName() + '.pdf');
      toast('PDF downloaded');
    } catch (e) {
      console.error(e); toast('Export failed', true);
    } finally { wrap.remove(); }
  }

  // =========================================================
  //  Modals
  // =========================================================
  function openModal(id) { $('#' + id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { $('#' + id).classList.add('hidden'); document.body.style.overflow = ''; }

  // =========================================================
  //  Settings / data
  // =========================================================
  function openSettings() {
    $('#currencyInput').value = state.settings.currency || '$';
    renderLogoSetting();
    $('#dbStatus').textContent = DB.backend === 'firestore'
      ? '☁ Cloud Firestore (connected)'
      : '📱 On-device only — add your Firebase config in js/firebase-config.js to sync.';
    openModal('settingsModal');
  }
  function renderLogoSetting() {
    const prev = $('#logoPreview');
    const logo = currentLogo();
    prev.innerHTML = logo ? `<img src="${logo}" alt="logo">` : '<span>No logo</span>';
    $('#removeLogoBtn').classList.toggle('hidden', !state.settings.logo);
  }
  async function saveSettings() {
    state.settings.currency = $('#currencyInput').value.trim() || '$';
    await persistSettings();
  }
  async function persistSettings() {
    await DB.put('settings', { key: 'app', currency: state.settings.currency, logo: state.settings.logo || null, theme: state.settings.theme || 'light' });
  }
  async function setLogo(file) {
    try {
      // Logos are wide; allow more width, keep file small for the DB
      state.settings.logo = await fileToResizedDataURL(file, 1200, 0.85);
      await persistSettings();
      renderLogoSetting();
      toast('Logo saved');
    } catch { toast('Could not load logo', true); }
  }
  async function removeLogo() {
    state.settings.logo = null;
    await persistSettings();
    renderLogoSetting();
    toast('Logo removed');
  }

  async function exportData() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      products: state.products,
      offers: state.offers,
      settings: state.settings,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'offer-maker-backup.json';
    link.click();
    toast('Data exported');
  }

  async function importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.products) for (const p of data.products) await DB.put('products', p);
      if (data.offers) for (const o of data.offers) await DB.put('offers', o);
      if (data.settings) { state.settings = { ...state.settings, ...data.settings }; await DB.put('settings', { key: 'app', ...state.settings }); }
      await loadAll();
      closeModal('settingsModal');
      toast('Data imported');
      goto('offers');
    } catch (e) {
      console.error(e); toast('Import failed — invalid file', true);
    }
  }

  async function wipeData() {
    if (!confirm('Delete ALL products and offers? This cannot be undone.')) return;
    await DB.clear('products');
    await DB.clear('offers');
    state.products = []; state.offers = [];
    state.selectedProductIds.clear();
    closeModal('settingsModal');
    toast('All data deleted');
    goto('offers');
  }

  // =========================================================
  //  Load
  // =========================================================
  async function loadAll() {
    // Legacy pricing modes are gone: 'net'/'none' items become a NET badge
    // (their `discount` field is set to "net"); 'percent' keeps its number.
    const migratePricing = (x) => {
      if (x && (x.mode === 'net' || x.mode === 'none')) x.discount = 'net';
      if (x) delete x.mode;
    };
    state.products = (await DB.all('products') || []);
    state.products.forEach(migratePricing);
    state.offers = await DB.all('offers') || [];
    // For resolving/reference of images stored once on products
    const prodById = new Map(state.products.map(p => [p.id, p]));
    const prodByImg = new Map(state.products.filter(p => p.image).map(p => [p.image, p.id]));
    state.offers.forEach(o => {
      // Legacy offers had no separate name — use the heading as the list/file name
      if (o.name === undefined || o.name === null || o.name === '') o.name = o.title || '';
      (o.items || []).forEach(it => {
        if (it.product === undefined || it.product === null) { it.product = it.name || ''; it.name = ''; }
        migratePricing(it);
        // Resolve image stored on the product; backfill pid for legacy inline-image
        // items (match by image) so a re-save shrinks the offer document.
        if (it.pid && !it.image && prodById.has(it.pid)) it.image = prodById.get(it.pid).image;
        if (!it.pid && it.image && prodByImg.has(it.image)) it.pid = prodByImg.get(it.image);
      });
    });
    const s = await DB.get('settings', 'app');
    if (s) state.settings = { currency: s.currency || '$', logo: s.logo || null, theme: s.theme || 'light' };
    applyTheme(state.settings.theme);
    if (!state.settings.logo) await loadFileLogo();
  }

  // ---------- Theme ----------
  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    state.settings.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('om_theme', t); } catch (e) {}
    $$('#themeSeg .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.themeVal === t));
  }
  async function setTheme(theme) {
    applyTheme(theme);
    await persistSettings();
  }

  // Optional: use a committed assets/logo.png as the logo when none is stored
  async function loadFileLogo() {
    try {
      const res = await fetch('assets/logo.png', { cache: 'force-cache' });
      if (!res.ok) return;
      const blob = await res.blob();
      state.fileLogo = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(blob);
      });
    } catch { /* no file logo — falls back to wordmark */ }
  }

  // =========================================================
  //  Wire up events
  // =========================================================
  function bind() {
    // Tabs
    $$('.tab').forEach(t => t.addEventListener('click', () => goto(t.dataset.tab)));
    $$('[data-goto]').forEach(b => b.addEventListener('click', () => goto(b.dataset.goto)));
    $$('[data-newoffer]').forEach(b => b.addEventListener('click', () => { newOffer(); goto('build'); }));

    // Products
    $('#addProductBtn').addEventListener('click', () => openProductModal(null));
    $('#addProductBtn2').addEventListener('click', () => openProductModal(null));
    $('#clearSelBtn').addEventListener('click', () => { state.selectedProductIds.clear(); renderProducts(); });
    $('#productSearch').addEventListener('input', (e) => { state.productQuery = e.target.value; renderProducts(); });
    $('#offerSearch').addEventListener('input', (e) => { state.offerQuery = e.target.value; renderOffers(); });
    $('#pickerSearch').addEventListener('input', (e) => { state.pickerQuery = e.target.value; renderPicker(); });
    $('#offerFromSelBtn').addEventListener('click', offerFromSelection);

    // Product modal
    $('#productImage').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { state.currentImage = await fileToResizedDataURL(file); updateImagePreview(); }
      catch { toast('Could not load image', true); }
    });
    ['#pPrice', '#pDiscount'].forEach(s => $(s).addEventListener('input', updatePriceHint));
    $('#saveProductBtn').addEventListener('click', saveProductOrItem);
    $('#deleteProductBtn').addEventListener('click', () => {
      if (state.editingProductId && state.editingProductId !== '__offerItem__') {
        const id = state.editingProductId;
        closeModal('productModal');
        deleteProduct(id);
      }
    });

    // Builder
    $('#pickProductsBtn').addEventListener('click', openPicker);
    $('#chooseThemeBtn').addEventListener('click', () => {
      renderDesignPicker(); renderColorPicker(); renderColsPicker();
      openModal('designModal');
    });
    $('#addItemInlineBtn').addEventListener('click', addInlineItem);
    $('#pickerAddBtn').addEventListener('click', addPickedToOffer);
    $('#previewBtn').addEventListener('click', openPreview);
    ['#offerName', '#offerTitle'].forEach(s =>
      $(s).addEventListener('input', syncOfferFromForm));

    // Export
    $('#exportImgBtn').addEventListener('click', exportPNG);
    $('#exportPdfBtn').addEventListener('click', exportPDF);

    // Settings
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#currencyInput').addEventListener('input', saveSettings);
    $$('#themeSeg .seg-btn').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeVal)));
    $('#logoInput').addEventListener('change', (e) => { if (e.target.files[0]) setLogo(e.target.files[0]); });
    $('#removeLogoBtn').addEventListener('click', removeLogo);
    $('#exportDataBtn').addEventListener('click', exportData);
    $('#importDataInput').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
    $('#wipeBtn').addEventListener('click', wipeData);

    // Close buttons / backdrop
    $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
    $$('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); }));

    // Picker uses select-only cards (no edit button)
  }

  // =========================================================
  //  Versions
  // =========================================================
  const APP_VER = window.APP_VERSION || 1;
  // Site base without any trailing /v<n>/ segment (works from root or a snapshot)
  function repoBase() {
    let p = location.pathname.replace(/index\.html$/, '');
    if (!p.endsWith('/')) p += '/';
    return p.replace(/v\d+\/$/, '');
  }
  function openVersions() {
    const base = repoBase();
    $('#verCurrent').innerHTML = `You are viewing <b>v${APP_VER}</b>.`;
    const rows = [];
    rows.push(`<button class="btn primary block" data-gov="">★ Latest version</button>`);
    for (let k = APP_VER; k >= 1; k--) {
      rows.push(`<button class="btn ghost block" data-gov="v${k}/">Version ${k}${k === APP_VER ? ' (current)' : ''}</button>`);
    }
    const list = $('#versionsList');
    list.innerHTML = rows.join('');
    $$('[data-gov]', list).forEach(b => b.addEventListener('click', () => {
      location.href = base + b.dataset.gov;
    }));
    openModal('versionsModal');
  }

  // =========================================================
  //  Init
  // =========================================================
  async function init() {
    const vp = $('#verPill'); if (vp) { vp.textContent = 'v' + APP_VER; vp.addEventListener('click', openVersions); }
    bind();
    try {
      await loadAll();
    } catch (e) {
      // e.g. Firestore not created yet or rules not published — keep the app usable
      console.error('Load failed:', e);
      toast('Could not load saved data — check Firestore setup', true);
    }
    goto('offers');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
