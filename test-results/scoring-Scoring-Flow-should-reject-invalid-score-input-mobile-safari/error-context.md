# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scoring.spec.ts >> Scoring Flow >> should reject invalid score input
- Location: tests\e2e\scoring.spec.ts:74:3

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
  3  | test.describe('Scoring Flow', () => {
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
  16 |   async function createAndSelectClass(page: any, className: string, studentName: string) {
  17 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  18 |       await page.click('#mOpenDrawer')
  19 |     }
  20 | 
  21 |     await page.fill('#newClassName', className)
  22 |     await page.fill('#newClassYear', '2024-2025')
  23 |     await page.click('#createClassBtn')
  24 |     await page.waitForTimeout(500)
  25 | 
  26 |     await page.locator('.class-item').first().click()
  27 |     await page.waitForTimeout(500)
  28 | 
  29 |     await page.keyboard.press('Escape')
  30 |     await page.waitForTimeout(300)
  31 | 
  32 |     await page.click('#addStudentBtn')
  33 |     await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
  34 |     await page.fill('#inputTenThanh', 'Maria')
  35 |     const names = studentName.split(' ')
  36 |     await page.fill('#inputHoDem', names[0] || '')
  37 |     await page.fill('#inputTen', names[1] || '')
  38 |     await page.locator('#addForm button[type="submit"]').click()
  39 |     await expect(page.locator('#studentsContainer .student')).toBeVisible({ timeout: 5000 })
  40 |   }
  41 | 
  42 |   test('should add a student and enter a score in card view', async ({ page }) => {
  43 |     await createAndSelectClass(page, 'Lớp Điểm', 'Nguyễn Văn A')
  44 | 
  45 |     const scoreInput = page.locator('[data-score-input]').first()
  46 |     await expect(scoreInput).toBeVisible()
  47 |     await scoreInput.fill('8')
  48 |     await scoreInput.press('Enter')
  49 |     await page.waitForTimeout(500)
  50 | 
  51 |     const chip = page.locator('.chip').first()
  52 |     await expect(chip).toBeVisible()
  53 |     await expect(chip).toContainText('8')
  54 |   })
  55 | 
  56 |   test('should enter a score in table view', async ({ page }) => {
  57 |     await createAndSelectClass(page, 'Lớp Bảng', 'Nguyễn Văn B')
  58 | 
  59 |     // Switch to table view via JS (sidebar may overlap on desktop)
  60 |     await page.evaluate(() => {
  61 |       (document.querySelector('[data-view="table"]') as HTMLButtonElement)?.click()
  62 |     })
  63 |     await page.waitForTimeout(500)
  64 | 
  65 |     const tableScoreInput = page.locator('[data-table-score]').first()
  66 |     await expect(tableScoreInput).toBeVisible()
  67 |     await tableScoreInput.fill('9')
  68 |     await tableScoreInput.press('Tab')
  69 |     await page.waitForTimeout(500)
  70 | 
  71 |     await expect(tableScoreInput).toHaveValue('9')
  72 |   })
  73 | 
  74 |   test('should reject invalid score input', async ({ page }) => {
  75 |     await createAndSelectClass(page, 'Lớp Lỗi', 'Trần Văn C')
  76 | 
  77 |     const scoreInput = page.locator('[data-score-input]').first()
  78 |     await expect(scoreInput).toBeVisible()
  79 |     await scoreInput.fill('15')
  80 |     await scoreInput.press('Enter')
  81 |     await page.waitForTimeout(500)
  82 | 
  83 |     const chips = page.locator('.chip')
  84 |     await expect(chips).toHaveCount(0)
  85 |   })
  86 | })
  87 | 
```