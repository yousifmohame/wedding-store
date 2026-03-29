from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# إعداد المتغيرات
BASE_URL = "http://localhost:3000" 
EXPECTED_ID = "1" 
EXPECTED_PATH = f"/services/category/{EXPECTED_ID}"

def test_category_card_navigation_simple():
    driver = webdriver.Chrome() 
    driver.implicitly_wait(10) 

    try:
        print(f"1. الانتقال إلى الصفحة الرئيسية: {BASE_URL}")
        driver.get(BASE_URL)

        wait = WebDriverWait(driver, 15)
        
        LINK_LOCATOR = (By.XPATH, f"//a[@href='{EXPECTED_PATH}']")
        
        print(f"2. البحث عن رابط الفئة بالمسار: {EXPECTED_PATH}")
        
        category_link = wait.until(
            EC.presence_of_element_located(LINK_LOCATOR)
        )
        
        print("3. النقر على الرابط...")
        category_link.click()

        expected_url = f"{BASE_URL}{EXPECTED_PATH}"
        print(f"4. التحقق من أن URL الحالي هو: {expected_url}")

        wait.until(EC.url_to_be(expected_url))
        
        current_url = driver.current_url
        
        assert current_url == expected_url
        
        print(f" PASS: test successfuly({current_url}).")

    except Exception as e:
        print(f" FAIL: حدث خطأ أثناء اختبار الرابط البسيط.")
        print(f"الخطأ: {e}")
        assert False
        
    finally:
        print("5. إغلاق المتصفح.")
        driver.quit()

# تشغيل الاختبار
if __name__ == "__main__":
    test_category_card_navigation_simple()