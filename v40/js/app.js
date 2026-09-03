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
    productSort: 'custom',           // custom | name-asc | name-desc | price-asc | price-desc
    offerSort: 'recent',             // recent | name-asc | name-desc
    productOrder: [],                // manual drag order of product ids (custom mode)
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
    { id: 'carbon',   name: 'Carbon' },
    { id: 'apex',     name: 'Apex' },
    { id: 'aurora',   name: 'Aurora' },
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
      showroom: "<rect width='100' height='74' fill='#fff'/><rect x='4' y='4' width='92' height='66' rx='2' fill='none' stroke='#9aa0ad' stroke-width='1.5'/><rect x='11' y='11' width='16' height='9' rx='1' fill='#c7cbd4'/><rect x='34' y='13' width='42' height='5' rx='1' fill='#9aa0ad'/><rect x='11' y='25' width='78' height='1.4' fill='#c7cbd4'/><g fill='#e7e9ef'><rect x='11' y='33' width='24' height='30' rx='2'/><rect x='38' y='33' width='24' height='30' rx='2'/><rect x='65' y='33' width='24' height='30' rx='2'/></g><g fill='#c7cbd4'><rect x='11' y='57' width='24' height='6'/><rect x='38' y='57' width='24' height='6'/><rect x='65' y='57' width='24' height='6'/></g>",
      chevron: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='25' fill='#9aa0ad'/><g fill='#5b6472'><path d='M60 0l12 12l-12 13h9l12-13l-12-12z'/><path d='M74 0l12 12l-12 13h9l12-13l-12-12z'/></g><rect x='6' y='7' width='15' height='11' rx='1' fill='#fff'/><rect x='30' y='9' width='24' height='7' rx='1' fill='#e7e9ef'/><g fill='#5b6472'><path d='M6 31h26l4 5l-4 5H6z'/></g><g fill='#e7e9ef'><rect x='6' y='45' width='26' height='22' rx='1'/><rect x='37' y='45' width='26' height='22' rx='1'/><rect x='68' y='45' width='26' height='22' rx='1'/></g>",
      carbon: "<rect width='100' height='74' fill='#fff'/><rect x='0' y='0' width='100' height='24' fill='#17181d'/><g stroke='rgba(255,255,255,0.06)' stroke-width='1'><path d='M-4 8L8 -4M4 16L16 4M12 24L24 12M20 32L32 20'/></g><rect x='0' y='24' width='100' height='2.5' fill='#9aa0ad'/><rect x='6' y='6' width='15' height='11' rx='1' fill='#fff'/><rect x='40' y='9' width='36' height='7' rx='1' fill='#4b515e'/><rect x='6' y='33' width='34' height='4' fill='#2b303c'/><rect x='6' y='39' width='88' height='1.5' fill='#9aa0ad'/><g fill='#e7e9ef'><rect x='6' y='44' width='26' height='23' rx='1.5'/><rect x='37' y='44' width='26' height='23' rx='1.5'/><rect x='68' y='44' width='26' height='23' rx='1.5'/></g><g fill='#2b303c'><rect x='6' y='60' width='26' height='7'/><rect x='37' y='60' width='26' height='7'/><rect x='68' y='60' width='26' height='7'/></g>",
      apex: "<rect width='100' height='74' fill='#fff'/><path d='M0 0h100v22L0 30z' fill='#9aa0ad'/><path d='M40 0l34 30H100V0z' fill='#7a828f'/><path d='M100 0v13L78 0z' fill='#5b6472'/><rect x='6' y='6' width='15' height='11' rx='1' fill='#fff'/><rect x='28' y='8' width='26' height='7' rx='1' fill='#e7e9ef'/><path d='M6 35h30l-2 8H6z' fill='#5b6472'/><g fill='#e7e9ef'><rect x='6' y='47' width='26' height='20' rx='1.5'/><rect x='37' y='47' width='26' height='20' rx='1.5'/><rect x='68' y='47' width='26' height='20' rx='1.5'/></g><g fill='#5b6472'><path d='M6 47h11l-11 11z'/><path d='M37 47h11l-11 11z'/><path d='M68 47h11l-11 11z'/></g>",
      aurora: "<rect width='100' height='74' fill='#fff'/><path d='M0 0h100v22q-50 16-100 0z' fill='#9aa0ad'/><circle cx='84' cy='6' r='16' fill='#b4bac4'/><circle cx='12' cy='24' r='11' fill='#8b93a4'/><rect x='6' y='7' width='15' height='11' rx='2' fill='#fff'/><rect x='30' y='9' width='24' height='7' rx='2' fill='#e7e9ef'/><rect x='6' y='34' width='30' height='8' rx='4' fill='#5b6472'/><circle cx='11' cy='38' r='1.6' fill='#fff'/><g fill='#e7e9ef'><rect x='6' y='47' width='26' height='20' rx='6'/><rect x='37' y='47' width='26' height='20' rx='6'/><rect x='68' y='47' width='26' height='20' rx='6'/></g><g fill='#c7cbd4'><circle cx='31' cy='48' r='5'/><circle cx='62' cy='48' r='5'/><circle cx='93' cy='48' r='5'/></g>",
    };
    return `<svg viewBox='0 0 100 74' preserveAspectRatio='xMidYMid meet' xmlns='http://www.w3.org/2000/svg'>${T[id] || ''}</svg>`;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const esc = (s) => (s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Icon set (crafted line icons, currentColor) ----------
  const ICON_STROKE = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3.5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 8 5-5 5 5"/><path d="M12 3v12"/>',
    settings: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.8l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7V20a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.8v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    box: '<path d="M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    offers: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    restore: '<path d="M3 3v6h6"/><path d="M3.5 9a9 9 0 1 1-.9 6"/>',
    sort: '<path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5"/>',
  };
  const ICON_FILL = {
    grip: '<circle cx="9" cy="5" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="5" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="15" cy="19" r="1.6"/>',
    brand: '<path d="M12 2 22 12 12 22 2 12Z"/>',
  };
  function icon(name, cls) {
    const c = cls ? ' ' + cls : '';
    if (ICON_FILL[name]) return `<svg class="svg-ico${c}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICON_FILL[name]}</svg>`;
    return `<svg class="svg-ico${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_STROKE[name] || ''}</svg>`;
  }
  window.OM_ICON = icon;   // used to fill icons in static markup

  // Pointer-based drag reorder (touch + mouse) via a drag handle. Reorders DOM
  // live within the same parent; calls onDrop(orderedIds) when released.
  // Smooth Trello-style drag: the item lifts and follows the pointer while a
  // placeholder holds its slot; siblings animate into place with FLIP.
  function makeSortable(container, { itemSel, handleSel, idAttr, grid, onDrop }) {
    const flowNodes = (parent) => $$(':scope > ' + itemSel + ', :scope > .drag-ph', parent).filter((n) => !n.classList.contains('drag-lift'));
    const flipMove = (parent, mutate) => {
      const nodes = flowNodes(parent);
      const first = nodes.map((n) => [n, n.getBoundingClientRect()]);
      mutate();
      first.forEach(([n, f]) => {
        const l = n.getBoundingClientRect();
        const dx = f.left - l.left, dy = f.top - l.top;
        if (!dx && !dy) return;
        n.style.transition = 'none';
        n.style.transform = `translate(${dx}px,${dy}px)`;
        n.getBoundingClientRect();               // force reflow
        requestAnimationFrame(() => { n.style.transition = 'transform .18s cubic-bezier(.2,.8,.2,1)'; n.style.transform = ''; });
      });
    };

    $$(handleSel, container).forEach((handle) => {
      handle.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
      handle.addEventListener('pointerdown', (e) => {
        if (e.button != null && e.button > 0) return;
        const el = handle.closest(itemSel);
        const parent = el && el.parentElement;
        if (!el || !parent) return;
        e.preventDefault(); e.stopPropagation();
        const pid = e.pointerId;
        try { handle.setPointerCapture(pid); } catch (_) {}

        const rect = el.getBoundingClientRect();
        const origCss = el.style.cssText;
        const startX = e.clientX, startY = e.clientY;

        const ph = document.createElement('div');
        ph.className = 'drag-ph';
        ph.style.height = rect.height + 'px';
        if (grid) ph.style.width = rect.width + 'px';
        parent.insertBefore(ph, el);

        el.classList.add('drag-lift');
        el.style.width = rect.width + 'px';
        el.style.height = rect.height + 'px';
        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = rect.top + 'px';
        el.style.margin = '0';
        el.style.pointerEvents = 'none';
        document.body.classList.add('reordering');

        const move = (ev) => {
          ev.preventDefault();
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          el.style.transform = `translate(${dx}px,${dy}px) rotate(2deg) scale(1.02)`;
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const target = under && under.closest(itemSel);
          if (target && target !== el && target.parentElement === parent && !target.classList.contains('drag-lift')) {
            const r = target.getBoundingClientRect();
            let before;
            if (grid) {
              before = ev.clientY < r.top + r.height * 0.35 ? true
                : ev.clientY > r.bottom - r.height * 0.35 ? false
                  : ev.clientX < r.left + r.width / 2;
            } else {
              before = ev.clientY < r.top + r.height / 2;
            }
            const ref = before ? target : target.nextSibling;
            if (ref !== ph && !(ref && ref.previousSibling === ph && before === false)) {
              flipMove(parent, () => parent.insertBefore(ph, ref));
            }
          }
          // edge auto-scroll
          const m = 80;
          if (ev.clientY < m) window.scrollBy(0, -Math.ceil((m - ev.clientY) / 5));
          else if (ev.clientY > innerHeight - m) window.scrollBy(0, Math.ceil((ev.clientY - (innerHeight - m)) / 5));
        };

        const drop = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', drop);
          window.removeEventListener('pointercancel', drop);
          try { handle.releasePointerCapture(pid); } catch (_) {}
          const pr = ph.getBoundingClientRect();
          el.style.transition = 'transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s';
          el.style.transform = `translate(${pr.left - rect.left}px,${pr.top - rect.top}px) rotate(0deg) scale(1)`;
          let done = false;
          const finish = () => {
            if (done) return; done = true;
            el.removeEventListener('transitionend', finish);
            el.classList.remove('drag-lift');
            el.style.cssText = origCss;
            parent.insertBefore(el, ph);
            ph.remove();
            document.body.classList.remove('reordering');
            flowNodes(parent).forEach((n) => { n.style.transition = ''; n.style.transform = ''; });
            const ids = $$(':scope > ' + itemSel, parent).map((n) => n.getAttribute(idAttr));
            onDrop(ids, parent);
          };
          el.addEventListener('transitionend', finish);
          setTimeout(finish, 240);
        };

        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', drop);
        window.addEventListener('pointercancel', drop);
      });
    });
  }

  const DRAG_HANDLE = `<button class="drag-handle" type="button" aria-label="Hold and drag to reorder">${icon('grip')}</button>`;

  function closeAllSortMenus() { $$('.sort-menu').forEach((m) => m.classList.add('hidden')); }
  function updateSortBtn(btnSel, menuSel, val) {
    const menu = $(menuSel);
    if (!menu) return;
    $$('button[data-sort]', menu).forEach((b) => {
      const on = b.dataset.sort === val;
      b.classList.toggle('active', on);
      const has = b.querySelector('.sm-check');
      if (on && !has) b.insertAdjacentHTML('beforeend', `<span class="sm-check">${icon('check')}</span>`);
      else if (!on && has) has.remove();
    });
  }
  function bindSortMenu(btnSel, menuSel, onPick) {
    const btn = $(btnSel), menu = $(menuSel);
    if (!btn || !menu) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains('hidden');
      closeAllSortMenus();
      if (!open) menu.classList.remove('hidden');
    });
    $$('button[data-sort]', menu).forEach((b) => b.addEventListener('click', () => {
      menu.classList.add('hidden');
      onPick(b.dataset.sort);
    }));
  }

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
  function cmpPrice(a, b, dir) {
    const pa = computePricing(a).price, pb = computePricing(b).price;
    if (pa == null && pb == null) return 0;
    if (pa == null) return 1; if (pb == null) return -1;   // no price → last
    return dir * (pa - pb);
  }
  function sortedProducts(list) {
    const arr = [...list];
    switch (state.productSort) {
      case 'name-asc': arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })); break;
      case 'name-desc': arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' })); break;
      case 'price-asc': arr.sort((a, b) => cmpPrice(a, b, 1)); break;
      case 'price-desc': arr.sort((a, b) => cmpPrice(a, b, -1)); break;
      default: { // custom manual order; unordered fall back to newest
        const ord = state.productOrder || [];
        const idx = (id) => { const i = ord.indexOf(id); return i < 0 ? Infinity : i; };
        arr.sort((a, b) => { const ia = idx(a.id), ib = idx(b.id); return ia !== ib ? ia - ib : b.createdAt - a.createdAt; });
      }
    }
    return arr;
  }

  function renderProducts() {
    const grid = $('#productsGrid');
    const empty = $('#productsEmpty');
    const q = (state.productQuery || '').trim().toLowerCase();
    let list = sortedProducts(state.products);
    if (q) list = list.filter(p =>
      ((p.name || '') + ' ' + (p.description || '')).toLowerCase().includes(q));
    if (!state.products.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      $('#productsToolbar').classList.add('hidden');
      return;
    }
    empty.classList.add('hidden');
    updateSortBtn('#productSortBtn', '#productSortMenu', state.productSort);
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:40px 10px"><p>No products match “${esc(q)}”.</p></div>`;
      updateProductsToolbar();
      return;
    }
    const canDrag = state.productSort === 'custom' && !q;
    grid.innerHTML = list.map(p => productCardHTML(p, state.selectedProductIds.has(p.id), true, canDrag)).join('');
    $$('.pcard', grid).forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.drag-handle')) return;
        if (e.target.closest('.pedit')) {
          const p = state.products.find(x => x.id === el.dataset.id);
          if (p) openProductModal(p);
          return;
        }
        if (e.target.closest('.pshare-btn')) {
          const p = state.products.find(x => x.id === el.dataset.id);
          if (p) shareOneProduct(p).then(productShareToast);
          return;
        }
        toggleProductSelect(el.dataset.id);
      });
    });
    if (canDrag) {
      makeSortable(grid, {
        itemSel: '.pcard', handleSel: '.drag-handle', idAttr: 'data-id', grid: true,
        onDrop: (ids) => { state.productOrder = ids; persistProductOrder(); },
      });
    }
    updateProductsToolbar();
  }

  async function persistProductOrder() {
    try { await DB.put('settings', { key: 'productOrder', ids: state.productOrder }); } catch (e) {}
  }

  // Merge identical library products (same name, description, price & discount)
  // into one. Any offers referencing a removed copy are repointed to the survivor
  // so their images and links stay intact.
  async function dedupeLibrary() {
    const norm = (s) => (s == null ? '' : String(s)).trim().toLowerCase().replace(/\s+/g, ' ');
    const keyOf = (p) => [norm(p.name), norm(p.description), norm(p.price), norm(p.discount)].join('');
    const groups = new Map();
    state.products.forEach((p) => {
      const k = keyOf(p);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    const remap = new Map();     // removedId -> survivorId
    const removeIds = new Set();
    const survivors = [];
    groups.forEach((arr) => {
      if (arr.length === 1) { survivors.push(arr[0]); return; }
      // Survivor: prefer one that has an image, then the oldest.
      arr.sort((a, b) => {
        const ai = a.image ? 1 : 0, bi = b.image ? 1 : 0;
        if (ai !== bi) return bi - ai;
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
      survivors.push(arr[0]);
      for (let i = 1; i < arr.length; i++) { remap.set(arr[i].id, arr[0].id); removeIds.add(arr[i].id); }
    });
    if (!removeIds.size) { toast('No duplicates found'); return; }
    if (!confirm(`Merge ${removeIds.size} duplicate product${removeIds.size > 1 ? 's' : ''} into ${survivors.length} unique product${survivors.length > 1 ? 's' : ''}?`)) return;

    // Remove the duplicates from storage and memory.
    for (const id of removeIds) { try { await DB.del('products', id); } catch (e) {} }
    state.products = survivors;

    // Repoint offer items (saved + the one open) from removed ids to survivors.
    for (const o of state.offers) {
      let changed = false;
      (o.items || []).forEach((it) => { if (it.pid && remap.has(it.pid)) { it.pid = remap.get(it.pid); changed = true; } });
      if (changed) { try { await DB.put('offers', offerForDb(o)); } catch (e) {} }
    }
    if (state.offer) (state.offer.items || []).forEach((it) => { if (it.pid && remap.has(it.pid)) it.pid = remap.get(it.pid); });

    // Drop removed ids from the manual product order.
    state.productOrder = (state.productOrder || []).filter((id) => !removeIds.has(id));
    await persistProductOrder();

    renderProducts();
    if (state.offer) renderOfferItems();
    toast(`Removed ${removeIds.size} duplicate${removeIds.size > 1 ? 's' : ''}`);
  }

  function productCardHTML(p, selected, showEdit, drag) {
    const pr = computePricing(p);
    const img = p.image
      ? `<img class="pimg" src="${p.image}" alt="">`
      : `<div class="pimg ph">${icon('box')}</div>`;
    let priceLine = '';
    if (pr.price != null) {
      priceLine = `<span class="pp"><b>${fmt(pr.price)}</b> ${badgeHTML(p, 'pless', 'pnet')}</span>`;
    }
    const editBtn = showEdit ? `<button class="pedit" data-act="edit" aria-label="Edit">${icon('edit')}</button>` : '';
    const shareBtn = showEdit ? `<button class="pshare-btn" data-act="share" aria-label="Share">${icon('share')}</button>` : '';
    const dragBtn = drag ? DRAG_HANDLE : '';
    const desc = p.description ? `<p class="pd">${esc(p.description)}</p>` : '';
    return `<div class="pcard ${selected ? 'selected' : ''}" data-id="${p.id}">
      <div class="check">${icon('check')}</div>${editBtn}${shareBtn}${dragBtn}
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
    const active = state.offers.filter(o => !o.deleted);
    $('#offerSearchWrap').classList.toggle('hidden', active.length === 0);
    if (!active.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    updateSortBtn('#offerSortBtn', '#offerSortMenu', state.offerSort);
    const q = (state.offerQuery || '').trim().toLowerCase();
    const nm = (o) => o.name || o.title || '';
    let offers = active.sort((a, b) =>
      state.offerSort === 'name-asc' ? nm(a).localeCompare(nm(b), undefined, { sensitivity: 'base' })
        : state.offerSort === 'name-desc' ? nm(b).localeCompare(nm(a), undefined, { sensitivity: 'base' })
          : b.updatedAt - a.updatedAt);
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
        : `<div class="oc-noimg">${icon('offers')}</div>`;
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
          <button class="oc-pdf" data-act="preview" title="Preview & export PDF">${icon('download')} PDF</button>
          <button class="icon-btn" data-act="dup" title="Duplicate">${icon('copy')}</button>
          <button class="icon-btn" data-act="edit" title="Edit">${icon('edit')}</button>
          <button class="icon-btn oc-del" data-act="del" title="Delete">${icon('x')}</button>
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

  // Soft delete — moves the offer to "Recently deleted" (restorable in Settings)
  async function deleteOffer(id) {
    const o = state.offers.find(x => x.id === id);
    if (!o) return;
    if (!confirm('Delete this offer?\n\nYou can restore it later from Settings › Recently deleted.')) return;
    o.deleted = true; o.deletedAt = Date.now();
    await DB.put('offers', offerForDb(o));
    renderOffers();
    toast('Moved to Recently deleted');
  }
  async function restoreOffer(id) {
    const o = state.offers.find(x => x.id === id);
    if (!o) return;
    o.deleted = false; o.deletedAt = null; o.updatedAt = Date.now();
    await DB.put('offers', offerForDb(o));
    renderDeletedOffers();
    toast('Offer restored');
  }
  async function purgeOffer(id) {
    if (!confirm('Permanently delete this offer? This cannot be undone.')) return;
    state.offers = state.offers.filter(o => o.id !== id);
    await DB.del('offers', id);
    renderDeletedOffers();
    toast('Offer permanently deleted');
  }
  function renderDeletedOffers() {
    const host = $('#deletedOffers');
    if (!host) return;
    const del = state.offers.filter(o => o.deleted).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    if (!del.length) { host.innerHTML = '<div class="hint-text">No deleted offers.</div>'; return; }
    host.innerHTML = del.map(o => {
      const date = new Date(o.deletedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const n = (o.items || []).length;
      return `<div class="del-row" data-id="${o.id}">
        <div class="del-info"><b>${esc(o.name) || esc(o.title) || 'Untitled offer'}</b><span>${n} item${n === 1 ? '' : 's'} · deleted ${date}</span></div>
        <button class="btn ghost small" data-act="restore">${icon('restore')} Restore</button>
        <button class="btn danger small" data-act="purge" aria-label="Delete permanently">${icon('x')}</button>
      </div>`;
    }).join('');
    $$('.del-row', host).forEach(el => {
      const id = el.dataset.id;
      el.querySelector('[data-act="restore"]').addEventListener('click', () => restoreOffer(id));
      el.querySelector('[data-act="purge"]').addEventListener('click', () => purgeOffer(id));
    });
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

  // One-shot reorder of whole product groups (drag order still editable after).
  function sortGroups(mode) {
    if (!state.offer) return;
    const groups = groupItems(state.offer.items);
    groups.sort(([a], [b]) => mode === 'name-desc'
      ? (b || '').localeCompare(a || '', undefined, { sensitivity: 'base' })
      : (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' }));
    state.offer.items = groups.flatMap(([, g]) => g);
    renderOfferItems();
  }

  // One-shot reorder of the variants within a single product group.
  function sortVariants(gkey, mode) {
    if (!state.offer) return;
    const inGroup = state.offer.items.filter((it) => groupKey(it) === gkey);
    inGroup.sort((a, b) => {
      switch (mode) {
        case 'name-asc': return (a.description || '').localeCompare(b.description || '', undefined, { sensitivity: 'base' });
        case 'name-desc': return (b.description || '').localeCompare(a.description || '', undefined, { sensitivity: 'base' });
        case 'price-asc': return cmpPrice(a, b, 1);
        case 'price-desc': return cmpPrice(a, b, -1);
        default: return 0;
      }
    });
    let qi = 0;
    state.offer.items = state.offer.items.map((it) => groupKey(it) === gkey ? inGroup[qi++] : it);
    renderOfferItems();
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
        const img = it.image ? `<img src="${it.image}" alt="">` : `<div class="oi-ph">${icon('box')}</div>`;
        const price = pr.price != null
          ? `<span class="oi-price"><b>${fmt(pr.price)}</b> ${badgeHTML(it, 'oi-less', 'oi-net')}</span>` : '';
        const label = esc(it.description) || 'Variant';
        return `<div class="oitem" data-iid="${it._iid}">
          ${DRAG_HANDLE}
          ${img}
          <div class="oi-body">
            <h4 class="oi-title">${label}</h4>
            <div class="oi-row">
              ${price || '<span class="oi-price"></span>'}
              <div class="oi-actions">
                <button class="icon-btn" data-act="edit">${icon('edit')}</button>
                <button class="icon-btn" data-act="rm">${icon('x')}</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
      const vsort = gitems.length > 1 ? `<div class="sort-wrap ogroup-sort">
          <button class="icon-btn sort-btn" data-gsort-btn aria-label="Sort variants" title="Sort variants"><span class="ico">${icon('sort')}</span></button>
          <div class="sort-menu hidden">
            <button type="button" data-vsort="name-asc">Name: A to Z</button>
            <button type="button" data-vsort="name-desc">Name: Z to A</button>
            <button type="button" data-vsort="price-asc">Price: low to high</button>
            <button type="button" data-vsort="price-desc">Price: high to low</button>
          </div>
        </div>` : '';
      return `<div class="ogroup" data-gkey="${esc(title)}">
        <div class="ogroup-title">${DRAG_HANDLE}<span>${esc(title) || 'Untitled product'}</span>${vsort}</div>
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
    // Per-group variant sorter
    $$('.ogroup', host).forEach((g) => {
      const gkey = g.dataset.gkey;
      const btn = g.querySelector('[data-gsort-btn]');
      const menu = g.querySelector('.ogroup-sort .sort-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = !menu.classList.contains('hidden');
        closeAllSortMenus();
        if (!open) menu.classList.remove('hidden');
      });
      $$('button[data-vsort]', menu).forEach((b) => b.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.add('hidden');
        sortVariants(gkey, b.dataset.vsort);
      }));
    });
    // Drag reorder: variants within each product group, and whole product groups
    const applyReorder = () => { syncOfferItemsFromDOM(); renderOfferItems(); };
    $$('.ogroup-items', host).forEach(g => makeSortable(g, {
      itemSel: '.oitem', handleSel: ':scope > .oitem > .drag-handle', idAttr: 'data-iid', onDrop: applyReorder,
    }));
    makeSortable(host, {
      itemSel: '.ogroup', handleSel: ':scope > .ogroup > .ogroup-title > .drag-handle', idAttr: 'data-gkey', onDrop: applyReorder,
    });
  }

  // Rebuild state.offer.items from the current DOM order (groups then variants)
  function syncOfferItemsFromDOM() {
    const host = $('#offerItems');
    const byId = new Map(state.offer.items.map((i) => [i._iid, i]));
    const next = [];
    $$('.ogroup', host).forEach((g) => $$('.oitem', g).forEach((oi) => {
      const it = byId.get(oi.dataset.iid);
      if (it) next.push(it);
    }));
    if (next.length === state.offer.items.length) state.offer.items = next;
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

  // Build the storable copy of an offer. Images resolvable from their product
  // are dropped so the Firestore doc stays tiny (Firestore caps a doc at ~1 MB).
  function offerForDb(o) {
    const prodImg = new Map(state.products.map(p => [p.id, p.image]));
    const items = (o.items || []).map((it) => {
      const resolvable = it.pid && prodImg.get(it.pid) && prodImg.get(it.pid) === it.image;
      return {
        _iid: it._iid || uid(), pid: it.pid || '', product: it.product || '', name: '',
        description: it.description || '', price: it.price == null ? '' : it.price,
        discount: it.discount == null ? '' : it.discount,
        image: resolvable ? null : (it.image || null),
      };
    });
    return {
      id: o.id, name: o.name || '', title: o.title || '', footer: o.footer || '',
      accent: o.accent || '#e11d48', designId: o.designId || DEFAULT_DESIGN, colorId: o.colorId || DEFAULT_COLOR,
      cols: [1, 2, 3].includes(o.cols) ? o.cols : DEFAULT_COLS, items,
      createdAt: o.createdAt || Date.now(), updatedAt: o.updatedAt || Date.now(),
      deleted: !!o.deleted, deletedAt: o.deletedAt || null,
    };
  }

  async function saveOffer() {
    syncOfferFromForm();
    state.offer.updatedAt = Date.now();
    const existing = state.offers.find(o => o.id === state.offer.id);
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
      items: memItems, deleted: false, deletedAt: null,
      createdAt: state.offer.createdAt || Date.now(), updatedAt: state.offer.updatedAt || Date.now(),
    };
    if (existing) Object.assign(existing, clean); else state.offers.push(clean);
    state.offer._isNew = false;
    await DB.put('offers', offerForDb(existing || clean));
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
    : `<div class="s-imgwrap"><span class="s-noimg">${icon('box')}</span></div>`;
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
    showroom:  (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    chevron:   (c) => `<header class="hero"><span class="hero-stripe"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    carbon:    (c) => `<header class="hero"><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div></header>${s_body(c)}${s_foot(c)}`,
    apex:      (c) => `<header class="hero"><span class="hero-slash"></span><span class="hero-slash2"></span><span class="hero-corner"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-edge"></span></header>${s_body(c)}${s_foot(c)}`,
    aurora:    (c) => `<header class="hero"><span class="hero-orb1"></span><span class="hero-orb2"></span><span class="hero-swoosh"></span><div class="hero-logo">${s_logo(c)}</div><div class="hero-head"><h1 class="hero-title">${c.title}</h1></div><span class="hero-scoop"></span></header>${s_body(c)}${s_foot(c)}`,
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

  // Phone/tablet? Prefer the native share sheet there; desktop downloads.
  function isMobileLike() {
    try {
      if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') return navigator.userAgentData.mobile;
    } catch (e) {}
    return /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent || '')
      || (navigator.maxTouchPoints > 1 && matchMedia('(pointer:coarse)').matches);
  }

  // Deliver a generated file: share sheet on mobile, immediate download on
  // desktop (and as a fallback if sharing is unavailable or dismissed-with-error).
  async function deliverFile(blob, filename, mime) {
    const download = () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      return 'downloaded';
    };
    let file;
    try { file = new File([blob], filename, { type: mime }); } catch (e) { file = null; }
    const canShare = file && navigator.canShare && navigator.canShare({ files: [file] });
    if (isMobileLike() && canShare) {
      try {
        // Share the file only — no title/text, or some apps (e.g. Viber)
        // send the filename as a separate text message alongside the PDF.
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';   // user closed the sheet
        // any other error (e.g. NotAllowedError) → fall back to a download
      }
    }
    return download();
  }
  const deliverToast = (res, kind) =>
    toast(res === 'shared' ? kind + ' ready to share'
      : res === 'cancelled' ? 'Share cancelled'
      : kind + ' downloaded');

  // ---------- Per-product share (real photo + text caption, one chat post) ----------
  // navigator.share({ files, text }) hands the target BOTH the photo and the
  // caption; WhatsApp/Viber/Messenger attach the text to the image as its caption
  // (a single post). The key is to gate on canShare({ files }) — NOT
  // canShare({ files, text }), which some browsers report false for, and then
  // still pass the text in the share() call.
  const productSlug = (p) => ((p && p.name) || 'product').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'product';
  const productShareToast = (res) => {
    if (res === 'error') return;
    toast(res === 'shared' ? 'Ready to share' : res === 'cancelled' ? 'Share cancelled' : 'Photo saved · caption copied');
  };

  // The caption that rides with the photo (title, detail, price + discount, stock).
  function productCaption(p) {
    const pr = computePricing(p);
    const blocks = [];
    if (p.name) blocks.push(p.name.trim());
    if (p.description) blocks.push(p.description.trim());
    if (pr.price != null) {
      const less = lessPct(p);
      blocks.push(less != null ? `${fmt(pr.price)}\nLess ${less}%` : `${fmt(pr.price)}\nNet price`);
    }
    blocks.push('Limited stock only');
    return blocks.join('\n\n');
  }

  function dataURLtoBlob(dataURL) {
    const [head, b64] = String(dataURL).split(',');
    const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
    const bin = atob(b64 || '');
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  }

  // Share one product as its own post: the real photo with the caption attached.
  // 'shared' | 'cancelled' | 'downloaded' | 'error'.
  async function shareOneProduct(p) {
    const caption = productCaption(p);
    try {
      let file = null, blob = null, ext = 'jpg';
      if (p.image) {
        blob = dataURLtoBlob(p.image);
        const mime = blob.type || 'image/jpeg';
        ext = /png/i.test(mime) ? 'png' : /webp/i.test(mime) ? 'webp' : 'jpg';
        try { file = new File([blob], productSlug(p) + '.' + ext, { type: mime }); } catch (e) {}
      }
      if (isMobileLike() && navigator.share) {
        // Gate on files only, then send photo + caption together in one call.
        const canFiles = file && navigator.canShare && navigator.canShare({ files: [file] });
        const payload = canFiles ? { files: [file], text: caption } : { text: caption };
        try { await navigator.share(payload); return 'shared'; }
        catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; /* else fall back */ }
      }
      // Desktop / no share: save the photo and copy the caption so it can be pasted.
      if (blob) downloadBlob(blob, productSlug(p) + '.' + ext);
      try { await navigator.clipboard.writeText(caption); } catch (e) {}
      return 'downloaded';
    } catch (e) { console.error(e); toast('Share failed', true); return 'error'; }
  }

  // Share several products — each posted individually. On mobile a small queue
  // steps through them (one native share sheet per product, each needing its own
  // tap so the browser honours the share gesture); desktop downloads each in turn.
  let shareQueue = [], shareIdx = 0, shareBusy = false;
  async function shareProducts(list) {
    if (!list.length) return;
    if (list.length === 1) { const r = await shareOneProduct(list[0]); productShareToast(r); return; }
    if (!isMobileLike()) {
      for (const p of list) { await shareOneProduct(p); }
      toast(`${list.length} photos saved`);
      return;
    }
    shareQueue = list.slice(); shareIdx = 0;
    renderShareStep();
    openModal('shareModal');
  }
  function renderShareStep() {
    const total = shareQueue.length;
    if (shareIdx >= total) {
      closeModal('shareModal');
      toast(`Shared ${total} product${total > 1 ? 's' : ''}`);
      shareQueue = []; shareIdx = 0;
      return;
    }
    const p = shareQueue[shareIdx];
    $('#shareProgress').textContent = `Product ${shareIdx + 1} of ${total}`;
    const img = p.image ? `<img src="${p.image}" alt="">` : `<span class="sq-noimg">${icon('box')}</span>`;
    const pr = computePricing(p);
    const price = pr.price != null ? `<span class="sq-price">${fmt(pr.price)}</span>` : '';
    $('#shareQueue').innerHTML = `<div class="sq-thumb">${img}</div><div class="sq-meta"><p class="sq-name">${esc(p.name) || 'Product'}</p>${price}</div>`;
    $('#shareNextBtn').innerHTML = `${icon('share')} Share this product`;
  }
  async function shareStepGo() {
    if (shareBusy) return;
    shareBusy = true;
    try { await shareOneProduct(shareQueue[shareIdx]); }
    finally { shareBusy = false; }
    shareIdx++;
    renderShareStep();
  }
  function shareStepSkip() { shareIdx++; renderShareStep(); }

  async function exportPNG() {
    const wrap = offscreenSheet();
    try {
      toast('Rendering image…');
      const canvas = await html2canvas(wrap.querySelector('.sheet'), { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const res = await deliverFile(blob, safeName() + '.png', 'image/png');
      deliverToast(res, 'PNG');
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
      const res = await deliverFile(pdf.output('blob'), safeName() + '.pdf', 'application/pdf');
      deliverToast(res, 'PDF');
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
      ? 'Cloud Firestore — connected'
      : 'On-device only — add your Firebase config in js/firebase-config.js to sync.';
    renderDeletedOffers();
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
    try { const po = await DB.get('settings', 'productOrder'); state.productOrder = (po && po.ids) || []; } catch (e) { state.productOrder = []; }
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
    bindSortMenu('#productSortBtn', '#productSortMenu', (s) => { state.productSort = s; renderProducts(); });
    bindSortMenu('#offerSortBtn', '#offerSortMenu', (s) => { state.offerSort = s; renderOffers(); });
    bindSortMenu('#offerItemsSortBtn', '#offerItemsSortMenu', (s) => sortGroups(s));
    document.addEventListener('click', () => closeAllSortMenus());
    $('#pickerSearch').addEventListener('input', (e) => { state.pickerQuery = e.target.value; renderPicker(); });
    $('#offerFromSelBtn').addEventListener('click', offerFromSelection);
    $('#shareSelBtn').addEventListener('click', () => {
      const picked = sortedProducts(state.products).filter(p => state.selectedProductIds.has(p.id));
      if (picked.length) shareProducts(picked);
    });
    $('#shareNextBtn').addEventListener('click', shareStepGo);
    $('#shareSkipBtn').addEventListener('click', shareStepSkip);

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
    $('#dedupeBtn').addEventListener('click', dedupeLibrary);

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
    rows.push(`<button class="btn primary block" data-gov="">${icon('check')} Latest version</button>`);
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
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    const vp = $('#verPill'); if (vp) { vp.textContent = 'v' + APP_VER; }
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
