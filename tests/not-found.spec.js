import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/api';

// 없는 주소와 내려간 공고는 서버 문구 대신 안내와 홈으로 가는 길을 보여 준다
test('없는 주소는 안내와 홈으로 가는 버튼', async ({ page }) => {
  await mockApi(page);
  await page.goto('/no-such-page');
  await expect(page.getByText('없는 페이지예요')).toBeVisible();
  await expect(page.getByText('곧 만들 화면')).toHaveCount(0);
  await page.getByRole('link', { name: '맞춤 공고 보러 가기' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('내려간 공고는 서버 문구 대신 안내', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (!/\/policies\/999/.test(url.pathname)) return false;
    await route.fulfill({ status: 404, json: { message: '공고를 찾을 수 없습니다: 999' } });
    return true;
  });
  await page.goto('/policies/999');
  await expect(page.getByText('찾을 수 없는 공고예요')).toBeVisible();
  await expect(page.getByText('공고를 찾을 수 없습니다')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다시 시도' })).toHaveCount(0);
});
