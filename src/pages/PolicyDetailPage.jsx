import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { Loading, ErrorBox } from '../components/StateBox';
import { VerdictBadge, computeDDay, deadlineText } from '../components/PolicyCard';
import { StarIcon, ClockIcon, BuildingIcon } from '../components/Icons';

const TRUTH = {
  TRUE: { text: '✓ 맞음', className: 'badge-match' },
  FALSE: { text: '✕ 안 맞음', className: 'badge-nomatch' },
  UNKNOWN: { text: '? 확인 필요', className: 'badge-check' },
};

const SOURCE_TEXT = { ONTONG: '출처: 온통청년', SCHOOL: '출처: 학교', USER: '직접 등록' };

function fullDate(date) {
  return date ? date.slice(0, 10).replaceAll('-', '.') : '';
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
            <strong>{p.organization}</strong>
            <span className="muted">· {p.categories.join(', ')}</span>
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
        {j.conditions.map((c) => (
          <div key={c.label} className="condition">
            <div className="row-between">
              <strong>{c.label}</strong>
              <span className={`badge ${TRUTH[c.truth].className}`}>{TRUTH[c.truth].text}</span>
            </div>
            <div className="compare-grid">
              <span>공고</span><span>{c.requirement}</span>
              <span>내 정보</span><span>{c.myValue ?? '비어 있음 (모름)'}</span>
            </div>
          </div>
        ))}
      </section>

      {j.missingFields.length > 0 && (
        <section className="card card-blue">
          <h2>정보 {j.missingFields.length}개가 비어서 판정할 수 없어요</h2>
          <p>{j.explanation}</p>
          <Link className="btn-white" to="/profile">{firstMissingLabel ? `${firstMissingLabel} 입력하기` : '내 정보 입력하기'}</Link>
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
