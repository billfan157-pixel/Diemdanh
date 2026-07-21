import { test, expect } from '@playwright/test'

test.describe('Sổ Điểm GL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#appMount', { state: 'attached' })
  })

  /** Extract the dynamically generated default PIN from the login hint text */
  async function getDefaultPin(page: any): Promise<string> {
    const el = page.locator('.login-screen .hint strong:nth-of-type(2)')
    const text = await el.textContent()
    return (text || '').trim()
  }

  test('should load login screen', async ({ page }) => {
    await expect(page.locator('#loginScreen')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Sổ Điểm Giáo Lý')
  })

  test('should login with default admin credentials', async ({ page }) => {
    const pin = await getDefaultPin(page)
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', pin)
    await page.click('button[type=submit]')

    await expect(page.locator('#appRoot')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', 'wrong')
    await page.click('button[type=submit]')

    await expect(page.locator('#loginError')).toBeVisible()
    await expect(page.locator('#loginError')).toContainText('Sai tài khoản')
  })

  test('should navigate to dashboard after login', async ({ page }) => {
    const pin = await getDefaultPin(page)
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', pin)
    await page.click('button[type=submit]')

    await expect(page.locator('#appRoot')).toBeVisible()
    await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
    await expect(page.locator('.m-nav-item.active')).toHaveAttribute('data-m-nav', 'home')
  })
})