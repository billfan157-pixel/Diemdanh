import { test, expect } from '@playwright/test'

test.describe('Sổ Điểm GL', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForSelector('#appMount', { state: 'attached' })
  })

  test('should load login screen', async ({ page }) => {
    await expect(page.locator('#loginScreen')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Sổ Điểm Giáo Lý')
  })

  test('should login with default admin credentials', async ({ page }) => {
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', '1234')
    await page.click('button[type=submit]')

    // Wait for app to load
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
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', '1234')
    await page.click('button[type=submit]')

    await expect(page.locator('#appRoot')).toBeVisible()
    await expect(page.locator('.m-top-title')).toContainText('Sổ Điểm')
    await expect(page.locator('.m-nav-item.active')).toHaveAttribute('data-m-nav', 'home')
  })
})