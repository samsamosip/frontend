import { test, expect } from '@playwright/test';
import { mockApi, policies } from './helpers/api';

const query = '면접 정장 빌릴 수 있는 지원 있어?';

function differentPolicies(count) {
  return Array.from({ length: count }, (_, index) => ({
    policy: { ...policies[5], id: 7000 + index, title: `면접 정장 지원 공고 ${index + 1}`, categories: ['일자리'] },
    verdict: 'NO_MATCH', verdictLabel: '조건 불일치', summary: '저장한 내 정보와 신청 조건이 달라요.', dDay: 46,
  }));
}

async function mockResults(page, noMatch, eligible = []) {
  await mockApi(page, async (route, url) => {
    if (url.pathname !== '/api/v1/search') return false;
    const include = url.searchParams.get('includeNoMatch') === 'true';
    const currentPage = Number(url.searchParams.get('page') || 0);
    const content = [...eligible, ...(include ? differentPolicies(noMatch) : [])];
    await route.fulfill({ json: {
      understood: { keywords: [['면접 정장']], audience: [], categories: url.searchParams.has('noCategory') ? [] : ['일자리'], region: null, age: null, closingSoon: false },
      counts: { match: 0, needsCheck: eligible.length, noMatch },
      content: content.slice(currentPage * 20, (currentPage + 1) * 20),
      page: currentPage, totalElements: content.length, totalPages: Math.ceil(content.length / 20),
      // 백엔드가 먼저 배포되지 않아도 이전 개발자용 문구가 노출되면 안 된다.
      message: !content.length && noMatch ? `찾은 공고 ${noMatch}개가 모두 내 조건과 맞지 않아요. 불일치도 보려면 includeNoMatch=true` : null,
    } });
    return true;
  });
}

test('모든 공고가 조건과 다르면 안내·보기 버튼을 제공하고 21번째 공고까지 볼 수 있다', async ({ page }, testInfo) => {
  await mockResults(page, 21);
  await page.goto(`/search?${new URLSearchParams({ q: query, noRegion: 'true' })}`);
  await expect(page.getByText('내 조건에 맞는 공고는 없어요', { exact: true })).toBeVisible();
  await expect(page.getByText('관련 공고 21개가 있지만, 저장한 내 정보와 신청 조건이 달라요.')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('includeNoMatch');
  await expect(page.getByRole('link', { name: '내 정보 확인·수정' })).toBeVisible();
  await expect(page.getByText('찾는 공고가 따로 있나요?', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('no-match-guidance.png'), scale: 'css', animations: 'disabled' });
  await page.getByRole('button', { name: '내 조건과 다른 공고 21개도 보기' }).click();
  await expect(page).toHaveURL(/includeNoMatch=true/);
  await expect(page).toHaveURL(/noRegion=true/);
  await expect(page.locator('.card-link')).toHaveCount(20);
  await expect(page.locator('.card-link .badge-nomatch')).toHaveCount(20);
  await page.getByRole('button', { name: '일자리', exact: true }).click();
  await expect(page).toHaveURL(/noCategory=true/);
  await expect(page).toHaveURL(/includeNoMatch=true/);
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/page=1/);
  await expect(page.locator('.card-link')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '면접 정장 지원 공고 21', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.locator('.card-link')).toHaveCount(20);
  await page.reload();
  await expect(page.locator('.card-link')).toHaveCount(20);
  await page.getByRole('button', { name: '내 조건에 맞는 공고만 보기' }).click();
  await expect(page.getByText('내 조건에 맞는 공고는 없어요', { exact: true })).toBeVisible();
  await expect(page.locator('.card-link')).toHaveCount(0);
  await expect(page).not.toHaveURL(/includeNoMatch=true/);
  await expect(page).toHaveURL(/noRegion=true/);
  await expect(page).toHaveURL(/noCategory=true/);
  await expect(page.getByRole('textbox', { name: '검색어' })).toHaveValue(query);
});

test('일부 맞는 공고가 있어도 다른 공고를 함께 보거나 다시 숨길 수 있다', async ({ page }) => {
  const eligible = { policy: policies[5], verdict: 'NEEDS_CHECK', verdictLabel: '확인 필요', summary: '추가 정보가 필요해요.', dDay: 46 };
  await mockResults(page, 2, [eligible]);
  await page.goto(`/search?${new URLSearchParams({ q: query })}`);
  await expect(page.locator('.card-link')).toHaveCount(1);
  await page.getByRole('button', { name: '내 조건과 다른 공고 2개도 보기' }).click();
  await expect(page.locator('.card-link')).toHaveCount(3);
  await expect(page.locator('.card-link .badge-nomatch')).toHaveCount(2);
  await expect(page.getByText('내 조건과 다른 공고도 함께 보고 있어요.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '내 조건에 맞는 공고만 보기' }).click();
  await expect(page.locator('.card-link')).toHaveCount(1);
  await expect(page.locator('.card-link .badge-nomatch')).toHaveCount(0);
});

test('실제 검색 결과가 없을 때는 공고 직접 등록 안내만 표시한다', async ({ page }) => {
  await mockResults(page, 0);
  await page.goto(`/search?${new URLSearchParams({ q: query })}`);
  await expect(page.getByText('맞는 공고를 찾지 못했어요', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '공고 직접 등록하기' })).toBeVisible();
  await expect(page.getByRole('button', { name: /내 조건과 다른 공고/ })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('includeNoMatch');
});
