export const MONTHLY_QUERY = '월세 지원받을 수 있는 거 있어?';
export const CERTIFICATE_QUERY = '자격증 응시료 지원받을 수 있어?';

const titles = [
  '청년신혼부부 월세지원 사업',
  '청년 1인가구 전월세 안심계약 지원',
  '2026년도 청년 신혼부부 월세지원사업',
  '청년 월세 지원',
  '신혼부부 등 주택전세 연월세자금 대출이자 지원',
  '영암군 청년 자격증 응시료 지원사업 11월 모집',
];

export const policies = titles.map((title, index) => ({
  id: index + 1,
  title,
  source: 'ONTONG',
  organization: '청년 지원 담당기관',
  categories: [index === 5 ? '교육' : '주거'],
  applyStartDate: '2026-01-01',
  applyEndDate: '2026-12-31',
  support: { label: '지원 내용 확인' },
  documents: [],
}));

function item(policy) {
  return { policy, verdict: 'NEEDS_CHECK', verdictLabel: '확인 필요', summary: '공고 조건을 확인해 주세요.', dDay: 46 };
}

export function searchResult(query, params = new URLSearchParams()) {
  const certificate = query === CERTIFICATE_QUERY;
  const topic = certificate ? '자격증 응시료' : '월세';
  const content = (certificate ? policies.slice(5) : policies.slice(0, 5)).map(item);
  return {
    understood: {
      keywords: params.getAll('drop').includes(topic) ? [] : [[topic]],
      audience: [],
      categories: params.has('noCategory') ? [] : [certificate ? '교육' : '주거'],
      region: null,
      age: null,
      closingSoon: false,
    },
    content,
    totalElements: content.length,
    counts: { match: 0, needsCheck: content.length, noMatch: 0 },
  };
}

export function matchResult(category) {
  const content = policies.filter((policy) => !category || policy.categories.includes(category)).map(item);
  return { content, totalElements: content.length, totalPages: 1, counts: { match: 0, needsCheck: content.length, noMatch: 0 } };
}

// 모든 요청을 가로채므로 테스트 중 운영 데이터 변경·메일 발송이 발생하지 않는다.
export async function mockApi(page, override = () => false) {
  await page.addInitScript(() => {
    localStorage.setItem('welcomeSeen', 'yes');
    localStorage.setItem('skipOnboarding', 'yes');
  });
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    if (await override(route, url)) return;
    let json;
    let status = 200;
    if (url.pathname === '/api/v1/search') json = searchResult(url.searchParams.get('q'), url.searchParams);
    else if (url.pathname === '/api/v1/search/examples') json = [{ text: MONTHLY_QUERY, match: 1, needsCheck: 0 }, { text: CERTIFICATE_QUERY, match: 1, needsCheck: 0 }];
    else if (url.pathname === '/api/v1/me/matches') json = matchResult(url.searchParams.get('category'));
    else if (url.pathname === '/api/v1/me/notifications') json = { items: [], unreadCount: 0 };
    else if (url.pathname === '/api/v1/me/applications') json = [];
    else if (url.pathname === '/api/v1/me/profile') { status = 404; json = { message: '저장한 정보가 없어요.' }; }
    else if (url.pathname === '/api/v1/me/suggestions') json = { items: [] };
    else if (url.pathname === '/api/v1/me/account') json = { email: 'audit@example.com', nickname: '점검', hasPassword: true };
    else if (url.pathname === '/api/v1/codes') json = { jobCd: [{ code: '0013001', label: '재직자' }, { code: '0013002', label: '미취업자' }], schoolCd: [], mrgSttsCd: [], sbizCd: [], housingType: [], interestCategories: [], enrollmentStatus: [], gpaScale: [], kosafIncomeBracket: [] };
    else if (url.pathname === '/api/v1/regions') json = [];
    else if (/\/policies\/\d+\/eligibility$/.test(url.pathname)) json = { verdict: 'NEEDS_CHECK', verdictLabel: '확인 필요', conditions: [], missingFields: [] };
    else if (/\/policies\/\d+$/.test(url.pathname)) json = policies.find((policy) => policy.id === Number(url.pathname.split('/').at(-1)));
    else if (['/api/v1/auth/password/forgot', '/api/v1/auth/signup', '/api/v1/auth/email/resend'].includes(url.pathname)) json = { expiresInSeconds: 600 };
    else if (url.pathname === '/api/v1/auth/password/verify-code') json = { resetToken: 'test-reset-token' };
    else if (['/api/v1/auth/email/verify', '/api/v1/auth/password/reset'].includes(url.pathname)) json = { accessToken: 'test-access', refreshToken: 'test-refresh' };
    else { status = 500; json = { message: `테스트 응답이 없는 경로: ${url.pathname}` }; }
    await route.fulfill({ status, json });
  });
}
