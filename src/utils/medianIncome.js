// 2026년 기준중위소득 (월, 원). 보건복지부 고시. 해가 바뀌면 YEAR 와 표를 함께 바꾼다.
// 7명 이상은 6명 값에 (6명 - 5명) 만큼씩 더한다.
export const MEDIAN_INCOME_YEAR = 2026;

// 서버가 받는 가장 큰 값 (기준중위소득 1000%)
export const MAX_MEDIAN_PCT = 1000;

const MONTHLY = { 1: 2564238, 2: 4199292, 3: 5359036, 4: 6494738, 5: 7556719, 6: 8555952 };

export function monthlyMedian(size) {
  if (!size || size < 1) return null;
  if (size <= 6) return MONTHLY[size];
  return MONTHLY[6] + (MONTHLY[6] - MONTHLY[5]) * (size - 6);
}

// 가구원 수와 가구 월 소득(만원)으로 기준중위소득 % (반올림 정수). 모르면 null
export function medianIncomePct(size, monthlyManwon) {
  const median = monthlyMedian(Number(size));
  if (!median || monthlyManwon === '' || monthlyManwon === null || Number(monthlyManwon) < 0) return null;
  return Math.round((Number(monthlyManwon) * 10000 * 100) / median);
}
