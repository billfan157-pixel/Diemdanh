import { test, expect } from '@playwright/test'

test.describe('Class Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('#appMount')
    await page.fill('#loginUser', 'admin')
    await page.fill('#loginPin', '1234')
    await page.click('button[type=submit]')
    await expect(page.locator('#appRoot')).toBeVisible()
  })

  test('should create a new class', async ({ page }) => {
    // Open sidebar if in mobile view
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
      await expect(page.locator('.sidebar')).toHaveClass(/open/)
    }

    // Create class
    await page.fill('#newClassName', 'Lớp Test')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')

    // Check class appears
    await expect(page.locator('.class-item')).toContainText('Lớp Test')
  })

  test('should rename class', async ({ page }) => {
    // Create a class first
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp Đổi Tên')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')

    // Click rename
    await page.click('.class-item .icon-btn[data-rename-class]')
    await expect(page.locator('#appDialog')).toBeVisible()

    await page.fill('#appDialogMessage input', 'Lớp Đã Đổi')
    await page.click('#appDialogOk')

    await expect(page.locator('.class-item')).toContainText('Lớp Đã Đổi')
  })

  test('should delete class', async ({ page }) => {
    // Create a class first
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }
    await page.fill('#newClassName', 'Lớp Xóa')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')

    // Delete
    await page.click('.class-item .icon-btn[data-del-class]')
    await expect(page.locator('#appDialog')).toBeVisible()
    await page.click('#appDialogOk')

    await expect(page.locator('.class-item')).not.toContainText('Lớp Xóa')
  })
})