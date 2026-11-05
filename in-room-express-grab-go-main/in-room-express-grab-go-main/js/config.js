// App-wide configuration. Change these values here only.
window.CONFIG = {
  hotelName: 'MANA Ratchayothin',

  // Google Apps Script web app: receives orders (POST) and serves cloud menu photos (GET ?action=images)
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbwqT1lS6nhzEWxPLcOPvy-VU1GBuDLcd-XON3H5o1IG1PfiBdgukNV7AFyhqtSXxcDj/exec',

  // Published "Menu Master" CSV; falls back to data/menu-data.js if it is unavailable.
  sheetCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIlPcFBNahWcP7yWRbzfJ_fZ8mQcJNzNoz1PsJbW0g0dd0uxr7vEeWurk2uEX5xo9VyEJmKeqhafnv/pub?output=csv',

  // Static PromptPay merchant QR (Thai QR). Amount is injected at checkout.
  merchantQr: '00020101021130650016A000000677010112011501075360001028602150140000034311520303SCB5802TH530376462200716000000000050737863045E8F',

  // Payment labels written to the order sheet (same values as the previous site)
  payBackend: {
    qr: 'Thai QR (slip pending check)',
    alipay: 'Alipay (screenshot pending check)',
    store: 'Pay at restaurant (Credit card / Cash)'
  },

  // How often to refresh cloud menu photos (ms)
  photoPollMs: 15000
};
