"""
Unit Tests for FoodStory Menu Scraper
Tests all core functions of the scraper module
"""

import unittest
from pathlib import Path
import json
import os
from datetime import datetime

# Import modules to test
from scripts.scrape_foodstory_modal import (
    FoodStoryScraper, 
    main,
    _get_chinese_name
)


class TestFoodStoryScraper(unittest.TestCase):
    """Test cases for FoodStoryScraper class"""

    def setUp(self):
        """Setup test fixtures before each test"""
        # สร้าง mock mapping file สำหรับทดสอบ
        self.test_mapping_file = Path("data/test_menu_zh_mapping.json")
        
        if not self.test_mapping_file.exists():
            # สร้างไฟล์ mapping แบบทดสอบ
            with open(self.test_mapping_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "by_code": {
                        "M001": "เมนูอาหารจานแรก",
                        "M002": "เมนูอาหารจานที่สอง"
                    },
                    "by_english": {
                        "Spicy Chicken Curry": "ไก่สับปะรดเผ็ด",
                        "Pad Thai": "ผัดไทย"
                    },
                    "by_thai": {
                        "ไก่ทอด": "ไก่ทอด",
                        "ข้าวผัด": "ข้าวผัด"
                    }
                }, f, ensure_ascii=False)

    def tearDown(self):
        """Cleanup after each test"""
        # ลบไฟล์ mapping แบบทดสอบหลังการทดสอบ
        if self.test_mapping_file.exists():
            try:
                os.remove(self.test_mapping_file)
            except Exception as e:
                print(f"Warning: Could not remove test file: {e}")

    def test_get_chinese_name_by_code(self):
        """Test getting Chinese name by menu code"""
        # สร้าง mock mapping file
        self.setUp()
        
        try:
            # เรียกใช้ฟังก์ชัน _get_chinese_name (ต้องแก้ไขให้เข้าถึงได้)
            # เนื่องจากเป็น private method ต้องทดสอบผ่าน public API
            
            # สร้าง instance ของ scraper
            scraper = FoodStoryScraper(
                username="test@example.com",
                password="test_password"
            )
            
            # Mock data
            mock_details = {
                'menu_code': 'M001',
                'thai_name': '',
                'english_name': '',
                'price': '',
                'category': '',
                'image_url': ''
            }
            
            # ทดสอบการดึงชื่อภาษาจีนจาก menu code
            chinese_name = scraper._get_chinese_name('M001', mock_details)
            
            self.assertEqual(chinese_name, "เมนูอาหารจานแรก", 
                          f"Expected 'เมนูอาหารจานแรก' but got '{chinese_name}'")

        finally:
            self.tearDown()

    def test_get_chinese_name_by_english(self):
        """Test getting Chinese name by English name"""
        # สร้าง mock mapping file
        self.setUp()
        
        try:
            scraper = FoodStoryScraper(
                username="test@example.com",
                password="test_password"
            )
            
            # Mock data with English name
            mock_details = {
                'menu_code': 'M002',
                'thai_name': '',
                'english_name': 'Spicy Chicken Curry',
                'price': '',
                'category': '',
                'image_url': ''
            }
            
            # ทดสอบการดึงชื่อภาษาจีนจาก English name
            chinese_name = scraper._get_chinese_name('M002', mock_details)
            
            self.assertEqual(chinese_name, "ไก่สับปะรดเผ็ด", 
                          f"Expected 'ไก่สับปะรดเผ็ด' but got '{chinese_name}'")

        finally:
            self.tearDown()

    def test_get_chinese_name_by_thai(self):
        """Test getting Chinese name by Thai name"""
        # สร้าง mock mapping file
        self.setUp()
        
        try:
            scraper = FoodStoryScraper(
                username="test@example.com",
                password="test_password"
            )
            
            # Mock data with Thai name
            mock_details = {
                'menu_code': 'M003',
                'thai_name': 'ไก่ทอด',
                'english_name': '',
                'price': '',
                'category': '',
                'image_url': ''
            }
            
            # ทดสอบการดึงชื่อภาษาจีนจาก Thai name
            chinese_name = scraper._get_chinese_name('M003', mock_details)
            
            self.assertEqual(chinese_name, "ไก่ทอด", 
                          f"Expected 'ไก่ทอด' but got '{chinese_name}'")

        finally:
            self.tearDown()

    def test_get_chinese_name_not_found(self):
        """Test getting Chinese name when not found in mapping"""
        # สร้าง mock mapping file
        self.setUp()
        
        try:
            scraper = FoodStoryScraper(
                username="test@example.com",
                password="test_password"
            )
            
            # Mock data with unknown menu code
            mock_details = {
                'menu_code': 'M999',  # Code not in mapping
                'thai_name': '',
                'english_name': '',
                'price': '',
                'category': '',
                'image_url': ''
            }
            
            # ทดสอบการดึงชื่อภาษาจีนเมื่อไม่พบใน mapping
            chinese_name = scraper._get_chinese_name('M999', mock_details)
            
            self.assertEqual(chinese_name, "", 
                          f"Expected empty string but got '{chinese_name}'")

        finally:
            self.tearDown()


class TestMainFunction(unittest.TestCase):
    """Test cases for main function"""

    def test_main_function_exists(self):
        """Test that main function exists and is callable"""
        # ตรวจสอบว่าฟังก์ชัน main มีอยู่และสามารถเรียกได้
        self.assertTrue(callable(main), "main function should be callable")


class TestFileOperations(unittest.TestCase):
    """Test cases for file operations"""

    def test_mapping_file_structure(self):
        """Test that mapping file has correct structure"""
        # สร้าง mock mapping file
        self.setUp()
        
        try:
            mapping_file = Path("data/test_menu_zh_mapping.json")
            
            if not mapping_file.exists():
                self.fail("Mapping file should exist for testing")
            
            with open(mapping_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # ตรวจสอบโครงสร้างไฟล์
            self.assertIn('by_code', data, "Mapping file should have 'by_code' key")
            self.assertIn('by_english', data, "Mapping file should have 'by_english' key")
            self.assertIn('by_thai', data, "Mapping file should have 'by_thai' key")

        finally:
            self.tearDown()


if __name__ == '__main__':
    # รันทดสอบทั้งหมด
    unittest.main(verbosity=2)