# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Sổ Điểm GL >> should navigate to dashboard after login
- Location: tests\e2e\login.spec.ts:40:3

# Error details

```
Test timeout of 30000ms exceeded.
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
    47 × waiting for element to be visible, enabled and editable
       - element is not editable
     - retrying fill action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - link "Chuyển đến nội dung chính" [ref=e2]:
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
  17 |     await expect(page.locator('#loginScreen')).toBeVisible()
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
> 43 |     await page.fill('#loginPin', pin)
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  44 |     await page.click('button[type=submit]')
  45 | 
  46 |     await expect(page.locator('#appRoot')).toBeVisible()
  47 |     await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
  48 |     await expect(page.locator('.m-nav-item.active')).toHaveAttribute('data-m-nav', 'home')
  49 |   })
  50 | })
```