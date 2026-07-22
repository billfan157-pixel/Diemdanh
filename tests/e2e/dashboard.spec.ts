import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#appMount')

    const pinEl = page.locator('.login-screen .hint strong:nth-of-type(2)')
    const pin = (await pinEl.textContent() || '').trim()
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', pin)
    await page.click('button[type=submit]')
    await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
  })

  test('should show dashboard stats after creating data', async ({ page }) => {
    // Open sidebar
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }

    // Create a class
    await page.fill('#newClassName', 'Lớp Dashboard')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.waitForTimeout(500)

    // Close sidebar and add students
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.waitForSelector('#addStudentBtn')

    // Add first student
    await page.click('#addStudentBtn')
    await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
    await page.fill('#inputTenThanh', 'Maria')
    await page.fill('#inputHoDem', 'Nguyễn')
    await page.fill('#inputTen', 'An')
    await page.locator('#addForm button[type="submit"]').click()
    await page.waitForTimeout(500)

    // Navigate to dashboard via home button
    await page.evaluate(() => {
      const btn = document.querySelector('[data-m-nav="home"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(500)

    // Verify dashboard elements
    await expect(page.locator('.dash-stats')).toBeVisible()
    await expect(page.locator('.dash-section')).toBeVisible()
  })

  test('should render class rankings on dashboard', async ({ page }) => {
    // Open sidebar
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }

    // Create two classes
    for (const name of ['Lớp A', 'Lớp B']) {
      await page.fill('#newClassName', name)
      await page.fill('#newClassYear', '2024-2025')
      await page.click('#createClassBtn')
      await page.waitForTimeout(500)
    }

    // Navigate to dashboard
    await page.evaluate(() => {
      const btn = document.querySelector('[data-m-nav="home"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(500)

    // Verify rankings section is present
    await expect(page.locator('.dash-rank-table')).toBeVisible()
  })
})
