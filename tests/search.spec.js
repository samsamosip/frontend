import { test, expect } from '@playwright/test';
import { mockApi, MONTHLY_QUERY, CERTIFICATE_QUERY, policies, searchResult, matchResult } from './helpers/api';

async function submit(page, query) {
  await page.getByRole('textbox', { name: '검색어' }).fill(query);
  await page.getByRole('button', { name: '검색', exact: true }).click();
}

test('검색어·제외 조건·결과·스크롤을 상세 뒤로 가기와 새로고침에서 복원한다', async ({ page }) => {
  await mockApi(page);
  await page.goto('/search');
  await submit(page, MONTHLY_QUERY);
  await page.getByRole('button', { name: /^주거/ }).click();
  await expect(page).toHaveURL(/noCategory=true/);
  const card = page.locator('.card-link').nth(3);
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  const scroll = await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(window.scrollY))));
  await card.click();
  await expect(page.getByRole('heading', { name: policies[3].title, level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(MONTHLY_QUERY);
  await expect(page).toHaveURL(/noCategory=true/);
  await expect(page.locator('.card-link')).toHaveCount(5);
  await expect.poll(async () => Math.abs(await page.evaluate(() => window.scrollY) - scroll)).toBeLessThan(4);
  await expect(page.getByRole('button', { name: /^주거/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(MONTHLY_QUERY);
  await expect(page.locator('.card-link')).toHaveCount(5);
  await expect(page.getByRole('button', { name: /^주거/ })).toHaveCount(0);
});

for (const status of [200, 500]) {
  test(`이전 검색의 늦은 ${status} 응답이 최신 결과·오류·최근 검색을 바꾸지 않는다`, async ({ page }) => {
    let oldRequest;
    await mockApi(page, (route, url) => {
      if (url.pathname === '/api/v1/search' && url.searchParams.get('q') === MONTHLY_QUERY) {
        oldRequest = route;
        return true;
      }
      return false;
    });
    await page.goto('/search');
    await submit(page, MONTHLY_QUERY);
    await expect.poll(() => Boolean(oldRequest)).toBe(true);
    await submit(page, CERTIFICATE_QUERY);
    await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
    await oldRequest.fulfill({ status, json: status === 200 ? searchResult(MONTHLY_QUERY) : { message: '오래된 요청 오류' } }).catch(() => {});
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(CERTIFICATE_QUERY);
    await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
    await expect(page.getByRole('heading', { name: policies[0].title })).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('recentSearches')))).toEqual([CERTIFICATE_QUERY]);
  });
}

test('최신 요청이 끝나기 전에는 이전 요청이 완료돼도 로딩을 유지한다', async ({ page }) => {
  const pending = new Map();
  await mockApi(page, (route, url) => {
    if (url.pathname !== '/api/v1/search') return false;
    pending.set(url.searchParams.get('q'), route);
    return true;
  });
  await page.goto('/search');
  await submit(page, MONTHLY_QUERY);
  await expect.poll(() => pending.size).toBe(1);
  await submit(page, CERTIFICATE_QUERY);
  await expect.poll(() => pending.size).toBe(2);
  await pending.get(MONTHLY_QUERY).fulfill({ json: searchResult(MONTHLY_QUERY) }).catch(() => {});
  await expect(page.getByRole('status')).toHaveText('불러오는 중이에요…');
  await expect(page.locator('.card-link')).toHaveCount(0);
  await pending.get(CERTIFICATE_QUERY).fulfill({ json: searchResult(CERTIFICATE_QUERY) });
  await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('홈 필터 변경 중 이전 결과를 숨기고 새 결과를 불러온다', async ({ page }) => {
  let pending;
  await mockApi(page, (route, url) => {
    if (url.pathname === '/api/v1/me/matches' && url.searchParams.has('category')) {
      pending = route;
      return true;
    }
    return false;
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
  await page.getByRole('button', { name: '주거', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('불러오는 중이에요…');
  await expect(page.locator('.card-link')).toHaveCount(0);
  await expect.poll(() => Boolean(pending)).toBe(true);
  await pending.fulfill({ json: matchResult('주거') });
  await expect(page.locator('.card-link')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: policies[5].title })).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('통신 실패를 한국어로 안내하고 같은 조건으로 재시도한다', async ({ page }) => {
  let offline = true;
  const queries = [];
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/search') return false;
    queries.push(url.search);
    if (!offline) return false;
    await route.abort('failed');
    return true;
  });
  await page.goto(`/search?${new URLSearchParams({ q: MONTHLY_QUERY, noCategory: 'true' })}`);
  await expect(page.getByRole('alert')).toContainText('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  await expect(page.getByText('Failed to fetch')).toHaveCount(0);
  offline = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('heading', { name: policies[0].title })).toBeVisible();
  expect(queries).toHaveLength(2);
  expect(queries[1]).toBe(queries[0]);
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(MONTHLY_QUERY);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('서버 오류 문구를 유지하고 재시도하는 동안 오래된 오류를 숨긴다', async ({ page }) => {
  let pending;
  let attempts = 0;
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/search') return false;
    if (++attempts === 1) await route.fulfill({ status: 429, json: { message: '검색이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.' } });
    else pending = route;
    return true;
  });
  await page.goto(`/search?${new URLSearchParams({ q: MONTHLY_QUERY })}`);
  await expect(page.getByRole('alert')).toContainText('검색이 너무 잦아요.');
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect.poll(() => Boolean(pending)).toBe(true);
  await pending.fulfill({ json: searchResult(MONTHLY_QUERY) });
  await expect(page.getByRole('heading', { name: policies[0].title })).toBeVisible();
});

test('빈 입력·공백 입력은 표시된 예시로 검색하고 새 방문에는 다른 예시를 보여 준다', async ({ page }) => {
  const queries = [];
  await mockApi(page, (route, url) => {
    if (url.pathname === '/api/v1/search') queries.push(url.searchParams.get('q'));
    return false;
  });
  await page.goto('/search');
  const input = page.getByRole('textbox', { name: '검색어' });
  const first = await input.getAttribute('placeholder');
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect.poll(() => queries.length).toBe(1);
  expect(queries[0]).toBe(first);
  await expect(input).toHaveValue(first);
  await expect(page.locator('.card-link').first()).toBeVisible();
  await page.goto('/search');
  const second = await input.getAttribute('placeholder');
  expect(second).not.toBe(first);
  await input.fill('   ');
  await input.press('Enter');
  await expect.poll(() => queries.length).toBe(2);
  expect(queries[1]).toBe(second);
});

test('토큰 갱신 중 통신이 끊겨도 로그인 상태를 유지하고 재시도한다', async ({ page }) => {
  let offline = true;
  await mockApi(page, async (route, url) => {
    if (url.pathname === '/api/v1/search' && route.request().headers().authorization !== 'Bearer renewed-access') {
      await route.fulfill({ status: 401, json: { code: 'TOKEN_EXPIRED', message: '토큰이 만료됐어요.' } });
      return true;
    }
    if (url.pathname !== '/api/v1/auth/refresh') return false;
    if (offline) await route.abort('failed');
    else await route.fulfill({ json: { accessToken: 'renewed-access', refreshToken: 'renewed-refresh' } });
    return true;
  });
  await page.addInitScript(() => { localStorage.setItem('accessToken', 'existing-access'); localStorage.setItem('refreshToken', 'existing-refresh'); });
  await page.goto(`/search?${new URLSearchParams({ q: CERTIFICATE_QUERY })}`);
  await expect(page.getByRole('alert')).toContainText('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('existing-access');
  offline = false;
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBe('renewed-access');
});
