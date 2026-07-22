# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: class-management.spec.ts >> Class Management >> should create a new class
- Location: tests\e2e\class-management.spec.ts:16:3

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
    39 × waiting for element to be visible, enabled and editable
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
  3  | test.describe('Class Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/')
  6  |     await page.waitForSelector('#appMount')
  7  |     // Read the dynamic default PIN from the login hint
  8  |     const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
  9  |     const pin = (await pinEl.textContent() || '').trim()
  10 |     await page.fill('#loginUser', 'admin')
> 11 |     await page.fill('#loginPin', pin)
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  12 |     await page.click('button[type=submit]')
  13 |     await expect(page.locator('#appRoot')).toBeVisible()
  14 |   })
  15 | 
  16 |   test('should create a new class', async ({ page }) => {
  17 |     // Open sidebar if in mobile view
  18 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  19 |       await page.click('#mOpenDrawer')
  20 |       await expect(page.locator('.sidebar')).toHaveClass(/open/)
  21 |     }
  22 | 
  23 |     // Create class
  24 |     await page.fill('#newClassName', 'Lớp Test')
  25 |     await page.fill('#newClassYear', '2024-2025')
  26 |     await page.click('#createClassBtn')
  27 | 
  28 |     // Check class appears
  29 |     await expect(page.locator('.class-item')).toContainText('Lớp Test')
  30 |   })
  31 | 
  32 |   test('should rename class', async ({ page }) => {
  33 |     // Create a class first
  34 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  35 |       await page.click('#mOpenDrawer')
  36 |     }
  37 |     await page.fill('#newClassName', 'Lớp Đổi Tên')
  38 |     await page.fill('#newClassYear', '2024-2025')
  39 |     await page.click('#createClassBtn')
  40 | 
  41 |     // Click rename
  42 |     await page.click('.class-item .icon-btn[data-rename-class]')
  43 |     await expect(page.locator('#appDialog')).toBeVisible()
  44 | 
  45 |     await page.fill('#appDialogMessage input', 'Lớp Đã Đổi')
  46 |     await page.click('#appDialogOk')
  47 | 
  48 |     await expect(page.locator('.class-item')).toContainText('Lớp Đã Đổi')
  49 |   })
  50 | 
  51 |   test('should delete class', async ({ page }) => {
  52 |     // Create a class first
  53 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  54 |       await page.click('#mOpenDrawer')
  55 |     }
  56 |     await page.fill('#newClassName', 'Lớp Xóa')
  57 |     await page.fill('#newClassYear', '2024-2025')
  58 |     await page.click('#createClassBtn')
  59 | 
  60 |     // Delete
  61 |     await page.click('.class-item .icon-btn[data-del-class]')
  62 |     await expect(page.locator('#appDialog')).toBeVisible()
  63 |     await page.click('#appDialogOk')
  64 | 
  65 |     await expect(page.locator('.class-item')).not.toContainText('Lớp Xóa')
  66 |   })
  67 | })
```