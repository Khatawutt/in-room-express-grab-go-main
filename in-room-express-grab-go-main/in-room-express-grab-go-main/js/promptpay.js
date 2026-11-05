// Thai QR (EMVCo / PromptPay) helpers: rebuild the merchant payload with a fixed amount.
(function () {
  function tlv(id, v) { return id + String(v.length).padStart(2, '0') + v; }

  function parseTLV(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const id = s.substr(i, 2), len = parseInt(s.substr(i + 2, 2), 10);
      out.push([id, s.substr(i + 4, len)]);
      i += 4 + len;
    }
    return out;
  }

  function crc16(s) {
    let c = 0xFFFF;
    for (let i = 0; i < s.length; i++) {
      c ^= s.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) : (c << 1);
      c &= 0xFFFF;
    }
    return c.toString(16).toUpperCase().padStart(4, '0');
  }

  // amount > 0 → dynamic QR (01=12) with tag 54 inserted before country code (58)
  function payload(merchantQr, amount) {
    let p = '';
    parseTLV(merchantQr).forEach(([id, v]) => {
      if (id === '63' || id === '54') return;
      if (id === '01') { p += tlv('01', amount > 0 ? '12' : '11'); return; }
      if (id === '58' && amount > 0) p += tlv('54', amount.toFixed(2));
      p += tlv(id, v);
    });
    p += '6304';
    return p + crc16(p);
  }

  window.PromptPay = { payload, crc16 };
})();
