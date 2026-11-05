"""
FoodStory Menu Scraper - ดึงข้อมูลเมนูจาก FoodStory Back-office
ใช้ Playwright จำลองเบราว์เซอร์จริงเพื่อ Login และดึงข้อมูลจาก Modal
"""

import os
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

from playwright.sync_api import Page, Browser, TimeoutError as PlaywrightTimeoutError
from openpyxl import Workbook
import pandas as pd


# ตั้งค่า Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# โพทโฟลเดอร์โปรเจค (ต้องแก้ไขตามจริง)
PROJECT_ROOT = Path(os.path.dirname(os.path.abspath(__file__))).parent


class FoodStoryScraper:
    """
    สคริปต์สำหรับดึงข้อมูลเมนูจาก FoodStory Back-office
    
    ข้อมูลที่ดึงได้:
    - รหัสเมนู (Menu Code)
    - ชื่อไทย (Thai Name)
    - ชื่ออังกฤษ (English Name)
    - ราคา (Price)
    - หมวดหมู่ (Category)
    - รูปภาพ (Image URL)
    - ภาษาจีน (Chinese Name) - จากไฟล์ mapping
    """

    def __init__(self, username: str, password: str):
        """
        สร้าง instance ของ FoodStoryScraper
        
        Args:
            username: ชื่อผู้ใช้ FoodStory
            password: รหัสผ่าน FoodStory
        """
        self.username = username
        self.password = password
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.menu_data: List[Dict[str, Any]] = []
        
        # โพทไฟล์ mapping ภาษาจีน
        mapping_file = PROJECT_ROOT / "data" / "menu_zh_mapping.json"
        logger.info(f"Loading Chinese menu mapping from: {mapping_file}")

    def setup_browser(self) -> None:
        """เริ่มต้นเบราว์เซอร์ Playwright"""
        logger.info("Starting browser...")
        
        # เริ่มต้น Chromium เบราว์เซอร์
        self.browser = playwright.sync_api.chromium.launch(
            headless=False,  # แสดงหน้าต่างเบราว์เซอร์ (สำหรับ debugging)
            args=[
                '--disable-web-security',  # Disable web security for cross-origin requests
                '--no-sandbox'
            ]
        )
        
        # สร้าง Context และ Page ใหม่
        self.page = self.browser.new_page()
        logger.info("Browser started successfully")

    def login(self, page: Page) -> bool:
        """
        ทำการ Login กับ FoodStory
        
        Args:
            page: Playwright Page object
            
        Returns:
            bool: True ถ้าล็อกอินสำเร็จ, False ถ้าล้มเหลว
        """
        try:
            logger.info(f"Logging in with username: {self.username}")
            
            # ไปยังหน้า Login ของ FoodStory
            url = "https://manage.foodstory.co/th/login"
            page.goto(url, timeout=30000)
            logger.info(f"Navigated to login page: {url}")

            # กรอกข้อมูล Username
            username_input = page.locator('input[name="username"]')
            if not username_input.is_visible():
                # หา input ที่ตรงกับ username (อาจมี attribute อื่นๆ)
                username_input = page.locator('input[placeholder*="Username"]')
            
            username_input.fill(self.username, timeout=10000)
            logger.info(f"Filled username: {self.username}")

            # กรอกข้อมูล Password
            password_input = page.locator('input[name="password"]')
            if not password_input.is_visible():
                password_input = page.locator('input[placeholder*="Password"]')
            
            password_input.fill(self.password, timeout=10000)
            logger.info("Filled password")

            # คลิกปุ่ม Login
            login_button = page.locator('button[type="submit"]', has_timeout=5000)
            if not login_button.is_visible():
                # หา button ที่ตรงกับ text "Login" หรือ "เข้าสู่ระบบ"
                login_button = page.locator('text="Login"', has_timeout=5000)
            
            logger.info("Clicking Login button...")
            login_button.click(timeout=10000)

            # รอให้หน้าเว็บโหลดและตรวจสอบว่าล็อกอินสำเร็จหรือไม่
            logger.info("Waiting for login success...")
            page.wait_for_load_state('networkidle', timeout=30000)
            
            # ตรวจสอบว่าเข้าสู่ระบบสำเร็จหรือไม่ (อาจดูจาก URL หรือ content)
            if "dashboard" in page.url or "menu" in page.url:
                logger.info("Login successful!")
                return True
            else:
                logger.warning(f"URL after login: {page.url}")
                logger.warning("Could not confirm login success, trying to navigate to menu...")
                
                # ลองไปหน้าเมนูโดยตรง
                menu_url = "https://manage.foodstory.co/th/menu"
                page.goto(menu_url, timeout=30000)
                return True
                
        except Exception as e:
            logger.error(f"Login failed with error: {e}")
            return False

    def get_menu_list(self, page: Page) -> List[Dict[str, Any]]:
        """
        ดึงรายการเมนูทั้งหมดจากหน้าเว็บ
        
        Args:
            page: Playwright Page object
            
        Returns:
            List[Dict]: รายการเมนูที่ดึงได้
        """
        try:
            logger.info("Fetching menu list...")
            
            # ไปยังหน้ารายการเมนู
            url = "https://manage.foodstory.co/th/menu"
            page.goto(url, timeout=30000)
            logger.info(f"Navigated to menu page: {url}")

            # รอให้ข้อมูลโหลดเสร็จ
            page.wait_for_load_state('networkidle', timeout=30000)

            # ดึงตารางเมนู (อาจต้องปรับ selector ตามโครงสร้างจริงของหน้าเว็บ)
            table = page.locator('table')
            
            if not table.is_visible():
                logger.warning("Table not found, trying alternative selectors...")
                # ลองหา div ที่คล้ายตาราง
                table = page.locator('div[data-role="table"]', has_timeout=5000)

            # ดึงข้อมูลจากแถวแต่ละแถวของตาราง
            rows = table.locator('tr').filter(has_timeout=10000).all()
            
            menu_list = []
            for row in rows:
                try:
                    cells = row.locator('td', has_timeout=5000).all()
                    
                    if len(cells) >= 2:
                        # ดึงข้อมูลจากคอลัมน์ต่างๆ (อาจต้องปรับตามโครงสร้างจริง)
                        menu_code = cells[0].inner_text().strip()
                        
                        # ตรวจสอบว่ามีรหัสเมนูหรือไม่
                        if not menu_code or menu_code == "":
                            continue
                        
                        row_data = {
                            'menu_code': menu_code,
                            'thai_name': '',  # ต้องดึงจากคอลัมน์ที่ถูกต้อง
                            'english_name': '',
                            'price': '',
                            'category': '',
                            'image_url': ''
                        }
                        
                        menu_list.append(row_data)
                    
                except Exception as e:
                    logger.warning(f"Error parsing row: {e}")
            
            logger.info(f"Fetched {len(menu_list)} menus from page")
            return menu_list

        except Exception as e:
            logger.error(f"Failed to fetch menu list: {e}")
            return []

    def open_menu_modal(self, page: Page, menu_code: str) -> bool:
        """
        คลิกเปิด Modal ของเมนูและดึงข้อมูลละเอียด
        
        Args:
            page: Playwright Page object
            menu_code: รหัสเมนู
            
        Returns:
            bool: True ถ้าเปิด Modal สำเร็จ, False ถ้าล้มเหลว
        """
        try:
            logger.info(f"Opening modal for menu code: {menu_code}")

            # หาปุ่มแก้ไขเมนู (อาจต้องปรับ selector ตามโครงสร้างจริง)
            edit_button = page.locator(f'[data-menu-code="{menu_code}"] button', has_timeout=5000)
            
            if not edit_button.is_visible():
                # ลองหาปุ่มที่มี text "Edit" หรือ "แก้ไข"
                edit_button = page.locator(f'text="Edit"', has_timeout=5000)

            logger.info("Clicking Edit button...")
            edit_button.click(timeout=10000)

            # รอให้ Modal เปิดขึ้น
            logger.info("Waiting for modal to open...")
            
            # ตรวจสอบว่า Modal เปิดขึ้นหรือไม่ (อาจดูจาก visibility หรือ content)
            page.wait_for_timeout(2000)  # รอ 2 วินาที
            
            return True

        except Exception as e:
            logger.error(f"Failed to open modal for menu {menu_code}: {e}")
            return False

    def get_menu_details(self, page: Page, menu_code: str) -> Dict[str, Any]:
        """
        ดึงข้อมูลละเอียดจาก Modal
        
        Args:
            page: Playwright Page object
            menu_code: รหัสเมนู
            
        Returns:
            Dict: ข้อมูลเมนูที่ดึงได้
        """
        try:
            logger.info(f"Fetching details for menu code: {menu_code}")

            # ดึงข้อมูลจากฟอร์มใน Modal (ต้องปรับ selector ตามโครงสร้างจริง)
            
            data = {
                'menu_code': menu_code,
                'thai_name': '',
                'english_name': '',
                'price': '',
                'category': '',
                'image_url': ''
            }

            # ดึงชื่อไทย (อาจต้องปรับ selector)
            thai_input = page.locator('input[name="menu_thai"]', has_timeout=5000)
            if thai_input.is_visible():
                data['thai_name'] = thai_input.input_value()

            # ดึงชื่ออังกฤษ
            english_input = page.locator('input[name="menu_english"]', has_timeout=5000)
            if english_input.is_visible():
                data['english_name'] = english_input.input_value()

            # ดึงราคา
            price_input = page.locator('input[name="price"]', has_timeout=5000)
            if price_input.is_visible():
                data['price'] = price_input.input_value()

            # ดึงหมวดหมู่
            category_select = page.locator('select[name="category"]', has_timeout=5000)
            if category_select.is_visible():
                selected_option = category_select.selected_options.first
                if selected_option:
                    data['category'] = selected_option.value_attr()

            # ดึงรูปภาพ (อาจเป็น URL หรือไฟล์)
            image_input = page.locator('input[name="image"]', has_timeout=5000)
            if image_input.is_visible():
                data['image_url'] = image_input.input_value()

            logger.info(f"Menu details fetched: {data}")
            return data

        except Exception as e:
            logger.error(f"Failed to fetch menu details for {menu_code}: {e}")
            return None

    def scrape_all_menus(self) -> List[Dict[str, Any]]:
        """
        สคริปต์หลักสำหรับดึงข้อมูลเมนูทั้งหมด
        
        Returns:
            List[Dict]: รายการเมนูที่รวบรวมได้
        """
        logger.info("=" * 50)
        logger.info("Starting FoodStory Menu Scraper")
        logger.info("=" * 50)

        # เริ่มต้นเบราว์เซอร์
        self.setup_browser()
        
        # ทำการ Login
        if not self.login(self.page):
            logger.error("Login failed, exiting...")
            return []

        # ดึงรายการเมนูทั้งหมด
        menu_list = self.get_menu_list(self.page)
        
        if not menu_list:
            logger.warning("No menus found on the page")
            return []

        logger.info(f"Found {len(menu_list)} menus to scrape")

        # เก็บข้อมูลเมนูที่ดึงแล้วเพื่อไม่ให้เกิด duplicate
        scraped_codes = set()

        for menu in menu_list:
            try:
                menu_code = menu.get('menu_code', '')
                
                # ตรวจสอบว่าเคยดึงข้อมูลนี้ไปแล้วหรือยัง
                if menu_code in scraped_codes:
                    logger.debug(f"Skipping duplicate menu code: {menu_code}")
                    continue
                
                # เปิด Modal และดึงข้อมูลละเอียด
                if self.open_menu_modal(self.page, menu_code):
                    details = self.get_menu_details(self.page, menu_code)
                    
                    if details:
                        # เพิ่มภาษาจีนจาก mapping file
                        chinese_name = self._get_chinese_name(menu_code, details)
                        
                        # บันทึกข้อมูล
                        scraped_data = {**details, 'chinese_name': chinese_name}
                        self.menu_data.append(scraped_data)
                        scraped_codes.add(menu_code)
                        
                        logger.info(f"Scraped menu: {menu_code}")

            except Exception as e:
                logger.error(f"Error scraping menu {menu.get('menu_code', 'unknown')}: {e}")
                continue

        # สรุปผลการสคริปต์
        logger.info("=" * 50)
        logger.info(f"Scraping completed! Total menus scraped: {len(self.menu_data)}")
        logger.info("=" * 50)

        return self.menu_data

    def _get_chinese_name(self, menu_code: str, details: Dict[str, Any]) -> str:
        """
        ดึงชื่อภาษาจีนจากไฟล์ mapping
        
        Args:
            menu_code: รหัสเมนู
            details: ข้อมูลเมนูที่ดึงได้
            
        Returns:
            str: ชื่อภาษาจีน
        """
        try:
            mapping_file = PROJECT_ROOT / "data" / "menu_zh_mapping.json"
            
            if not mapping_file.exists():
                logger.warning(f"Mapping file not found: {mapping_file}")
                return ""

            with open(mapping_file, 'r', encoding='utf-8') as f:
                mapping_data = json.load(f)

            # ค้นหาชื่อภาษาจีนจาก menu_code หรือ english_name หรือ thai_name
            chinese_name = ""
            
            if menu_code in mapping_data.get('by_code', {}):
                chinese_name = mapping_data['by_code'][menu_code]
            elif details.get('english_name') and details['english_name'] in mapping_data.get('by_english', {}):
                chinese_name = mapping_data['by_english'][details['english_name']]
            elif details.get('thai_name') and details['thai_name'] in mapping_data.get('by_thai', {}):
                chinese_name = mapping_data['by_thai'][details['thai_name']]

            return chinese_name

        except Exception as e:
            logger.error(f"Error getting Chinese name for menu {menu_code}: {e}")
            return ""

    def export_to_excel(self, output_path: Optional[Path] = None) -> Path:
        """
        ส่งออกข้อมูลเมนูเป็นไฟล์ Excel
        
        Args:
            output_path: โพทไฟล์ส่งออก (ถ้าไม่ระบุ จะสร้างอัตโนมัติ)
            
        Returns:
            Path: โพทไฟล์ที่สร้างขึ้น
        """
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = PROJECT_ROOT / "data" / f"foodstory_menu_export_{timestamp}.xlsx"

        try:
            wb = Workbook()
            
            # กำหนดชื่อ worksheet
            ws = wb.active
            ws.title = "Menu Data"

            # ตั้งค่าคอลัมน์
            headers = [
                'menu_code', 
                'thai_name', 
                'english_name', 
                'price', 
                'category', 
                'image_url', 
                'chinese_name'
            ]
            
            # เขียนหัวตาราง
            for col, header in enumerate(headers, start=1):
                ws.cell(row=1, column=col, value=header)

            # เขียนข้อมูล
            for row_idx, menu in enumerate(self.menu_data, start=2):
                for col_idx, header in enumerate(headers, start=1):
                    ws.cell(row=row_idx, column=col_idx, value=menu.get(header))

            # บันทึกไฟล์
            wb.save(output_path)
            
            logger.info(f"Excel file saved to: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to save Excel file: {e}")
            raise

    def export_to_csv(self, output_path: Optional[Path] = None) -> Path:
        """
        ส่งออกข้อมูลเมนูเป็นไฟล์ CSV
        
        Args:
            output_path: โพทไฟล์ส่งออก (ถ้าไม่ระบุ จะสร้างอัตโนมัติ)
            
        Returns:
            Path: โพทไฟล์ที่สร้างขึ้น
        """
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = PROJECT_ROOT / "data" / f"foodstory_menu_export_{timestamp}.csv"

        try:
            df = pd.DataFrame(self.menu_data)
            df.to_csv(output_path, index=False, encoding='utf-8-sig')
            
            logger.info(f"CSV file saved to: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to save CSV file: {e}")
            raise

    def export_to_json(self, output_path: Optional[Path] = None) -> Path:
        """
        ส่งออกข้อมูลเมนูเป็นไฟล์ JSON
        
        Args:
            output_path: โพทไฟล์ส่งออก (ถ้าไม่ระบุ จะสร้างอัตโนมัติ)
            
        Returns:
            Path: โพทไฟล์ที่สร้างขึ้น
        """
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = PROJECT_ROOT / "data" / f"foodstory_menu_export_{timestamp}.json"

        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(self.menu_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"JSON file saved to: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to save JSON file: {e}")
            raise

    def cleanup(self) -> None:
        """ทำความสะอาดทรัพยากร"""
        if self.browser:
            self.browser.close()
            logger.info("Browser closed")


def main():
    """ฟังก์ชันหลักสำหรับรันสคริปต์"""
    
    # โพทไฟล์ mapping ภาษาจีน (ต้องแก้ไขตามจริง)
    mapping_file = PROJECT_ROOT / "data" / "menu_zh_mapping.json"
    
    if not mapping_file.exists():
        logger.error(f"Mapping file not found: {mapping_file}")
        print(f"Error: Mapping file not found at {mapping_file}")
        return
    
    # โหลดข้อมูล mapping
    with open(mapping_file, 'r', encoding='utf-8') as f:
        menu_zh_mapping = json.load(f)

    # สร้าง instance ของ scraper
    scraper = FoodStoryScraper(
        username=os.getenv("FOODSTORY_USERNAME", "your_username_here"),
        password=os.getenv("FOODSTORY_PASSWORD", "your_password_here")
    )

    try:
        # รันการสคริปต์
        menu_data = scraper.scrape_all_menus()

        if not menu_data:
            logger.warning("No data scraped, exiting...")
            return

        # ส่งออกข้อมูลเป็นไฟล์ต่างๆ
        excel_path = scraper.export_to_excel()
        csv_path = scraper.export_to_csv()
        json_path = scraper.export_to_json()

        print("\n" + "=" * 50)
        print("Scraping completed successfully!")
        print(f"Total menus scraped: {len(menu_data)}")
        print("=" * 50)
        
        # แสดงโพทไฟล์ที่สร้างขึ้น
        print(f"\nExcel file: {excel_path}")
        print(f"CSV file: {csv_path}")
        print(f"JSON file: {json_path}")

    finally:
        scraper.cleanup()


if __name__ == "__main__":
    main()