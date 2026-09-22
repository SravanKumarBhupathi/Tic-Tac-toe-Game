from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Test bot mode
        page.click('label[for="mode-bot"]')
        page.fill('#player-x', 'ViDya')
        page.click('#start-game-btn')
        page.wait_for_timeout(500)

        page.click('.cell[data-index="0"]')
        page.wait_for_timeout(500)
        page.screenshot(path="test_bot.png")

        browser.close()

if __name__ == "__main__":
    run()
