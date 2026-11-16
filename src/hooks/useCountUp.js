import { useEffect, useRef, useState } from 'react';

// 숫자가 이전 값에서 새 값까지 빠르게 올라간다(처음엔 0부터). 움직임 줄이기 설정이면 바로 새 값.
export default function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (target == null) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (reduce || start === target) {
      from.current = target;
      setValue(target);
      return undefined;
    }
    let frame;
    const begin = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - begin) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(start + (target - start) * eased);
      setValue(next);
      from.current = next;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    // 화면 그리기가 멈춘 탭(백그라운드 등)에서도 0으로 남지 않게, 시간이 지나면 최종 값으로
    const done = setTimeout(() => {
      cancelAnimationFrame(frame);
      from.current = target;
      setValue(target);
    }, duration + 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [target, duration]);

  return target == null ? null : value;
}
