import { test, expect } from '@playwright/test'

test.describe('Settings', () => {
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

  test('should open command palette and navigate to settings', async ({ page }) => {
    await page.keyboard.press('/')
    await page.waitForSelector('#commandPalette:not(.hidden)', { timeout: 3000 })
    await page.fill('#commandPalette input[type=text]', 'Cài đặt')
    await page.waitForTimeout(300)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(500)
    const dialog = page.locator('.dialog-overlay:not(.hidden)')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
  })

  test('should open settings from ProfileView', async ({ page }) => {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-m-nav="profile"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(500)
    const settingsBtn = page.locator('[data-me-action="settings"]')
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()
    await page.waitForTimeout(300)
    const dialog = page.locator('.dialog-overlay:not(.hidden)')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
  })
})
