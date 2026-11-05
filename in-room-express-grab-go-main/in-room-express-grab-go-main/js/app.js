// MANA In-Room Dining — main app (vanilla JS, no build step)
(function () {
  'use strict';

  const C = window.CONFIG, I18N = window.I18N;
  const LOCAL_PHOTOS = new Set(window.LOCAL_PHOTOS || []);
  const STAGED_KEY = 'mana_menu_imgs', CART_KEY = 'mana_cart', LANG_KEY = 'mana_lang';
  const DEV_FLAG = 'mana_dev_active', DEV_CRED = 'mana_dev_cred';

  // ---------- small utils ----------
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = s => String(s || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F3FB}-\u{1F3FF}️]/gu, '').trim();
  const baht = n => '฿' + Number(n).toLocaleString('en-US');
  const fixed = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const store = {
    get(area, k, def) { try { const v = window[area].getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(area, k, v) { try { window[area].setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(area, k) { try { window[area].removeItem(k); } catch (e) { /* ignore */ } }
  };
  function newOrderId() {
    const d = new Date(), z = n => String(n).padStart(2, '0');
    return 'MN' + String(d.getFullYear()).slice(2) + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  const ICON = {
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    minus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    upload: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>',
    download: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    camera: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>'
  };

  // ---------- state ----------
  const params = new URLSearchParams(location.search);
  const qrRoom = (params.get('room') || '').trim();
  const initialLang = (() => {
    const p = params.get('lang'), saved = store.get('localStorage', LANG_KEY, null);
    if (I18N[p]) return p;
    if (I18N[saved]) return saved;
    const n = (navigator.language || 'en').toLowerCase();
    return n.startsWith('th') ? 'th' : n.startsWith('zh') ? 'zh' : 'en';
  })();

  const S = {
    menu: [], menuState: 'loading',
    lang: initialLang, cat: 'ALL', q: '',
    cart: store.get('sessionStorage', CART_KEY, {}),
    dish: null, dq: 1, dnotes: [], dtext: '',
    screen: 'menu', room: qrRoom, name: '', pay: 'qr', slip: null, err: '', sending: false, pendingOrderId: null,
    rc: null,
    remote: {}, staged: store.get('localStorage', STAGED_KEY, {}), failed: {},
    dev: store.get('sessionStorage', DEV_FLAG, false) === true, devLogin: false,
    saving: false, saveDone: 0, saveTotal: 0, crop: null, cz: 1
  };
  const layout = ['grid', 'list', 'editorial'].includes(params.get('layout')) ? params.get('layout') : 'grid';
  const theme = ['classical', 'original'].includes(params.get('theme')) ? params.get('theme') : 'classical';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.layout = layout;

  const t = () => I18N[S.lang];
  const byId = () => { if (byId._m !== S.menu) { byId._m = S.menu; byId._v = {}; S.menu.forEach(i => { byId._v[i.id] = i; }); } return byId._v; };
  const count = () => Object.values(S.cart).reduce((a, c) => a + c.qty, 0);
  const total = () => { const m = byId(); return Object.entries(S.cart).reduce((s, [id, c]) => s + (m[id] ? m[id].price * c.qty : 0), 0); };
  const saveCart = () => store.set('sessionStorage', CART_KEY, S.cart);

  function names(i) {
    const L = S.lang, th = i.name_th || i.name, en = i.name_en || '', zh = i.name_zh || '';
    const title = L === 'th' ? th : L === 'en' ? (en || th) : (zh || en || th);
    const alts = [th, en, zh].filter((x, k, a) => x && x !== title && a.indexOf(x) === k);
    return { title, alts, sub: alts[0] || '' };
  }
  const imgOf = i => S.remote[i.id] || S.staged[i.id] || (LOCAL_PHOTOS.has(i.id) ? 'images/' + i.id + '.jpg?v=5' : '') || i.image || '';
  const hasImg = i => !!imgOf(i) && !S.failed[i.id];

  function media(i, cls) {
    if (!hasImg(i)) return `<span class="ph ${cls}">${esc(i.id)}</span>`;
    const rot = Menu.rotateCW(i) ? ' rot' : '';
    return `<span class="media ${cls}"><img src="${esc(imgOf(i))}" alt="" loading="lazy" decoding="async" class="${rot}" data-img-id="${esc(i.id)}"></span>`;
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  // ---------- render: menu ----------
  function renderHeader() {
    const T = t();
    document.documentElement.lang = S.lang === 'zh' ? 'zh-Hans' : S.lang;
    document.title = 'MANA · ' + T.title;
    $('#hdr-title').textContent = T.title;
    $('#hdr-room').textContent = qrRoom ? T.room + ' ' + qrRoom + ' · ' + T.viaQr : '';
    $('#hdr-room').hidden = !qrRoom;
    $('#q').placeholder = T.search;
    $('#q').setAttribute('aria-label', T.search);
    document.querySelectorAll('[data-lang-switch]').forEach(box => {
      box.innerHTML = [['th', 'TH'], ['en', 'EN'], ['zh', '中文']].map(([k, label]) =>
        `<button type="button" data-action="lang" data-v="${k}" aria-pressed="${S.lang === k}" class="${S.lang === k ? 'on' : ''}">${label}</button>`).join('');
    });
  }

  function filtered() {
    const q = S.q.trim().toLowerCase();
    return S.menu.filter(i => (S.cat === 'ALL' || i.desc === S.cat) && (!q ||
      i.name.toLowerCase().includes(q) || (i.name_en || '').toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || (i.name_zh || '').includes(S.q.trim())));
  }
  const catList = () => ['ALL', ...new Set(S.menu.map(i => i.desc))];

  let catsKey = '';
  function renderCats() {
    const box = $('#cats');
    const list = catList(), key = S.lang + '|' + list.join('|');
    if (key !== catsKey) {
      catsKey = key;
      box.innerHTML = list.map((c, k) => `<button type="button" data-action="cat" data-k="${k}">${esc(c === 'ALL' ? t().all : clean(c))}</button>`).join('');
    }
    box.querySelectorAll('button').forEach((b, k) => { const on = list[k] === S.cat; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    updateArrows(box, '#cats-prev', '#cats-next');
  }

  let picksKey = '';
  function renderPicks() {
    const sec = $('#picks');
    const show = layout !== 'editorial' && S.cat === 'ALL' && !S.q.trim();
    const picks = S.menu.filter(i => Menu.isRec(i) && hasImg(i)).slice(0, 8);
    sec.hidden = !show || !picks.length;
    if (sec.hidden) return;
    $('#picks-title').textContent = t().picks;
    $('#picks-by').textContent = t().byChef;
    const key = S.lang + '|' + picks.map(i => i.id + imgOf(i)).join('|');
    if (key !== picksKey) {
      picksKey = key;
      $('#picks-row').innerHTML = picks.map(i => `<button type="button" class="pick" data-action="open" data-id="${esc(i.id)}">
        ${media(i, 'pick-img')}<span class="pick-title">${esc(names(i).title)}</span><span class="price">${baht(i.price)}</span></button>`).join('');
    }
    updateArrows($('#picks-row'), '#picks-prev', '#picks-next');
  }

  function itemQty(i) { const c = S.cart[i.id]; return c ? c.qty : 0; }
  function addBadge(i, cls) {
    const q = itemQty(i);
    return `<span class="add ${cls} ${q ? 'on' : ''}" aria-hidden="true">${q ? '×' + q : '+'}</span>`;
  }
  const devBadge = () => S.dev ? `<span class="dev-badge">${ICON.camera}${esc(t().editImg)}</span>` : '';
  const itemLabel = i => { const q = itemQty(i); return names(i).title + ', ' + baht(i.price) + (q ? ' ×' + q : ''); };

  function renderItems() {
    const box = $('#items'), T = t();
    if (S.menuState === 'loading') { box.innerHTML = `<p class="state">${esc(T.loading)}</p>`; return; }
    if (S.menuState === 'error') { box.innerHTML = `<p class="state err">${esc(T.loadFail)}</p>`; return; }
    const list = filtered();
    if (!list.length) { box.innerHTML = `<p class="state">${esc(T.empty)}</p>`; return; }

    if (layout === 'grid') {
      box.innerHTML = `<div class="grid">${list.map(i => { const n = names(i); return `
        <button type="button" class="card" data-action="open" data-id="${esc(i.id)}" aria-label="${esc(itemLabel(i))}">
          <span class="card-media">${media(i, 'card-img')}${devBadge()}</span>
          <span class="card-body"><span class="card-title">${esc(n.title)}</span><span class="sub">${esc(n.sub)}</span>
          <span class="card-foot"><span class="price">${baht(i.price)}</span>${addBadge(i, '')}</span></span>
        </button>`; }).join('')}</div>`;
    } else if (layout === 'list') {
      box.innerHTML = `<div class="list">${list.map(i => { const n = names(i); return `
        <button type="button" class="row" data-action="open" data-id="${esc(i.id)}" aria-label="${esc(itemLabel(i))}">
          <span class="row-text"><span class="kicker">${esc(clean(i.desc))}</span><span class="row-title">${esc(n.title)}</span>
          <span class="sub">${esc(n.sub)}</span><span class="price">${baht(i.price)}</span></span>
          <span class="row-media">${media(i, 'row-img')}${addBadge(i, 'float')}${devBadge()}</span>
        </button>`; }).join('')}</div>`;
    } else {
      const all = catList(), groups = [], gm = {};
      list.forEach(i => { if (!gm[i.desc]) { gm[i.desc] = []; groups.push(i.desc); } gm[i.desc].push(i); });
      const qn = i => itemQty(i) ? ' · ×' + itemQty(i) : '';
      box.innerHTML = groups.map(g => {
        const items = gm[g], hero = items.find(hasImg);
        const rows = items.filter(i => i !== hero).map(i => { const n = names(i); return `
          <button type="button" class="ed-row" data-action="open" data-id="${esc(i.id)}" aria-label="${esc(itemLabel(i))}">
            <span class="leader"><span>${esc(n.title)}</span><span class="dots"></span><span class="price">${baht(i.price)}</span></span>
            <span class="sub it">${esc(n.sub)}${qn(i)}</span></button>`; }).join('');
        const heroHtml = hero ? (() => { const n = names(hero); return `
          <button type="button" class="ed-hero" data-action="open" data-id="${esc(hero.id)}" aria-label="${esc(itemLabel(hero))}">
            ${media(hero, 'hero-img')}${devBadge()}
            <span class="leader"><span class="hero-title">${esc(n.title)}</span><span class="dots"></span><span class="price">${baht(hero.price)}</span></span>
            <span class="sub it">${esc(n.sub)}${qn(hero)}</span></button>`; })() : '';
        return `<section class="ed-group"><h2 class="ed-head"><span class="ed-num">${String(all.indexOf(g)).padStart(2, '0')}</span>
          <span class="ed-name">${esc(clean(g))}</span><span class="ed-count">${items.length}</span></h2>${heroHtml}${rows}</section>`;
      }).join('');
    }
  }

  function renderBar() {
    const n = count(), bar = $('#cartbar');
    bar.hidden = !(S.screen === 'menu' && n > 0);
    if (bar.hidden) return;
    $('#bar-count').textContent = t().item(n);
    $('#bar-total').textContent = baht(total());
    $('#bar-go').textContent = t().review;
  }

  // ---------- render: dish sheet ----------
  function renderDish() {
    const wrap = $('#dish'), i = S.dish ? byId()[S.dish] : null;
    wrap.hidden = !i;
    document.body.classList.toggle('lock', !!i || S.devLogin || !!S.crop);
    if (!i) return;
    const T = t(), n = names(i), inCart = !!S.cart[i.id];
    const cta = S.dq === 0 ? T.remove : inCart ? T.update : T.add;
    $('#dish-body').innerHTML = `
      <div class="dish-media">${hasImg(i) ? media(i, 'dish-img') : `<span class="ph dish-img">${esc(i.id)} · ${esc(T.photoSoon)}</span>`}
        <button type="button" class="icon-btn dish-close" data-action="dish-close" aria-label="${esc(T.close)}">${ICON.close}</button></div>
      <div class="dish-info"><div class="kicker">${esc(clean(i.desc))}</div>
        <h2 class="dish-title" id="dish-title">${esc(n.title)}</h2>
        ${n.alts.map(a => `<div class="sub it">${esc(a)}</div>`).join('')}
        <div class="price big">${baht(i.price)}</div></div>
      <hr class="rule">
      <div class="dish-notes"><div class="kicker">${esc(T.notes)}</div>
        <div class="chips">${T.quick.map((q, k) => `<button type="button" class="chip ${S.dnotes.includes(k) ? 'on' : ''}" aria-pressed="${S.dnotes.includes(k)}" data-action="dish-note" data-k="${k}">${esc(q)}</button>`).join('')}</div>
        <textarea id="dish-text" rows="2" maxlength="200" placeholder="${esc(T.notesPh)}" aria-label="${esc(T.notes)}">${esc(S.dtext)}</textarea></div>`;
    $('#dish-foot').innerHTML = `
      <div class="stepper big" role="group"><button type="button" data-action="dish-dec" aria-label="−">${ICON.minus}</button>
        <span aria-live="polite">${S.dq}</span><button type="button" data-action="dish-inc" aria-label="+">${ICON.plus}</button></div>
      <button type="button" class="btn primary grow" data-action="dish-commit"><span>${esc(cta)}</span>${S.dq ? `<span class="num">· ${baht(i.price * S.dq)}</span>` : ''}</button>`;
  }

  // ---------- render: checkout ----------
  let qrCache = { amt: null, node: null };
  function qrNode(amt) {
    if (qrCache.amt === amt && qrCache.node) return qrCache.node;
    if (typeof QRCode === 'undefined') return null;
    const el = document.createElement('div');
    el.className = 'qr-code';
    new QRCode(el, { text: PromptPay.payload(C.merchantQr, amt), width: 392, height: 392, correctLevel: QRCode.CorrectLevel.M });
    qrCache = { amt, node: el };
    return el;
  }

  function renderCheckout() {
    const box = $('#checkout');
    box.hidden = S.screen !== 'checkout';
    if (box.hidden) return;
    const T = t(), m = byId(), tot = total();
    const noteText = c => [...c.notes.map(k => T.quick[k]), c.text].filter(Boolean).join(' · ');
    const lines = Object.entries(S.cart).filter(([id]) => m[id]).map(([id, c]) => `
      <div class="line"><div class="line-text"><span>${esc(names(m[id]).title)}</span>
        ${noteText(c) ? `<span class="sub it">${esc(noteText(c))}</span>` : ''}
        <button type="button" class="link" data-action="line-edit" data-id="${esc(id)}">${esc(T.editNote)}</button></div>
        <div class="line-right"><span class="num">${baht(m[id].price * c.qty)}</span>
          <div class="stepper" role="group"><button type="button" data-action="line-dec" data-id="${esc(id)}" aria-label="−">${ICON.minus}</button>
          <span>${c.qty}</span><button type="button" data-action="line-inc" data-id="${esc(id)}" aria-label="+">${ICON.plus}</button></div></div></div>`).join('');
    const payOpts = [['qr', T.qr, T.qrSub], ['alipay', T.ali, T.aliSub], ['store', T.store, T.storeSub]].map(([k, label, sub]) => `
      <button type="button" class="pay-opt ${S.pay === k ? 'on' : ''}" role="radio" aria-checked="${S.pay === k}" data-action="pay" data-v="${k}"${k === 'alipay' ? ' disabled aria-disabled="true"' : ''}>
        <span class="radio"><span></span></span><span class="pay-text"><span class="pay-label">${esc(label)}</span><span class="sub">${esc(sub)}</span></span></button>`).join('');
    let payPanel = '';
    if (S.pay === 'qr') payPanel = `
      <div class="panel center"><div class="qr-band">THAI QR PAYMENT · PromptPay</div><div id="qr-slot" class="qr-slot"></div>
        <div>${esc(T.amount)} <span class="price big num">${fixed(tot)}</span> THB</div>
        <div class="sub small">${esc(T.acct)}</div>
        <button type="button" class="btn outline block" data-action="save-qr">${ICON.download}${esc(T.saveQr)}</button></div>
      <div class="slip"><div class="slip-head"><span class="tag">${esc(T.afterPay)}</span>${esc(T.slip)}</div>
        <label class="slip-drop ${S.slip ? 'has' : ''}">
          ${S.slip ? `<img src="${esc(S.slip.url)}" alt="" class="slip-thumb"><span class="slip-name"><span>${esc(S.slip.name)}</span><span class="link">${esc(T.change)}</span></span><span class="ok">${ICON.check}</span>`
                   : `${ICON.upload}<span>${esc(T.tapUpload)}</span>`}
          <input type="file" id="slip-input" accept="image/*" class="sr-only"></label></div>`;
    else if (S.pay === 'alipay') payPanel = `<div class="panel center"><div class="qr-band ali">ALIPAY</div><p class="err-text">${esc(T.aliNA)}</p></div>`;
    else payPanel = `<div class="panel center"><p>${esc(T.storeMsg)}</p><div>${esc(T.amount)}: <span class="price big num">${fixed(tot)}</span> THB</div></div>`;

    box.innerHTML = `
      <header class="sub-hdr"><button type="button" class="icon-btn" data-action="go-menu" aria-label="${esc(T.back)}">${ICON.left}</button>
        <h1 class="sub-title">${esc(T.yourOrder)}</h1><div class="langs" data-lang-switch></div></header>
      <div class="co-body">
        <section><div class="kicker">${esc(T.deliverTo)}</div>
          <div class="panel">
            <div class="room-row"><label class="field grow"><span class="lbl">${esc(T.roomL)}</span>
              <input id="room" class="room-input" value="${esc(S.room)}" placeholder="${esc(T.roomPh)}" autocomplete="off" maxlength="40" required></label>
              ${qrRoom && S.room === qrRoom ? `<span class="from-qr">${ICON.check}${esc(T.fromQr)}</span>` : ''}</div>
            <label class="field"><span class="lbl">${esc(T.guest)}</span>
              <input id="guest" value="${esc(S.name)}" placeholder="${esc(T.guestPh)}" autocomplete="name" maxlength="60"></label>
          </div></section>
        <section><div class="sec-head"><span class="kicker">${esc(T.orderItems)}</span><span class="sub">${esc(T.item(count()))}</span></div>
          ${lines}
          <div class="total-row"><span>${esc(T.total)}</span><span class="price num">${baht(tot)}</span></div></section>
        <section><div class="kicker">${esc(T.payment)}</div><div class="pay-opts" role="radiogroup" aria-label="${esc(T.payment)}">${payOpts}</div></section>
        ${payPanel}
      </div>
      <footer class="co-foot">
        <p class="err-text" role="alert" ${S.err ? '' : 'hidden'}>${esc(S.err)}</p>
        <button type="button" class="btn primary block lg" data-action="place" ${S.sending ? 'disabled aria-busy="true"' : ''}>${esc(S.sending ? T.sending : T.place + ' · ' + baht(tot))}</button>
      </footer>`;
    renderHeader();
    const slot = $('#qr-slot');
    if (slot) {
      const node = qrNode(tot);
      if (node) slot.appendChild(node);
      else setTimeout(() => { if (S.screen === 'checkout') renderCheckout(); }, 500); // QR lib still loading
    }
  }

  // ---------- render: receipt ----------
  function receiptData() {
    const r = S.rc, T = t();
    return {
      orderId: r.orderId, room: r.room, name: r.name,
      timeStr: r.time.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }),
      items: r.items.map(i => ({ label: names(i.item).title + ' ×' + i.qty, amount: fixed(i.price * i.qty) })),
      total: fixed(r.total), totalLabel: r.pay === 'store' ? T.dueLabel : T.totalLabel,
      payText: r.pay === 'store' ? T.payStore : r.pay === 'alipay' ? T.payAli : T.payQr,
      foot: r.pay === 'store' ? T.footStore : T.footQr
    };
  }

  function renderReceipt() {
    const box = $('#receipt');
    box.hidden = !(S.screen === 'receipt' && S.rc);
    if (box.hidden) return;
    const T = t(), d = receiptData();
    const labels = T.steps.slice();
    if (S.rc.pay === 'store') labels[1] = T.stepStore;
    // Only "received" is confirmed by the system; later steps are shown as upcoming.
    const steps = labels.map((label, k) => `<li class="${k === 0 ? 'done' : ''}"><span class="dot"></span><span class="step-label">${esc(label)}</span>
      <span class="sub num">${k === 0 ? esc(S.rc.time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })) : ''}</span></li>`).join('');
    box.innerHTML = `
      <div class="rc-top"><div class="langs" data-lang-switch></div></div>
      <div class="rc-hero"><div class="rc-check">${ICON.check}</div><h1 class="rc-title">${esc(T.received)}</h1>
        <div class="sub">${esc(T.orderNo)} <strong class="num">${esc(d.orderId)}</strong> · ${esc(T.roomL)} ${esc(d.room)}</div></div>
      <ol class="panel steps">${steps}</ol>
      <p class="sub small center">${esc(T.stepHint)}</p>
      <div class="panel slip-receipt">
        <div class="rc-brand"><div class="rc-brand-name">MANA RATCHAYOTHIN</div><div class="sub small">In-Room Dining · Order Receipt</div></div>
        <div class="kv"><span>${esc(T.orderNo)}</span><span class="num">${esc(d.orderId)}</span></div>
        <div class="kv"><span>${esc(T.date)}</span><span>${esc(d.timeStr)}</span></div>
        <div class="kv"><span>${esc(T.roomL)}</span><span>${esc(d.room)}</span></div>
        ${d.name ? `<div class="kv"><span>${esc(T.guestR)}</span><span>${esc(d.name)}</span></div>` : ''}
        <div class="rc-items">${d.items.map(i => `<div class="kv"><span>${esc(i.label)}</span><span class="num">${i.amount}</span></div>`).join('')}</div>
        <div class="kv strong"><span>${esc(d.totalLabel)}</span><span class="num">${d.total} THB</span></div>
        <div class="kv"><span>${esc(T.payment)}</span><span>${esc(d.payText)}</span></div>
        <p class="sub small center">${esc(d.foot)}</p></div>
      <div class="rc-actions"><button type="button" class="btn outline grow" data-action="save-receipt">${esc(T.saveReceipt)}</button>
        <button type="button" class="btn primary grow" data-action="order-more">${esc(T.orderMore)}</button></div>`;
    renderHeader();
  }

  // ---------- render: developer tools ----------
  function renderDev() {
    const T = t(), bar = $('#devbar'), n = Object.keys(S.staged).length;
    bar.hidden = !S.dev;
    document.body.classList.toggle('dev', S.dev);
    if (S.dev) {
      bar.innerHTML = `<span class="dev-dot"></span><span class="dev-msg">${esc(T.devBar)}</span>
        ${S.saving ? `<span class="num">${esc(T.saving.replace('{d}', S.saveDone).replace('{n}', S.saveTotal))}</span>`
          : n ? `<button type="button" class="link" data-action="dev-reset">${esc(T.devReset)}</button>
                 <button type="button" class="dev-btn" data-action="dev-save">${esc(T.saveAll.replace('{n}', n))}</button>` : ''}
        <button type="button" class="dev-btn" data-action="dev-logout">${esc(T.devLogout)}</button>`;
    }
    const login = $('#devlogin');
    if (S.devLogin && login.hidden) {
      login.hidden = false;
      $('#dev-hint').textContent = T.devHint;
      $('#dev-err').textContent = T.devErr;
      $('#dev-err').hidden = true;
      $('#dev-cancel').textContent = T.cancel;
      $('#dev-submit').textContent = T.login;
      $('#dev-u').value = ''; $('#dev-p').value = '';
      setTimeout(() => $('#dev-u').focus(), 30);
    } else if (!S.devLogin) login.hidden = true;

    const crop = $('#crop');
    crop.hidden = !S.crop;
    if (S.crop) {
      $('#crop-title').textContent = T.cropTitle;
      $('#crop-id').textContent = S.crop.id;
      $('#crop-hint').textContent = T.cropHint;
      $('#crop-cancel').textContent = T.cancel;
      $('#crop-save').textContent = T.cropSave;
      $('#crop-zoom').value = S.cz;
      drawCrop();
    }
  }

  function render() {
    renderHeader();
    const onMenu = S.screen === 'menu';
    $('#menu').hidden = !onMenu;
    if (onMenu) { renderPicks(); renderCats(); renderItems(); }
    renderBar(); renderCheckout(); renderReceipt(); renderDish(); renderDev();
  }

  // ---------- carousels ----------
  function updateArrows(el, prevSel, nextSel) {
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    $(prevSel).hidden = !(el.scrollLeft > 4);
    $(nextSel).hidden = !(el.scrollLeft < max - 4);
  }
  function wireCarousel(el, prevSel, nextSel, step) {
    el.addEventListener('scroll', () => updateArrows(el, prevSel, nextSel), { passive: true });
    el.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }, { passive: false });
    $(prevSel).addEventListener('click', () => el.scrollBy({ left: -step(el), behavior: 'smooth' }));
    $(nextSel).addEventListener('click', () => el.scrollBy({ left: step(el), behavior: 'smooth' }));
    new ResizeObserver(() => updateArrows(el, prevSel, nextSel)).observe(el);
  }
  function centerActiveCat() {
    const el = $('#cats'), b = el.querySelector('button.on');
    if (b) el.scrollTo({ left: b.offsetLeft - (el.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
  }

  // ---------- navigation ----------
  let menuScrollY = 0;
  function go(screen, mode) {
    if (S.screen === 'menu' && screen !== 'menu') menuScrollY = window.scrollY;
    S.screen = screen;
    const hash = screen === 'menu' ? '' : '#' + screen;
    const url = location.pathname + location.search + hash;
    if (mode === 'push') history.pushState({ screen }, '', url);
    else if (mode === 'replace') history.replaceState({ screen }, '', url);
    render();
    window.scrollTo(0, screen === 'menu' ? menuScrollY : 0);
  }
  window.addEventListener('popstate', () => {
    const h = location.hash.slice(1);
    const target = h === 'checkout' && count() ? 'checkout' : h === 'receipt' && S.rc ? 'receipt' : 'menu';
    S.dish = null;
    go(target);
  });

  // ---------- cart ----------
  function setQty(id, q) {
    if (q <= 0) delete S.cart[id];
    else S.cart[id] = { ...(S.cart[id] || { notes: [], text: '' }), qty: q };
    S.pendingOrderId = null;
    saveCart();
    if (S.screen === 'checkout' && !count()) go('menu', 'replace');
    else render();
  }
  function openDish(id) {
    const c = S.cart[id];
    S.dish = id; S.dq = c ? c.qty : 1; S.dnotes = c ? c.notes.slice() : []; S.dtext = c ? c.text : '';
    render();
    setTimeout(() => { const b = $('#dish .dish-close'); if (b) b.focus({ preventScroll: true }); }, 30);
  }
  function commitDish() {
    if (S.dq <= 0) delete S.cart[S.dish];
    else S.cart[S.dish] = { qty: S.dq, notes: S.dnotes.slice(), text: S.dtext.trim() };
    S.dish = null; S.pendingOrderId = null;
    saveCart();
    if (S.screen === 'checkout' && !count()) go('menu', 'replace');
    else render();
  }

  // ---------- images ----------
  function compressImage(file, max = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the slip image')); };
      img.src = url;
    });
  }

  // ---------- order ----------
  async function placeOrder() {
    const T = t();
    if (S.sending) return;
    if (!S.room.trim()) { S.err = T.needRoom; renderCheckout(); $('#room').focus(); return; }
    if (S.pay === 'alipay') { S.err = T.needAli; renderCheckout(); return; }
    if (S.pay === 'qr' && !S.slip) { S.err = T.needSlip; renderCheckout(); return; }

    const m = byId(), EN = I18N.en;
    const items = Object.entries(S.cart).filter(([id]) => m[id]).map(([id, c]) => ({
      id, item: m[id], name: m[id].name, en: m[id].name_en || m[id].name, qty: c.qty, price: m[id].price,
      note: [...c.notes.map(k => EN.quick[k]), c.text].filter(Boolean).join(', ')
    }));
    const tot = total(), room = S.room.trim(), name = S.name.trim();
    // Same ID across retries of an unchanged cart, so the kitchen can spot duplicates
    const orderId = S.pendingOrderId || (S.pendingOrderId = newOrderId());
    const payload = {
      room: name ? `${room} (${name})` : room,
      menu: items.map(i => `${i.name} (x${i.qty})` + (i.note ? ` [${i.note}]` : '')).join(', '),
      price: tot, orderId, payment: C.payBackend[S.pay]
    };

    S.sending = true; S.err = ''; renderCheckout();
    let result;
    try {
      if (S.pay !== 'store') payload.slip = { data: await compressImage(S.slip.file), mime: 'image/jpeg' };
      const res = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const text = await res.text();
      try { result = JSON.parse(text); } catch (e) { result = { status: 'error', message: 'Unexpected response from the order system' }; }
    } catch (e) {
      console.error('Order send failed:', e);
      result = { status: 'error', message: e.message };
    }
    S.sending = false;
    if (!result || result.status !== 'success') {
      S.err = T.sendFail + (result && result.message ? ' (' + result.message + ')' : '');
      renderCheckout();
      return;
    }
    if (S.slip) URL.revokeObjectURL(S.slip.url);
    S.rc = { orderId, room, name, items, total: tot, time: new Date(), pay: S.pay };
    S.cart = {}; S.slip = null; S.pendingOrderId = null; S.err = '';
    saveCart();
    go('receipt', 'replace');
  }

  function download(href, filename) {
    const a = document.createElement('a');
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function saveReceiptImage() {
    const d = receiptData(), T = t(), W = 720, P = 48, LH = 34;
    const rows = [[T.orderNo, d.orderId], [T.date, d.timeStr], [T.roomL, d.room]];
    if (d.name) rows.push([T.guestR, d.name]);
    const H = P * 2 + 120 + (rows.length + d.items.length + 2) * LH + 40 + 3 * LH;
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = W; c.height = H;
    const font = (sz, w) => `${w || 400} ${sz}px "Noto Sans Thai", "Noto Sans SC", system-ui, sans-serif`;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#201f1d'; g.textBaseline = 'middle';
    let y = P + 20;
    g.textAlign = 'center';
    g.font = font(30, 700); g.fillText('MANA RATCHAYOTHIN', W / 2, y); y += 40;
    g.font = font(20); g.fillStyle = '#605d5d'; g.fillText('In-Room Dining · Order Receipt', W / 2, y); y += 40;
    const dash = () => { g.strokeStyle = '#9b9797'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(P, y); g.lineTo(W - P, y); g.stroke(); g.setLineDash([]); y += LH * 0.7; };
    const kv = (k, v, bold) => {
      g.fillStyle = '#201f1d'; g.font = font(bold ? 26 : 22, bold ? 700 : 400);
      g.textAlign = 'left'; g.fillText(k, P, y, W * 0.6); g.textAlign = 'right'; g.fillText(v, W - P, y, W * 0.4); y += LH;
    };
    dash();
    rows.forEach(([k, v]) => kv(k, v));
    dash();
    d.items.forEach(i => kv(i.label, i.amount));
    dash();
    kv(d.totalLabel, d.total + ' THB', true);
    kv(T.payment, d.payText);
    y += 10; g.textAlign = 'center'; g.font = font(18); g.fillStyle = '#605d5d';
    g.fillText(d.foot.length > 70 ? d.foot.slice(0, 70) + '…' : d.foot, W / 2, y, W - P * 2);
    download(c.toDataURL('image/png'), 'MANA-receipt-' + d.orderId + '.png');
    toast(T.saved);
  }

  // ---------- developer: photo editing ----------
  let wineTaps = 0, wineTimer;
  function pickCat(c) {
    if (/^wine/i.test(c)) {
      wineTaps++; clearTimeout(wineTimer); wineTimer = setTimeout(() => { wineTaps = 0; }, 4000);
      if (wineTaps >= 9) { wineTaps = 0; if (!S.dev) S.devLogin = true; }
    }
    S.cat = c;
    render();
    centerActiveCat();
    const top = $('#cats-bar').offsetTop;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
  }

  let cropImg = null, pan = { x: 0, y: 0 }, drag = null;
  function drawCrop() {
    const c = $('#crop-canvas');
    if (!c || !cropImg) return;
    const g = c.getContext('2d'), B = 256, s = B / Math.min(cropImg.width, cropImg.height) * S.cz;
    const w = cropImg.width * s, h = cropImg.height * s;
    g.fillStyle = '#141312'; g.fillRect(0, 0, B, B);
    g.drawImage(cropImg, (B - w) / 2 + pan.x, (B - h) / 2 + pan.y, w, h);
  }
  function saveCrop() {
    const T = t(), B = 256, r = 1080 / B, s = B / Math.min(cropImg.width, cropImg.height) * S.cz;
    const c = document.createElement('canvas');
    c.width = c.height = 1080;
    c.getContext('2d').drawImage(cropImg, ((B - cropImg.width * s) / 2 + pan.x) * r, ((B - cropImg.height * s) / 2 + pan.y) * r, cropImg.width * s * r, cropImg.height * s * r);
    let u = c.toDataURL('image/webp', 0.82);
    if (!u.startsWith('data:image/webp')) u = c.toDataURL('image/jpeg', 0.82);
    const id = S.crop.id, next = { ...S.staged, [id]: u };
    if (!store.set('localStorage', STAGED_KEY, next)) { toast(T.imgFull); return; }
    S.staged = next; S.failed[id] = false; S.crop = null; cropImg = null;
    picksKey = '';
    render();
    toast(T.imgStaged);
  }
  async function uploadPhoto(id, dataUrl) {
    const [meta, data] = dataUrl.split(','), mime = meta.slice(5, meta.indexOf(';'));
    const cred = store.get('sessionStorage', DEV_CRED, {});
    const r = await fetch(C.appsScriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'uploadImage', id, data, mime, user: cred.u, pass: cred.p }) });
    const j = JSON.parse(await r.text());
    if (!j || j.status !== 'success' || !j.url) throw new Error((j && j.message) || 'upload failed');
    return j.url;
  }
  async function saveAllPhotos() {
    const T = t(), ids = Object.keys(S.staged);
    if (!ids.length || S.saving) return;
    let ok = 0, fail = 0, unauthorized = false;
    S.saving = true; S.saveDone = 0; S.saveTotal = ids.length; renderDev();
    for (const id of ids) {
      try {
        const url = await uploadPhoto(id, S.staged[id]);
        ok++;
        delete S.staged[id];
        store.set('localStorage', STAGED_KEY, S.staged);
        S.remote = { ...S.remote, [id]: url };
      } catch (e) {
        fail++;
        console.warn('Upload failed', id, e);
        if (/unauthorized/i.test(e.message)) { unauthorized = true; break; }
      }
      S.saveDone++; renderDev();
    }
    S.saving = false;
    picksKey = '';
    if (unauthorized) { logoutDev(); toast(T.unauthorized); S.devLogin = true; }
    else toast(fail ? T.saveFail.replace('{n}', fail) : T.saveOk.replace('{n}', ok));
    render();
  }
  function logoutDev() {
    store.del('sessionStorage', DEV_FLAG); store.del('sessionStorage', DEV_CRED);
    S.dev = false;
  }

  // ---------- events ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action, id = b.dataset.id, T = t();
    switch (a) {
      case 'lang':
        S.lang = b.dataset.v; store.set('localStorage', LANG_KEY, S.lang); catsKey = ''; picksKey = ''; render(); break;
      case 'cat': pickCat(catList()[+b.dataset.k]); break;
      case 'open':
        if (S.dev) { $('#img-file').dataset.id = id; $('#img-file').value = ''; $('#img-file').click(); }
        else openDish(id);
        break;
      case 'dish-close': S.dish = null; render(); break;
      case 'dish-inc': S.dq++; renderDish(); break;
      case 'dish-dec': S.dq = Math.max(S.cart[S.dish] ? 0 : 1, S.dq - 1); renderDish(); break;
      case 'dish-note': { const k = +b.dataset.k; S.dnotes = S.dnotes.includes(k) ? S.dnotes.filter(x => x !== k) : [...S.dnotes, k]; renderDish(); break; }
      case 'dish-commit': commitDish(); break;
      case 'go-checkout':
        if (!count()) { toast(T.selectOne); break; }
        S.err = ''; go('checkout', 'push'); break;
      case 'go-menu': if (history.state && history.state.screen === 'checkout') history.back(); else go('menu', 'replace'); break;
      case 'line-inc': setQty(id, S.cart[id].qty + 1); break;
      case 'line-dec': setQty(id, S.cart[id].qty - 1); break;
      case 'line-edit': openDish(id); break;
      case 'pay': S.pay = b.dataset.v; S.err = ''; renderCheckout(); break;
      case 'save-qr': {
        const c = document.querySelector('#qr-slot canvas');
        if (c) { download(c.toDataURL('image/png'), 'MANA-QR-' + total() + 'THB.png'); toast(T.qrSaved); }
        break;
      }
      case 'place': placeOrder(); break;
      case 'save-receipt': saveReceiptImage(); break;
      case 'order-more': S.rc = null; menuScrollY = 0; go('menu', 'replace'); break;
      case 'dev-save': saveAllPhotos(); break;
      case 'dev-reset':
        if (!confirm(T.devReset + '?')) break;
        store.del('localStorage', STAGED_KEY); S.staged = {}; picksKey = ''; render(); toast(T.imgReset); break;
      case 'dev-logout': logoutDev(); render(); break;
    }
  });

  $('#dish').addEventListener('click', e => { if (e.target.classList.contains('backdrop')) { S.dish = null; render(); } });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (S.crop) { S.crop = null; render(); } else if (S.devLogin) { S.devLogin = false; render(); } else if (S.dish) { S.dish = null; render(); }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.id === 'q') { S.q = el.value; renderPicks(); renderItems(); }
    else if (el.id === 'room') { S.room = el.value; if (S.err) { S.err = ''; const p = $('#checkout .err-text'); if (p) p.hidden = true; } }
    else if (el.id === 'guest') S.name = el.value;
    else if (el.id === 'dish-text') S.dtext = el.value;
    else if (el.id === 'crop-zoom') { S.cz = Number(el.value); drawCrop(); }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'slip-input') {
      const f = el.files && el.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { S.err = t().slipBad; renderCheckout(); return; }
      if (S.slip) URL.revokeObjectURL(S.slip.url);
      S.slip = { file: f, name: f.name, url: URL.createObjectURL(f) };
      S.err = ''; renderCheckout();
    } else if (el.id === 'img-file') {
      const f = el.files && el.files[0], id = el.dataset.id;
      if (!f || !id) return;
      const im = new Image();
      im.onload = () => { cropImg = im; pan = { x: 0, y: 0 }; S.crop = { id }; S.cz = 1; render(); };
      im.onerror = () => toast(t().slipBad);
      im.src = URL.createObjectURL(f);
    }
  });

  // Broken image → swap to placeholder and remember
  document.addEventListener('error', e => {
    const el = e.target;
    if (el.tagName !== 'IMG' || !el.dataset.imgId) return;
    const id = el.dataset.imgId;
    S.failed[id] = true;
    const box = el.closest('.media');
    if (box) { const ph = document.createElement('span'); ph.className = 'ph ' + box.className.replace('media', '').trim(); ph.textContent = id; box.replaceWith(ph); }
  }, true);

  $('#dev-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = $('#dev-u').value.trim(), p = $('#dev-p').value.trim();
    if (!u || !p) { $('#dev-err').hidden = false; return; }
    // Credentials are verified by the Apps Script on upload — never stored in this code.
    store.set('sessionStorage', DEV_FLAG, true);
    store.set('sessionStorage', DEV_CRED, { u, p });
    S.dev = true; S.devLogin = false;
    render();
  });
  $('#dev-cancel').addEventListener('click', () => { S.devLogin = false; render(); });
  $('#crop-cancel').addEventListener('click', () => { S.crop = null; cropImg = null; render(); });
  $('#crop-save').addEventListener('click', saveCrop);
  const cc = $('#crop-canvas');
  cc.addEventListener('pointerdown', e => { drag = { x: e.clientX - pan.x, y: e.clientY - pan.y }; cc.setPointerCapture(e.pointerId); });
  cc.addEventListener('pointermove', e => { if (!drag) return; pan = { x: e.clientX - drag.x, y: e.clientY - drag.y }; drawCrop(); });
  ['pointerup', 'pointercancel'].forEach(ev => cc.addEventListener(ev, () => { drag = null; }));

  window.addEventListener('beforeunload', e => {
    if (S.dev && Object.keys(S.staged).length) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- boot ----------
  wireCarousel($('#cats'), '#cats-prev', '#cats-next', el => Math.max(160, el.clientWidth * 0.7));
  wireCarousel($('#picks-row'), '#picks-prev', '#picks-next', el => 162 * Math.max(1, Math.floor(el.clientWidth / 162) - 1));
  $('#bar-go').addEventListener('click', () => { if (count()) { S.err = ''; go('checkout', 'push'); } });

  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  render();

  Menu.loadMenu().then(({ items, source }) => {
    S.menu = items; S.menuState = 'ok';
    if (source === 'fallback') console.info('Menu loaded from offline fallback (data/menu-data.js)');
    // Drop cart lines for dishes no longer on the menu
    const m = byId();
    Object.keys(S.cart).forEach(id => { if (!m[id]) delete S.cart[id]; });
    saveCart();
    render();
  }).catch(e => { console.error(e); S.menuState = 'error'; render(); });

  let photoSyncSupported = null;
  async function refreshPhotos() {
    if (photoSyncSupported === false) return;
    try {
      const images = await Menu.fetchCloudPhotos();
      photoSyncSupported = !!images;
      if (!images) return;
      if (images && JSON.stringify(images) !== JSON.stringify(S.remote)) {
        S.remote = images; S.failed = {}; picksKey = '';
        if (S.screen === 'menu' && !S.dish) render();
      }
    } catch (e) { photoSyncSupported = false; }
  }
  refreshPhotos();
  setInterval(refreshPhotos, C.photoPollMs);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshPhotos(); });
})();
