import chromedriver_binary
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


def main() -> None:
    options = Options()
    options.add_argument("--headless")

    driver = webdriver.Chrome(options=options)
    driver.get("https://google.com")

    print(f"Current ULR: {driver.current_url}")


if __name__ == "__main__":
    main()
