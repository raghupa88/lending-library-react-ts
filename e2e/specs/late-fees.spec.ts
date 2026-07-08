import { test as authTest, expect as authExpect } from '../fixtures/auth.fixture';
import { setupAllApiMocks, setupLoansApiMock, setupOrdersApiMocks } from '../helpers/api-mocks';
import {
  MOCK_RETURN_WITH_LATE_FEE,
  MOCK_MY_ORDERS_PENDING,
  MOCK_PAY_ORDER_DECLINED_FAILURE,
} from '../fixtures/mock-data';

authTest.beforeEach(async ({ authenticatedPage: page }) => {
  await setupAllApiMocks(page);
});

authTest('returning an overdue book prompts payment of the late fee', async ({
  authenticatedPage: page,
}) => {
  await setupLoansApiMock(page, { returned: MOCK_RETURN_WITH_LATE_FEE });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await reading.getByRole('button', { name: 'Return' }).first().click();

  const toastRegion = page.getByRole('region', { name: 'Notifications' });
  await authExpect(toastRegion.getByText(/₹20\.00 late fee was added/i)).toBeVisible();
  await toastRegion.getByRole('button', { name: /pay now/i }).click();

  const dialog = page.getByRole('dialog', { name: 'Pay late fee' });
  await authExpect(dialog).toBeVisible();
  await authExpect(dialog.getByText('₹20.00', { exact: true })).toBeVisible();
});

authTest('paying a late fee from the toast succeeds with a valid card', async ({
  authenticatedPage: page,
}) => {
  await setupLoansApiMock(page, { returned: MOCK_RETURN_WITH_LATE_FEE });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await reading.getByRole('button', { name: 'Return' }).first().click();
  await page
    .getByRole('region', { name: 'Notifications' })
    .getByRole('button', { name: /pay now/i })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Pay late fee' });
  await dialog.getByLabel(/cardholder name/i).fill('Test Member');
  await dialog.getByLabel(/card number/i).fill('4242424242424242');
  await dialog.getByLabel(/month/i).fill('12');
  await dialog.getByLabel(/year/i).fill('2030');
  await dialog.getByLabel(/cvc/i).fill('123');
  await dialog.getByRole('button', { name: /pay ₹20\.00/i }).click();

  await authExpect(
    page.getByRole('region', { name: 'Notifications' }).getByText(/late fee paid/i),
  ).toBeVisible();
});

authTest('a declined card keeps the pay-late-fee dialog open with an inline error', async ({
  authenticatedPage: page,
}) => {
  await setupLoansApiMock(page, { returned: MOCK_RETURN_WITH_LATE_FEE });
  await setupOrdersApiMocks(page, { pay: MOCK_PAY_ORDER_DECLINED_FAILURE });
  await page.goto('/dashboard');
  const reading = page.getByRole('tabpanel');
  await reading.getByRole('button', { name: 'Return' }).first().click();
  await page
    .getByRole('region', { name: 'Notifications' })
    .getByRole('button', { name: /pay now/i })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Pay late fee' });
  await dialog.getByLabel(/cardholder name/i).fill('Test Member');
  await dialog.getByLabel(/card number/i).fill('4000000000000002');
  await dialog.getByLabel(/month/i).fill('12');
  await dialog.getByLabel(/year/i).fill('2030');
  await dialog.getByLabel(/cvc/i).fill('123');
  await dialog.getByRole('button', { name: /pay ₹20\.00/i }).click();

  await authExpect(dialog.getByRole('alert').getByText(/declined/i)).toBeVisible();
  await authExpect(dialog).toBeVisible();
});

authTest('the dashboard shows an outstanding-fees banner when a fee is unpaid', async ({
  authenticatedPage: page,
}) => {
  await setupOrdersApiMocks(page, { list: MOCK_MY_ORDERS_PENDING });
  await page.goto('/dashboard');
  await authExpect(page.getByText('You have an outstanding late fee')).toBeVisible();
  await authExpect(page.getByText('Total due: ₹20.00')).toBeVisible();
});
