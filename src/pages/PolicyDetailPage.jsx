import { useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { Loading, ErrorBox } from '../components/StateBox';
import { VerdictBadge, computeDDay, deadlineText } from '../components/PolicyCard';
import { StarIcon, ClockIcon, BuildingIcon } from '../components/Icons';
import { searchReturnPath } from '../utils/searchReturnPath';

const TRUTH = {
  TRUE: { text: '✓ 맞음', className: 'badge-match' },
  FALSE: { text: '✕ 안 맞음', className: 'badge-nomatch' },
  UNKNOWN: { text: '? 확인 필요', className: 'badge-check' },
};

const SOURCE_TEXT = { ONTONG: '출처: 온통청년', SCHOOL: '출처: 학교', USER: '직접 등록' };

// AI가 프로필 항목으로 바꾸지 못한 조건(예: 이수 학점, 특정 학과)은 requirement가 "원문 확인 필요"로 온다.
// 그 대신 공고의 원래 문장(evidence)을 보여 주고, 입력할 칸이 없으니 "비어 있음"이라고 하지 않는다.
function requirementText(c) {
  if (!c.requirement?.endsWith('원문 확인 필요') || !c.evidence) return c.requirement;
  return c.requirement.startsWith('해당하면 제외') ? `해당하면 제외: ${c.evidence}` : c.evidence;
}

function myValueText(c) {
  if (c.myValue != null) return c.myValue;
  // missingField가 있으면 내 정보에서 입력할 수 있는 항목이다
  return c.missingField ? '비어 있음 (모름)' : '공고 원문과 직접 비교해 주세요';
}

// 온통청년이 정리한 칸과 AI가 글에서 뽑은 조건이 같은 이름(지역, 나이…)으로 겹치면 한 줄로 합친다.
// 판정은 가장 나쁜 쪽(안 맞음 > 확인 필요 > 맞음), 공고 문장은 다른 것만 줄을 바꿔 이어 쓴다.
const TRUTH_RANK = { FALSE: 2, UNKNOWN: 1, TRUE: 0 };

function mergeByLabel(conditions) {
  const rows = new Map();
  for (const c of conditions) {
    const text = requirementText(c);
    const row = rows.get(c.label);
    if (!row) {
      rows.set(c.label, { ...c, texts: [text] });
      continue;
    }
    // AI가 분류 이름을 그대로 옮긴 "중소기업, 기타"는 앞 줄("중소기업 등 (원문 확인)")과 같은 말이라 붙이지 않는다
    if (!row.texts.includes(text) && !/(^|, )기타$/.test(text)) row.texts.push(text);
    if (TRUTH_RANK[c.truth] > TRUTH_RANK[row.truth]) row.truth = c.truth;
    row.myValue ??= c.myValue;
    row.missingField ??= c.missingField;
  }
  return [...rows.values()];
}

function fullDate(date) {
  return date ? date.slice(0, 10).replaceAll('-', '.') : '';
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = searchReturnPath(location.state?.returnTo);
  const profileLink = returnTo ? `/profile?${new URLSearchParams({ returnTo })}` : '/profile';
  const policy = useApi(`/api/v1/policies/${id}`);
  const judged = useApi(`/api/v1/policies/${id}/eligibility`);
  const [saveError, setSaveError] = useState(null);
  // 이미 준비함에 담긴 공고인지: 준비함 목록에 같은 policyId가 있으면 처음부터 「담았어요」로 보여 준다
  const prep = useApi('/api/v1/me/applications');
  const saved = prep.data?.find((a) => a.policyId === Number(id));
  const liked = Boolean(saved);

  async function addToPrep(status) {
    setSaveError(null);
    try {
      if (saved) {
        // 이미 담긴 공고: 다시 담지 않고, 「관심」이면 「준비 중」으로만 바꾼다
        if (status && saved.status === 'INTERESTED') {
          await api(`/api/v1/me/applications/${saved.id}`, { method: 'PATCH', body: { status } });
        }
        if (status) navigate('/prep');
        return;
      }
      // status 없이 보내면 "관심", PREPARING 이면 "준비 중"으로 담긴다
      await api('/api/v1/me/applications', {
        method: 'POST',
        body: status ? { policyId: Number(id), status } : { policyId: Number(id) },
      });
      if (status) navigate('/prep');
      else prep.reload(); // 관심 담기는 화면에 그대로 머물고, 목록을 다시 받아 「담았어요」로 바뀐다
    } catch (error) {
      setSaveError(error);
    }
  }

  if (policy.loading || judged.loading) return <Loading />;
  if (policy.error) return <ErrorBox error={policy.error} onRetry={policy.reload} />;
  if (judged.error) return <ErrorBox error={judged.error} onRetry={judged.reload} />;

  const p = policy.data;
  const j = judged.data;
  const dDay = p.applyEndDate ? computeDDay(p.applyEndDate) : null;
  // missingFields 는 ["annualIncome", ...] 같은 항목 이름이다. 화면 이름은 그 항목을 쓰는 조건의 label("소득")에서 찾는다.
  const firstMissingLabel = j.conditions.find((c) => c.missingField === j.missingFields?.[0])?.label;

  return (
    <>
      <section className="hero hero-short">
        <div className="row-between">
          <button className="link-white back" onClick={() => navigate(-1)}>← 공고 상세</button>
          <button className="btn-white-small with-icon" onClick={() => addToPrep()} disabled={liked}>
            <StarIcon size={18} fill={liked ? 'currentColor' : 'none'} />{liked ? '담았어요' : '관심 담기'}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <span className="row-inline org">
            <span className="org-icon"><BuildingIcon size={16} /></span>
            {/* 기관 이름이 길어도 분야가 혼자 다음 줄로 떨어지지 않게 두 줄로 */}
            <span className="org-text">
              <strong>{p.organization}</strong>
              {p.categories.length > 0 && <span className="muted">{p.categories.join(', ')}</span>}
            </span>
          </span>
          <span className="chip-small">{SOURCE_TEXT[p.source] ?? ''}</span>
        </div>
        <h1>{p.title}</h1>
        <p className="amount">{p.support?.label ?? p.support?.summary}</p>
        <div className="divider" />
        <div className="row-between">
          <VerdictBadge verdict={j.verdict} label={j.verdictLabel} />
          <span className="deadline row-inline">
            <ClockIcon size={16} />
            {dDay === null ? '상시 모집' : `${deadlineText(dDay, p.applyEndDate)} 마감`}
          </span>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">내 조건과 비교</h2>
        {/* 조건이 하나도 없으면 상자가 비지 않게 한 줄로 알려 준다 */}
        {j.conditions.length === 0 && (
          <p className="hint">
            {j.verdict === 'MATCH'
              ? '따로 정해 둔 자격 조건이 없는 공고예요.'
              : j.explanation || '자격 조건은 공고 원문에서 확인해 주세요.'}
          </p>
        )}
        {mergeByLabel(j.conditions).map((c) => (
          <div key={c.label} className="condition">
            <div className="row-between">
              <strong>{c.label}</strong>
              <span className={`badge ${TRUTH[c.truth].className}`}>{TRUTH[c.truth].text}</span>
            </div>
            <div className="compare-grid">
              <span>공고</span><span className="pre-line">{c.texts.join('\n')}</span>
              <span>내 정보</span><span className={c.myValue == null && !c.missingField ? 'muted' : undefined}>{myValueText(c)}</span>
            </div>
          </div>
        ))}
      </section>

      {j.missingFields.length > 0 && (
        <section className="card card-blue">
          <h2>정보 {j.missingFields.length}개가 비어서 판정할 수 없어요</h2>
          <p>{j.explanation}</p>
          <Link className="btn-white" to={profileLink}>{firstMissingLabel ? `${firstMissingLabel} 입력하기` : '내 정보 입력하기'}</Link>
        </section>
      )}

      <section className="card info-list">
        {p.supportContent && (
          <div><p className="label">지원 내용</p><p className="pre-line">{p.supportContent}</p></div>
        )}
        {(p.applyStartDate || p.applyEndDate) && (
          <div><p className="label">신청 기간</p><p>{fullDate(p.applyStartDate)} ~ {fullDate(p.applyEndDate)}</p></div>
        )}
        <div>
          <p className="label">제출 서류</p>
          {p.documents.length === 0 ? (
            <p className="muted">공고에 서류 안내가 없어요. 원문에서 확인해 주세요.</p>
          ) : (
            <ul>
              {p.documents.map((d) => (
                <li key={d.name}>{d.name}{d.optional && ' (선택)'}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="row-two">
        {p.sourceUrl && <a className="btn-secondary" href={p.sourceUrl} target="_blank" rel="noreferrer">원문 보기 ↗</a>}
        {p.applyUrl && <a className="btn-secondary" href={p.applyUrl} target="_blank" rel="noreferrer">신청하러 가기 ↗</a>}
      </div>

      {saveError && <ErrorBox error={saveError} />}
      <button className="btn-primary" onClick={() => addToPrep('PREPARING')}>
        {saved && saved.status !== 'INTERESTED' ? '준비함에서 보기' : '신청 준비 시작'}
      </button>
      <p className="notice">준비함에 「준비 중」으로 담기고 서류 체크리스트가 열려요.<br />조건 일치는 선정 확정이 아니에요. 최종 심사는 운영 기관이 해요.</p>
    </>
  );
}
