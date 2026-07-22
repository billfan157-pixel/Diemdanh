# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.spec.ts >> Dashboard >> should render class rankings on dashboard
- Location: tests\e2e\dashboard.spec.ts:54:3

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
    48 × waiting for element to be visible, enabled and editable
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
  3  | test.describe('Dashboard', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForSelector('#appMount')
  7  | 
  8  |     const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
  9  |     const pin = (await pinEl.textContent() || '').trim()
  10 |     await page.fill('#loginUser', 'admin')
> 11 |     await page.fill('#loginPin', pin)
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  12 |     await page.click('button[type=submit]')
  13 |     await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
  14 |   })
  15 | 
  16 |   test('should show dashboard stats after creating data', async ({ page }) => {
  17 |     // Open sidebar
  18 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  19 |       await page.click('#mOpenDrawer')
  20 |     }
  21 | 
  22 |     // Create a class
  23 |     await page.fill('#newClassName', 'Lớp Dashboard')
  24 |     await page.fill('#newClassYear', '2024-2025')
  25 |     await page.click('#createClassBtn')
  26 |     await page.waitForTimeout(500)
  27 | 
  28 |     // Close sidebar and add students
  29 |     await page.keyboard.press('Escape')
  30 |     await page.waitForTimeout(300)
  31 |     await page.waitForSelector('#addStudentBtn')
  32 | 
  33 |     // Add first student
  34 |     await page.click('#addStudentBtn')
  35 |     await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
  36 |     await page.fill('#inputTenThanh', 'Maria')
  37 |     await page.fill('#inputHoDem', 'Nguyễn')
  38 |     await page.fill('#inputTen', 'An')
  39 |     await page.locator('#addForm button[type="submit"]').click()
  40 |     await page.waitForTimeout(500)
  41 | 
  42 |     // Navigate to dashboard via home button
  43 |     await page.evaluate(() => {
  44 |       const btn = document.querySelector('[data-m-nav="home"]') as HTMLButtonElement
  45 |       if (btn) btn.click()
  46 |     })
  47 |     await page.waitForTimeout(500)
  48 | 
  49 |     // Verify dashboard elements
  50 |     await expect(page.locator('.dash-stats')).toBeVisible()
  51 |     await expect(page.locator('.dash-section')).toBeVisible()
  52 |   })
  53 | 
  54 |   test('should render class rankings on dashboard', async ({ page }) => {
  55 |     // Open sidebar
  56 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  57 |       await page.click('#mOpenDrawer')
  58 |     }
  59 | 
  60 |     // Create two classes
  61 |     for (const name of ['Lớp A', 'Lớp B']) {
  62 |       await page.fill('#newClassName', name)
  63 |       await page.fill('#newClassYear', '2024-2025')
  64 |       await page.click('#createClassBtn')
  65 |       await page.waitForTimeout(500)
  66 |     }
  67 | 
  68 |     // Navigate to dashboard
  69 |     await page.evaluate(() => {
  70 |       const btn = document.querySelector('[data-m-nav="home"]') as HTMLButtonElement
  71 |       if (btn) btn.click()
  72 |     })
  73 |     await page.waitForTimeout(500)
  74 | 
  75 |     // Verify rankings section is present
  76 |     await expect(page.locator('.dash-rank-table')).toBeVisible()
  77 |   })
  78 | })
  79 | 
```