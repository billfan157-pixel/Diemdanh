# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: excel-import.spec.ts >> Excel Import >> should open excel import modal
- Location: tests\e2e\excel-import.spec.ts:40:3

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
    49 × waiting for element to be visible, enabled and editable
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
  2  | import * as path from 'path'
  3  | import * as fs from 'fs'
  4  | import * as XLSX from 'xlsx'
  5  | 
  6  | test.describe('Excel Import', () => {
  7  |   let importFilePath: string
  8  |   let tmpDir: string
  9  | 
  10 |   test.beforeEach(async ({ page }) => {
  11 |     await page.goto('/')
  12 |     await page.waitForSelector('#appMount')
  13 | 
  14 |     const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
  15 |     const pin = (await pinEl.textContent() || '').trim()
  16 |     await page.fill('#loginUser', 'admin')
> 17 |     await page.fill('#loginPin', pin)
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  18 |     await page.click('button[type=submit]')
  19 |     await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
  20 | 
  21 |     // Create a minimal .xlsx fixture
  22 |     tmpDir = fs.mkdtempSync('import-')
  23 |     const ws = XLSX.utils.aoa_to_sheet([
  24 |       ['STT', 'Họ đệm', 'Tên', 'CC', 'KhaoKinh', 'ThuocBai'],
  25 |       ['1', 'Nguyễn', 'An', '8', '9', '7'],
  26 |       ['2', 'Trần', 'Bình', '6', '7', '8'],
  27 |     ])
  28 |     const wb = XLSX.utils.book_new()
  29 |     XLSX.utils.book_append_sheet(wb, ws, 'HK1')
  30 |     importFilePath = path.join(tmpDir, 'import.xlsx')
  31 |     XLSX.writeFile(wb, importFilePath, { bookType: 'xlsx', type: 'file' })
  32 |   })
  33 | 
  34 |   test.afterEach(() => {
  35 |     if (tmpDir) {
  36 |       fs.rmSync(tmpDir, { recursive: true, force: true })
  37 |     }
  38 |   })
  39 | 
  40 |   test('should open excel import modal', async ({ page }) => {
  41 |     // Create a class first
  42 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  43 |       await page.click('#mOpenDrawer')
  44 |     }
  45 |     await page.fill('#newClassName', 'Lớp Import')
  46 |     await page.fill('#newClassYear', '2024-2025')
  47 |     await page.click('#createClassBtn')
  48 |     await page.waitForTimeout(500)
  49 |     await page.keyboard.press('Escape')
  50 |     await page.waitForTimeout(300)
  51 | 
  52 |     // Click import button
  53 |     await page.click('#importBtn')
  54 |     await page.waitForSelector('#excelImportModal', { state: 'visible', timeout: 3000 })
  55 | 
  56 |     // Verify modal content
  57 |     await expect(page.locator('#excelImportModal')).toContainText('Import Excel')
  58 |   })
  59 | 
  60 |   test('should show file chooser when clicking upload', async ({ page }) => {
  61 |     if (await page.locator('#mOpenDrawer').isVisible()) {
  62 |       await page.click('#mOpenDrawer')
  63 |     }
  64 |     await page.fill('#newClassName', 'Lớp Import 2')
  65 |     await page.fill('#newClassYear', '2024-2025')
  66 |     await page.click('#createClassBtn')
  67 |     await page.waitForTimeout(500)
  68 |     await page.keyboard.press('Escape')
  69 |     await page.waitForTimeout(300)
  70 | 
  71 |     await page.click('#importBtn')
  72 |     await page.waitForSelector('#excelImportModal', { state: 'visible', timeout: 3000 })
  73 | 
  74 |     // Click upload zone and set file
  75 |     const [fileChooser] = await Promise.all([
  76 |       page.waitForEvent('filechooser', { timeout: 5000 }),
  77 |       page.click('#excelDropZone')
  78 |     ])
  79 |     await fileChooser.setFiles(importFilePath)
  80 |     await page.waitForTimeout(2000)
  81 | 
  82 |     // Verify preview table appears (parsed successfully)
  83 |     await expect(page.locator('.import-preview')).toBeVisible()
  84 |   })
  85 | })
  86 | 
```