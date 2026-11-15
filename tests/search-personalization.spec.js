import { test, expect } from '@playwright/test';
import { mockApi, MONTHLY_QUERY, CERTIFICATE_QUERY, policies, searchResult } from './helpers/api';

const profilePath = (returnTo) => `/profile?${new URLSearchParams({ returnTo })}`;

test('내 정보 저장 후 검색 조건으로 복귀해 다시 판정하고 예시도 새로 받는다', async ({ page }) => {
  let saved = false;
  let searches = 0;
  let examples = 0;
  await mockApi(page, async (route, url) => {
    if (url.pathname === '/api/v1/me/profile') {
      if (route.request().method() === 'PUT') {
        expect(route.request().postDataJSON().jobCd).toBe('0013002');
        saved = true;
        await route.fulfill({ status: 204 });
      } else await route.fulfill({ json: { jobCd: '0013001', sbizCd: null } });
      return true;
    }
    if (url.pathname === '/api/v1/search/examples') {
      examples++;
      await route.fulfill({ json: [{ text: saved ? CERTIFICATE_QUERY : MONTHLY_QUERY, match: 1, needsCheck: 0 }] });
      return true;
    }
    if (url.pathname !== '/api/v1/search') return false;
    searches++;
    await route.fulfill({ json: {
      ...searchResult(CERTIFICATE_QUERY),
      counts: { match: saved ? 1 : 0, needsCheck: 0, noMatch: saved ? 0 : 21 },
      totalElements: saved ? 1 : 21, totalPages: saved ? 1 : 2,
      content: [{ policy: policies[5], verdict: saved ? 'MATCH' : 'NO_MATCH', verdictLabel: saved ? '조건 일치' : '조건 불일치', summary: '판정 결과', dDay: 46 }],
    } });
    return true;
  });
  await page.goto(`/search?${new URLSearchParams({ q: CERTIFICATE_QUERY, noRegion: 'true', noCategory: 'true', includeNoMatch: 'true', page: '1' })}`);
  await expect(page.locator('.search-result-counts strong')).toHaveText(['0', '0', '21']);
  await page.getByRole('link', { name: '내 정보 확인·수정' }).click();
  const job = page.getByRole('combobox', { name: '취업 상태', exact: true });
  await expect(job).toHaveValue('0013001');
  await job.selectOption('0013002');
  await page.getByRole('button', { name: '저장하고 검색 결과 다시 보기' }).click();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(CERTIFICATE_QUERY);
  await expect(page.locator('.search-result-counts strong')).toHaveText(['1', '0', '0']);
  const returned = new URL(page.url());
  expect(returned.searchParams.get('noRegion')).toBe('true');
  expect(returned.searchParams.get('noCategory')).toBe('true');
  expect(returned.searchParams.get('includeNoMatch')).toBe('true');
  expect(returned.searchParams.has('page')).toBe(false);
  await page.getByRole('textbox', { name: '검색어' }).fill('');
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveAttribute('placeholder', CERTIFICATE_QUERY);
  expect(searches).toBe(2);
  expect(examples).toBe(2);
});

test('저장 없이 돌아가도 검색어와 조건을 유지한다', async ({ page }) => {
  let writes = 0;
  await mockApi(page, (route, url) => {
    if (url.pathname === '/api/v1/me/profile' && route.request().method() === 'PUT') writes++;
    return false;
  });
  await page.goto(profilePath(`/search?${new URLSearchParams({ q: MONTHLY_QUERY, noRegion: 'true' })}`));
  await page.getByRole('button', { name: '검색으로 돌아가기' }).click();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(MONTHLY_QUERY);
  await expect(page).toHaveURL(/noRegion=true/);
  expect(writes).toBe(0);
});

test('검색에서 공고 상세를 거쳐 내 정보를 열어도 같은 검색으로 돌아간다', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (!url.pathname.endsWith('/eligibility')) return false;
    await route.fulfill({ json: { verdict: 'NEEDS_CHECK', verdictLabel: '확인 필요', conditions: [], missingFields: ['jobCd'], explanation: '취업 상태를 입력해 주세요.' } });
    return true;
  });
  await page.goto(`/search?${new URLSearchParams({ q: CERTIFICATE_QUERY, noRegion: 'true' })}`);
  await page.locator('.card-link').first().click();
  await page.getByRole('link', { name: '내 정보 입력하기' }).click();
  await page.getByRole('button', { name: '검색으로 돌아가기' }).click();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(CERTIFICATE_QUERY);
  await expect(page).toHaveURL(/noRegion=true/);
});

test('저장에 실패하면 편집한 값을 유지하고 성공한 뒤에만 검색으로 돌아간다', async ({ page }) => {
  let fail = true;
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/me/profile' || route.request().method() !== 'PUT') return false;
    await route.fulfill({ status: fail ? 400 : 200, json: fail ? { message: '입력한 정보를 확인해 주세요.' } : {} });
    return true;
  });
  await page.goto(profilePath(`/search?${new URLSearchParams({ q: MONTHLY_QUERY })}`));
  await page.getByRole('combobox', { name: '취업 상태', exact: true }).selectOption('0013002');
  await page.getByRole('button', { name: '저장하고 검색 결과 다시 보기' }).click();
  await expect(page.getByRole('alert')).toContainText('입력한 정보를 확인해 주세요.');
  await expect(page.getByRole('combobox', { name: '취업 상태', exact: true })).toHaveValue('0013002');
  expect(new URL(page.url()).pathname).toBe('/profile');
  fail = false;
  await page.getByRole('button', { name: '저장하고 검색 결과 다시 보기' }).click();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(MONTHLY_QUERY);
});

test('외부 URL을 복귀 경로로 사용하지 않고 기존 프로필 흐름을 유지한다', async ({ page }) => {
  await mockApi(page);
  await page.goto(profilePath('https://example.com/search?q=external'));
  await expect(page.getByRole('button', { name: '저장하고 맞춤 공고 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '검색으로 돌아가기' })).toHaveCount(0);
  await page.getByRole('button', { name: '나중에 입력' }).click();
  await expect(page).toHaveURL('/');
});

test('조건 일치 예시를 우선하며 다른 결과가 있으면 직전 예시를 반복하지 않는다', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/search/examples') return false;
    await route.fulfill({ json: [{ text: MONTHLY_QUERY, match: 0, needsCheck: 10 }, { text: CERTIFICATE_QUERY, match: 2, needsCheck: 0 }, { text: '결과가 없는 예시', match: 0, needsCheck: 0 }] });
    return true;
  });
  await page.goto('/search');
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveAttribute('placeholder', CERTIFICATE_QUERY);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(CERTIFICATE_QUERY);
  await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
  await page.goto('/search');
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveAttribute('placeholder', MONTHLY_QUERY);
});

test('예시를 불러오지 못해도 기본 예시와 직접 검색을 사용할 수 있다', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/search/examples') return false;
    await route.abort('failed');
    return true;
  });
  await page.goto('/search');
  const input = page.getByRole('textbox', { name: '검색어' });
  await expect(input).toHaveAttribute('placeholder', '내 조건에 맞는 혜택 찾아줘');
  await input.fill(CERTIFICATE_QUERY);
  await page.getByRole('button', { name: '검색', exact: true }).click();
  await expect(page.getByRole('heading', { name: policies[5].title })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('늦게 도착한 맞춤 예시가 사용자가 입력 중인 검색어를 덮어쓰지 않는다', async ({ page }) => {
  let pending;
  await mockApi(page, (route, url) => {
    if (url.pathname !== '/api/v1/search/examples') return false;
    pending = route;
    return true;
  });
  await page.goto('/search');
  await expect.poll(() => Boolean(pending)).toBe(true);
  const input = page.getByRole('textbox', { name: '검색어' });
  await input.fill('직접 입력 중인 검색어');
  await pending.fulfill({ json: [{ text: CERTIFICATE_QUERY, match: 0, needsCheck: 3 }] });
  await expect(input).toHaveAttribute('placeholder', CERTIFICATE_QUERY);
  await expect(input).toHaveValue('직접 입력 중인 검색어');
  await input.fill('');
  await input.press('Enter');
  await expect(input).toHaveValue(CERTIFICATE_QUERY);
});
