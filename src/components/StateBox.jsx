import { useEffect, useState } from 'react';

// 모든 화면에 필요한 세 가지 상태: 불러오는 중, 오류, 비어 있음
export function Loading() {
  return <p className="state-box" role="status">불러오는 중이에요…</p>;
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="state-box" role="alert">
      <p>{error.message}</p>
      {onRetry && <button className="btn-secondary" onClick={onRetry}>다시 시도</button>}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="state-box">
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

// 불러오는 동안 카드 모양 회색 틀이 은은하게 반짝인다(스켈레톤). 화면 읽기 프로그램에는 글자로 알려 준다.
export function SkeletonCards({ count = 3, label = '불러오는 중이에요…' }) {
  return (
    <div role={label ? 'status' : undefined} aria-live={label ? 'polite' : undefined}>
      {label && <span className="sr-only">{label}</span>}
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card skeleton-card" aria-hidden="true">
          <div className="row-between"><span className="sk sk-pill" /><span className="sk sk-date" /></div>
          <span className="sk sk-title" />
          <span className="sk sk-line" />
          <div className="row-between"><span className="sk sk-chip" /><span className="sk sk-link" /></div>
        </div>
      ))}
    </div>
  );
}

// 말로 검색할 때 AI가 2~3초 걸린다. 멈춘 것처럼 보이지 않게 단계 문구를 차례로 바꾼다(마지막 단계에서 멈춤).
const SEARCH_STEPS = ['질문을 이해하는 중…', '맞는 공고를 찾는 중…', '내 조건과 비교하는 중…'];

export function SearchWaiting() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, SEARCH_STEPS.length - 1)), 1100);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <div className="search-wait" role="status" aria-live="polite">
        <span className="dot" aria-hidden="true" />
        <span key={step} className="search-wait-text">{SEARCH_STEPS[step]}</span>
      </div>
      <SkeletonCards count={2} label="" />
    </>
  );
}
