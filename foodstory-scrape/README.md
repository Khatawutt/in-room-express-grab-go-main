# FoodStory Menu Scraper

ระบบสำหรับดึงข้อมูลเมนูอาหารจาก FoodStory Back-office และเชื่อมต่อกับ GitHub Actions เพื่อรันอัตโนมัติ

## 📋 คุณสมบัติ (Features)

- ✅ ดึงข้อมูลเมนูจากหน้าเว็บ FoodStory ด้วย Playwright
- ✅ Login อัตโนมัติด้วยบัญชีผู้ใช้ที่ปลอดภัยผ่าน GitHub Secrets
- ✅ ดึงข้อมูลละเอียดจาก Modal ของแต่ละเมนู
- ✅ เพิ่มชื่อภาษาจีนโดยอ้างอิงจากไฟล์ Mapping
- ✅ ส่งออกข้อมูลเป็น Excel, CSV และ JSON
- ✅ รันอัตโนมัติทุกวันจันทร์ผ่าน GitHub Actions

## 📁 โครงสร้างโปรเจค (Project Structure)

```
foodstory-scrape/
├── scripts/
│   └── scrape_foodstory_modal.py      # สคริปต์หลักสำหรับดึงข้อมูลเมนู
├── data/
│   ├── menu_zh_mapping.json           # Mapping ข้อมูลภาษาจีน
│   └── foodstory_menu_export_*.xlsx   # ไฟล์ส่งออก (สร้างอัตโนมัติ)
├── .github/workflows/
│   └── scrape_foodstory_modal.yml     # GitHub Actions Workflow
├── tests/
│   └── test_scrape_foodstory_modal.py # Unit Tests
└── README.md                           # คู่มือการใช้งาน
```

## 🚀 การติดตั้งและใช้งาน (Installation & Usage)

### ขั้นตอนที่ 1: สร้าง Repository บน GitHub

1. ไปยัง [GitHub](https://github.com/)
2. สร้าง New Repository ชื่อ `Khatawutt/in-room-express-grab-go`
3. กดปุ่ม "Create repository"

### ขั้นตอนที่ 2: โหลดโค้ดเข้า Repository

มี 2 วิธี:

**วิธีที่ 1: ใช้ Git CLI (แนะนำ)**
```bash
# ไปยังโฟลเดอร์โปรเจค
cd D:\Dev\foodstory-scrape

# เพิ่ม Remote Repository
git init
git add .
git commit -m "Initial commit: FoodStory Menu Scraper"
git remote add origin https://github.com/Khatawutt/in-room-express-grab-go.git
git push -u origin main
```

**วิธีที่ 2: ใช้ GitHub Desktop**
1. เปิด GitHub Desktop
2. กดปุ่ม "Add repository"
3. เลือกโฟลเดอร์ `D:\Dev\foodstory-scrape`
4. เพิ่ม Remote Repository ตามชื่อที่กำหนด

### ขั้นตอนที่ 3: ตั้งค่า GitHub Secrets

1. ไปยังหน้า Repository ของคุณบนเว็บ GitHub
2. คลิกที่แท็บ **Settings**
3. เลื่อนลงมาหาส่วน **Secrets and variables > Actions**
4. กดปุ่ม **New repository secret** แล้วเพิ่มค่าดังนี้:

| Name | Value |
|------|-------|
| `FOODSTORY_USERNAME` | อีเมลล็อกอิน FoodStory ของคุณ (เช่น `user@example.com`) |
| `FOODSTORY_PASSWORD` | รหัสผ่าน FoodStory ของคุณ |

> ⚠️ **ความปลอดภัย:** อย่าใส่รหัสผ่านในโค้ดหรือไฟล์ที่ commit ให้ใช้ GitHub Secrets แทนเสมอ!

### ขั้นตอนที่ 4: ติดตั้ง Playwright บนเครื่องทดสอบ (Local Testing)

ก่อนรันจริงบน GitHub สามารถทดสอบบนเครื่องตัวเองได้:

```bash
# ไปยังโฟลเดอร์โปรเจค
cd D:\Dev\foodstory-scrape

# ติดตั้ง Python dependencies
pip install -r requirements.txt  # หรือติดตั้งเอง:
pip install playwright openpyxl pandas

# ติดตั้ง Playwright browsers
playwright install chromium

# รันทดสอบบนเครื่อง
python scripts/scrape_foodstory_modal.py
```

### ขั้นตอนที่ 5: สั่งรันผ่าน GitHub Actions

1. ไปยังหน้า Repository ของคุณบน GitHub
2. คลิกที่แท็บ **Actions**
3. เลือก Workflow ชื่อ **Scrape FoodStory Menu from Modal**
4. กดปุ่ม **Run workflow** (หรือกดปุ่ม ▶️)

เมื่อรันเสร็จแล้ว สามารถดาวน์โหลดไฟล์ผลลัพธ์ได้จากส่วน **Artifacts** ด้านล่างสุดของหน้าการรันนั้น ๆ! 🎉

## 🔧 การปรับแต่ง (Configuration)

### แก้ไขสคริปต์หลัก (`scripts/scrape_foodstory_modal.py`)

หากต้องการแก้ไข URL หรือ selector ของหน้าเว็บ ให้ค้นหาและแก้ไขในฟังก์ชันเหล่านี้:

- `login()`: ฟังก์ชันสำหรับ Login
- `get_menu_list()`: ดึงรายการเมนูทั้งหมด
- `open_menu_modal()`: เปิด Modal ของแต่ละเมนู
- `get_menu_details()`: ดึงข้อมูลละเอียดจาก Modal

### เพิ่มข้อมูล Mapping ภาษาจีน (`data/menu_zh_mapping.json`)

แก้ไขไฟล์ mapping เพื่อเพิ่มชื่อภาษาจีนของเมนูอาหาร:

```json
{
  "by_code": {
    "M001": "ชื่อเมนูภาษาจีน"
  },
  "by_english": {
    "Menu Name": "ชื่อเมนูภาษาจีน"
  },
  "by_thai": {
    "ชื่อเมนูไทย": "ชื่อเมนูภาษาจีน"
  }
}
```

## 📊 ข้อมูลที่ดึงได้ (Data Fields)

ระบบจะดึงข้อมูลเมนูอาหารดังนี้:

| Field | คำอธิบาย |
|-------|----------|
| `menu_code` | รหัสเมนู (เช่น M001, M002) |
| `thai_name` | ชื่อเมนูภาษาไทย |
| `english_name` | ชื่อเมนูภาษาอังกฤษ |
| `price` | ราคา |
| `category` | หมวดหมู่ |
| `image_url` | URL รูปภาพเมนู |
| `chinese_name` | ชื่อเมนูภาษาจีน (จากไฟล์ mapping) |

## 🧪 การทดสอบ (Testing)

รัน Unit Tests เพื่อตรวจสอบความถูกต้องของโค้ด:

```bash
# รันทดสอบทั้งหมด
python -m unittest tests/test_scrape_foodstory_modal.py -v
```

หรือใช้ pytest:

```bash
pytest tests/ -v
```

## 📝 ข้อกำหนดระบบ (System Requirements)

- Python 3.10 หรือสูงกว่า
- Playwright และ Chromium browser
- GitHub Actions (สำหรับรันอัตโนมัติบนคลาวด์)

## 🤝 การสนับสนุน (Support)

หากพบปัญหาหรือต้องการความช่วยเหลือ กรุณา:
- ตรวจสอบ Log ในไฟล์ `scripts/scrape_foodstory_modal.py`
- ตรวจสอบ GitHub Actions Logs ที่หน้า Repository ของคุณ
- เปิด Issue หรือ Contact Developer

---

**สร้างด้วย Model_Coding** ✨