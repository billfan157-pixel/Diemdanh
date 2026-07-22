import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Export & Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#appMount')

    const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
    const pin = (await pinEl.textContent() || '').trim()
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', pin)
    await page.click('button[type=submit]')
    await expect(page.locator('#appRoot')).toBeVisible()
  })

  test('should export class CSV and verify content', async ({ page }) => {
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp CSV')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.click('.class-item')
    await page.waitForTimeout(500)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.waitForSelector('#addStudentBtn')

    await page.click('#addStudentBtn')
    await page.fill('#inputTen', 'HV CSV')
    await page.click('#addForm button[type="submit"]')
    await page.waitForTimeout(500)

    const scoreInput = page.locator('[data-score-input]').first()
    await scoreInput.fill('9')
    await scoreInput.press('Enter')
    await page.waitForTimeout(500)

    await expect(page.locator('.chip')).toContainText('9')

    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#exportBtn')
    ])
    expect(download.suggestedFilename()).toMatch(/\.csv$/i)
  })

  test('should export backup and restore it', async ({ page }) => {
    // Create a class with data
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp Backup')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.click('.class-item')
    await page.waitForTimeout(500)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.click('#addStudentBtn')
    await page.fill('#inputTen', 'HV Backup')
    await page.click('#addForm button[type="submit"]')

    // Navigate to profile
    await page.evaluate(() => {
      const btn = document.querySelector('[data-m-nav="me"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForSelector('#meView', { state: 'visible' })

    // Open backup modal
    await page.click('[data-me-action="backup"]')
    await page.waitForSelector('#backupModal', { state: 'visible' })

    // Export backup
    const downloadPromise = page.waitForEvent('download', { timeout: 25000 })
    await page.click('#backupExportBtn')

    // Handle folder picker dialog if it appears
    try {
      await page.waitForSelector('#appDialog', { timeout: 5000 })
      await page.click('#appDialogCancel')
    } catch {
      // Dialog may not appear
    }

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.json$/i)

    // Save backup file
    const tmpDir = fs.mkdtempSync('backup-')
    const backupPath = path.join(tmpDir, 'backup.json')
    await download.saveAs(backupPath)

    // Verify backup file contents
    const backupContent = fs.readFileSync(backupPath, 'utf-8')
    const backupData = JSON.parse(backupContent)
    expect(backupData.version).toBe(2)
    expect(backupData.exportedAt).toBeGreaterThan(0)
    expect(backupData.state).toBeDefined()
    expect(backupData.auth).toBeDefined()
    expect(backupData.checksum).toBeDefined()
    expect(Array.isArray(backupData.state.classes)).toBe(true)
    expect(backupData.state.classes.length).toBeGreaterThanOrEqual(1)
    expect(backupData.state.classes[0].students.length).toBeGreaterThanOrEqual(1)

    // Close backup modal
    await page.locator('#backupModalClose').click()
    await page.waitForSelector('#backupModal', { state: 'hidden' })

    // Navigate to profile again
    await page.evaluate(() => {
      const btn = document.querySelector('[data-m-nav="me"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForSelector('#meView', { state: 'visible' })

    // Open backup modal again
    await page.click('[data-me-action="backup"]')
    await page.waitForSelector('#backupModal', { state: 'visible' })

    // Restore from backup
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.click('#backupImportBtn')
    ])
    await fileChooser.setFiles(backupPath)

    // Confirm restore dialog
    await expect(page.locator('#appDialog')).toBeVisible()
    await page.click('#appDialogOk')

    // Wait for modal to close
    await expect(page.locator('#backupModal')).not.toBeVisible({ timeout: 5000 })

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })
})
