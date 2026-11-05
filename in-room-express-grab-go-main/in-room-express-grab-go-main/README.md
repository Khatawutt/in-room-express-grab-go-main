# MANA In-Room Dining — Web App

เว็บแอปสั่งอาหารเข้าห้องพัก (MANA Ratchayothin) สร้างจาก UI ต้นแบบ `MenuApp.dc.html`
เป็น HTML/CSS/JS ล้วน **ไม่ต้อง build** อัปโหลดขึ้น static hosting ได้ทันที (GitHub Pages, Netlify, Vercel)

## โครงสร้าง

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | โครงหน้า: เมนู, แถบตะกร้า, Checkout, ใบเสร็จ, Dish sheet, เครื่องมือแก้รูป |
| `css/styles.css` | Design tokens + 2 ธีม (classical / original) + Responsive |
| `js/config.js` | **ค่าตั้งค่าทั้งหมด** (Apps Script URL, Google Sheet, PromptPay QR) |
| `js/i18n.js` | ข้อความ ไทย / อังกฤษ / จีน |
| `js/menu.js` | โหลดเมนูจาก Published CSV ของ Menu Master ก่อน แล้วสำรองด้วย `data/menu-data.js` |
| `js/promptpay.js` | สร้าง Thai QR พร้อมยอดเงิน (EMVCo + CRC16) |
| `js/app.js` | State, การ render, ตะกร้า, ส่งออร์เดอร์, ใบเสร็จ, โหมดแก้รูป |
| `data/menu-data.js` | เมนู Active สำรองตอนออฟไลน์ (snapshot จาก Published CSV ของ Menu Master) |
| `images/` | รูปเมนู `M###.jpg` |
| `apps-script/ImageUpload.gs` | โค้ดฝั่ง Google Apps Script สำหรับอัปโหลดรูปเมนู |
| `serve.ps1` | เซิร์ฟเวอร์ทดสอบในเครื่อง (ไม่ต้องลง Node/Python) |

## เปิดทดสอบในเครื่อง

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1
```
จากนั้นเปิด http://localhost:8080/?room=101

## ลิงก์ / พารามิเตอร์ URL

| พารามิเตอร์ | ตัวอย่าง | ผล |
|---|---|---|
| `room` | `?room=Mana%201` | ใส่เลขห้องอัตโนมัติ (ใช้ทำ QR ติดในแต่ละห้อง) |
| `lang` | `?lang=th` / `en` / `zh` | ภาษาเริ่มต้น (ถ้าไม่ใส่ จะดูจากภาษาเครื่อง) |
| `layout` | `?layout=list` / `editorial` | รูปแบบเมนู (ค่าเริ่มต้น `grid`) |
| `theme` | `?theme=original` | ธีมทอง-ดำแบบเดิม (ค่าเริ่มต้น `classical`) |

## การส่งออร์เดอร์

POST ไปที่ `CONFIG.appsScriptUrl` ด้วยรูปแบบเดียวกับเว็บเวอร์ชันก่อนหน้า (`room`, `menu`, `price`, `orderId`, `payment`, `slip`)
หมายเหตุจากแขก (เช่น "Less spicy") ต่อท้ายชื่อเมนูในวงเล็บ `[...]` เป็นภาษาอังกฤษเสมอ เพื่อให้ครัวอ่านง่าย
ขณะนี้ Alipay ยังไม่พร้อมใช้งาน จึงแสดงเป็นตัวเลือกที่ปิดไว้จนกว่าจะเชื่อมระบบชำระเงินสำเร็จ

## โหมดแก้รูปเมนู (สำหรับพนักงาน)

แตะหมวด **Wine** 9 ครั้งติดกัน → กรอก Username/Password → แตะรูปเมนูเพื่อครอปและอัปโหลด
รหัสผ่าน **ไม่ได้อยู่ในโค้ดหน้าเว็บแล้ว** ตรวจสอบที่ Apps Script (Script properties `DEV_USER` / `DEV_PASS`) ตอนกดบันทึก
การ sync และอัปโหลดรูปต้องติดตั้ง `apps-script/ImageUpload.gs` เข้ากับ Apps Script ที่รับออร์เดอร์ แก้ `doGet` / `doPost` ตามคำอธิบายต้นไฟล์ แล้ว Deploy เวอร์ชันใหม่

## Deploy (GitHub Pages)

1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repo (ไม่ต้องใส่ `serve.ps1` ก็ได้)
2. Settings → Pages → Source: `main` / root
3. ลิงก์ QR ของแต่ละห้อง: `https://<user>.github.io/<repo>/?room=<เลขห้อง>`

## เมนูเล่มเต็ม (Full Menu)
- ต้นฉบับ Canva: https://www.canva.com/d/uBAjrgsJMp7Dq1m (MANA Ratchayothin Photo Book Menu)
- Flipbook (Heyzine): https://heyzine.com/flip-book/c976158379.html
- ปุ่ม "ดูเมนูเต็ม" ในหน้าเว็บจะเปิด `FLIPBOOK_URL` (ลิงก์ Heyzine) ใน `index.html` — ถ้าเว้นว่างจะเปิดลิงก์ Canva แทน
- ข้อมูลราคา/รายการที่ใช้สั่งจริงยึด Google Sheet (Menu Master) → `menuData.json` เป็นหลัก
