import { useLayoutEffect, useRef, useState } from 'react';

// 같은 검색 기록으로 돌아왔을 때 결과가 로드된 뒤 원래 위치로 돌아간다.
const positions = new Map();

export function useSearchScroll(key, ready) {
  const [target] = useState(() => positions.get(key) ?? 0);
  const restored = useRef(false);

  useLayoutEffect(() => {
    function remember() {
      if (!restored.current) return;
      positions.set(key, window.scrollY);
      if (positions.size > 50) positions.delete(positions.keys().next().value);
    }
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, [key]);

  useLayoutEffect(() => {
    if (!ready || restored.current) return undefined;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, target);
      restored.current = true;
      positions.set(key, window.scrollY);
      if (positions.size > 50) positions.delete(positions.keys().next().value);
    });
    return () => cancelAnimationFrame(frame);
  }, [key, ready, target]);
}
