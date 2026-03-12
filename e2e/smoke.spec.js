const { test, expect } = require('@playwright/test');
const { seedWorkspaceScenario } = require('./helpers/api');

const selectWarehouseScope = async (page, warehouseId) => {
  const selector = page.getByRole('combobox', {
    name: 'Warehouse',
    exact: true
  });
  await selector.selectOption(warehouseId || '');
};

const getProductRow = (page, productName) =>
  page.locator('table.data-table tbody tr').filter({ hasText: productName }).first();

const getStockCell = (row) => row.locator('td').nth(6);
const expectStockCellText = (row, value) =>
  expect(getStockCell(row)).toHaveText(String(value), { timeout: 20_000 });
const getNotificationDialog = (page) => page.getByRole('dialog');

const openPortalSelection = async (page) => {
  await page.goto('/');
  const landingStage = page.locator('.auth-landing-stage-interactive');
  const tapToContinueButton = page.getByRole('button', {
    name: 'Tap to Continue',
    exact: true
  });
  const continueButton = page.getByRole('button', {
    name: 'Continue',
    exact: true
  });
  const employerPortalButton = page.getByRole('button', {
    name: 'Employer Portal'
  });

  if (await landingStage.isVisible().catch(() => false)) {
    await landingStage.click();
    await expect(tapToContinueButton).toBeVisible({ timeout: 15_000 });
    await tapToContinueButton.click();
  }

  if (
    !(await employerPortalButton.isVisible().catch(() => false)) &&
    (await continueButton.isVisible().catch(() => false))
  ) {
    await continueButton.click();
  }

  await expect(employerPortalButton).toBeVisible({ timeout: 15_000 });
};

const loginThroughPortal = async ({
  page,
  portal,
  companyName = '',
  username,
  password
}) => {
  await openPortalSelection(page);
  const portalButton = page.getByRole('button', { name: portal });

  await expect(portalButton).toBeVisible({ timeout: 15_000 });
  await portalButton.click();

  if (companyName) {
    await page.getByLabel('Company Name').fill(companyName);
  }

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
};

const openProductsAsAdmin = async (page, scenario) => {
  await loginThroughPortal({
    page,
    portal: 'Employer Portal',
    username: scenario.admin.username,
    password: scenario.admin.password
  });

  await expect(
    page.getByRole('heading', {
      name: `${scenario.companyName}'s Inventory`
    })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Products' }).click();
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
};

const openReportsAsAdmin = async (page, scenario) => {
  await loginThroughPortal({
    page,
    portal: 'Employer Portal',
    username: scenario.admin.username,
    password: scenario.admin.password
  });

  await expect(
    page.getByRole('heading', {
      name: `${scenario.companyName}'s Inventory`
    })
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
};

const openNotifications = async (page) => {
  await page.getByRole('button', { name: 'Notifications' }).click();
  const dialog = getNotificationDialog(page);
  await expect(dialog).toBeVisible();
  return dialog;
};

const closeNotifications = async (page) => {
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(getNotificationDialog(page)).toHaveCount(0);
};

const openAuthPortal = async (page, portalName) => {
  await openPortalSelection(page);
  const portalButton = page.getByRole('button', { name: portalName });

  await expect(portalButton).toBeVisible({ timeout: 15_000 });
  await portalButton.click();
};

const submitEmployeeSignupRequest = async ({
  page,
  companyName,
  username,
  email,
  mobileNumber,
  password
}) => {
  await openAuthPortal(page, 'Employee Portal');
  await page.getByRole('button', { name: 'Employee sign up' }).click();
  await page.getByLabel('Company Name').fill(companyName);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mobile Number').fill(mobileNumber);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: 'Request employee signup' }).click();
  await expect(
    page.getByText('Signup request submitted. An admin must approve your account.')
  ).toBeVisible({ timeout: 20_000 });
};

const signOutToPortal = async (page) => {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('button', { name: 'Employer Portal' })
  ).toBeVisible({ timeout: 15_000 });
};

const getEmployeeSignupNotification = (dialog, username) =>
  dialog
    .locator('.notification-item')
    .filter({ hasText: 'Employee signup request' })
    .filter({ hasText: username })
    .first();

const getNotificationItem = (dialog, title, detail) =>
  dialog
    .locator('.notification-item')
    .filter({ hasText: title })
    .filter({ hasText: detail })
    .first();

test.describe('Invendex end-to-end smoke', () => {
  test('admin warehouse selector scopes product stock', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({ suffix });

    await openProductsAsAdmin(page, scenario);

    const retroRow = getProductRow(page, scenario.products.retro.name);
    await expect(retroRow).toBeVisible({ timeout: 20_000 });
    await expectStockCellText(retroRow, 23);

    await selectWarehouseScope(page, scenario.warehouses.kampala.id);
    await expectStockCellText(retroRow, 3);

    await selectWarehouseScope(page, scenario.warehouses.entebbe.id);
    await expectStockCellText(retroRow, 20);

    await selectWarehouseScope(page, '');
    await expectStockCellText(retroRow, 23);
  });

  test('admin warehouse selector scopes notifications', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({
      suffix,
      includeLowStockNotifications: true
    });

    await openProductsAsAdmin(page, scenario);

    await selectWarehouseScope(page, scenario.warehouses.kampala.id);
    let dialog = await openNotifications(page);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    await expect(
      dialog.getByText(`Low stock: ${scenario.products.retro.name}`)
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      dialog.getByText(`Low stock: ${scenario.products.sneaker.name}`)
    ).toHaveCount(0, { timeout: 20_000 });
    await closeNotifications(page);

    await selectWarehouseScope(page, scenario.warehouses.entebbe.id);
    dialog = await openNotifications(page);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    await expect(
      dialog.getByText(`Low stock: ${scenario.products.sneaker.name}`)
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      dialog.getByText(`Low stock: ${scenario.products.retro.name}`)
    ).toHaveCount(0, { timeout: 20_000 });
  });

  test('staff can add a product and admin can review the deletion', async ({
    page
  }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({
      suffix,
      includeEmployee: true
    });
    const productName = `UI Smoke Tee ${suffix}`;

    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    await loginThroughPortal({
      page,
      portal: 'Employee Portal',
      companyName: scenario.companyName,
      username: scenario.employee.username,
      password: scenario.employee.password
    });

    await expect(
      page.getByRole('heading', {
        name: `${scenario.companyName}'s Inventory`
      })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();

    const addProductCard = page
      .locator('article.data-card')
      .filter({ has: page.getByRole('heading', { name: 'Add product' }) })
      .first();

    await expect(addProductCard).toBeVisible();

    await addProductCard.getByLabel('Name').fill(productName);
    await addProductCard.getByLabel(/Price/).fill('79');
    await addProductCard.getByLabel('Category').fill('Apparel');
    await addProductCard.getByLabel('Low-stock threshold').fill('2');
    await page.getByRole('button', { name: 'Add product' }).click();

    const staffRow = getProductRow(page, productName);
    await expect(staffRow).toBeVisible();
    await staffRow.getByRole('button', { name: 'Remove' }).click();
    await expect(staffRow).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Deleted items (admin review)' })
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign out' }).click();

    await loginThroughPortal({
      page,
      portal: 'Employer Portal',
      username: scenario.admin.username,
      password: scenario.admin.password
    });

    await page.getByRole('button', { name: 'Products' }).click();
    await expect(
      page.getByRole('heading', { name: 'Deleted items (admin review)' })
    ).toBeVisible();

    const deletedRow = getProductRow(page, productName);
    await expect(deletedRow).toBeVisible();
    await deletedRow.getByRole('button', { name: 'Restore' }).click();

    await expect(
      page
        .locator('article.data-card')
        .filter({ hasText: 'Deleted items (admin review)' })
        .getByText(productName)
    ).toHaveCount(0);
    await expect(getProductRow(page, productName)).toBeVisible();
  });

  test('admin can approve an employee signup request from notifications', async ({
    page
  }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({ suffix });
    const employee = {
      username: `approval${suffix}`,
      email: `approval.${suffix}@example.com`,
      mobileNumber: '+256700333333',
      password: 'QaStaff123!'
    };

    await submitEmployeeSignupRequest({
      page,
      companyName: scenario.companyName,
      username: employee.username,
      email: employee.email,
      mobileNumber: employee.mobileNumber,
      password: employee.password
    });

    await loginThroughPortal({
      page,
      portal: 'Employer Portal',
      username: scenario.admin.username,
      password: scenario.admin.password
    });

    const dialog = await openNotifications(page);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    const signupNotification = getEmployeeSignupNotification(
      dialog,
      employee.username
    );
    await expect(signupNotification).toBeVisible({ timeout: 20_000 });
    await signupNotification.getByRole('button', { name: 'Approve' }).click();
    await expect(
      signupNotification.getByRole('button', { name: 'Approve' })
    ).toHaveCount(0, { timeout: 20_000 });
    await expect(signupNotification).toContainText('Read', { timeout: 20_000 });
    await expect(
      getNotificationItem(dialog, 'Employee signup approved', employee.username)
    ).toBeVisible({ timeout: 20_000 });

    await signOutToPortal(page);

    await loginThroughPortal({
      page,
      portal: 'Employee Portal',
      companyName: scenario.companyName,
      username: employee.username,
      password: employee.password
    });

    await expect(
      page.getByRole('heading', {
        name: `${scenario.companyName}'s Inventory`
      })
    ).toBeVisible({ timeout: 20_000 });
  });

  test('admin can decline an employee signup request from notifications', async ({
    page
  }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({ suffix });
    const employee = {
      username: `decline${suffix}`,
      email: `decline.${suffix}@example.com`,
      mobileNumber: '+256700444444',
      password: 'QaStaff123!'
    };

    await submitEmployeeSignupRequest({
      page,
      companyName: scenario.companyName,
      username: employee.username,
      email: employee.email,
      mobileNumber: employee.mobileNumber,
      password: employee.password
    });

    await loginThroughPortal({
      page,
      portal: 'Employer Portal',
      username: scenario.admin.username,
      password: scenario.admin.password
    });

    const dialog = await openNotifications(page);
    await dialog.getByRole('button', { name: 'Refresh' }).click();
    const signupNotification = getEmployeeSignupNotification(
      dialog,
      employee.username
    );
    await expect(signupNotification).toBeVisible({ timeout: 20_000 });
    await signupNotification.getByRole('button', { name: 'Decline' }).click();
    await expect(
      signupNotification.getByRole('button', { name: 'Decline' })
    ).toHaveCount(0, { timeout: 20_000 });
    await expect(signupNotification).toContainText('Read', { timeout: 20_000 });
    await expect(
      getNotificationItem(dialog, 'Employee signup declined', employee.username)
    ).toBeVisible({ timeout: 20_000 });

    await signOutToPortal(page);

    await loginThroughPortal({
      page,
      portal: 'Employee Portal',
      companyName: scenario.companyName,
      username: employee.username,
      password: employee.password
    });

    await expect(page.getByRole('alert')).toContainText('Account not found', {
      timeout: 20_000
    });
  });

  test('reports page can download a queued summary export', async ({
    page
  }) => {
    const suffix = String(Date.now()).slice(-6);
    const scenario = await seedWorkspaceScenario({
      suffix,
      includeReportsData: true
    });

    await openReportsAsAdmin(page, scenario);

    await page.getByRole('button', { name: 'Download reports' }).click();
    const fullSummaryExcelItem = page.getByRole('menuitem', {
      name: 'Full summary Excel'
    });
    await expect(fullSummaryExcelItem).toBeEnabled({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download');
    await fullSummaryExcelItem.click();
    const download = await downloadPromise;

    await expect(
      page.getByText(/Report export job .*COMPLETED/i)
    ).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => download.suggestedFilename(), {
        timeout: 20_000
      })
      .toMatch(/reports-full-summary-.*\.xlsx/i);

    const downloadedPath = await download.path();
    expect(downloadedPath).toBeTruthy();
  });
});
