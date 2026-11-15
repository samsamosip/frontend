// 검색에서 온 편집만 복귀 경로로 허용한다.
export function searchReturnPath(value) {
  if (!value || !value.startsWith('/')) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname !== '/search') return null;
    url.searchParams.delete('page');
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}
