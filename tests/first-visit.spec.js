import { test, expect } from '@playwright/test';
import { matchResult } from './helpers/api';

// 소개 화면: 로그인 안 한 사람은 새로 들어올 때마다, 로그인한 사람은 안 보여 준다
async function serve(page) {
  await page.route('**/api/v1/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    if (pathname === '/api/v1/me/profile') return route.fulfill({ json: { birthDate: '2002-03-01', age: 24 } });
    if (pathname === '/api/v1/me/matches') return route.fulfill({ json: matchResult(null) });
    if (pathname === '/api/v1/me/suggestions') return route.fulfill({ json: { items: [] } });
    if (pathname === '/api/v1/me/notifications') return route.fulfill({ json: { items: [], unreadCount: 0 } });
    if (pathname === '/api/v1/me/account') return route.fulfill({ json: { email: 'a@example.com', nickname: '점검' } });
    if (pathname === '/api/v1/codes') return route.fulfill({ json: { jobCd: [], schoolCd: [] } });
    return route.fulfill({ json: {} });
  });
}

const welcome = (page) => page.getByRole('heading', { name: /놓치지 않게/, level: 1 });

// 창을 닫았다 다시 연 것처럼: 이번 방문 기록(sessionStorage)만 지우고 다시 들어온다
async function revisit(page) {
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/');
}

test('로그인 안 했으면 정보를 저장했어도 새로 들어올 때마다 소개 화면', async ({ page }) => {
  await serve(page);
  await page.goto('/');
  await expect(welcome(page)).toBeVisible();
  await page.getByRole('link', { name: /가입 없이 시작/ }).first().click();
  await expect(welcome(page)).toHaveCount(0);
  // 같은 방문 안에서는 다시 안 뜬다
  await page.reload();
  await expect(welcome(page)).toHaveCount(0);
  // 새로 들어오면 다시 뜬다
  await revisit(page);
  await expect(welcome(page)).toBeVisible();
});

test('로그인했으면 소개 화면 없이 바로 홈', async ({ page }) => {
  await serve(page);
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'test-access');
    localStorage.setItem('refreshToken', 'test-refresh');
  });
  await page.goto('/');
  await expect(welcome(page)).toHaveCount(0);
  await revisit(page);
  await expect(welcome(page)).toHaveCount(0);
});
