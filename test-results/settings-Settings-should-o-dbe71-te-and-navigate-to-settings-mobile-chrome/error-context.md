# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings >> should open command palette and navigate to settings
- Location: tests\e2e\settings.spec.ts:15:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#loginPin')
    - locator resolved to <input readonly required="" id="loginPin" type="password" autocomplete="current-password"/>
    - fill("1234")
  - attempting fill action
    2 × waiting for element to be visible, enabled and editable
      - element is not editable
    - retrying fill action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and editable
      - element is not editable
    - retrying fill action
      - waiting 100ms
    54 × waiting for element to be visible, enabled and editable
       - element is not editable
     - retrying fill action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Chuyển đến nội dung chính" [ref=e2] [cursor=pointer]:
    - /url: "#appMount"
  - generic [ref=e6]:
    - generic [ref=e7]: ✝
    - heading "Sổ Điểm Giáo Lý" [level=1] [ref=e8]
    - paragraph [ref=e9]: Đăng nhập để tiếp tục
    - tablist "Phương thức đăng nhập" [ref=e10]:
      - tab "Mã PIN (Offline)" [selected] [ref=e11] [cursor=pointer]
      - tab "Email Cloud" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - tabpanel [ref=e14]:
        - generic [ref=e15]: Tài khoản
        - textbox "Tài khoản" [active] [ref=e16]:
          - /placeholder: admin
          - text: admin
        - textbox
        - generic [ref=e17]: Mã PIN đăng nhập
        - generic [ref=e23]:
          - button "1" [ref=e24] [cursor=pointer]
          - button "2" [ref=e25] [cursor=pointer]
          - button "3" [ref=e26] [cursor=pointer]
          - button "4" [ref=e27] [cursor=pointer]
          - button "5" [ref=e28] [cursor=pointer]
          - button "6" [ref=e29] [cursor=pointer]
          - button "7" [ref=e30] [cursor=pointer]
          - button "8" [ref=e31] [cursor=pointer]
          - button "9" [ref=e32] [cursor=pointer]
          - button "C" [ref=e33] [cursor=pointer]
          - button "0" [ref=e34] [cursor=pointer]
          - button "⌫" [ref=e35] [cursor=pointer]
      - generic [ref=e36] [cursor=pointer]:
        - checkbox "Ghi nhớ trên máy này" [checked] [ref=e37]
        - text: Ghi nhớ trên máy này
      - button "Đăng nhập" [ref=e38] [cursor=pointer]
    - generic [ref=e39]:
      - generic [ref=e41]: hoặc
      - button "Mở bằng Face ID / vân tay" [ref=e42] [cursor=pointer]:
        - generic [ref=e43]: 🔐
        - generic [ref=e44]: Mở bằng Face ID / vân tay
      - paragraph [ref=e45]: "Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar."
    - paragraph [ref=e46]:
      - text: "Mặc định PIN:"
      - strong [ref=e47]: admin
      - text: / PIN
      - strong [ref=e48]: "1234"
      - text: (Vào app bấm
      - strong [ref=e49]: Đổi PIN
      - text: hoặc
      - strong [ref=e50]: Cấu hình Cloud
      - text: )
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Settings', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForSelector('#appMount')
  7  |     const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
  8  |     const pin = (await pinEl.textContent() || '').trim()
  9  |     await page.fill('#loginUser', 'admin')
> 10 |     await page.fill('#loginPin', pin)
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  11 |     await page.click('button[type=submit]')
  12 |     await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
  13 |   })
  14 | 
  15 |   test('should open command palette and navigate to settings', async ({ page }) => {
  16 |     await page.keyboard.press('/')
  17 |     await page.waitForSelector('#commandPalette:not(.hidden)', { timeout: 3000 })
  18 |     await page.fill('#commandPalette input[type=text]', 'Cài đặt')
  19 |     await page.waitForTimeout(300)
  20 |     await page.keyboard.press('Enter')
  21 |     await page.waitForTimeout(500)
  22 |     const dialog = page.locator('.dialog-overlay:not(.hidden)')
  23 |     await expect(dialog).toBeVisible({ timeout: 3000 })
  24 |     await page.keyboard.press('Escape')
  25 |   })
  26 | 
  27 |   test('should open settings from ProfileView', async ({ page }) => {
  28 |     await page.evaluate(() => {
  29 |       const btn = document.querySelector('[data-m-nav="profile"]') as HTMLButtonElement
  30 |       if (btn) btn.click()
  31 |     })
  32 |     await page.waitForTimeout(500)
  33 |     const settingsBtn = page.locator('[data-me-action="settings"]')
  34 |     await expect(settingsBtn).toBeVisible()
  35 |     await settingsBtn.click()
  36 |     await page.waitForTimeout(300)
  37 |     const dialog = page.locator('.dialog-overlay:not(.hidden)')
  38 |     await expect(dialog).toBeVisible({ timeout: 3000 })
  39 |     await page.keyboard.press('Escape')
  40 |   })
  41 | })
  42 | 
```