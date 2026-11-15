import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

// 화면이 열릴 때 GET 하나를 부르고 { data, loading, error, reload } 를 돌려준다.
// path 가 null 이면 아무것도 부르지 않는다 (로그인했을 때만 부르는 API 등).
export function useApi(path) {
  const [state, setState] = useState({ request: null, data: null, error: null });
  const [version, setVersion] = useState(0);
  const request = useMemo(() => ({ path, version }), [path, version]);

  useEffect(() => {
    if (!request.path) return undefined;
    const controller = new AbortController();
    let cancelled = false; // 화면을 떠난 뒤 도착한 응답은 버린다
    api(request.path, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setState({ request, data, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ request, data: null, error });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [request]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // 조건이 바뀐 첫 렌더부터 이전 조건의 결과·오류를 숨긴다.
  const current = Boolean(path) && state.request === request;
  return {
    data: current ? state.data : null,
    loading: Boolean(path) && !current,
    error: current ? state.error : null,
    reload,
  };
}
