import { test, expect } from '@playwright/test';
import { mockApi } from './helpers/api';

// 판정할 수 없는 조건은 "원문 확인 필요" 대신 공고 문장을, 입력할 칸이 없는 항목은 "비어 있음" 대신 직접 비교 안내를 보여 준다
test('판정 못 한 조건은 공고 문장을 보여 주고 비어 있다고 하지 않는다', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (!/\/policies\/\d+\/eligibility$/.test(url.pathname)) return false;
    await route.fulfill({ json: {
      verdict: 'NEEDS_CHECK', verdictLabel: '확인 필요', missingFields: ['age'], explanation: '',
      conditions: [
        { label: '나이', truth: 'UNKNOWN', requirement: '만 19~34세', myValue: null, missingField: 'age', evidence: '만 19세 이상 34세 이하' },
        { label: '이수학점', truth: 'UNKNOWN', requirement: '원문 확인 필요', myValue: null, missingField: null, evidence: '직전 학기 12학점 이상 이수' },
        { label: '참여 제한 대상', truth: 'UNKNOWN', requirement: '해당하면 제외 — 원문 확인 필요', myValue: null, missingField: null, evidence: '휴학생' },
      ],
    } });
    return true;
  });
  await page.goto('/policies/1');
  const rows = page.locator('.condition');
  await expect(rows.nth(0)).toContainText('비어 있음 (모름)');
  await expect(rows.nth(1)).toContainText('직전 학기 12학점 이상 이수');
  await expect(rows.nth(1)).toContainText('공고 원문과 직접 비교해 주세요');
  await expect(rows.nth(1)).not.toContainText('비어 있음');
  await expect(rows.nth(2)).toContainText('해당하면 제외: 휴학생');
  await expect(page.getByText('원문 확인 필요')).toHaveCount(0);
});

test('같은 이름의 조건은 한 줄로 합치고 더 나쁜 판정을 보여 준다', async ({ page }) => {
  await mockApi(page, async (route, url) => {
    if (!/\/policies\/\d+\/eligibility$/.test(url.pathname)) return false;
    await route.fulfill({ json: {
      verdict: 'NO_MATCH', verdictLabel: '조건 불일치', missingFields: [], explanation: '',
      conditions: [
        { label: '지역', truth: 'TRUE', requirement: '충남 아산시 주민등록', myValue: '충남 아산시', missingField: null, evidence: 'zipCd' },
        { label: '나이', truth: 'TRUE', requirement: '만 19~39세', myValue: '만 24세', missingField: null, evidence: '' },
        { label: '지역', truth: 'TRUE', requirement: '충남 아산시 주민등록', myValue: '충남 아산시', missingField: null, evidence: '' },
        { label: '나이', truth: 'FALSE', requirement: '만 18~23세', myValue: '만 24세', missingField: null, evidence: '' },
      ],
    } });
    return true;
  });
  await page.goto('/policies/1');
  const rows = page.locator('.condition');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('충남 아산시 주민등록');
  await expect(rows.nth(1)).toContainText('만 19~39세');
  await expect(rows.nth(1)).toContainText('만 18~23세');
  await expect(rows.nth(1)).toContainText('안 맞음');
});
