import { test, expect } from '@playwright/test'
import { LoginPage } from '../../pages/LoginPage'

// Example UI test — expand with real selectors and credentials
test.describe('HR Login', () => {
  test('should display the login page', async ({ page }) => {
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await expect(page).toHaveTitle(/Salary Hero/)
  })
})
