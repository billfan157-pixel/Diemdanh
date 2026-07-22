import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as XLSX from 'xlsx'

test.describe('Excel Import', () => {
  let importFilePath: string
  let tmpDir: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#appMount')

    const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
    const pin = (await pinEl.textContent() || '').trim()
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', pin)
    await page.click('button[type=submit]')
    await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })

    // Create a minimal .xlsx fixture
    tmpDir = fs.mkdtempSync('import-')
    const ws = XLSX.utils.aoa_to_sheet([
      ['STT', 'Họ đệm', 'Tên', 'CC', 'KhaoKinh', 'ThuocBai'],
      ['1', 'Nguyễn', 'An', '8', '9', '7'],
      ['2', 'Trần', 'Bình', '6', '7', '8'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'HK1')
    importFilePath = path.join(tmpDir, 'import.xlsx')
    XLSX.writeFile(wb, importFilePath, { bookType: 'xlsx', type: 'file' })
  })

  test.afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  test('should open excel import modal', async ({ page }) => {
    // Create a class first
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp Import')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Click import button
    await page.click('#importBtn')
    await page.waitForSelector('#excelImportModal', { state: 'visible', timeout: 3000 })

    // Verify modal content
    await expect(page.locator('#excelImportModal')).toContainText('Import Excel')
  })

  test('should show file chooser when clicking upload', async ({ page }) => {
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp Import 2')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.waitForTimeout(500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.click('#importBtn')
    await page.waitForSelector('#excelImportModal', { state: 'visible', timeout: 3000 })

    // Click upload zone and set file
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.click('#excelDropZone')
    ])
    await fileChooser.setFiles(importFilePath)
    await page.waitForTimeout(2000)

    // Verify preview table appears (parsed successfully)
    await expect(page.locator('.import-preview')).toBeVisible()
  })
})
