// Menu loading (Google Sheet → fallback file) and menu business rules.
(function () {
  const C = window.CONFIG;

  function parseCSV(text) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); rows.push(row); row = []; f = '';
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  function sheetRowsToMenu(rows) {
    const head = rows[0].map(x => x.trim().toLowerCase());
    const col = n => head.indexOf(n.toLowerCase());
    const idx = {
      id: col('ID'), status: col('Status'), cat: col('Category'),
      th: col('Name TH'), en: col('Name EN'), zh: col('Name CHI'),
      price: col('Price (THB)') >= 0 ? col('Price (THB)') : col('Price'), img: col('Image URL')
    };
    const get = (r, k) => (idx[k] >= 0 && r[idx[k]] != null ? String(r[idx[k]]).trim() : '');
    return rows.slice(1)
      .filter(r => get(r, 'id') && get(r, 'status').toLowerCase() === 'active')
      .map(r => {
        const th = get(r, 'th'), en = get(r, 'en');
        return {
          id: get(r, 'id'), desc: get(r, 'cat') || 'Other',
          name: th && en && th !== en ? th + '-' + en : (th || en),
          name_th: th || en, name_en: th ? en : '', name_zh: get(r, 'zh'),
          price: Number(get(r, 'price').replace(/[^0-9.]/g, '')) || 0,
          image: get(r, 'img')
        };
      });
  }

  // House rules carried over from the current menu
  const fixName = i => {
    const f = s => String(s || '').replace('ปลาสลิดทอด', 'ปลาทอด');
    return { ...i, name: f(i.name), name_th: f(i.name_th) };
  };
  const isHidden = i => i.id === 'M027' || i.id === 'M103' ||
    /strawberry coconut smoothie/i.test(i.name_en || i.name || '') ||
    (/tiramisu/i.test((i.name_en || '') + (i.name || '')) && Number(i.price) === 159);
  const isRec = i => /^recommendation/i.test(i.desc);
  // Some source photos are stored sideways
  const rotateCW = i => /brownie|tiramisu/i.test((i.name_en || '') + ' ' + (i.name || ''));

  function prepare(list) {
    const d = list.map(fixName).filter(i => !isHidden(i));
    return [...d.filter(isRec), ...d.filter(i => !isRec(i))];
  }

  async function loadMenu() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const sep = C.sheetCsvUrl.includes('?') ? '&' : '?';
      const r = await fetch(C.sheetCsvUrl + sep + 't=' + Date.now(), { signal: controller.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const items = sheetRowsToMenu(parseCSV(await r.text()));
      if (items.length) return { items: prepare(items), source: 'sheet' };
      throw new Error('no active items');
    } catch (e) {
      console.warn('Published menu source failed:', e.message);
    } finally {
      clearTimeout(timeout);
    }
    if (Array.isArray(window.MENU_FALLBACK) && window.MENU_FALLBACK.length) {
      return { items: prepare(window.MENU_FALLBACK), source: 'fallback' };
    }
    throw new Error('menu unavailable');
  }

  async function fetchCloudPhotos() {
    const r = await fetch(C.appsScriptUrl + '?action=images&t=' + Date.now());
    const j = await r.json();
    return j && j.status === 'success' && j.images ? j.images : null;
  }

  window.Menu = { loadMenu, fetchCloudPhotos, isRec, rotateCW };
})();
