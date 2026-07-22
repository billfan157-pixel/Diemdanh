# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: parent-invite.spec.ts >> Parent Invite >> should create invite link and show parent report
- Location: tests\e2e\parent-invite.spec.ts:16:3

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
    51 × waiting for element to be visible, enabled and editable
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
  3  | test.describe('Parent Invite', () => {
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
  16 |   test('should create invite link and show parent report', async ({ page }) => {
  17 |     // Open sidebar
  18 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  19 |       await page.click('#mOpenDrawer')
  20 |     }
  21 | 
  22 |     // Create a class
  23 |     await page.fill('#newClassName', 'Lớp PH Test')
  24 |     await page.fill('#newClassYear', '2024-2025')
  25 |     await page.click('#createClassBtn')
  26 |     await page.waitForTimeout(500)
  27 | 
  28 |     // Select the class
  29 |     await page.click('.class-item')
  30 |     await page.waitForTimeout(300)
  31 | 
  32 |     // Close sidebar
  33 |     await page.keyboard.press('Escape')
  34 |     await page.waitForTimeout(300)
  35 | 
  36 |     // Add a student
  37 |     await page.waitForSelector('#addStudentBtn')
  38 |     await page.click('#addStudentBtn')
  39 |     await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
  40 |     await page.fill('#inputTenThanh', 'Maria')
  41 |     await page.fill('#inputHoDem', 'Nguyễn')
  42 |     await page.fill('#inputTen', 'An')
  43 |     await page.locator('#addForm button[type="submit"]').click()
  44 |     await page.waitForTimeout(500)
  45 | 
  46 |     // Enter a score
  47 |     const scoreInput = page.locator('[data-score-input]').first()
  48 |     await scoreInput.fill('8')
  49 |     await scoreInput.press('Enter')
  50 |     await page.waitForTimeout(300)
  51 | 
  52 |     // Open invite modal from class view
  53 |     await page.click('#classInviteBtn')
  54 |     await page.waitForSelector('#parentInviteModal', { state: 'visible', timeout: 3000 })
  55 | 
  56 |     // Click "Tạo link" on the first student
  57 |     await page.click('[data-invite-student]')
  58 |     await page.waitForTimeout(500)
  59 | 
  60 |     // Check result area is shown with the link
  61 |     const resultArea = page.locator('#parentInviteResult')
  62 |     await expect(resultArea).not.toHaveClass(/hidden/)
  63 |     const linkInput = page.locator('#parentInviteUrl')
  64 |     const inviteUrl = await linkInput.inputValue()
  65 |     expect(inviteUrl).toContain('#/ph/')
  66 | 
  67 |     // Close modal
  68 |     await page.click('#parentInviteDone')
  69 |     await page.waitForSelector('#parentInviteModal', { state: 'hidden' })
  70 | 
  71 |     // Navigate to the parent report page
  72 |     await page.goto(inviteUrl)
  73 | 
  74 |     // Verify parent report card is visible
  75 |     await expect(page.locator('#parentReportRoot')).toBeVisible({ timeout: 15000 })
  76 |     await expect(page.locator('.parent-report-card')).toBeVisible()
  77 |     await expect(page.locator('.parent-report-card')).toContainText('Maria')
  78 |     await expect(page.locator('.parent-report-card')).toContainText('Nguyễn An')
  79 |   })
  80 | })
  81 | 
```