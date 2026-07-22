import { test, expect } from '@playwright/test'

test.describe('Parent Invite', () => {
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

  test('should create invite link and show parent report', async ({ page }) => {
    // Open sidebar
    if (await page.locator('#mOpenDrawer').isVisible()) {
      await page.click('#mOpenDrawer')
    }

    // Create a class
    await page.fill('#newClassName', 'Lớp PH Test')
    await page.fill('#newClassYear', '2024-2025')
    await page.click('#createClassBtn')
    await page.waitForTimeout(500)

    // Select the class
    await page.click('.class-item')
    await page.waitForTimeout(300)

    // Close sidebar
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Add a student
    await page.waitForSelector('#addStudentBtn')
    await page.click('#addStudentBtn')
    await page.waitForSelector('#addStudentModal', { state: 'visible', timeout: 3000 })
    await page.fill('#inputTenThanh', 'Maria')
    await page.fill('#inputHoDem', 'Nguyễn')
    await page.fill('#inputTen', 'An')
    await page.locator('#addForm button[type="submit"]').click()
    await page.waitForTimeout(500)

    // Enter a score
    const scoreInput = page.locator('[data-score-input]').first()
    await scoreInput.fill('8')
    await scoreInput.press('Enter')
    await page.waitForTimeout(300)

    // Open invite modal from class view
    await page.click('#classInviteBtn')
    await page.waitForSelector('#parentInviteModal', { state: 'visible', timeout: 3000 })

    // Click "Tạo link" on the first student
    await page.click('[data-invite-student]')
    await page.waitForTimeout(500)

    // Check result area is shown with the link
    const resultArea = page.locator('#parentInviteResult')
    await expect(resultArea).not.toHaveClass(/hidden/)
    const linkInput = page.locator('#parentInviteUrl')
    const inviteUrl = await linkInput.inputValue()
    expect(inviteUrl).toContain('#/ph/')

    // Close modal
    await page.click('#parentInviteDone')
    await page.waitForSelector('#parentInviteModal', { state: 'hidden' })

    // Navigate to the parent report page
    await page.goto(inviteUrl)

    // Verify parent report card is visible
    await expect(page.locator('#parentReportRoot')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.parent-report-card')).toBeVisible()
    await expect(page.locator('.parent-report-card')).toContainText('Maria')
    await expect(page.locator('.parent-report-card')).toContainText('Nguyễn An')
  })
})
