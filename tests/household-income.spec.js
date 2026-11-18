import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/api';

// 가구원 수·가구 월 소득을 넣으면 기준중위소득 % 를 보여 주고, 그 % 를 저장한다
test('가구 소득으로 기준중위소득 % 를 계산해 저장한다', async ({ page }) => {
  let saved = null;
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/me/profile') return false;
    if (route.request().method() === 'PUT') {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: saved });
    } else await route.fulfill({ status: 404, json: { message: '저장한 정보가 없어요.' } });
    return true;
  });
  await page.goto('/profile');
  await page.getByRole('combobox', { name: '가구원 수' }).selectOption('4');
  await page.getByRole('spinbutton', { name: '가구 월 소득' }).fill('600');
  await expect(page.getByText('약 92%')).toBeVisible();
  await page.getByRole('button', { name: /저장/ }).click();
  await expect.poll(() => saved?.householdMedianIncomePct).toBe(92);
  expect(saved.householdIncomeYear).toBe(2026);
});
