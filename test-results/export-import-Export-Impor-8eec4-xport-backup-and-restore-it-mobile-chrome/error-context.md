# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: export-import.spec.ts >> Export & Import >> should export backup and restore it
- Location: tests\e2e\export-import.spec.ts:56:3

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
    44 × waiting for element to be visible, enabled and editable
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
  1   | import { test, expect } from '@playwright/test'
  2   | import * as fs from 'fs'
  3   | import * as path from 'path'
  4   | 
  5   | test.describe('Export & Import', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.goto('/')
  8   |     await page.waitForSelector('#appMount')
  9   | 
  10  |     const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
  11  |     const pin = (await pinEl.textContent() || '').trim()
  12  |     await page.fill('#loginUser', 'admin')
> 13  |     await page.fill('#loginPin', pin)
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  14  |     await page.click('button[type=submit]')
  15  |     await expect(page.locator('#appRoot')).toBeVisible()
  16  |   })
  17  | 
  18  |   test('should export class CSV and verify content', async ({ page }) => {
  19  |     if (await page.locator('#mOpenDrawer').isVisible()) {
  20  |       await page.click('#mOpenDrawer')
  21  |     }
  22  |     await page.fill('#newClassName', 'Lớp CSV')
  23  |     await page.fill('#newClassYear', '2024-2025')
  24  |     await page.click('#createClassBtn')
  25  |     await page.click('.class-item')
  26  |     await page.waitForTimeout(500)
  27  | 
  28  |     // Close sidebar
  29  |     await page.keyboard.press('Escape')
  30  |     await page.waitForTimeout(300)
  31  |     await page.waitForSelector('#addStudentBtn')
  32  | 
  33  |     await page.click('#addStudentBtn')
  34  |     await page.fill('#inputTen', 'HV CSV')
  35  |     await page.click('#addForm button[type="submit"]')
  36  |     await page.waitForTimeout(500)
  37  | 
  38  |     const scoreInput = page.locator('[data-score-input]').first()
  39  |     await scoreInput.fill('9')
  40  |     await scoreInput.press('Enter')
  41  |     await page.waitForTimeout(500)
  42  | 
  43  |     await expect(page.locator('.chip')).toContainText('9')
  44  | 
  45  |     if (await page.locator('#mOpenDrawer').isVisible()) {
  46  |       await page.click('#mOpenDrawer')
  47  |     }
  48  | 
  49  |     const [download] = await Promise.all([
  50  |       page.waitForEvent('download', { timeout: 15000 }),
  51  |       page.click('#exportBtn')
  52  |     ])
  53  |     expect(download.suggestedFilename()).toMatch(/\.csv$/i)
  54  |   })
  55  | 
  56  |   test('should export backup and restore it', async ({ page }) => {
  57  |     // Create a class with data
  58  |     if (await page.locator('#mOpenDrawer').isVisible()) {
  59  |       await page.click('#mOpenDrawer')
  60  |     }
  61  |     await page.fill('#newClassName', 'Lớp Backup')
  62  |     await page.fill('#newClassYear', '2024-2025')
  63  |     await page.click('#createClassBtn')
  64  |     await page.click('.class-item')
  65  |     await page.waitForTimeout(500)
  66  | 
  67  |     // Close sidebar
  68  |     await page.keyboard.press('Escape')
  69  |     await page.waitForTimeout(300)
  70  | 
  71  |     await page.click('#addStudentBtn')
  72  |     await page.fill('#inputTen', 'HV Backup')
  73  |     await page.click('#addForm button[type="submit"]')
  74  | 
  75  |     // Navigate to profile
  76  |     await page.evaluate(() => {
  77  |       const btn = document.querySelector('[data-m-nav="me"]') as HTMLButtonElement
  78  |       if (btn) btn.click()
  79  |     })
  80  |     await page.waitForSelector('#meView', { state: 'visible' })
  81  | 
  82  |     // Open backup modal
  83  |     await page.click('[data-me-action="backup"]')
  84  |     await page.waitForSelector('#backupModal', { state: 'visible' })
  85  | 
  86  |     // Export backup
  87  |     const downloadPromise = page.waitForEvent('download', { timeout: 25000 })
  88  |     await page.click('#backupExportBtn')
  89  | 
  90  |     // Handle folder picker dialog if it appears
  91  |     try {
  92  |       await page.waitForSelector('#appDialog', { timeout: 5000 })
  93  |       await page.click('#appDialogCancel')
  94  |     } catch {
  95  |       // Dialog may not appear
  96  |     }
  97  | 
  98  |     const download = await downloadPromise
  99  |     expect(download.suggestedFilename()).toMatch(/\.json$/i)
  100 | 
  101 |     // Save backup file
  102 |     const tmpDir = fs.mkdtempSync('backup-')
  103 |     const backupPath = path.join(tmpDir, 'backup.json')
  104 |     await download.saveAs(backupPath)
  105 | 
  106 |     // Verify backup file contents
  107 |     const backupContent = fs.readFileSync(backupPath, 'utf-8')
  108 |     const backupData = JSON.parse(backupContent)
  109 |     expect(backupData.version).toBe(2)
  110 |     expect(backupData.exportedAt).toBeGreaterThan(0)
  111 |     expect(backupData.state).toBeDefined()
  112 |     expect(backupData.auth).toBeDefined()
  113 |     expect(backupData.checksum).toBeDefined()
```