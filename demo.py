# unreleased list

def main():
    unreleased_list = []

    import re
    import os
    import math
    import time
    import json
    import traceback
    import datetime
    import requests
    import textwrap
    from bs4 import BeautifulSoup
    from lxml import html
    from urllib.parse import urlparse
    from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageEnhance
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    import chromedriver_binary

    ## ver4.1以降
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait 
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import Select


    # 動作ok
    get_charlist = False

    for _ in range(5):
        try:
            sel_options = Options()
            driver = webdriver.Chrome(options=sel_options)
            url = "https://ambr.top/jp/archive/avatar"
            driver.get(url)
            time.sleep(2)
            # まず、releasedキャラリストを取得する
            charactor_source1 = driver.page_source
            xpath = "/html/body/div/div/div[1]/div/div/div[1]/div[2]/div/div[1]/select"
            element = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, xpath))
            )
            select = Select(element)
            select.select_by_value("on")
            time.sleep(1)
            driver.refresh()
            time.sleep(3)
            charactor_source2 = driver.page_source
            print("キャラリストを取得できました。")
            get_charlist = True
            driver.quit()
            break
        except TimeoutError as e:
            print(f"TimeOutError: {e}")
        except Exception as e:
            print(f"Error: {e}")
    if not get_charlist:
        print("キャラリストを取得できませんでした。")
        driver.quit()
        return
    # # つぎに、キャラのid,name,name_jaをjsonにする
    # 動作ok
    charactor_result = {}
    id_list = []
    name_list = []
    name_ja_list = []
    release_diff_list = []
    # released
    doc_char1 = html.fromstring(charactor_source1)
    char_id_all1 = doc_char1.xpath("/html/body/div/main/div/div[3]/a/@href")
    for elm in char_id_all1:
        release_diff_list.append(elm.split("/")[5])

    # unreleased
    doc_char2 = html.fromstring(charactor_source2)
    char_nameja_all = doc_char2.xpath("/html/body/div/main/div/div[3]/a")
    char_id_all2 = doc_char2.xpath("/html/body/div/main/div/div[3]/a/@href")
    for elm in char_nameja_all:
        name_ja_list.append(elm.text_content().strip())
    for elm in char_id_all2:
        id_list.append(elm.split("/")[4])
        name_list.append(elm.split("/")[5])
        # 差分を取得
        if elm.split("/")[5] not in release_diff_list:
            unreleased_list.append(elm.split("/")[5])
    for i in range(min(len(id_list), len(name_list), len(name_ja_list))):
        charactor_result[id_list[i]] = {
            "name": name_list[i],
            "name_ja": name_ja_list[i],
            "data": {},
        }

    print("キャラリストを保存しました")

    try:
        with open("release_diff.csv", "w", encoding="utf-8") as f:
            f.write(", ".join(unreleased_list))
        print("release_difを保存しました")
    except Exception as e:
        print(f"release_diffの書き込み中にエラーが発生しました: {e}")
        
main() if __name__ == "__main__" else None