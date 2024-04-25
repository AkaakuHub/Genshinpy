### github用 ###
### 仕様書
# 定期実行して、全キャラ分のambrtopからselenium,htmlを取得し、xpathで要素を抽出、データに格納する、画像を取得、pillowで画像を生成して外からアクセス可能にする #
###
# 仕様変更
# talentの文章、storyは文字のみ
# todo
# いまここ：
def main():
    unreleased_list = []
    avater2_list = [
        "keqing",
        "mona",
        "fischl",
        "klee",
        "ningguang",
        "amber",
        "diluc",
        "kaeya",
        "barbara",
        "jean",
        "lisa",
        "rosaria",
        "kamisato-ayaka",
    ]
    avater3_list = ["jean"]
    sprinter_list = ["mona", "kamisato-ayaka"]
    html_kind = ["profile", "talent", "constellation", "ascension", "other", "story"]
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
    # from selenium import webdriver
    # from selenium.webdriver.chrome.options import Options
    # import chromedriver_binary
    ## ver4.1以降
    # from selenium.webdriver.common.by import By
    # from selenium.webdriver.support.ui import WebDriverWait
    # from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.support.ui import Select
    from seleniumwire import webdriver
    from seleniumwire.utils import decode
    from selenium.webdriver.firefox.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
    
    import geckodriver_autoinstaller

    geckodriver_autoinstaller.install() 
    
    options = Options()
    options.add_argument("--headless")
    seleniumwire_options = {"disable_encoding": True}

    # エラーログファイルのパス
    log_file_path = "errorlog.txt"


    # エラーログをファイルに書き込む関数
    def write_error_log(error_message):
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] {error_message}\n"
        with open(log_file_path, "a") as log_file:
            log_file.write(log_entry)


    write_error_log("----------start Genshin.py----------")
    # 動作ok

    get_charlist = False
    for _ in range(5):
        try:
            driver = webdriver.Firefox(
                options=options, seleniumwire_options=seleniumwire_options
            )
            url = "https://ambr.top/jp/archive/avatar"
            driver.get(url)
            time.sleep(2)
            # まず、releasedキャラリストを取得する
            charactor_source1 = driver.page_source
            # 20240208追記
            # つぎに、以下の要素がある場合、unreleasedキャラリストを取得する
            # 存在しなかったら、charactor_source2をcharactor_source1と同じにする
            # 20240425追加
            # サイトの構造が変わったため、スイッチの位置が違う
            # xpath = "/html/body/div/div/div[1]/div/div/div[1]/div[2]/div/div[1]/select"
            xpath = "/html/body/div[2]/div/div[2]/div[2]/div/div[3]/div[2]/div/select"
            try:
                element = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, xpath))
                )
                select = Select(element)
                select.select_by_value("on")
                time.sleep(1)
                driver.refresh()
                time.sleep(3)
                charactor_source2 = driver.page_source
            except Exception as e:
                print(f"Error: {e}")
                write_error_log(e)
                charactor_source2 = charactor_source1
                print("キャラクターソース2を1と同じにしました。")
            print("キャラリストを取得できました。")
            get_charlist = True
            driver.quit()
            break
        except TimeoutError as e:
            print(f"TimeOutError: {e}")
            write_error_log(e)
        except Exception as e:
            print(f"Error: {e}")
            write_error_log(e)
            
    if not get_charlist:
        print("キャラリストを取得できませんでした。")
        write_error_log("!!could not get charactor list. Finish Genshin.py!!")
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
    print(char_id_all)
    print("unreleased_list", unreleased_list)

    try:
        with open("release_diff.csv", "w", encoding="utf-8") as f:
            f.write(", ".join(unreleased_list))
        print("release_difを保存しました")
    except Exception as e:
        print(f"release_diffの書き込み中にエラーが発生しました: {e}")
        write_error_log(f"error occured in writing release_diff.csv: {e}")
        
        
    try:
        with open("Genshin_data.json", "w", encoding="utf-8") as output_file:
            output_file.write(json.dumps(charactor_result, ensure_ascii=False))
        print("結果がGenshin_data.jsonに書き込まれました。")
    except Exception as e:
        print(f"ファイルの書き込み中にエラーが発生しました: {e}")
        write_error_log(f"error occured while writing: {e}")
    #################
    # 没
    # # 降順でソート(やっぱいらなくね)https://www.youtube.com/watch?v=o420yQ9zYcg&list=PLsQRM9WM4rCp0a5U_4H-VNEhKnsjvcxhO&index=18
    # with open("Genshin_data.json", "r", encoding="utf-8") as f:
    #     char_json_data = json.load(f)
    # sorted_json_data = {
    #     k: v for k, v in sorted(char_json_data.items(), key=lambda item: item[0], reverse=True)
    # }
    # with open("data/Genshin_char.json", "w", encoding="utf-8") as f:
    #     json.dump(sorted_json_data, f, ensure_ascii=False, indent=4)
    # # for debug
    # with open("Genshin_data.json", "r", encoding="utf-8") as f:
    #     charactor_result = json.load(f)
    #################
    # finished_char_list = []

    driver = webdriver.Firefox(
        options=options, seleniumwire_options=seleniumwire_options
    )
    edit_config = False
    # 一回tableにしちゃえば十分
    error_gethtml_list = []
    for id in charactor_result:
        char_id = id
        char_name = charactor_result[id]["name"]
        if not os.path.exists(f"html/{char_id}"):
            os.makedirs(f"html/{char_id}")
            print(f"作成:html/{char_id}")
        for kind in html_kind:
            # 既にあるやつをスキップするときはFalse andの前に#をつける
            if (
                False and
                f"{char_name}_{kind}.html" in os.listdir(f"html/{char_id}")
                and len(html_kind)
                + avater2_list.count(char_name)
                + avater3_list.count(char_name)
                == len(os.listdir(f"html/{char_id}"))
            ):
                print("既に完了しているためスキップ:", char_name, kind)
                continue
                # None
            else:
                try:
                    url = f"https://ambr.top/jp/archive/avatar/{char_id}/{char_name}?mode={kind}"
                    driver.get(url)
                    time.sleep(4)
                    if not edit_config:
                        edit_config = True
                        # tableにする
                        js_script1 = """
                        var selElements = document.querySelectorAll('.rounded-md.font-whitney.text-lg.text-amberDark-600');
                        for (var i = 0; i < selElements.length; i++) {
                            if (i == 2) {
                                var selectElement = selElements[i];
                                selectElement.value = 'table';
                                var event = new Event('change', {
                                    'bubbles': true,
                                    'cancelable': true
                                });
                                selectElement.dispatchEvent(event);
                            }
                        }
                        """
                        driver.execute_script(js_script1)
                        time.sleep(1)
                        # popup消す
                        driver.refresh()
                        time.sleep(4)
                    page_source = driver.page_source

                    filename = f"html/{char_id}/{char_name}_{kind}.html"
                    with open(filename, "w", encoding="utf-8") as output_file:
                        output_file.write(str(page_source))
                    print(f"保存:{char_name}_{kind}.html")

                    if kind == "other" and char_name in avater2_list:
                        for _ in range(3):
                            try:
                                ## skin複数の場合
                                avater2 = driver.find_element(
                                    By.XPATH,
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[2]/div/span[2]",
                                )
                                avater2.click()
                                time.sleep(4)
                                page_source2 = driver.page_source
                                filename = f"html/{char_id}/{char_name}_{kind}_2.html"
                                with open(filename, "w", encoding="utf-8") as output_file:
                                    output_file.write(str(page_source2))
                                print(f"保存:{char_name}_{kind}_2.html")
                                break
                            except TimeoutError as e:
                                error_gethtml_list.append(f"タイムアウト:{char_name}_{kind}")
                                print(kind, f"TimeOutError: {e}")
                                write_error_log(f"{char_name},{e}")
                            except Exception as e:
                                error_gethtml_list.append(f"エラー:{char_name}_{kind}")
                                print(kind, f"Error: {e}")
                                write_error_log(f"{char_name},{e}")
                    if kind == "other" and char_name in avater3_list:
                        for _ in range(3):
                            try:
                                ## skin複数の場合
                                avater3 = driver.find_element(
                                    By.XPATH,
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[2]/div/span[3]",
                                )
                                avater3.click()
                                time.sleep(4)
                                page_source3 = driver.page_source
                                filename = f"html/{char_id}/{char_name}_{kind}_3.html"
                                with open(filename, "w", encoding="utf-8") as output_file:
                                    output_file.write(str(page_source3))
                                print(f"保存:{char_name}_{kind}_3.html")
                                break
                            except TimeoutError as e:
                                error_gethtml_list.append(f"タイムアウト:{char_name}_{kind}")
                                print(kind, f"TimeOutError: {e}")
                                write_error_log(f"{char_name},{e}")
                            except Exception as e:
                                error_gethtml_list.append(f"エラー:{char_name}_{kind}")
                                print(kind, f"Error: {e}")
                                write_error_log(f"{char_name},{e}")
                except TimeoutError as e:
                    error_gethtml_list.append(f"タイムアウト:{char_name}_{kind}")
                    print(kind, f"TimeOutError: {e}")
                    write_error_log(f"{char_name},{e}")
                except Exception as e:
                    error_gethtml_list.append(f"エラー:{char_name}_{kind}")
                    print(kind, f"Error: {e}")
                    write_error_log(f"{char_name},{e}")
            # サーバー負荷軽減
            time.sleep(1)
    driver.quit()
    print("ブラウザを閉じました")
    print("error_gethtml_list", error_gethtml_list)
    if len(error_gethtml_list) > 0:
        write_error_log(f"error_gethtml_list:{error_gethtml_list}")
    print("完了していないキャラ:", charactor_result)
    # #
    # # 終わってるキャラはcharactor_resultから削除する
    # # 次に、htmlからxpathで要素を抽出する
    # # 動作ok
    #
    error_xpath_list = []
    for id in charactor_result:
        char_id = id
        char_name = charactor_result[id]["name"]
        if not os.path.exists(f"html/{char_id}"):
            error_xpath_list.append(f"xpath error: {char_name}_{kind}")
            print(f"{char_name}でディレクトリhtml/{char_id}が見つかりませんでした。スキップします。")
            write_error_log(f"could not find html/{char_id} in {char_name}. skipped it.")
            break
        print(f"xpath抽出の処理開始:{char_name}")
        for kind in html_kind:
            # if charactor_result[id]["data"].get(kind):
            #     print(f"既に完了しているためxpathをスキップ:{char_name}_{kind}.html")
            #     break
            if not os.path.exists(f"html/{char_id}/{char_name}_{kind}.html"):
                error_xpath_list.append(f"xpath error: {char_name}_{kind}.html")
                print(
                    f"{char_name}でhtml/{char_id}/{char_name}_{kind}.htmlが見つかりませんでした。スキップします。"
                )
                write_error_log(
                    f"could not find html/{char_id}/{char_name}_{kind}.html in {char_name}. skipped it."
                )
                break
            if kind != "other":
                with open(
                    f"html/{char_id}/{char_name}_{kind}.html", "r", encoding="utf-8"
                ) as f:
                    html_data = f.read()
                doc = html.fromstring(html_data)
                try:
                    if kind == "profile":
                        name_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[1]/div[2]/div/div[1]/h1"
                        )
                        sub_name_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[1]/div[2]/div/h2"
                        )
                        amount_of_star_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[1]/div[2]/div/div[2]"
                        )
                        base_hp_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[1]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[1]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[2]/table/tr[1]/td[2]"
                            )
                        )
                        base_atk_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[2]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[2]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[2]/table/tr[2]/td[2]"
                            )
                        )
                        base_def_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[3]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[3]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[2]/table/tr[3]/td[2]"
                            )
                        )
                        bonus_name_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[4]/td[1]/span[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[4]/td[1]/span[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[2]/table/tr[4]/td[1]/span[2]"
                            )
                        )
                        bonus_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[4]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[2]/table/tr[4]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[2]/table/tr[4]/td[2]"
                            )
                        )
                        # 順番変わった
                        # 20230930修正
                        element_icon_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[1]/td[2]/img"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[1]/td[2]/img"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[1]/td[2]/img"
                            )
                        )
                        # 20230930追加
                        weapon_icon_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[2]/td[2]/img"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[2]/td[2]/img"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[3]/td[2]/img"
                            )
                        )
                        constellation_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[3]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[3]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[3]/td[2]"
                            )
                        )
                        # cv未公開だとここら辺ずれる
                        affiliation_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[4]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[4]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[4]/td[2]"
                            )
                        )
                        birth_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[5]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[5]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[5]/td[2]"
                            )
                        )
                        cv_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[8]/td[2]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[3]/table/tr[8]/td[2]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[3]/table/tr[8]/td[2]"
                            )
                        )

                        description_e = (
                            doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[4]"
                            )
                            if doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div/div/div/div/div[4]"
                            )
                            else doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div/div/div[4]"
                            )
                        )

                        name = name_e[0].text_content()
                        sub_name = sub_name_e[0].text_content()
                        amount_of_star = str(
                            html.tostring(
                                amount_of_star_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .count("<div>")
                        )
                        base_hp = base_hp_e[0].text_content()
                        base_atk = base_atk_e[0].text_content()
                        base_def = base_def_e[0].text_content()
                        bonus_name = bonus_name_e[0].text_content()
                        bonus = bonus_e[0].text_content()
                        element_icon = element_icon_e[0].attrib["src"]
                        weapon_icon = weapon_icon_e[0].attrib["src"]
                        constellation = constellation_e[0].text_content()
                        affiliation = affiliation_e[0].text_content()
                        birth = birth_e[0].text_content()
                        cv = cv_e[0].text_content() if len(cv_e) > 0 else ""
                        description = description_e[0].text_content().replace("\n", "")

                        xpath_result = {
                            "name": name,
                            "sub_name": sub_name,
                            "amount_of_star": amount_of_star,
                            "base_hp": base_hp,
                            "base_atk": base_atk,
                            "base_def": base_def,
                            "bonus_name": bonus_name,
                            "bonus": bonus,
                            "element_icon": element_icon,
                            "weapon_icon": weapon_icon,
                            "constellation": constellation,
                            "affiliation": affiliation,
                            "birth": birth,
                            "cv": cv,
                            "description": description,
                        }
                        for key in xpath_result:
                            if isinstance(xpath_result[key], str):
                                xpath_result[key] = xpath_result[key].strip()

                    elif kind == "talent":
                        normal_atk_icon_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]/img"
                        )
                        normal_atk_title_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[1]/div[2]/div"
                        )
                        normal_atk_description_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[1]/div[3]/div/div[1]/div[2]/div/div"
                        )
                        normal_atk_table_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[1]/div[3]/div/div[2]/div[2]/table"
                        )

                        skill_icon_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/div[2]/img"
                        )
                        skill_title_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/div[2]/div"
                        )
                        skill_description_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/div[3]/div/div[1]/div[2]/div/div"
                        )
                        skill_table_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[2]/div[3]/div/div[2]/div[2]/table"
                        )

                        if char_name in sprinter_list:
                            print("scajvdwraiebthw49uapp85phbw9485hbhb8pw8h8\ng43qph89g4")
                            sprint_icon_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[2]/img"
                            )
                            sprint_title_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[2]/div"
                            )
                            sprint_description_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[3]/div/div[1]/div[2]/div/div"
                            )
                            sprint_table_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[3]/div/div[2]/div[2]/table"
                            )
                            ult_icon_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[4]/div[2]/img"
                            )
                            ult_title_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[4]/div[2]/div"
                            )
                            ult_description_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[4]/div[3]/div/div[1]/div[2]/div/div"
                            )
                            ult_table_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[4]/div[3]/div/div[2]/div[2]/table"
                            )
                        else:
                            ult_icon_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[2]/img"
                            )
                            ult_title_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[2]/div"
                            )
                            ult_description_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[3]/div/div[1]/div[2]/div/div"
                            )
                            ult_table_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[1]/div[3]/div[3]/div/div[2]/div[2]/table"
                            )

                        uniq1_icon_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/div[1]/img"
                        )
                        uniq1_name_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/div[1]/div"
                        )
                        uniq1_description_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]/div/div/div[2]/div/div"
                        )

                        uniq2_icon_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[1]/img"
                        )
                        uniq2_name_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[1]/div"
                        )
                        uniq2_description_e = doc.xpath(
                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[2]/div/div/div[2]/div/div"
                        )

                        # travelerは3ない
                        if "10000005" not in char_id and "10000007" not in char_id:
                            uniq3_icon_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[1]/img"
                            )
                            uniq3_name_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[1]/div"
                            )
                            uniq3_description_e = doc.xpath(
                                "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[2]/div/div/div[2]/div/div"
                            )

                        normal_atk_icon = normal_atk_icon_e[0].attrib["src"]
                        normal_atk_title = (
                            normal_atk_title_e[0].text_content().replace("JP0B", "")
                        )
                        normal_atk_description = (
                            html.tostring(
                                normal_atk_description_e[0],
                                encoding="utf-8",
                                pretty_print=True,
                            )
                            .decode("utf-8")
                            .replace("<br>", "\n")
                            .replace("<div>", "")
                            .replace("</div>", "")
                            .replace("<i>", "")
                            .replace("</i>", "")
                            .replace("JP0B", "")
                        )
                        normal_atk_table = (
                            html.tostring(
                                normal_atk_table_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("JP0B", "")
                        )

                        skill_icon = skill_icon_e[0].attrib["src"]
                        skill_title = skill_title_e[0].text_content().replace("JP0B", "")
                        skill_description = (
                            html.tostring(
                                skill_description_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("<br>", "\n")
                            .replace("<div>", "")
                            .replace("</div>", "")
                            .replace("<i>", "")
                            .replace("</i>", "")
                            .replace("JP0B", "")
                        )
                        skill_table = (
                            html.tostring(
                                skill_table_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("JP0B", "")
                        )

                        if char_name in sprinter_list:
                            sprint_icon = sprint_icon_e[0].attrib["src"]
                            sprint_title = (
                                sprint_title_e[0].text_content().replace("JP0B", "")
                            )
                            sprint_description = (
                                html.tostring(
                                    sprint_description_e[0],
                                    encoding="utf-8",
                                    pretty_print=True,
                                )
                                .decode("utf-8")
                                .replace("<br>", "\n")
                                .replace("<div>", "")
                                .replace("</div>", "")
                                .replace("<i>", "")
                                .replace("</i>", "")
                                .replace("JP0B", "")
                            )
                            sprint_table = html.tostring(
                                sprint_table_e[0], encoding="utf-8", pretty_print=True
                            ).decode("utf-8")

                        ult_icon = ult_icon_e[0].attrib["src"]
                        ult_title = ult_title_e[0].text_content().replace("JP0B", "")
                        ult_description = (
                            html.tostring(
                                ult_description_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("<br>", "\n")
                            .replace("<div>", "")
                            .replace("</div>", "")
                            .replace("<i>", "")
                            .replace("</i>", "")
                            .replace("JP0B", "")
                        )
                        ult_table = (
                            html.tostring(
                                ult_table_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("JP0B", "")
                        )

                        uniq1_icon = uniq1_icon_e[0].attrib["src"]
                        uniq1_name = uniq1_name_e[0].text_content().replace("JP0B", "")
                        uniq1_description = (
                            html.tostring(
                                uniq1_description_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("<br>", "\n")
                            .replace("<div>", "")
                            .replace("</div>", "")
                            .replace("JP0E", "")
                            .replace("JP0B", "")
                        )

                        uniq2_icon = uniq2_icon_e[0].attrib["src"]
                        uniq2_name = uniq2_name_e[0].text_content().replace("JP0B", "")
                        uniq2_description = (
                            html.tostring(
                                uniq2_description_e[0], encoding="utf-8", pretty_print=True
                            )
                            .decode("utf-8")
                            .replace("<br>", "\n")
                            .replace("<div>", "")
                            .replace("</div>", "")
                            .replace("JP0E", "")
                            .replace("JP0B", "")
                        )

                        # travelerは3ない
                        if "10000005" not in char_id and "10000007" not in char_id:
                            uniq3_icon = uniq3_icon_e[0].attrib["src"]
                            uniq3_name = uniq3_name_e[0].text_content().replace("JP0B", "")
                            uniq3_description = (
                                html.tostring(
                                    uniq3_description_e[0],
                                    encoding="utf-8",
                                    pretty_print=True,
                                )
                                .decode("utf-8")
                                .replace("<br>", "\n")
                                .replace("<div>", "")
                                .replace("</div>", "")
                                .replace("JP0E", "")
                                .replace("JP0B", "")
                            )

                        ### table to list ###
                        def table_to_list(html_table):
                            soup = BeautifulSoup(html_table, "html.parser")
                            header = soup.find("thead")
                            data = soup.find("tbody")
                            header_cells = [
                                cell.text.strip() for cell in header.find_all("td")
                            ]
                            data_rows = data.find_all("tr")
                            table_data = []
                            for row in data_rows:
                                row_cells = [
                                    cell.text.strip() for cell in row.find_all("td")
                                ]
                                table_data.append(row_cells)
                            table = {
                                header_cells[i]: [row[i] for row in table_data]
                                for i in range(len(header_cells))
                            }
                            return table

                        normal_atk_table = table_to_list(normal_atk_table)
                        skill_table = table_to_list(skill_table)
                        if char_name in sprinter_list:
                            sprint_table = table_to_list(sprint_table)
                        ult_table = table_to_list(ult_table)

                        xpath_result = {
                            "normal_atk_icon": normal_atk_icon,
                            "normal_atk_title": normal_atk_title,
                            "normal_atk_description": normal_atk_description,
                            "normal_atk_table": normal_atk_table,
                            "skill_icon": skill_icon,
                            "skill_title": skill_title,
                            "skill_description": skill_description,
                            "skill_table": skill_table,
                            "ult_icon": ult_icon,
                            "ult_title": ult_title,
                            "ult_description": ult_description,
                            "ult_table": ult_table,
                            "uniq1_icon": uniq1_icon,
                            "uniq1_name": uniq1_name,
                            "uniq1_description": uniq1_description,
                            "uniq2_icon": uniq2_icon,
                            "uniq2_name": uniq2_name,
                            "uniq2_description": uniq2_description,
                        }
                        # travelerは3ない
                        if "10000005" not in char_id and "10000007" not in char_id:
                            xpath_result["uniq3_icon"] = uniq3_icon
                            xpath_result["uniq3_name"] = uniq3_name
                            xpath_result["uniq3_description"] = uniq3_description
                        if char_name in sprinter_list:
                            xpath_result["sprint_icon"] = sprint_icon
                            xpath_result["sprint_title"] = sprint_title
                            xpath_result["sprint_description"] = sprint_description
                            xpath_result["sprint_table"] = sprint_table
                        for key in xpath_result:
                            if isinstance(xpath_result[key], str):
                                xpath_result[key] = xpath_result[key].strip()
                    elif kind == "constellation":
                        xpath_result = {}
                        for i in range(6):
                            constellation_icon_e = doc.xpath(
                                f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[{i+1}]/div[1]/img"
                            )
                            constellation_name_e = doc.xpath(
                                f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[{i+1}]/div[1]/div"
                            )
                            constellation_description_e = doc.xpath(
                                f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[{i+1}]/div[2]/div/div/div/div/div"
                            )
                            constellation_icon = constellation_icon_e[0].attrib["src"]
                            constellation_name = (
                                constellation_name_e[0]
                                .text_content()
                                .replace("\n", "")
                                .replace("JP0B", "")
                            )
                            constellation_description = (
                                html.tostring(
                                    constellation_description_e[0],
                                    encoding="utf-8",
                                    pretty_print=True,
                                )
                                .decode("utf-8")
                                .replace("<br>", "\n")
                                .replace("<div>", "")
                                .replace("</div>", "")
                                .replace("JP0B", "")
                            )

                            xpath_result[str(i + 1)] = {
                                "constellation_icon": constellation_icon,
                                "constellation_name": constellation_name,
                                "constellation_description": constellation_description,
                            }
                            for key in xpath_result[str(i + 1)]:
                                if isinstance(xpath_result[str(i + 1)][key], str):
                                    xpath_result[str(i + 1)][key] = xpath_result[
                                        str(i + 1)
                                    ][key].strip()

                    elif kind == "ascension":
                        xpath_result = {}
                        asc_num = 17
                        if "10000005" in char_id or "10000007" in char_id:
                            asc_num = 23
                        for i in range(asc_num):
                            item_icon_e = doc.xpath(
                                f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[1]/div/div[{i+1}]/div/div[2]/span/img"
                            )
                            item_icon = item_icon_e[0].attrib["src"]
                            xpath_result[str(i + 1)] = item_icon
                    elif kind == "story":
                        # あーろいは別
                        if "10000062" not in char_id:
                            xpath_result = {}
                            char_detail_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[1]/div[2]/div/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[1]/div[2]/div/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[1]/div[2]/div/div"
                                )
                            )

                            if "10000005" not in char_id and "10000007" not in char_id:
                                story1_e = (
                                    doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[2]/div[2]/div[3]/div"
                                    )
                                    if doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[2]/div[2]/div[3]/div"
                                    )
                                    else doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[2]/div[2]/div[3]/div"
                                    )
                                )
                            else:
                                story1_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[2]/div[2]/div/div"
                                )
                            story2_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[3]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[3]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[3]/div[2]/div[3]/div"
                                )
                            )
                            story3_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[4]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[4]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[4]/div[2]/div[3]/div"
                                )
                            )
                            story4_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[5]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[5]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[5]/div[2]/div[3]/div"
                                )
                            )
                            story5_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[6]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[6]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[6]/div[2]/div[3]/div"
                                )
                            )
                            story_uniq_name_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[7]/div[1]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[7]/div[1]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[7]/div[1]/div"
                                )
                            )
                            story_uniq_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[7]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[7]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[7]/div[2]/div[3]/div"
                                )
                            )
                            story_eye_name_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[8]/div[1]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[8]/div[1]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[8]/div[1]/div"
                                )
                            )
                            story_eye_e = (
                                doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[8]/div[2]/div[3]/div"
                                )
                                if doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div[3]/div[8]/div[2]/div[3]/div"
                                )
                                else doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div[2]/div[8]/div[2]/div[3]/div"
                                )
                            )

                            if len(char_detail_e) >= 1:
                                char_detail = (
                                    (
                                        html.tostring(
                                            char_detail_e[0],
                                            encoding="utf-8",
                                            pretty_print=True,
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(char_detail_e) > 0
                                    else ""
                                )
                                story1 = (
                                    (
                                        html.tostring(
                                            story1_e[0], encoding="utf-8", pretty_print=True
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story1_e) > 0
                                    else ""
                                )
                                story2 = (
                                    (
                                        html.tostring(
                                            story2_e[0], encoding="utf-8", pretty_print=True
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story2_e) > 0
                                    else ""
                                )
                                story3 = (
                                    (
                                        html.tostring(
                                            story3_e[0], encoding="utf-8", pretty_print=True
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story3_e) > 0
                                    else ""
                                )
                                story4 = (
                                    (
                                        html.tostring(
                                            story4_e[0], encoding="utf-8", pretty_print=True
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story4_e) > 0
                                    else ""
                                )
                                story5 = (
                                    (
                                        html.tostring(
                                            story5_e[0], encoding="utf-8", pretty_print=True
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story5_e) > 0
                                    else ""
                                )
                                story_uniq_name = story_uniq_name_e[0].text_content()
                                story_uniq = (
                                    (
                                        html.tostring(
                                            story_uniq_e[0],
                                            encoding="utf-8",
                                            pretty_print=True,
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story_uniq_e) > 0
                                    else ""
                                )
                                story_eye_name = story_eye_name_e[0].text_content()
                                story_eye = (
                                    (
                                        html.tostring(
                                            story_eye_e[0],
                                            encoding="utf-8",
                                            pretty_print=True,
                                        )
                                        .decode("utf-8")
                                        .replace("<br>", "\n")
                                        .replace("<div>", "")
                                        .replace("</div>", "")
                                        .replace("<i>", "")
                                        .replace("</i>", "")
                                        .replace("JP0B", "")
                                    )
                                    if len(story_eye_e) > 0
                                    else ""
                                )

                                xpath_result = {
                                    "char_detail": char_detail,
                                    "story1": story1,
                                    "story2": story2,
                                    "story3": story3,
                                    "story4": story4,
                                    "story5": story5,
                                    "story_uniq_name": story_uniq_name,
                                    "story_uniq": story_uniq,
                                    "story_eye_name": story_eye_name,
                                    "story_eye": story_eye,
                                }

                            for key in xpath_result:
                                if isinstance(xpath_result[key], str):
                                    xpath_result[key] = xpath_result[key].strip()
                        else:
                            xpath_result = {}
                except Exception as e:
                    error_xpath_list.append(f"error: {char_name}_{kind}")
                    print(kind, f"Error: {e}")
                    write_error_log(f"{char_name},{e}")
                    continue

                output_file_path = "Genshin_data.json"
                with open(output_file_path, "r", encoding="utf-8") as output_file:
                    charactor_result = json.load(output_file)

                charactor_result[char_id]["data"][kind] = xpath_result

                with open(output_file_path, "w", encoding="utf-8") as output_file:
                    output_file.write(json.dumps(charactor_result, ensure_ascii=False))
                print(f"記録:{char_name}_{kind}")
            # travelerはotherない
            elif kind == "other":
                if "10000005" not in char_id and "10000007" not in char_id:
                    try:
                        amount_of_skin = (
                            1
                            + avater2_list.count(char_name)
                            + avater3_list.count(char_name)
                        )
                        xpath_result = {}
                        for i in range(amount_of_skin):
                            if i == 0:
                                with open(
                                    f"html/{char_id}/{char_name}_{kind}.html",
                                    "r",
                                    encoding="utf-8",
                                ) as f:
                                    data = f.read()
                            else:
                                with open(
                                    f"html/{char_id}/{char_name}_{kind}_{i+1}.html",
                                    "r",
                                    encoding="utf-8",
                                ) as f:
                                    data = f.read()
                            doc = html.fromstring(data)

                            if i == 0:
                                namecard_icon_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div/div/div[1]/div[2]/div[1]/div[1]/img"
                                )
                                namecard_name_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[1]/div[2]/div[1]/div[2]"
                                )
                                namecard_description_e = (
                                    doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[1]/div[2]/div[2]/div"
                                    )
                                    if doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[1]/div[2]/div[2]/div"
                                    )
                                    else doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[1]/div[2]/div[2]/div"
                                    )
                                )
                                # raidenは料理ない
                                if "10000052" not in char_id:
                                    dish_icon_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[2]/div/a/div/div/div[1]/span/img[2]"
                                    )
                                    dish_name_e = (
                                        doc.xpath(
                                            "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[2]/div/a/div/div/div[2]/span"
                                        )
                                        if doc.xpath(
                                            "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[2]/div/a/div/div/div[2]/span"
                                        )
                                        else doc.xpath(
                                            "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[2]/div[2]/div/a/div/div/div[2]/span"
                                        )
                                    )
                                    outfit_icon_e = doc.xpath(
                                        f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[2]/div/span[{i+1}]/img"
                                    )
                                    outfit_name_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/span[1]"
                                    )
                                    outfit_text_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/div"
                                    )
                                    outfit_avater_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/span[2]/img"
                                    )

                                    dish_icon = dish_icon_e[0].attrib["src"]
                                    dish_name = (
                                        dish_name_e[0].text_content().replace("JP0Y", "")
                                        if dish_name_e[0].text_content()
                                        else ""
                                    )
                                else:
                                    # raidenのみ
                                    outfit_icon_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[2]/div/span/img"
                                    )
                                    outfit_name_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[3]/span[1]"
                                    )
                                    outfit_text_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[3]/div"
                                    )
                                    outfit_avater_e = doc.xpath(
                                        "/html/body/div/main/div/div[2]/div[2]/div/div/div[2]/div[3]/span[2]/img"
                                    )

                                namecard_icon = namecard_icon_e[0].attrib["src"]
                                namecard_name = namecard_name_e[0].text_content()
                                namecard_description = (
                                    html.tostring(
                                        namecard_description_e[0],
                                        encoding="utf-8",
                                        pretty_print=True,
                                    )
                                    .decode("utf-8")
                                    .replace("<br>", "\n")
                                    .replace("<div>", "")
                                    .replace("</div>", "")
                                )
                                outfit_icon = outfit_icon_e[0].attrib["src"]
                                outfit_name = outfit_name_e[0].text_content().replace("JP0G", "")
                                outfit_text = (
                                    outfit_text_e[0].text_content().replace("JP0B", "").replace("JP0G", "")
                                    if outfit_text_e[0].text_content()
                                    else ""
                                )
                                outfit_avater = outfit_avater_e[0].attrib["src"]

                                xpath_result[str(i + 1)] = {
                                    "namecard_icon": namecard_icon,
                                    "namecard_name": namecard_name,
                                    "namecard_description": namecard_description,
                                    "outfit_icon": outfit_icon,
                                    "outfit_name": outfit_name,
                                    "outfit_text": outfit_text,
                                    "outfit_avater": outfit_avater,
                                }
                                if "10000052" not in char_id:
                                    xpath_result[str(i + 1)]["dish_icon"] = dish_icon
                                    xpath_result[str(i + 1)]["dish_name"] = dish_name

                                for key in xpath_result[str(i + 1)]:
                                    if isinstance(xpath_result[str(i + 1)][key], str):
                                        xpath_result[str(i + 1)][key] = xpath_result[
                                            str(i + 1)
                                        ][key].strip()
                            else:
                                outfit_icon_e = doc.xpath(
                                    f"/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[2]/div/span[{i+1}]/img"
                                )
                                outfit_name_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/span[1]"
                                )
                                outfit_text_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/div[1]"
                                )
                                outfit_description_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/div[2]/div[2]"
                                )
                                outfit_avater_e = doc.xpath(
                                    "/html/body/div/main/div/div[2]/div[2]/div[1]/div/div[3]/div[3]/span[2]/img"
                                )
                                outfit_icon = outfit_icon_e[0].attrib["src"]
                                outfit_name = outfit_name_e[0].text.replace("JP0G", "")
                                outfit_text = outfit_text_e[0].text.replace("JP0B", "").replace("JP0G", "")
                                outfit_description = outfit_description_e[0].text.replace(
                                    "JP0B", ""
                                )
                                outfit_avater = outfit_avater_e[0].attrib["src"]

                                xpath_result[str(i + 1)] = {
                                    "outfit_icon": outfit_icon,
                                    "outfit_name": outfit_name,
                                    "outfit_text": outfit_text,
                                    "outfit_description": outfit_description,
                                    "outfit_avater": outfit_avater,
                                }
                                for key in xpath_result[str(i + 1)]:
                                    if isinstance(xpath_result[str(i + 1)][key], str):
                                        xpath_result[str(i + 1)][key] = xpath_result[
                                            str(i + 1)
                                        ][key].strip()
                    except Exception as e:
                        error_xpath_list.append(f"error: {char_name}_{kind}")
                        print(kind, f"Error: {e}")
                        write_error_log(f"{e}\n{char_name}")
                        continue
                elif "10000005" in char_id:
                    try:
                        xpath_result = {}
                        xpath_result["1"] = {
                            "namecard_icon": "",
                            "namecard_name": "",
                            "namecard_description": "",
                            "dish_icon": "",
                            "dish_name": "",
                            "outfit_icon": "https://api.ambr.top/assets/UI/UI_AvatarIcon_PlayerBoy.png",
                            "outfit_name": "",
                            "outfit_text": "",
                            "outfit_avater": "https://api.ambr.top/assets/UI/UI_Gacha_AvatarImg_PlayerBoy.png",
                        }
                    except Exception as e:
                        error_xpath_list.append(f"error: {char_name}_{kind}")
                        print(kind, f"Error: {e}")
                        write_error_log(f"{e}\n{char_name}")
                        continue
                elif "10000007" in char_id:
                    try:
                        xpath_result = {}
                        xpath_result["1"] = {
                            "namecard_icon": "",
                            "namecard_name": "",
                            "namecard_description": "",
                            "dish_icon": "",
                            "dish_name": "",
                            "outfit_icon": "https://api.ambr.top/assets/UI/UI_AvatarIcon_PlayerGirl.png",
                            "outfit_name": "",
                            "outfit_text": "",
                            "outfit_avater": "https://api.ambr.top/assets/UI/UI_Gacha_AvatarImg_PlayerGirl.png",
                        }
                    except Exception as e:
                        error_xpath_list.append(f"error: {char_name}_{kind}")
                        print(kind, f"Error: {e}")
                        write_error_log(f"{e}\n{char_name}")
                        continue

                output_file_path = "Genshin_data.json"
                with open(output_file_path, "r", encoding="utf-8") as output_file:
                    charactor_result = json.load(output_file)

                charactor_result[char_id]["data"][kind] = xpath_result

                with open(output_file_path, "w", encoding="utf-8") as output_file:
                    output_file.write(json.dumps(charactor_result, ensure_ascii=False))
                print(f"記録:{char_name}_{kind}")
        print(f"xpath抽出の処理を完了:{char_name}")
    print("xpathでの抽出が完了しました")
    print("error_xpath_list", error_xpath_list)
    if len(error_xpath_list) > 0:
        write_error_log(f"error_xpath_list: {error_xpath_list}")
    # ###
    # ###
    # for debug
    # # # 次に、urlから画像を取得する
    # # # 動作ok
    ## charactor_result = {}

    if not os.path.exists(f"mat/icon"):
        os.makedirs(f"mat/icon")
        print(f"作成:mat/icon")
    print("urlから画像パスを取得します")
    for id in charactor_result:
        char_id = id
        char_name = charactor_result[id]["name"]
        icon_url_set = set()  # 重複なし
        try:
            icon_url_set.update(
                [
                    charactor_result[id]["data"]["profile"]["element_icon"],
                    # 20230930追加
                    charactor_result[id]["data"]["profile"]["weapon_icon"],
                    # ここまで
                    charactor_result[id]["data"]["talent"]["normal_atk_icon"],
                    charactor_result[id]["data"]["talent"]["skill_icon"],
                    charactor_result[id]["data"]["talent"]["ult_icon"],
                    charactor_result[id]["data"]["talent"]["uniq1_icon"],
                    charactor_result[id]["data"]["talent"]["uniq2_icon"],
                    charactor_result[id]["data"]["constellation"]["1"][
                        "constellation_icon"
                    ],
                    charactor_result[id]["data"]["constellation"]["2"][
                        "constellation_icon"
                    ],
                    charactor_result[id]["data"]["constellation"]["3"][
                        "constellation_icon"
                    ],
                    charactor_result[id]["data"]["constellation"]["4"][
                        "constellation_icon"
                    ],
                    charactor_result[id]["data"]["constellation"]["5"][
                        "constellation_icon"
                    ],
                    charactor_result[id]["data"]["constellation"]["6"][
                        "constellation_icon"
                    ],
                ]
            )
            asc_num = 17
            if "10000005" in char_id or "10000007" in char_id:
                asc_num = 23
            for i in range(asc_num):
                icon_url_set.add(charactor_result[id]["data"]["ascension"][str(i + 1)])
            amount_of_skin = (
                1 + avater2_list.count(char_name) + avater3_list.count(char_name)
            )
            if char_name in sprinter_list:
                icon_url_set.add(charactor_result[id]["data"]["talent"]["sprint_icon"])
            if "10000005" not in char_id and "10000007" not in char_id:
                icon_url_set.add(charactor_result[id]["data"]["talent"]["uniq3_icon"])
        except Exception as e:
            print(f"画像URLの取得に失敗:{char_name}で\n{str(e)}")
            write_error_log(f"could not find url in {char_name}: {str(e)}")
        try:
            if "10000052" not in char_id:
                icon_url_set.add(charactor_result[id]["data"]["other"]["1"]["dish_icon"])
            icon_url_set.add(charactor_result[id]["data"]["other"]["1"]["namecard_icon"])
            icon_url_set.add(charactor_result[id]["data"]["other"]["1"]["outfit_icon"])
            icon_url_set.add(charactor_result[id]["data"]["other"]["1"]["outfit_avater"])
            if amount_of_skin > 1:
                for i in range(amount_of_skin):
                    icon_url_set.add(
                        charactor_result[id]["data"]["other"][str(i + 1)]["outfit_icon"]
                    )
                    icon_url_set.add(
                        charactor_result[id]["data"]["other"][str(i + 1)]["outfit_avater"]
                    )
        except Exception as e:
            print(f"画像URLの取得に失敗:{char_name}で\n{str(e)}404モードで進めます")
            write_error_log(f"could not find url in {char_name}: {str(e)}")

        icon_url_list = list(icon_url_set)
        # まだ持ってない画像のみを保存する
        for url in icon_url_list:
            try:
                if url == "":
                    continue
                parsed_url = urlparse(url)
                filename = os.path.basename(parsed_url.path)
                if not any(
                    filename in existing_file for existing_file in os.listdir("mat/icon/")
                ):
                    response = requests.get(url)
                    if response.status_code == 200:
                        with open(os.path.join("mat/icon/", filename), "wb") as file:
                            file.write(response.content)
                        print(f"保存:{filename}")
                    else:
                        print(f"ダウンロードに失敗:{url}")
                        write_error_log(f"{char_name} failed to download:{url}")
                else:
                    # print(f"既に保存済み:{filename}")
                    None
            except Exception as e:
                print(f"エラー:{url}のダウンロード中に発生\n{str(e)}")
                write_error_log(f"error occured while downloading {url}\n{str(e)}")
            # サーバー負荷軽減
            time.sleep(1)
    ####################
    # ascensionの画像の名前をwebから取得する
    # 動作ok
    print("素材名を取得します")
    with open("itemname.json", "r", encoding="utf-8") as f:
        itemname = json.load(f)
    driver = webdriver.Firefox(
        options=options, seleniumwire_options=seleniumwire_options
    )
    error_get_itemname_list = []
    ct = True
    for id in charactor_result:
        char_id = id
        char_name = charactor_result[id]["name"]
        asc_num = 17
        if "10000005" in char_id or "10000007" in char_id:
            asc_num = 23
        for i in range(asc_num):
            try:
                path = charactor_result[id]["data"]["ascension"][str(i + 1)]
                parsed_path = urlparse(path)
                item_id = os.path.basename(parsed_path.path).split("_")[2].split(".")[0]
                url = "https://ambr.top/jp/archive/material/" + item_id
                if item_id == "Item":
                    continue
                if item_id not in itemname:
                    for _ in range(3):
                        try:
                            driver.get(url)
                            WebDriverWait(driver, 10).until(
                                EC.presence_of_element_located((By.TAG_NAME, "title"))
                            )
                            html_title = driver.title
                            itemname[item_id] = (
                                html_title.replace(
                                    " | Project Amber — Genshin Impact Database", ""
                                )
                                .replace("JP0Y", "")
                                .replace("| Project Amber — Genshin Impact Database", "???")
                                .replace(
                                    "Home | Project Amber — Your brand new Genshin Impact Database",
                                    "???",
                                )
                            )
                            print(f"保存:{item_id}:{html_title}")
                            break
                        except Exception as e:
                            print(f"エラー:{url}のダウンロード中に発生\n{str(e)}")
                            write_error_log(
                                f"error occured while downloading {url}\n{str(e)}"
                            )
                            error_get_itemname_list.append(item_id)
                            break
                else:
                    # print(f"既に保存済み:{item_id}")
                    None
            except Exception as e:
                print(f"エラー:{char_name}のダウンロード中に発生\n{str(e)}")
                write_error_log(f"error occured while downloading {url}\n{str(e)}")
                error_get_itemname_list.append(char_name)
                # error_get_itemname_list.append(item_id)
            # サーバー負荷軽減
            time.sleep(1)
    with open("itemname.json", "w", encoding="utf-8") as f:
        json.dump(itemname, f, ensure_ascii=False, indent=4)
    driver.quit()
    print("ブラウザを閉じました")
    print("error_get_itemname_list", error_get_itemname_list)
    ####################
    # 画像debug用のcharactor_resultここへ
    with open("Genshin_data.json", "r", encoding="utf-8") as f:
        charactor_result = json.load(f)


    ####################
    def search_icon(url):
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        return f"mat/icon/{filename}"


    def search_bonus(name):
        dic = {
            "HP": "hp",
            "攻撃力": "atk",
            "防御力": "def",
            "元素熟知": "em",
            "会心率": "critr",
            "会心ダメージ": "critd",
            "与える治療効果": "heal",
            "元素チャージ効率": "ec",
            "炎元素ダメージ": "pyro",
            "水元素ダメージ": "hydro",
            "雷元素ダメージ": "electro",
            "風元素ダメージ": "anemo",
            "氷元素ダメージ": "cryo",
            "岩元素ダメージ": "geo",
            "草元素ダメージ": "dendro",
            "物理ダメージ": "phys",
        }
        return f"mat/icon2/bonus_{dic[name]}_icon.png"


    def despan_draw(draw, font_file, text, font_size, starcord, max_width):
        x_pos = starcord[0]
        y_pos = starcord[1]
        pattern = re.compile(
            r'<span[^>]*style="color: #[a-zA-Z0-9].....">(.*?)<\/span>',
            re.DOTALL,
        )
        lines = text.split("\n")
        for line in lines:
            if "<span" in line:
                amount = line.count("<span")
                for i in range(amount):
                    start_idx = line.find("<span")
                    end_idx = line.find("</span>")
                    if start_idx != -1 and end_idx != -1:
                        style = line[start_idx : end_idx + 7]  # '<span ... </span>' の部分
                        color_start_idx = style.find("color:")
                        if color_start_idx != -1:
                            color_hex = style[color_start_idx + 8 : color_start_idx + 14]
                            text_color = tuple(
                                int(color_hex[i : i + 2], 16) for i in (0, 2, 4)
                            )
                    # マッチした部分を抽出
                    match = pattern.search(line)
                    if match:
                        x = x_pos
                        span_text = match.group(1)
                        line = pattern.sub(rf"{span_text}", line, count=1)
                        span_start = line.find(span_text)
                        ct = 0
                        for char in line:
                            if char == "<":
                                x_pos = x
                                break
                            line = line[1:]
                            if ct >= span_start and ct < span_start + len(span_text):
                                char_color = text_color
                            else:  # その他の部分
                                char_color = (255, 255, 255)
                            draw.text(
                                (x, y_pos),
                                char,
                                fill=char_color,
                                font=ImageFont.truetype(font_file, font_size),
                            )
                            char_bbox = draw.textbbox(
                                (x, y_pos),
                                char,
                                font=ImageFont.truetype(font_file, font_size),
                            )
                            char_width = char_bbox[2] - char_bbox[0]
                            x += char_width
                            ct += 1
                            # ここで改行もできる
                            if x >= max_width - font_size + starcord[0]:
                                x = starcord[0]
                                y_pos += font_size
            else:
                ct = 0
                x = x_pos
                for char in line:
                    char_color = (255, 255, 255)
                    draw.text(
                        (x, y_pos),
                        char,
                        fill=char_color,
                        font=ImageFont.truetype(font_file, font_size),
                    )
                    char_bbox = draw.textbbox(
                        (x, y_pos),
                        char,
                        font=ImageFont.truetype(font_file, font_size),
                    )
                    char_width = char_bbox[2] - char_bbox[0]
                    x += char_width
                    ct += 1
                    # ここで改行もできる
                    if x >= max_width - font_size + starcord[0]:
                        x = starcord[0]
                        y_pos += font_size
            y_pos += font_size
            x_pos = starcord[0]


    def draw_table(draw, font_file, table, font_size, starcord, blank):
        x, y = starcord[0], starcord[1]
        line_height = font_size

        Title = True
        ct = 0

        for key, values in table.items():
            if ct <= 15:
                base_y = 0
            else:
                base_y = 450 - font_size * (3 + len(values))
            draw.text(
                (x, base_y + y),
                key,
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, font_size),
                # anchor="mm",
            )
            for value in values:
                y += line_height
                draw.text(
                    (x, base_y + y),
                    value,
                    fill=(255, 255, 255),
                    font=ImageFont.truetype(font_file, font_size),
                    # anchor="mm",
                )
                ratio = 0.9
            if ct == 15:
                x = starcord[0]
                x -= blank * (1 - ratio)
            if Title:
                x += blank * ratio
                Title = False
            ct += 1
            x += blank
            y = starcord[1]


    def wrapped_text(draw, font_file, text, font_size, starcord, max_width):
        # wrapper = textwrap.TextWrapper(width=ratio)
        # draw.text(
        #     (starcord[0], starcord[1]),
        #     wrapper.fill(text),
        #     fill=(255, 255, 255),
        #     font=ImageFont.truetype(font_file, font_size),
        # )
        x_pos = starcord[0]
        y_pos = starcord[1]
        lines = text.split("\n")
        for line in lines:
            ct = 0
            x = x_pos
            for char in line:
                char_color = (255, 255, 255)
                draw.text(
                    (x, y_pos),
                    char,
                    fill=char_color,
                    font=ImageFont.truetype(font_file, font_size),
                )
                char_bbox = draw.textbbox(
                    (x, y_pos),
                    char,
                    font=ImageFont.truetype(font_file, font_size),
                )
                char_width = char_bbox[2] - char_bbox[0]
                x += char_width
                ct += 1
                # ここで改行もできる
                if x >= max_width - font_size + starcord[0]:
                    x = starcord[0]
                    y_pos += font_size
            y_pos += font_size
            x_pos = starcord[0]


    ####################
    def draw_bg(id, skin_num, kind):
        color_dic = {
            ## dark, light
            "Wind": [(31, 85, 78, 255), (51, 141, 129, 128)],
            "Rock": [(74, 58, 28, 255), (162, 126, 58, 128)],
            "Fire": [(103, 28, 28, 128), (173, 48, 48, 128)],
            "Water": [(29, 60, 105, 255), (43, 95, 172, 128)],
            "Electric": [(54, 28, 85, 255), (104, 52, 169, 128)],
            "Ice": [(67, 138, 146, 255), (105, 147, 160, 128)],
            "Grass": [(37, 80, 26, 255), (54, 147, 31, 128)],
        }
        canvas = Image.new("RGBA", (2048, 1024), (255, 255, 255, 0))
        draw = ImageDraw.Draw(canvas)

        elm = charactor_result[id]["data"]["profile"]["element_icon"]
        parsed_elm = urlparse(elm)
        elm_name = os.path.basename(parsed_elm.path).split("_")[3].split(".")[0]
        bg_color = color_dic[elm_name][0]
        bg_color_l = color_dic[elm_name][1]
        draw.rectangle((0, 0, 2048, 1024), fill=bg_color)
        canvas.paste(avater_img_list[skin_num - 1], (0, 0), avater_img_list[skin_num - 1])
        draw.rectangle((0, 0, 2048, 1024), outline=(255, 255, 255), width=10)

        rect = Image.new("RGBA", canvas.size)
        draw_rect = ImageDraw.Draw(rect)
        if kind == "profile":
            draw_rect.rounded_rectangle(
                (40, 40, 750, 640),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (1300, 40, 2048 - 40, 350),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            # 武器用
            draw_rect.rounded_rectangle(
                (2048 - 40 - 150 - 40, 350 + 40 + 20, 2048 - 40, 350 + 40 + 40 + 20 + 150),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (40, 880, 2048 - 40, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=20,
            )
            # しかく
            draw_rect.rounded_rectangle(
                (50, 400 + 5, 50 + 48, 405 + 48),
                fill=(0, 0, 0, 128),
                radius=10,
            )
            draw_rect.rounded_rectangle(
                (50, 450 + 5, 50 + 48, 455 + 48),
                fill=(0, 0, 0, 128),
                radius=10,
            )
            draw_rect.rounded_rectangle(
                (50, 500 + 5, 50 + 48, 505 + 48),
                fill=(0, 0, 0, 128),
                radius=10,
            )
            draw_rect.rounded_rectangle(
                (50, 550 + 5, 50 + 48, 555 + 48),
                fill=(0, 0, 0, 128),
                radius=10,
            )
            # 丸
            draw.ellipse(
                (1640, 210, 1640 + 50, 210 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (2048 - 40 - 150 - 20, 350 + 40 + 40, 2048 - 60, 350 + 40 + 40 + 150),
                fill=(0, 0, 0, 128),
            )
        elif kind == "talent_a":
            draw_rect.rounded_rectangle(
                (40, 40, 1024 - 20, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (1024 + 20, 40, 2048 - 40, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.ellipse(
                (50, 50, 50 + 40, 50 + 40),
                fill=(0, 0, 0, 128),
            )
            draw_rect.ellipse(
                (50 + 1024, 50, 50 + 1024 + 40, 50 + 40),
                fill=(0, 0, 0, 128),
            )
        elif kind == "talent_b":
            draw_rect.rounded_rectangle(
                (40, 40, 1024 - 20, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            # ユニーク枠
            draw_rect.rounded_rectangle(
                (1024 + 20, 620 + 40, 2048 - 40 - 660, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (1024 + 20 + 330, 620 + 40, 2048 - 40 - 330, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            # travelerは3ない
            if "10000005" not in char_id and "10000007" not in char_id:
                draw_rect.rounded_rectangle(
                    (1024 + 20 + 660, 620 + 40, 2048 - 40, 1024 - 40),
                    fill=bg_color_l,
                    outline=(255, 255, 255),
                    width=2,
                    radius=15,
                )
                draw_rect.ellipse(
                    (
                        50 + 1024 - 20 + 660,
                        620 + 50,
                        50 + 1024 - 20 + 40 + 660,
                        620 + 50 + 40,
                    ),
                    fill=(0, 0, 0, 128),
                )

            draw_rect.ellipse(
                (50, 50, 50 + 40, 50 + 40),
                fill=(0, 0, 0, 128),
            )

            # 下のユニーク
            draw_rect.ellipse(
                (50 + 1024 - 20, 620 + 50, 50 + 1024 - 20 + 40, 620 + 50 + 40),
                fill=(0, 0, 0, 128),
            )
            draw_rect.ellipse(
                (50 + 1024 - 20 + 330, 620 + 50, 50 + 1024 - 20 + 40 + 330, 620 + 50 + 40),
                fill=(0, 0, 0, 128),
            )
        # sprinter
        elif kind == "talent_b2":
            draw_rect.rounded_rectangle(
                (40, 40, 1024 - 20, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (1024 + 20, 40, 2048 - 40, 620),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            # ユニーク枠
            draw_rect.rounded_rectangle(
                (1024 + 20, 620 + 40, 2048 - 40 - 660, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (1024 + 20 + 330, 620 + 40, 2048 - 40 - 330, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            # travelerは3ない
            if "10000005" not in char_id and "10000007" not in char_id:
                draw_rect.rounded_rectangle(
                    (1024 + 20 + 660, 620 + 40, 2048 - 40, 1024 - 40),
                    fill=bg_color_l,
                    outline=(255, 255, 255),
                    width=2,
                    radius=15,
                )
                draw_rect.ellipse(
                    (
                        50 + 1024 - 20 + 660,
                        620 + 50,
                        50 + 1024 - 20 + 40 + 660,
                        620 + 50 + 40,
                    ),
                    fill=(0, 0, 0, 128),
                )

            draw_rect.ellipse(
                (50, 50, 50 + 40, 50 + 40),
                fill=(0, 0, 0, 128),
            )
            draw_rect.ellipse(
                (50 + 1024, 50, 50 + 1024 + 40, 50 + 40),
                fill=(0, 0, 0, 128),
            )

            # 下のユニーク
            draw_rect.ellipse(
                (50 + 1024 - 20, 620 + 50, 50 + 1024 - 20 + 40, 620 + 50 + 40),
                fill=(0, 0, 0, 128),
            )
            draw_rect.ellipse(
                (50 + 1024 - 20 + 330, 620 + 50, 50 + 1024 - 20 + 40 + 330, 620 + 50 + 40),
                fill=(0, 0, 0, 128),
            )

        elif kind == "talent_c":
            # tableよう
            draw_rect.rounded_rectangle(
                (15, 40, 2048 - 15, 40 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (15, 360, 2048 - 15, 360 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (15, 680, 2048 - 15, 680 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
        elif kind == "constellation":
            draw_rect.rounded_rectangle(
                (40, 40, 1024 - 40, 40 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (40, 360, 1024 - 40, 360 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (40, 680, 1024 - 40, 680 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            # ここから右側
            draw_rect.rounded_rectangle(
                (1024 + 40, 40, 1024 + 1024 - 40, 40 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (1024 + 40, 360, 1024 + 1024 - 40, 360 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw_rect.rounded_rectangle(
                (1024 + 40, 680, 1024 + 1024 - 40, 680 + 300),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
            draw.ellipse(
                (50, 50, 50 + 50, 50 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (50, 320 + 50, 50 + 50, 320 + 50 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (50, 640 + 50, 50 + 50, 640 + 50 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (50 + 1024, 50, 50 + 50 + 1024, 50 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (50 + 1024, 320 + 50, 50 + 50 + 1024, 320 + 50 + 50),
                fill=(0, 0, 0, 128),
            )
            draw.ellipse(
                (50 + 1024, 640 + 50, 50 + 50 + 1024, 640 + 50 + 50),
                fill=(0, 0, 0, 128),
            )
        elif kind == "other":
            draw_rect.rounded_rectangle(
                (40, 40, 900, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=15,
            )
            draw_rect.rounded_rectangle(
                (930, 40, 2048 - 40, 1024 - 40),
                fill=bg_color_l,
                outline=(255, 255, 255),
                width=2,
                radius=30,
            )
        return Image.alpha_composite(canvas, rect)


    ####################
    def profile1(font_file, avater_img_list, skin_num):
        db = charactor_result[id]["data"]["profile"]
        canvas = draw_bg(id, skin_num, "profile")
        draw = ImageDraw.Draw(canvas)

        draw.text(
            (50, 50),
            db["name"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 110),
        )
        subn_size = 60
        subn_y = 0
        if len(db["sub_name"]) >= 11:
            subn_size = int(600 / len(db["sub_name"]))
            subn_y = int((60 - subn_size) / 2)
        draw.text(
            (50, 190 + subn_y),
            db["sub_name"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, subn_size),
        )
        star = Image.open("mat/icon2/star.png").resize((72, 64)).convert("RGBA")
        for i in range(int(db["amount_of_star"])):
            canvas.paste(
                star,
                (50 + 70 * i, 300),
                star,
            )
        base_hp_icon = (
            Image.open("mat/icon2/base_hp_icon.png").resize((48, 48)).convert("RGBA")
        )
        # base_hp_icon = ImageOps.invert(base_hp_icon).convert("RGBA")
        base_atk_icon = (
            Image.open("mat/icon2/base_atk_icon.png").resize((48, 48)).convert("RGBA")
        )
        base_def_icon = (
            Image.open("mat/icon2/base_def_icon.png").resize((48, 48)).convert("RGBA")
        )
        bonus_icon = (
            Image.open(search_bonus(db["bonus_name"])).resize((48, 48)).convert("RGBA")
        )
        canvas.paste(
            base_hp_icon,
            (50, 400 + 5),
            base_hp_icon,
        )
        canvas.paste(
            base_atk_icon,
            (50, 450 + 5),
            base_atk_icon,
        )
        canvas.paste(
            base_def_icon,
            (50, 500 + 5),
            base_def_icon,
        )
        canvas.paste(
            bonus_icon,
            (50, 550 + 5),
            bonus_icon,
        )
        draw.text(
            (120, 400),
            "基礎HP",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (550, 400),
            db["base_hp"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (120, 450),
            "基礎攻撃力",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (550, 450),
            db["base_atk"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (120, 500),
            "基礎防御力",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (550, 500),
            db["base_def"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (120, 550),
            db["bonus_name"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (550, 550),
            db["bonus"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (1340, 60),
            "声優",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        cv_size = 50
        cv_y = 0
        if len(db["cv"]) >= 7:
            cv_size = int(300 / len(db["cv"]))
            cv_y = int((50 - cv_size) / 2)
        draw.text(
            (1640, 60 + cv_y),
            db["cv"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, cv_size),
        )
        draw.text(
            (1340, 110),
            "誕生日",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (1640, 110),
            db["birth"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        draw.text(
            (1340, 160),
            "所属",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        aff_size = 50
        aff_y = 0
        if len(db["affiliation"]) >= 7:
            aff_size = int(300 / len(db["affiliation"]))
            aff_y = int((50 - aff_size) / 2)
        draw.text(
            (1640, 160 + aff_y),
            db["affiliation"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, aff_size),
        )
        draw.text(
            (1340, 210),
            "元素",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        element_icon = (
            Image.open(search_icon(db["element_icon"])).resize((50, 50)).convert("RGBA")
        )
        canvas.paste(element_icon, (1640, 210), element_icon)
        weapon_icon = (
            Image.open(search_icon(db["weapon_icon"])).resize((150, 150)).convert("RGBA")
        )
        canvas.paste(weapon_icon, (2048 - 40 - 20 - 150, 350 + 40 + 40), weapon_icon)

        draw.text(
            (1340, 260),
            "命ノ星座",
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        con_size = 50
        con_y = 0
        if len(db["constellation"]) >= 7:
            con_size = int(300 / len(db["constellation"]))
            con_y = int((50 - con_size) / 2)
        draw.text(
            (1640, 260 + con_y),
            db["constellation"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, con_size),
        )
        wrapped_text(draw, font_file, db["description"], 28, (50, 900), 1940)

        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_profile.png")
            print(f"保存:output/{char_id}/{char_name}_profile.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_profile_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_profile_{skin_num}.png")


    def talent1(font_file, avater_img_list, skin_num):
        db = charactor_result[id]["data"]["talent"]
        isSprint = False

        canvas = draw_bg(id, skin_num, "talent_a")
        draw = ImageDraw.Draw(canvas)

        if char_name in sprinter_list:  # monaやayakaはA, E, ダッシュ, Qになってる
            isSprint = True

        normal_atk_icon = (
            Image.open(search_icon(db["normal_atk_icon"])).resize((40, 40)).convert("RGBA")
        )
        canvas.paste(normal_atk_icon, (50, 50), normal_atk_icon)
        draw.text(
            (95, 50),
            db["normal_atk_title"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 40),
        )
        despan_draw(
            draw,
            font_file,
            db["normal_atk_description"],  # .replace("\n\n", "\n")
            27,
            (50, 100),
            1024 - 75,
        )

        skill_icon = (
            Image.open(search_icon(db["skill_icon"])).resize((40, 40)).convert("RGBA")
        )
        canvas.paste(skill_icon, (50 + 1024, 50), skill_icon)
        draw.text(
            (95 + 1024, 50),
            db["skill_title"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 40),
        )
        despan_draw(
            draw,
            font_file,
            db["skill_description"],  # .replace("\n\n", "\n")
            27,
            (50 + 1024, 100),
            1024 - 100,
        )

        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_talent_a.png")
            print(f"保存:output/{char_id}/{char_name}_talent_a.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_talent_a_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_talent_a_{skin_num}.png")

        # 後半はQとユニーク（ダッシュも）
        canvas = draw_bg(id, skin_num, "talent_b2" if isSprint else "talent_b")
        draw = ImageDraw.Draw(canvas)

        ult_icon = Image.open(search_icon(db["ult_icon"])).resize((40, 40)).convert("RGBA")
        canvas.paste(ult_icon, (50, 50), ult_icon)
        draw.text(
            (95, 50),
            db["ult_title"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 40),
        )
        despan_draw(
            draw,
            font_file,
            db["ult_description"],  # .replace("\n\n", "\n")
            27,
            (50, 100),
            1024 - 75,
        )

        if isSprint:  # sprintを書く
            sprint_icon = (
                Image.open(search_icon(db["sprint_icon"])).resize((40, 40)).convert("RGBA")
            )
            canvas.paste(sprint_icon, (50 + 1024, 50), sprint_icon)
            draw.text(
                (95 + 1024, 50),
                db["sprint_title"],
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, 40),
            )
            despan_draw(
                draw,
                font_file,
                db["sprint_description"],  # .replace("\n\n", "\n")
                27,
                (50 + 1024, 100),
                1024 - 100,
            )
            draw_table(draw, font_file, db["sprint_table"], 27, (50 + 1024, 460), 250)

        uniq1_icon = (
            Image.open(search_icon(db["uniq1_icon"])).resize((40, 40)).convert("RGBA")
        )
        canvas.paste(uniq1_icon, (50 + 1024 - 20, 830 - 160), uniq1_icon)
        wrapped_text(
            draw, font_file, db["uniq1_name"], 22, (95 + 1024 - 20, 835 - 160), 250
        )

        despan_draw(
            draw, font_file, db["uniq1_description"], 14, (50 + 1024 - 20, 880 - 130), 290
        )
        uniq2_icon = (
            Image.open(search_icon(db["uniq2_icon"])).resize((40, 40)).convert("RGBA")
        )
        canvas.paste(uniq2_icon, (380 + 1024 - 20, 830 - 160), uniq2_icon)
        wrapped_text(
            draw, font_file, db["uniq2_name"], 22, (425 + 1024 - 20, 835 - 160), 250
        )

        despan_draw(
            draw, font_file, db["uniq2_description"], 14, (380 + 1024 - 20, 880 - 130), 290
        )
        # travelerは3ない
        if "10000005" not in char_id and "10000007" not in char_id:
            uniq3_icon = (
                Image.open(search_icon(db["uniq3_icon"])).resize((40, 40)).convert("RGBA")
            )
            canvas.paste(uniq3_icon, (710 + 1024 - 20, 830 - 160), uniq3_icon)
            wrapped_text(
                draw, font_file, db["uniq3_name"], 22, (755 + 1024 - 20, 835 - 160), 250
            )

            despan_draw(
                draw,
                font_file,
                db["uniq3_description"],
                14,
                (710 + 1024 - 20, 880 - 130),
                290,
            )

        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_talent_b.png")
            print(f"保存:output/{char_id}/{char_name}_talent_b.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_talent_b_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_talent_b_{skin_num}.png")

        # 後はテーブル
        canvas = draw_bg(id, skin_num, "talent_c")
        draw = ImageDraw.Draw(canvas)

        draw_table(draw, font_file, db["normal_atk_table"], 13, (20, 50), 120)
        draw_table(draw, font_file, db["skill_table"], 13, (20, 370), 120)
        draw_table(draw, font_file, db["ult_table"], 13, (20, 690), 120)

        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_talent_c.png")
            print(f"保存:output/{char_id}/{char_name}_talent_c.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_talent_c_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_talent_c_{skin_num}.png")


    def constellation1(font_file, avater_img_list, skin_num):
        db = charactor_result[id]["data"]["constellation"]
        canvas = draw_bg(id, skin_num, "constellation")
        draw = ImageDraw.Draw(canvas)

        for i in range(6):
            constellation_icon = (
                Image.open(search_icon(db[str(i + 1)]["constellation_icon"]))
                .resize((50, 50))
                .convert("RGBA")
            )
            constellation_name = db[str(i + 1)]["constellation_name"]
            constellation_description = db[str(i + 1)]["constellation_description"]

            if i % 2 == 0:
                x = 50
            else:
                x = 1024 + 50
            y = math.floor(i / 2) * 320 + 50

            canvas.paste(constellation_icon, (x, y), constellation_icon)
            draw.text(
                (x + 50, y),
                constellation_name,
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, 40),
            )
            despan_draw(
                draw,
                font_file,
                constellation_description.replace("\n\n", "\n"),
                17,
                (x, y + 60),
                920,
            )

        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_constellation.png")
            print(f"保存:output/{char_id}/{char_name}_constellation.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_constellation_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_constellation_{skin_num}.png")


    def ascension1(font_file, avater_img_list, skin_num):
        db = charactor_result[id]["data"]["ascension"]
        canvas = draw_bg(id, skin_num, "ascension")
        draw = ImageDraw.Draw(canvas)

        radius = 400
        amount_list = [
            "7049.9K",
            "168",
            "2",
            "418",
            "1",
            "9",
            "9",
            "6",
            "9",
            "63",
            "114",
            "3",
            "36",
            "96",
            "129",
            "46",
            "18",
        ]
        # 5F青#7B灰#55緑#89紫#BA金
        bg_color_list = [
            (95, 124, 153),
            (123, 125, 129),
            (85, 139, 117),
            (137, 104, 174),
            (85, 139, 117),
            (95, 124, 153),
            (137, 104, 174),
            (186, 117, 39),
            (85, 139, 117),
            (95, 124, 153),
            (137, 104, 174),
            (186, 117, 39),
            (123, 125, 129),
            (85, 139, 117),
            (95, 124, 153),
            (137, 104, 174),
            (186, 117, 39),
        ]
        asc_num = 17
        orikaeshi = 8
        if "10000005" in char_id or "10000007" in char_id:
            radius = 430
            asc_num = 23
            orikaeshi = 11
            amount_list = [
                "7049.9K",
                "168",
                "2",
                "418",
                "1",
                "9",
                "9",
                "6",
                "9",
                "18",
                "18",
                "33",
                "36",
                "12",
                "60",
                "3",
                "18",
                "30",
                "36",
                "18",
                "66",
                "93",
                "18",
            ]
            # 95青#123灰#85緑#137紫#186金
            bg_color_list = [
                (95, 124, 153),
                (123, 125, 129),
                (85, 139, 117),
                (137, 104, 174),
                (85, 139, 117),
                (95, 124, 153),
                (137, 104, 174),
                (186, 117, 39),
                (85, 139, 117),
                (95, 124, 153),
                (137, 104, 174),
                (95, 124, 153),
                (137, 104, 174),
                (95, 124, 153),
                (137, 104, 174),
                (186, 117, 39),
                (123, 125, 129),
                (85, 139, 117),
                (95, 124, 153),
                (123, 125, 129),
                (85, 139, 117),
                (95, 124, 153),
                (186, 117, 39),
            ]
        # 円(楕円)
        asc_moji = 50
        if "10000005" in char_id or "10000007" in char_id:
            asc_moji = 40
        for i in range(asc_num):
            angle = (2 * math.pi * i) / asc_num
            x = int(radius * math.sin(angle) * 1.5) + (2048 // 2)
            y = int(radius * math.cos(angle) * (-1)) + (1024 // 2)
            if i == 8 and "UI_ItemIcon_104319.png" in search_icon(
                db[str(i + 1)]
            ):  # 久岐忍以降は王冠の位置9番目にあって昔と違う
                if "10000005" not in char_id and "10000007" not in char_id:
                    element_to_move = amount_list.pop(11)
                    amount_list.insert(8, element_to_move)
                    element_to_move2 = bg_color_list.pop(11)
                    bg_color_list.insert(8, element_to_move2)
                else:
                    # traveler
                    orikaeshi = 12
                    element_to_move = amount_list.pop(15)
                    amount_list.insert(8, element_to_move)
                    element_to_move2 = bg_color_list.pop(15)
                    bg_color_list.insert(8, element_to_move2)
            # 丸背景
            draw.ellipse(
                (x - 70, y - 60, x + 70, y + 60),
                fill=bg_color_list[i],
                outline=(255, 255, 255),
                width=4,
            )
            image = (
                Image.open(search_icon(db[str(i + 1)])).resize((100, 100)).convert("RGBA")
            )
            canvas.paste(image, (x - 50, y - 50), image)
            draw.text(
                (
                    int((radius - 100) * math.sin(angle) * 1.55) + (2048 // 2),
                    int((radius - 100) * math.cos(angle) * (-1)) + (1024 // 2),
                ),
                amount_list[i],
                fill=(255, 255, 255),
                stroke_fill=(0, 0, 0),
                stroke_width=4,
                font=ImageFont.truetype(font_file, asc_moji),
                anchor="mm",
            )
        with open("itemname.json", "r", encoding="utf-8") as f:
            itemname = json.load(f)
        ct = 0
        y = 50
        # item名描画
        for i in range(asc_num):
            path = db[str(i + 1)]
            parsed_path = urlparse(path)
            item_id = os.path.basename(parsed_path.path).split("_")[2].split(".")[0]
            html_title = itemname[item_id]
            if ct == orikaeshi:
                y = 50
            if i < orikaeshi:
                # 右
                x = 2008
            else:
                x = 40
            draw.text(
                (x, y),
                html_title,
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, 25),
                anchor="rm" if i < orikaeshi else "lm",
                stroke_fill=(0, 0, 0),
                stroke_width=4,
            )
            y += 50
            ct += 1
        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_ascension.png")
            print(f"保存:output/{char_id}/{char_name}_ascension.png")
        else:
            canvas.save(f"output/{char_id}/{char_name}_ascension_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_ascension_{skin_num}.png")


    def other1(font_file, avater_img_list, skin_num):
        db = charactor_result[id]["data"]["other"]
        canvas = draw_bg(id, skin_num, "other")
        draw = ImageDraw.Draw(canvas)

        namecard_icon = (
            Image.open(search_icon(db["1"]["namecard_icon"]))
            .resize((840, 400))
            .convert("RGBA")
        )
        canvas.paste(namecard_icon, (50, 50), namecard_icon)
        w, h = namecard_icon.size
        draw.rectangle((50, 50, 50 + w, 50 + h), outline=(255, 255, 255), width=2)
        draw.text(
            (50, 470),
            db["1"]["namecard_name"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        wrapped_text(
            draw,
            font_file,
            db["1"]["namecard_description"],
            25,
            (50, 530),
            840,
        )
        # raidenは料理ない
        if "10000052" not in char_id:
            draw.text(
                (50, 650),
                "オリジナル料理",
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, 40),
            )
            dish_icon = Image.open(search_icon(db["1"]["dish_icon"])).convert("RGBA")
            canvas.paste(dish_icon, (330, 700), dish_icon)
            draw.text(
                (450, 950),
                db["1"]["dish_name"].replace("JP0Y", ""),
                fill=(255, 255, 255),
                font=ImageFont.truetype(font_file, 25),
                anchor="mm",
            )
        # outfit_icon = Image.open(search_icon(db[str(skin_num)]["outfit_icon"]))
        # canvas.paste(outfit_icon, (1024 + 50, 50), outfit_icon)
        draw.text(
            (950, 50),
            db[str(skin_num)]["outfit_name"],
            fill=(255, 255, 255),
            font=ImageFont.truetype(font_file, 50),
        )
        wrapped_text(
            draw,
            font_file,
            db[str(skin_num)]["outfit_text"],
            23,
            (950, 110),
            1060,
        )
        if skin_num == 1:
            canvas.save(f"output/{char_id}/{char_name}_other.png")
            print(f"保存:output/{char_id}/{char_name}_other.png")
        else:
            ### description
            wrapped_text(
                draw,
                font_file,
                db[str(skin_num)]["outfit_description"].replace("\n\n", "\n"),
                23,
                (950, 240),
                1060,
            )
            canvas.save(f"output/{char_id}/{char_name}_other_{skin_num}.png")
            print(f"保存:output/{char_id}/{char_name}_other_{skin_num}.png")


    # いよいよpillowで画像を作る
    for id in charactor_result:
        try:
            char_id = id
            char_name = charactor_result[id]["name"]

            if not os.path.exists(f"output/{char_id}"):
                os.makedirs(f"output/{char_id}")
                print(f"作成:output/{char_id}")
            else:
                # print(f"既に存在:output/{char_id}")
                None
            font_file = "mat/ja-jp.ttf"
            avater_img_list = []
            try:
                amount_of_skin = len(charactor_result[id]["data"]["other"])

                for i in range(amount_of_skin):
                    avater = Image.open(
                        search_icon(
                            charactor_result[id]["data"]["other"][str(i + 1)][
                                "outfit_avater"
                            ]
                        )
                    ).convert("RGBA")
                    avater_img_list.append(avater)
            except Exception as e:
                print(f"{e}\nアバター画像の読み込みに失敗:{char_name}\n404モードで作成します")
                write_error_log(f"failed to load avater image in {char_name}: {e}")
                amount_of_skin = 1
                avater = Image.open("mat/icon2/avater_404.png").convert("RGBA")
                avater_img_list.append(avater)
            #######
            print(f"画像作成の処理開始:{char_name}")
            for i in range(amount_of_skin):
                try:
                    if os.path.exists(f"html/{char_id}/{char_name}_profile.html"):
                        profile1(font_file, avater_img_list, i + 1)
                except Exception as e:
                    print(f"{e}\nprofile画像作成の処理に失敗:{char_name}")
                    write_error_log(f"failed to creat image in {char_name}'s profile: {e}")
                try:
                    if os.path.exists(f"html/{char_id}/{char_name}_talent.html"):
                        talent1(font_file, avater_img_list, i + 1)
                except Exception as e:
                    print(f"{e}\ntalent画像作成の処理に失敗:{char_name}")
                    write_error_log(f"failed to creat image in {char_name}'s talent: {e}")
                try:
                    if os.path.exists(f"html/{char_id}/{char_name}_constellation.html"):
                        constellation1(font_file, avater_img_list, i + 1)
                except Exception as e:
                    print(f"{e}\nconstellation画像作成の処理に失敗:{char_name}")
                    write_error_log(
                        f"failed to creat image in {char_name}'s constellation: {e}"
                    )
                try:
                    if os.path.exists(f"html/{char_id}/{char_name}_ascension.html"):
                        ascension1(font_file, avater_img_list, i + 1)
                except Exception as e:
                    print(f"{e}\nascension画像作成の処理に失敗:{char_name}")
                    write_error_log(
                        f"failed to creat image in {char_name}'s ascension: {e}"
                    )
                try:
                    if (
                        os.path.exists(f"html/{char_id}/{char_name}_other.html")
                        and "10000005" not in char_id
                        and "10000007" not in char_id
                    ):
                        other1(font_file, avater_img_list, i + 1)
                except Exception as e:
                    print(f"{e}\nother画像作成の処理に失敗:{char_name}")
                    write_error_log(f"failed to creat image in {char_name}'s other: {e}")
            print(f"画像作成の処理を完了:{char_name}")
        except Exception as e:
            print(e)
            print(f"画像作成の処理に失敗:{char_name}")
            write_error_log(f"failed to creat image 2 in {char_name}: {e}")

    print("処理が完了しました。")
    write_error_log("----------finished Genshin.py----------")

main() if __name__ == "__main__" else None
