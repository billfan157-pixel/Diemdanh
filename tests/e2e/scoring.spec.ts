import { test, expect } from '@playwright/test'

test.describe('Scoring Flow', () => {
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

  async function createAndSelectClass(page: any, className: string, studentName: string) {
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }

    await page.fill('#newClassName', className)
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.waitForTimeout(500)

    await page.locator('.class-item').first().click()
    await page.waitForTimeout(500)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    await page.click('#addStudentBtn')
    await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
    await page.fill('#inputTenThanh', 'Maria')
    const names = studentName.split(' ')
    await page.fill('#inputHoDem', names[0] || '')
    await page.fill('#inputTen', names[1] || '')
    await page.locator('#addForm button[type="submit"]').click()
    await expect(page.locator('#studentsContainer .student')).toBeVisible({ timeout: 5000 })
  }

  test('should add a student and enter a score in card view', async ({ page }) => {
    await createAndSelectClass(page, 'Lớp Điểm', 'Nguyễn Văn A')

    const scoreInput = page.locator('[data-score-input]').first()
    await expect(scoreInput).toBeVisible()
    await scoreInput.fill('8')
    await scoreInput.press('Enter')
    await page.waitForTimeout(500)

    const chip = page.locator('.chip').first()
    await expect(chip).toBeVisible()
    await expect(chip).toContainText('8')
  })

  test('should enter a score in table view', async ({ page }) => {
    await createAndSelectClass(page, 'Lớp Bảng', 'Nguyễn Văn B')

    // Switch to table view via JS (sidebar may overlap on desktop)
    await page.evaluate(() => {
      (document.querySelector('[data-view="table"]') as HTMLButtonElement)?.click()
    })
    await page.waitForTimeout(500)

    const tableScoreInput = page.locator('[data-table-score]').first()
    await expect(tableScoreInput).toBeVisible()
    await tableScoreInput.fill('9')
    await tableScoreInput.press('Tab')
    await page.waitForTimeout(500)

    await expect(tableScoreInput).toHaveValue('9')
  })

  test('should reject invalid score input', async ({ page }) => {
    await createAndSelectClass(page, 'Lớp Lỗi', 'Trần Văn C')

    const scoreInput = page.locator('[data-score-input]').first()
    await expect(scoreInput).toBeVisible()
    await scoreInput.fill('15')
    await scoreInput.press('Enter')
    await page.waitForTimeout(500)

    const chips = page.locator('.chip')
    await expect(chips).toHaveCount(0)
  })
})
