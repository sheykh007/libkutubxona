from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

try:
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    driver.get('http://127.0.0.1:8000/')
    time.sleep(2)
    # Check if there are any error divs
    errors = driver.execute_script('''
        const errs = [];
        const divs = document.querySelectorAll('div[style*="z-index: 999999"]');
        divs.forEach(d => errs.push(d.innerText));
        return errs;
    ''')
    print('ERRORS FOUND:')
    for e in errors:
        print(e)
    driver.quit()
except Exception as e:
    print('Exception:', e)
