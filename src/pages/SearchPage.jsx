import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useSearchScroll } from '../hooks/useSearchScroll';
import { ErrorBox, SearchWaiting } from '../components/StateBox';
import PolicyCard from '../components/PolicyCard';
import SearchProfileSummary from '../components/SearchProfileSummary';
import SearchResultSummary from '../components/SearchResultSummary';
import { SearchIcon, ClockIcon, CloseIcon } from '../components/Icons';

const DEFAULT_EXAMPLE = '내 조건에 맞는 혜택 찾아줘';

function exampleSelection() {
  let previous;
  try { previous = sessionStorage.getItem('lastSearchExample'); } catch { /* 저장소 없이도 검색할 수 있다 */ }
  return { previous, random: Math.random() };
}

function pickSearchExample(suggestions, selection) {
  const available = Array.isArray(suggestions) ? suggestions.filter((item) => typeof item.text === 'string' && item.match + item.needsCheck > 0) : [];
  const different = available.filter((item) => item.text !== selection.previous);
  const pool = different.length ? different : available;
  const matched = pool.filter((item) => item.match > 0);
  const choices = matched.length ? matched : pool;
  return choices[Math.floor(selection.random * choices.length)]?.text ?? DEFAULT_EXAMPLE;
}

function readRecent() {
  try {
    const stored = JSON.parse(localStorage.getItem('recentSearches'));
    return Array.isArray(stored) ? stored.filter((query) => typeof query === 'string') : [];
  } catch {
    return [];
  }
}

const REMOVABLE_PARAMS = new Set(['noRegion', 'noCategory', 'noAge', 'noClosingSoon', 'drop']);

function searchParamsFor(query, removed, includeNoMatch = false, page = 0) {
  const params = new URLSearchParams({ q: query });
  removed.forEach(([name, value]) => params.append(name, value));
  if (includeNoMatch) params.set('includeNoMatch', 'true');
  if (page > 0) params.set('page', String(page));
  return params;
}

// 서버가 준 understood 를 화면 칩 목록으로 바꾼다. off 는 ×를 눌렀을 때 붙일 조건이다.
function toChips(u) {
  const chips = [];
  if (u.region) chips.push({ text: u.regionFromProfile ? `내 지역 · ${u.region}` : u.region, off: ['noRegion', 'true'] });
  u.categories.forEach((c) => chips.push({ text: c, off: ['noCategory', 'true'] }));
  if (u.age !== null) chips.push({ text: `만 ${u.age}세`, off: ['noAge', 'true'] });
  if (u.closingSoon) chips.push({ text: '마감 임박', off: ['noClosingSoon', 'true'] });
  [...u.keywords, ...u.audience].forEach((group) => chips.push({ text: group[0], off: ['drop', group[0]] }));
  return chips;
}

export default function SearchPage() {
  const location = useLocation();
  const { data: examples } = useApi('/api/v1/search/examples');
  return <SearchResults key={location.key} examples={examples} />;
}

function SearchResults({ examples }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const removed = [...searchParams].filter(([name]) => REMOVABLE_PARAMS.has(name));
  const includeNoMatch = searchParams.get('includeNoMatch') === 'true';
  const page = Math.max(0, Number.parseInt(searchParams.get('page'), 10) || 0);
  const params = searchParamsFor(query, removed, includeNoMatch, page);
  const profileParams = searchParamsFor(query, removed, includeNoMatch);
  const returnTo = `/search?${profileParams}`;
  const profileLink = `/profile?${new URLSearchParams({ returnTo })}`;
  const { data: result, loading, error, reload } = useApi(query ? `/api/v1/search?${params}` : null);
  const [text, setText] = useState(query);
  const [previousSearches] = useState(readRecent);
  const [selection] = useState(exampleSelection);
  const example = pickSearchExample(examples, selection);
  const recent = result ? [query, ...previousSearches.filter((r) => r !== query)].slice(0, 5) : previousSearches;

  useSearchScroll(location.key, !query || Boolean(result));

  useEffect(() => {
    if (text.trim()) return;
    try { sessionStorage.setItem('lastSearchExample', example); } catch { /* 저장 못 해도 괜찮다 */ }
  }, [example, text]);

  useEffect(() => {
    if (!result) return;
    // 완료된 현재 요청만 기록하며, 요청을 시작할 때의 오래된 목록으로 덮어쓰지 않는다.
    const next = [query, ...readRecent().filter((r) => r !== query)].slice(0, 5);
    try { localStorage.setItem('recentSearches', JSON.stringify(next)); } catch { /* 저장 못 해도 괜찮다 */ }
  }, [query, result]);

  function search(q, nextRemoved = [], nextIncludeNoMatch = includeNoMatch, nextPage = 0) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const next = searchParamsFor(trimmed, nextRemoved, nextIncludeNoMatch, nextPage);
    if (next.toString() === params.toString()) reload();
    else setSearchParams(next);
  }

  const chips = result ? toChips(result.understood) : [];
  const personalized = result && result.understood.keywords.length === 0 && result.understood.audience.length === 0;
  // 지금 쪽의 카드 수가 아니라 검색 전체의 확인 필요 수 (위 숫자와 같게)
  const needsCheck = result?.counts?.needsCheck ?? 0;
  const noMatch = result?.counts?.noMatch ?? 0;
  const onlyNoMatch = result?.content.length === 0 && noMatch > 0;

  return (
    <>
      <section className="hero">
        <button className="link-white back" onClick={() => navigate('/')}>← 홈</button>
        <form onSubmit={(e) => { e.preventDefault(); search(text.trim() || example); }} className="search-box">
          <SearchIcon size={20} />
          <input aria-label="검색어" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={example} />
          <button className="search-btn">검색</button>
        </form>
      </section>

      {/* 아직 검색 전: 실제로 결과가 있는 예시 질문을 보여 주고, 누르면 바로 검색 */}
      {!query && !loading && <SearchExamples examples={examples} onPick={search} />}

      {loading && <SearchWaiting />}
      {error && <ErrorBox error={error} onRetry={reload} />}

      {result && !loading && (
        <>
          <SearchResultSummary counts={result.counts} profileLink={personalized ? undefined : profileLink} />
          {personalized && <SearchProfileSummary profileLink={profileLink} />}
          <div className="row-between">
            <p className="label">이 조건으로 찾았어요</p>
            {chips.length > 0 && <span className="hint">필요 없는 조건은 ×로 빼세요</span>}
          </div>
          {chips.length > 0 ? (
            <div className="chips">
              {chips.map((chip) => (
                <button key={chip.text} className="chip chip-soft" onClick={() => search(query, [...removed, chip.off])}>
                  {chip.text} <CloseIcon size={12} />
                </button>
              ))}
            </div>
          ) : <p className="hint search-scope-note">구체적인 검색 조건 없이 전체 공고의 신청 조건을 비교했어요.</p>}

          {includeNoMatch && noMatch > 0 && (
            <section className="guide-box">
              <p>내 조건과 다른 공고도 함께 보고 있어요. 신청 조건은 공고 상세에서 확인해 주세요.</p>
              <button className="link" onClick={() => search(query, removed, false)}>내 조건에 맞는 공고만 보기</button>
            </section>
          )}

          {result.content.length === 0 ? (
            <>
              <section className="card empty-card">
                <SearchIcon size={26} />
                <strong>{onlyNoMatch ? '내 조건에 맞는 공고는 없어요' : '맞는 공고를 찾지 못했어요'}</strong>
                {onlyNoMatch ? (
                  <>
                    <p className="muted">관련 공고 {noMatch}개가 있지만, 저장한 내 정보와 신청 조건이 달라요.</p>
                    <button className="btn-primary" onClick={() => search(query, removed, true)}>내 조건과 다른 공고 {noMatch}개도 보기</button>
                  </>
                ) : <p className="muted">{result.message ?? '조건을 하나 빼고 다시 찾아보거나, 알고 있는 공고를 직접 등록해 주세요.'}</p>}
              </section>
              {!onlyNoMatch && <section className="card card-blue">
                <h2>찾는 공고가 따로 있나요?</h2>
                <p>공고 링크나 캡처를 올리면 준비함에 담아 마감을 챙겨 드려요.</p>
                <Link className="btn-white" to="/custom-policies/new">공고 직접 등록하기</Link>
              </section>}
              {!onlyNoMatch && <p className="notice">등록한 공고는 나만 볼 수 있어요.</p>}
            </>
          ) : (
            <>
              {(needsCheck > 0 || result.notice) && (
                <section className="card card-blue compact">
                  {needsCheck > 0 && <strong>확인할 공고 {needsCheck}건이 있어요.</strong>}
                  {result.notice && <p>{result.notice}</p>}
                </section>
              )}
              {result.content.map((item) => <PolicyCard key={item.policy.id} item={item} returnTo={returnTo} />)}
              {result.totalPages > 1 && (
                <div className="row-two">
                  <button className="btn-secondary" disabled={page === 0} onClick={() => search(query, removed, includeNoMatch, page - 1)}>이전</button>
                  <button className="btn-secondary" disabled={page + 1 >= result.totalPages} onClick={() => search(query, removed, includeNoMatch, page + 1)}>다음</button>
                </div>
              )}
              {!includeNoMatch && noMatch > 0 && (
                <button className="btn-secondary btn-card" onClick={() => search(query, removed, true)}>내 조건과 다른 공고 {noMatch}개도 보기</button>
              )}
              <div className="row-between under-save">
                <span className="hint">찾는 공고가 따로 있나요?</span>
                <Link className="link" to="/custom-policies/new">직접 등록하기 →</Link>
              </div>
            </>
          )}
        </>
      )}

      {recent.length > 0 && !loading && (
        <>
          <h2>최근 검색</h2>
          <section className="card recent-card">
            {recent.map((r) => (
              <button key={r} className="list-row recent-row" onClick={() => search(r)}>
                <span className="row-inline"><ClockIcon size={16} />{r}</span>
              </button>
            ))}
          </section>
        </>
      )}
    </>
  );
}

function SearchExamples({ examples, onPick }) {
  const list = Array.isArray(examples)
    ? examples.filter((item) => typeof item.text === 'string' && item.match + item.needsCheck > 0).slice(0, 4)
    : [];
  if (list.length === 0) return null;
  return (
    <section className="ask-examples">
      <h2>이렇게 물어보세요</h2>
      <p className="hint">평소 말하듯이 물어보면 내 조건에 맞는 공고를 찾아 줘요.</p>
      <div className="ask-list">
        {list.map((item, i) => (
          <button key={item.text} type="button" className="ask-item" style={{ '--i': i }} onClick={() => onPick(item.text)}>
            <span className="ask-text">{item.text}</span>
            <span className="ask-count">
              {item.match > 0 ? <span className="badge badge-match">일치 {item.match}</span> : null}
              {item.needsCheck > 0 ? <span className="badge badge-check">확인 {item.needsCheck}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
