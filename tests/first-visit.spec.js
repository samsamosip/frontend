import { test, expect } from '@playwright/test';
import { matchResult } from './helpers/api';

// 소개 화면: 정보 없이 나갔다 다시 온 사람에게는 다시, 정보를 저장했거나 "가입 없이 시작"을 고른 사람에게는 안 보여 준다
async function serve(page, { hasProfile }) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/v1/me/profile') {
      return hasProfile()
        ? route.fulfill({ json: { birthDate: '2002-03-01', age: 24 } })
        : route.fulfill({ status: 404, json: { message: '프로필이 아직 없습니다' } });
    }
    if (pathname === '/api/v1/me/matches') return route.fulfill({ json: matchResult(null) });
    if (pathname === '/api/v1/me/suggestions') return route.fulfill({ json: { items: [] } });
    if (pathname === '/api/v1/me/notifications') return route.fulfill({ json: { items: [], unreadCount: 0 } });
    if (pathname === '/api/v1/codes') return route.fulfill({ json: { jobCd: [], schoolCd: [] } });
    return route.fulfill({ json: {} });
  });
}

const welcome = (page) => page.getByRole('heading', { name: /놓치지 않게/, level: 1 });

test('소개만 보고 나갔다 다시 오면 소개 화면을 다시 보여 준다', async ({ page }) => {
  await serve(page, { hasProfile: () => false });
  await page.goto('/');
  await expect(welcome(page)).toBeVisible();
  await page.getByRole('link', { name: '로그인', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  // 로그인하지 않고 나갔다가 다시 온다 (익명 ID는 남아 있다)
  await page.goto('/');
  await expect(welcome(page)).toBeVisible();
});

test('서버에 내 정보가 있으면 소개 없이 홈으로 간다', async ({ page }) => {
  let saved = false;
  await serve(page, { hasProfile: () => saved });
  await page.goto('/');
  await page.getByRole('link', { name: '로그인', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  saved = true; // 다른 곳에서 정보를 저장했다
  await page.goto('/');
  await expect(welcome(page)).toHaveCount(0);
  await page.reload();
  await expect(welcome(page)).toHaveCount(0);
});

test('"가입 없이 시작"을 고르면 다음부터 소개 화면이 없다', async ({ page }) => {
  await serve(page, { hasProfile: () => false });
  await page.goto('/');
  await page.getByRole('link', { name: /가입 없이 시작/ }).first().click();
  await expect(welcome(page)).toHaveCount(0);
  await page.reload();
  await expect(welcome(page)).toHaveCount(0);
});
