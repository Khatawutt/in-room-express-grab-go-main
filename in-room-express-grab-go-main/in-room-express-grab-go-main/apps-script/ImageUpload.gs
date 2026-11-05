/**
 * MANA In-Room Dining — cloud menu photos
 * วางไฟล์นี้ในโปรเจกต์ Apps Script เดิม (ตัวที่รับออร์เดอร์) แล้ว Deploy เวอร์ชันใหม่ (Manage deployments → Edit → New version)
 *
 * ตั้งค่าครั้งเดียว: Project Settings → Script properties
 *   DEV_USER = tigg3r
 *   DEV_PASS = (รหัสผ่าน)
 *
 * แก้ doPost / doGet เดิมให้เรียกตัวจัดการนี้ก่อน:
 *
 *   function doPost(e) {
 *     const body = JSON.parse(e.postData.contents);
 *     if (body.action === 'uploadImage') return handleImageUpload_(body);
 *     ... โค้ดรับออร์เดอร์เดิม ...
 *   }
 *
 *   function doGet(e) {
 *     if (e.parameter.action === 'images') return handleImages_();
 *     ... (ถ้ามีโค้ดเดิม) ...
 *   }
 */

const IMG_FOLDER_NAME = 'MANA Menu Images';
const MENU_SHEET_NAME = 'Menu Master';
// ถ้าสคริปต์ไม่ได้ผูกกับชีต ให้ใส่ ID ของสเปรดชีตตรงนี้
const SPREADSHEET_ID = '';

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function menuSheet_() {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActive();
  return ss.getSheetByName(MENU_SHEET_NAME);
}
function imgFolder_() {
  const it = DriveApp.getFoldersByName(IMG_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMG_FOLDER_NAME);
}
function cols_(head) {
  const h = head.map(x => String(x).trim().toLowerCase());
  return { id: h.indexOf('id'), img: h.indexOf('image url') };
}

/** POST {action:'uploadImage', id, data(base64), mime, user, pass} → {status, url} */
function handleImageUpload_(b) {
  const p = PropertiesService.getScriptProperties();
  if (!b.user || b.user !== p.getProperty('DEV_USER') || b.pass !== p.getProperty('DEV_PASS')) {
    return json_({ status: 'error', message: 'unauthorized' });
  }
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(b.id || '')) return json_({ status: 'error', message: 'bad id' });
  const mime = /^image\/(webp|jpeg|png)$/.test(b.mime) ? b.mime : 'image/jpeg';
  const ext = mime === 'image/webp' ? '.webp' : mime === 'image/png' ? '.png' : '.jpg';

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const folder = imgFolder_();
    const old = folder.searchFiles("title contains '" + b.id + "-'");
    while (old.hasNext()) old.next().setTrashed(true);

    const blob = Utilities.newBlob(Utilities.base64Decode(b.data), mime, b.id + '-' + Date.now() + ext);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const url = 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1080';

    const sh = menuSheet_();
    const v = sh.getDataRange().getValues();
    const c = cols_(v[0]);
    if (c.id < 0 || c.img < 0) return json_({ status: 'error', message: 'Menu Master needs ID and Image URL columns' });
    for (let r = 1; r < v.length; r++) {
      if (String(v[r][c.id]).trim() === b.id) { sh.getRange(r + 1, c.img + 1).setValue(url); break; }
    }
    return json_({ status: 'success', url: url });
  } finally {
    lock.releaseLock();
  }
}

/** GET ?action=images → {status, images:{ID:url}} — อ่านสดจากชีต (ไม่ต้องรอ Publish to web) */
function handleImages_() {
  const v = menuSheet_().getDataRange().getValues();
  const c = cols_(v[0]);
  const images = {};
  for (let r = 1; r < v.length; r++) {
    const id = String(v[r][c.id]).trim(), url = String(v[r][c.img] || '').trim();
    if (id && url) images[id] = url;
  }
  return json_({ status: 'success', images: images });
}
