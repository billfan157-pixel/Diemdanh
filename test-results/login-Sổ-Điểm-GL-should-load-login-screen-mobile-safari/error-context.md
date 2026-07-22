# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Sổ Điểm GL >> should load login screen
- Location: tests\e2e\login.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#loginScreen')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('#loginScreen')

```

```yaml
- link "Chuyển đến nội dung chính":
  - /url: "#appMount"
- text: ✝
- heading "Sổ Điểm Giáo Lý" [level=1]
- paragraph: Đăng nhập để tiếp tục
- tablist "Phương thức đăng nhập":
  - tab "Mã PIN (Offline)" [selected]
  - tab "Email Cloud"
- tabpanel:
  - text: Tài khoản
  - textbox "Tài khoản":
    - /placeholder: admin
  - textbox
  - text: Mã PIN đăng nhập
  - button "1"
  - button "2"
  - button "3"
  - button "4"
  - button "5"
  - button "6"
  - button "7"
  - button "8"
  - button "9"
  - button "C"
  - button "0"
  - button "⌫"
- checkbox "Ghi nhớ trên máy này" [checked]
- text: Ghi nhớ trên máy này
- button "Đăng nhập"
- text: hoặc
- button "Mở bằng Face ID / vân tay"
- paragraph: "Lần đầu: đăng nhập PIN → bật sinh trắc trong sidebar."
- paragraph:
  - text: "Mặc định PIN:"
  - strong: admin
  - text: / PIN
  - strong: "1234"
  - text: (Vào app bấm
  - strong: Đổi PIN
  - text: hoặc
  - strong: Cấu hình Cloud
  - text: )
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Sổ Điểm GL', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForSelector('#appMount', { state: 'attached' })
  7  |   })
  8  | 
  9  |   /** Extract the dynamically generated default PIN from the login hint text */
  10 |   async function getDefaultPin(page: any): Promise<string> {
  11 |     const el = page.locator('.login-screen .hint strong:nth-of-type(2)')
  12 |     const text = await el.textContent()
  13 |     return (text || '').trim()
  14 |   }
  15 | 
  16 |   test('should load login screen', async ({ page }) => {
> 17 |     await expect(page.locator('#loginScreen')).toBeVisible()
     |                                                ^ Error: expect(locator).toBeVisible() failed
  18 |     await expect(page.locator('h1')).toContainText('Sổ Điểm Giáo Lý')
  19 |   })
  20 | 
  21 |   test('should login with default admin credentials', async ({ page }) => {
  22 |     const pin = await getDefaultPin(page)
  23 |     await page.fill('#loginUser', 'admin')
  24 |     await page.fill('#loginPin', pin)
  25 |     await page.click('button[type=submit]')
  26 | 
  27 |     await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
  28 |     await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
  29 |   })
  30 | 
  31 |   test('should show error for invalid credentials', async ({ page }) => {
  32 |     await page.fill('#loginUser', 'admin')
  33 |     await page.fill('#loginPin', 'wrong')
  34 |     await page.click('button[type=submit]')
  35 | 
  36 |     await expect(page.locator('#loginError')).toBeVisible()
  37 |     await expect(page.locator('#loginError')).toContainText('Sai tài khoản')
  38 |   })
  39 | 
  40 |   test('should navigate to dashboard after login', async ({ page }) => {
  41 |     const pin = await getDefaultPin(page)
  42 |     await page.fill('#loginUser', 'admin')
  43 |     await page.fill('#loginPin', pin)
  44 |     await page.click('button[type=submit]')
  45 | 
  46 |     await expect(page.locator('#appRoot')).toBeVisible()
  47 |     await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
  48 |     await expect(page.locator('.m-nav-item.active')).toHaveAttribute('data-m-nav', 'home')
  49 |   })
  50 | })
```