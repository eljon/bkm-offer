/* Offer Maker — main app */
(() => {
  'use strict';

  // ---------- State ----------
  const state = {
    products: [],
    offers: [],
    settings: { currency: '$', defaultStore: '' },
    selectedProductIds: new Set(),   // products view multi-select
    pickerSelected: new Set(),       // picker modal selection
    editingProductId: null,          // product modal target
    currentImage: null,              // data URL in product modal
    offer: null,                     // offer being built
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Money helpers ----------
  const cur = () => state.settings.currency || '$';
  function fmt(n) {
    if (n == null || isNaN(n)) return '';
    const v = Math.round(n * 100) / 100;
    return cur() + v.toLocaleString(undefined, { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
  }
  // Returns {price, net, discountPct, hasDiscount}
  function computePricing(p) {
    const price = parseFloat(p.price);
    if (isNaN(price)) return { price: null, net: null, discountPct: 0, hasDiscount: false };
    if (p.mode === 'percent') {
      const d = parseFloat(p.discount) || 0;
      const net = price * (1 - d / 100);
      return { price, net, discountPct: Math.round(d), hasDiscount: d > 0 };
    }
    if (p.mode === 'net') {
      const net = parseFloat(p.discount);
      if (isNaN(net) || net >= price) return { price, net: isNaN(net) ? price : net, discountPct: 0, hasDiscount: !isNaN(net) && net < price };
      const pct = Math.round((1 - net / price) * 100);
      return { price, net, discountPct: pct, hasDiscount: true };
    }
    return { price, net: price, discountPct: 0, hasDiscount: false };
  }
  // "LESS x%" percent, or null when not a percent-discount item
  function lessPct(p) {
    const d = parseFloat(p.discount);
    return (p.mode === 'percent' && !isNaN(d) && d > 0) ? Math.round(d) : null;
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
    const list = [...state.products].sort((a, b) => b.createdAt - a.createdAt);
    if (!list.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      $('#productsToolbar').classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
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
    const less = lessPct(p);
    let priceLine = '';
    if (pr.price != null) {
      if (less != null) priceLine = `<span class="pp"><b>${fmt(pr.price)}</b> <span class="pless">LESS ${less}%</span></span>`;
      else if (p.mode === 'net' && pr.hasDiscount) priceLine = `<span class="pp"><s>${fmt(pr.price)}</s> <b>${fmt(pr.net)}</b></span>`;
      else priceLine = `<span class="pp"><b>${fmt(pr.price)}</b></span>`;
    }
    const editBtn = showEdit ? `<button class="pedit" data-act="edit" aria-label="Edit">✎</button>` : '';
    return `<div class="pcard ${selected ? 'selected' : ''}" data-id="${p.id}">
      <div class="check">✓</div>${editBtn}
      ${img}
      <div class="pbody">
        <p class="pn">${esc(p.name) || 'Untitled'}</p>
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

  // Configure modal for library-product vs offer-item (variant) editing
  function setModalMode(isItem) {
    $('#productField').classList.toggle('hidden', !isItem);
    $('#pNameLabel').textContent = isItem ? 'Variant name (optional)' : 'Product name';
    $('#pName').placeholder = isItem ? 'e.g. RR-LH-Upper (leave blank if none)' : 'e.g. Front Brake Pads';
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
    $('#pMode').value = product ? (product.mode || 'percent') : 'percent';
    $('#pDiscount').value = product ? (product.discount ?? '') : '';
    updateImagePreview();
    updateDiscountField();
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

  function updateDiscountField() {
    const mode = $('#pMode').value;
    const field = $('#discountField');
    const label = $('#discountLabel');
    if (mode === 'none') { field.classList.add('hidden'); return; }
    field.classList.remove('hidden');
    label.textContent = mode === 'percent' ? 'Discount %' : 'Net price';
    $('#pDiscount').placeholder = mode === 'percent' ? '0' : '0.00';
  }

  function readProductForm() {
    return {
      product: $('#pProduct').value.trim(),
      name: $('#pName').value.trim(),
      description: $('#pDesc').value.trim(),
      price: $('#pPrice').value,
      mode: $('#pMode').value,
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
    if (less != null) {
      hint.innerHTML = `Shows <b>${fmt(pr.price)}</b> · <b>LESS ${less}%</b> badge`;
    } else if (form.mode === 'net' && pr.hasDiscount) {
      hint.innerHTML = `Was ${fmt(pr.price)} → net <b>${fmt(pr.net)}</b>`;
    } else {
      hint.innerHTML = `Price <b>${fmt(pr.price)}</b>`;
    }
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
    const offers = [...state.offers].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!offers.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = offers.map(o => {
      const items = o.items || [];
      const withImg = items.filter(i => i.image).slice(0, 4);
      const thumbs = withImg.length
        ? withImg.map(i => `<img src="${i.image}" alt="">`).join('')
        : '<div class="oc-noimg">🧾</div>';
      const date = new Date(o.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `<div class="offer-card" data-id="${o.id}">
        <div class="oc-thumbs">${thumbs}</div>
        <div class="oc-main">
          <h3>${esc(o.title) || 'Untitled offer'}</h3>
          <div class="oc-meta">${items.length} item${items.length === 1 ? '' : 's'} · ${date}</div>
        </div>
        <div class="oc-actions">
          <button class="icon-btn" data-act="dup" title="Duplicate">⧉</button>
          <button class="icon-btn" data-act="edit" title="Edit">✎</button>
          <button class="icon-btn" data-act="del" title="Delete">🗑</button>
        </div>
      </div>`;
    }).join('');
    $$('.offer-card', list).forEach(el => {
      const id = el.dataset.id;
      el.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'dup') duplicateOffer(id);
        else if (act === 'edit') editOffer(id);
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
      title: (o.title || 'Offer') + ' (copy)',
      store: o.store, footer: o.footer, accent: o.accent,
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
      title: '',
      store: state.settings.defaultStore || '',
      footer: '',
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
    $('#offerTitle').value = o.title || '';
    $('#offerStore').value = o.store || '';
    $('#offerFooter').value = o.footer || '';
    $('#offerAccent').value = o.accent || '#e11d48';
    renderOfferItems();
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
        const less = lessPct(it);
        let price = '';
        if (pr.price != null) {
          if (less != null) price = `<span class="oi-price"><b>${fmt(pr.price)}</b> <span class="oi-less">LESS ${less}%</span></span>`;
          else if (it.mode === 'net' && pr.hasDiscount) price = `<span class="oi-price"><s>${fmt(pr.price)}</s><b>${fmt(pr.net)}</b></span>`;
          else price = `<span class="oi-price"><b>${fmt(pr.price)}</b></span>`;
        }
        const label = esc(it.name) || esc(it.description) || 'Variant';
        return `<div class="oitem" data-iid="${it._iid}">
          ${img}
          <div class="oi-main"><h4>${label}</h4>${price}</div>
          <button class="icon-btn" data-act="edit">✎</button>
          <button class="icon-btn" data-act="rm">✕</button>
        </div>`;
      }).join('');
      return `<div class="ogroup">
        <div class="ogroup-head">
          <span class="ogroup-title">${esc(title) || 'Untitled product'}</span>
          <button class="ogroup-add" data-product="${esc(title)}">+ Variant</button>
        </div>
        <div class="ogroup-items">${rows}</div>
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
    $('#pName').value = values.name || '';
    $('#pDesc').value = values.description || '';
    $('#pPrice').value = values.price ?? '';
    $('#pMode').value = values.mode || 'percent';
    $('#pDiscount').value = values.discount ?? '';
    updateImagePreview(); updateDiscountField(); updatePriceHint();
    $('#deleteProductBtn').classList.add('hidden');
    openModal('productModal');
  }

  function editOfferItem(iid) {
    const it = state.offer.items.find(i => i._iid === iid);
    if (!it) return;
    editingItemIid = iid;
    openItemModal('Edit Variant', { product: groupKey(it), name: it.name, description: it.description, price: it.price, mode: it.mode, discount: it.discount, image: it.image });
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
        state.offer.items.push({ _iid: uid(), ...data });
        // Also save the variant to the library for reuse (grouped by product title)
        const prod = {
          id: uid(), name: data.product,
          description: [data.name, data.description].filter(Boolean).join(' · '),
          price: data.price, mode: data.mode, discount: data.discount, image: data.image,
          createdAt: Date.now(), updatedAt: Date.now(),
        };
        state.products.push(prod);
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
    state.offer.title = $('#offerTitle').value.trim();
    state.offer.store = $('#offerStore').value.trim();
    state.offer.footer = $('#offerFooter').value.trim();
    state.offer.accent = $('#offerAccent').value;
  }

  async function saveOffer() {
    syncOfferFromForm();
    state.offer.updatedAt = Date.now();
    const existing = state.offers.find(o => o.id === state.offer.id);
    const clean = {
      id: state.offer.id,
      title: state.offer.title,
      store: state.offer.store,
      footer: state.offer.footer,
      accent: state.offer.accent,
      items: state.offer.items.map(({ _iid, product, name, description, price, mode, discount, image }) =>
        ({ _iid, product: product || '', name, description, price, mode, discount, image })),
      createdAt: state.offer.createdAt,
      updatedAt: state.offer.updatedAt,
    };
    if (existing) Object.assign(existing, clean);
    else state.offers.push(clean);
    state.offer._isNew = false;
    await DB.put('offers', clean);
  }

  // ----- Product picker (from library) -----
  function openPicker() {
    state.pickerSelected = new Set();
    // Preselect ones already in the offer by matching library origin is hard; keep empty.
    renderPicker();
    openModal('pickerModal');
  }
  function renderPicker() {
    const grid = $('#pickerGrid');
    const empty = $('#pickerEmpty');
    const list = [...state.products].sort((a, b) => b.createdAt - a.createdAt);
    if (!list.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');
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
  // Library product -> offer item: the product's name becomes the group title
  function libToItem(p) {
    return {
      _iid: uid(), product: p.name || '', name: '', description: p.description,
      price: p.price, mode: p.mode, discount: p.discount, image: p.image,
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
  function buildSheet(offer) {
    const accent = offer.accent || '#e11d48';
    const items = offer.items || [];

    const variantCard = (it) => {
      const pr = computePricing(it);
      const img = it.image
        ? `<div class="s-imgwrap"><img src="${it.image}" alt=""></div>`
        : `<div class="s-imgwrap"><span class="s-noimg">📦</span></div>`;
      const less = lessPct(it);
      let priceBlock;
      if (pr.price == null) priceBlock = '';
      else if (less != null) {
        priceBlock = `<div class="s-price"><span class="s-single">${fmt(pr.price)}</span><span class="s-less" style="background:${accent}">LESS ${less}%</span></div>`;
      } else if (it.mode === 'net' && pr.hasDiscount) {
        priceBlock = `<div class="s-price"><span class="s-old">${fmt(pr.price)}</span><span class="s-new">${fmt(pr.net)}</span></div>`;
      } else {
        priceBlock = `<div class="s-price"><span class="s-single">${fmt(pr.price)}</span></div>`;
      }
      // Variant card shows only variant detail — the product title is the section heading
      const name = it.name ? `<p class="s-name">${esc(it.name)}</p>` : '';
      const desc = it.description ? `<p class="s-desc">${esc(it.description)}</p>` : '';
      return `<div class="scard">
        ${img}
        <div class="s-body">
          ${name}${desc}
          ${priceBlock}
        </div>
      </div>`;
    };

    // One section per product, title shown once
    const sections = groupItems(items).map(([title, gitems]) => {
      const heading = title
        ? `<div class="sgroup-title" style="border-color:${accent}">${esc(title)}</div>` : '';
      return `<section class="sgroup">${heading}<div class="sheet-grid">${gitems.map(variantCard).join('')}</div></section>`;
    }).join('');

    const dealCount = items.length;
    return `<div class="sheet" style="--accent:${accent}">
      <div class="sheet-header" style="background:${accent}">
        ${offer.store ? `<div class="sh-store">${esc(offer.store)}</div>` : ''}
        <h1 class="sh-title">${esc(offer.title) || 'Special Offer'}</h1>
        <div class="sh-badge" style="color:${accent}">${dealCount} DEAL${dealCount === 1 ? '' : 'S'}</div>
      </div>
      <div class="sheet-body">${sections}</div>
      <div class="sheet-footer">
        <span>${esc(offer.footer) || ''}</span>
        <span class="sf-brand" style="color:${accent}">${esc(offer.store) || 'Offer Maker'}</span>
      </div>
    </div>`;
  }

  async function openPreview() {
    syncOfferFromForm();
    if (!state.offer.items.length) { toast('Add at least one item first', true); return; }
    await saveOffer(); // persist as we preview
    const host = $('#sheetHost');
    host.innerHTML = buildSheet(state.offer);
    // Scale sheet to fit modal width
    requestAnimationFrame(() => {
      const sheet = host.querySelector('.sheet');
      const avail = host.parentElement.clientWidth - 32;
      const scale = Math.min(1, avail / 794);
      host.style.transform = `scale(${scale})`;
      host.style.height = (sheet.offsetHeight * scale) + 'px';
    });
    openModal('previewModal');
    renderOffers();
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
    return (state.offer.title || 'offer').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'offer';
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
      const canvas = await html2canvas(sheet, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const { jsPDF } = window.jspdf;
      // Page proportional to content, A4 width
      const pdfW = 210; // mm
      const pdfH = canvas.height * pdfW / canvas.width;
      const pdf = new jsPDF({ orientation: pdfH > pdfW ? 'p' : 'l', unit: 'mm', format: [pdfW, pdfH] });
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH);
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
    $('#defaultStoreInput').value = state.settings.defaultStore || '';
    openModal('settingsModal');
  }
  async function saveSettings() {
    state.settings.currency = $('#currencyInput').value.trim() || '$';
    state.settings.defaultStore = $('#defaultStoreInput').value.trim();
    await DB.put('settings', { key: 'app', ...state.settings });
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
    state.products = await DB.all('products') || [];
    state.offers = await DB.all('offers') || [];
    // Migrate legacy offer items (no `product`): the old item name becomes the product title
    state.offers.forEach(o => (o.items || []).forEach(it => {
      if (it.product === undefined || it.product === null) { it.product = it.name || ''; it.name = ''; }
    }));
    const s = await DB.get('settings', 'app');
    if (s) state.settings = { currency: s.currency || '$', defaultStore: s.defaultStore || '' };
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
    $('#offerFromSelBtn').addEventListener('click', offerFromSelection);

    // Product modal
    $('#productImage').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try { state.currentImage = await fileToResizedDataURL(file); updateImagePreview(); }
      catch { toast('Could not load image', true); }
    });
    $('#pMode').addEventListener('change', () => { updateDiscountField(); updatePriceHint(); });
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
    $('#addItemInlineBtn').addEventListener('click', addInlineItem);
    $('#pickerAddBtn').addEventListener('click', addPickedToOffer);
    $('#previewBtn').addEventListener('click', openPreview);
    ['#offerTitle', '#offerStore', '#offerFooter', '#offerAccent'].forEach(s =>
      $(s).addEventListener('input', syncOfferFromForm));

    // Export
    $('#exportImgBtn').addEventListener('click', exportPNG);
    $('#exportPdfBtn').addEventListener('click', exportPDF);

    // Settings
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#currencyInput').addEventListener('input', saveSettings);
    $('#defaultStoreInput').addEventListener('input', saveSettings);
    $('#exportDataBtn').addEventListener('click', exportData);
    $('#importDataInput').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); });
    $('#wipeBtn').addEventListener('click', wipeData);

    // Close buttons / backdrop
    $$('[data-close-modal]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.closeModal)));
    $$('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); }));

    // Picker uses select-only cards (no edit button)
  }

  // =========================================================
  //  Init
  // =========================================================
  async function init() {
    bind();
    await loadAll();
    goto('offers');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
