import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError, clearLogin, isLoggedIn } from '../api/client';
import { useApi } from '../hooks/useApi';
import { Loading, ErrorBox } from '../components/StateBox';
import { searchReturnPath } from '../utils/searchReturnPath';
import { MEDIAN_INCOME_YEAR, MAX_MEDIAN_PCT, medianIncomePct, monthlyMedian } from '../utils/medianIncome';

const EMPTY_FORM = {
  birthDate: '', sido: '', zipCd: '', jobCd: '', schoolCd: '', mrgSttsCd: '',
  majorName: '', sbizCd: null, annualIncome: '', housingType: '', homeowner: false,
  // 가구 소득: 가구원 수·월 소득(만원)은 계산용이라 저장하지 않고, 계산한 기준중위소득 %만 저장한다
  householdSize: '', householdMonthlyIncome: '', householdMedianIncomePct: '',
  interestCategories: [], isStudent: false, schoolName: '', enrollmentStatus: '',
  gradeLevel: '', gpa: '', gpaScale: '4.5', kosafIncomeBracket: '',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = searchReturnPath(params.get('returnTo'));
  const codes = useApi('/api/v1/codes');
  const regions = useApi('/api/v1/regions');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveError, setSaveError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const account = useApi(isLoggedIn() ? '/api/v1/me/account' : null);

  // 이미 저장한 프로필이 있으면 입력칸에 채운다. 처음이면 404라서 그냥 빈칸으로 둔다.
  useEffect(() => {
    api('/api/v1/me/profile')
      .then((p) => { setUpdatedAt(p.updatedAt ?? null); setForm({
        ...EMPTY_FORM,
        ...Object.fromEntries(Object.entries(p).filter(([, value]) => value !== null)),
        sbizCd: p.sbizCd,
        sido: p.zipCd ? p.zipCd.slice(0, 2) : '',
        isStudent: Boolean(p.schoolName),
      }); })
      .catch((error) => {
        if (error.status !== 404) setSaveError(error);
      });
  }, []);

  function change(name, value) {
    setForm((old) => ({ ...old, [name]: value }));
  }

  function toggleInterest(code) {
    const list = form.interestCategories;
    change('interestCategories', list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
  }

  async function save(event) {
    event.preventDefault(); // 브라우저가 페이지를 새로고침하지 못하게 막는다
    setSaveError(null);
    const householdPct = medianIncomePct(form.householdSize, form.householdMonthlyIncome)
      ?? (form.householdMedianIncomePct === '' ? null : Number(form.householdMedianIncomePct));
    // 서버는 0~1000% 만 받는다. 넘으면 칸 아래 안내가 이미 보이니 저장하지 않는다
    if (householdPct !== null && householdPct > MAX_MEDIAN_PCT) return;
    try {
      await api('/api/v1/me/profile', {
        method: 'PUT',
        body: {
          // 빈칸은 null = "모름". 서버는 모르는 값을 "확인 필요"로 판정한다.
          birthDate: form.birthDate || null,
          zipCd: form.zipCd || null,
          jobCd: form.jobCd || null,
          schoolCd: form.schoolCd || null,
          mrgSttsCd: form.mrgSttsCd || null,
          majorName: form.majorName || null,
          sbizCd: form.sbizCd,
          annualIncome: form.annualIncome === '' ? null : Number(form.annualIncome),
          householdMedianIncomePct: householdPct,
          householdIncomeYear: householdPct === null ? null : MEDIAN_INCOME_YEAR,
          housingType: form.housingType || null,
          homeowner: form.homeowner,
          interestCategories: form.interestCategories,
          // 학생이 아니면 학교 항목은 전부 null
          schoolName: form.isStudent ? form.schoolName || null : null,
          enrollmentStatus: form.isStudent ? form.enrollmentStatus || null : null,
          gradeLevel: form.isStudent && form.gradeLevel ? Number(form.gradeLevel) : null,
          gpa: form.isStudent && form.gpa !== '' ? Number(form.gpa) : null,
          gpaScale: form.isStudent && form.gpa !== '' ? Number(form.gpaScale) : null,
          kosafIncomeBracket: form.isStudent && form.kosafIncomeBracket !== '' ? Number(form.kosafIncomeBracket) : null,
        },
      });
      navigate(returnTo ?? '/', { replace: Boolean(returnTo) });
    } catch (error) {
      setSaveError(error);
    }
  }

  // 내 데이터 삭제와 로그아웃
  async function deleteData() {
    if (!window.confirm('프로필과 준비함을 모두 지울까요?')) return;
    await api('/api/v1/me', { method: 'DELETE' });
    setForm(EMPTY_FORM);
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    await api('/api/v1/auth/logout', { method: 'POST', body: { refreshToken } }).catch(() => {});
    clearLogin();
    navigate('/login');
  }

  function skip() {
    if (!returnTo) localStorage.setItem('skipOnboarding', 'yes');
    navigate(returnTo ?? '/', { replace: Boolean(returnTo) });
  }

  if (codes.loading || regions.loading) return <Loading />;
  if (codes.error) return <ErrorBox error={codes.error} onRetry={codes.reload} />;
  if (regions.error) return <ErrorBox error={regions.error} onRetry={regions.reload} />;

  const sigungu = regions.data.find((r) => r.code === form.sido)?.sigungu ?? [];
  const fieldErrors = saveError instanceof ApiError ? saveError.errors ?? {} : {};

  const income = form.annualIncome === '';
  // 새로 입력했으면 그 값으로 계산, 아니면 저장돼 있던 % 를 그대로 둔다
  const typedPct = medianIncomePct(form.householdSize, form.householdMonthlyIncome);
  const savedPct = form.householdMedianIncomePct === '' ? null : Number(form.householdMedianIncomePct);
  const householdPct = typedPct ?? savedPct;

  return (
    <form onSubmit={save}>
      <section className="hero">
        <div className="row-between">
          <p>내 정보</p>
          <button type="button" className="link-white" onClick={skip}>{returnTo ? '검색으로 돌아가기' : '나중에 입력'}</button>
        </div>
        <h1>맞춤 공고를 찾기 위해<br />조건을 알려주세요</h1>
        <p className="hero-sub">모르는 항목은 [모름]을 누르고 넘어가도 돼요. 나중에 하나씩 수정할 수 있어요.</p>
      </section>

      <section className="card">
        <h2 className="card-title">기본 정보</h2>

        <FieldHead label="생년월일" empty={!form.birthDate} onUnknown={() => change('birthDate', '')} />
        <input
          aria-label="생년월일"
          className={form.birthDate ? '' : 'is-unknown'}
          type="date"
          value={form.birthDate}
          onChange={(e) => change('birthDate', e.target.value)}
        />
        {fieldErrors.birthDate && <p className="field-error">{fieldErrors.birthDate}</p>}

        <FieldHead label="지역" empty={!form.zipCd} onUnknown={() => setForm((old) => ({ ...old, sido: '', zipCd: '' }))} />
        <div className="row-two tight">
          <select
            aria-label="시도"
            className={form.sido ? '' : 'is-unknown'}
            value={form.sido}
            onChange={(e) => { const v = e.target.value; setForm((old) => ({ ...old, sido: v, zipCd: '' })); }}
          >
            <option value="">시·도</option>
            {regions.data.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <select aria-label="시군구" className={form.zipCd ? '' : 'is-unknown'} value={form.zipCd} onChange={(e) => change('zipCd', e.target.value)}>
            <option value="">시·군·구</option>
            {sigungu.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
          </select>
        </div>

        <CodeSelect label="취업 상태" name="jobCd" options={codes.data.jobCd} form={form} change={change} />
        <CodeSelect label="학력" name="schoolCd" options={codes.data.schoolCd} form={form} change={change} />

        <FieldHead label="결혼 여부" empty={!form.mrgSttsCd} onUnknown={() => change('mrgSttsCd', '')} />
        <div className="chips">
          {codes.data.mrgSttsCd.map((o) => (
            <button
              type="button"
              key={o.code}
              className={form.mrgSttsCd === o.code ? 'chip active' : 'chip'}
              onClick={() => change('mrgSttsCd', form.mrgSttsCd === o.code ? '' : o.code)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <FieldHead label="전공" empty={!form.majorName} onUnknown={() => change('majorName', '')} />
        <input aria-label="전공" className={form.majorName ? '' : 'is-unknown'} value={form.majorName} onChange={(e) => change('majorName', e.target.value)} placeholder="예: 전기전자공학" />

        <p className="label field-head">해당 대상</p>
        <div className="chips">
          {codes.data.sbizCd.map((c) => {
            const on = form.sbizCd?.includes(c.code);
            return (
              <button
                type="button"
                key={c.code}
                className={on ? 'chip active' : 'chip'}
                onClick={() => {
                  const list = form.sbizCd ?? [];
                  change('sbizCd', on ? list.filter((x) => x !== c.code) : [...list, c.code]);
                }}
              >
                {c.label}
              </button>
            );
          })}
          {/* [] = 해당 없음, null = 모름. 둘은 서버에서 다르게 판정된다 */}
          <button
            type="button"
            className={form.sbizCd?.length === 0 ? 'chip active' : 'chip'}
            onClick={() => change('sbizCd', form.sbizCd?.length === 0 ? null : [])}
          >
            해당 없음
          </button>
        </div>

        <FieldHead label="소득 (본인 연소득, 만원)" empty={income} onUnknown={() => change('annualIncome', '')} />
        <input
          aria-label="연소득"
          className={income ? 'is-unknown' : ''}
          type="number"
          min="0"
          value={form.annualIncome}
          onChange={(e) => change('annualIncome', e.target.value)}
          placeholder="모름으로 표시됨"
        />
        {income && <p className="hint">소득 조건이 있는 공고는 「확인 필요」로 보여요.</p>}

        <FieldHead
          label="가구 소득 (함께 사는 가족 전체)"
          empty={householdPct === null}
          onUnknown={() => setForm((old) => ({ ...old, householdSize: '', householdMonthlyIncome: '', householdMedianIncomePct: '' }))}
        />
        <div className="row-two tight">
          <select
            aria-label="가구원 수"
            className={form.householdSize === '' ? 'is-unknown' : ''}
            value={form.householdSize}
            onChange={(e) => change('householdSize', e.target.value)}
          >
            <option value="">가구원 수</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}명{n === 8 ? ' 이상' : ''}</option>)}
          </select>
          <input
            aria-label="가구 월 소득"
            className={form.householdMonthlyIncome === '' ? 'is-unknown' : ''}
            type="number"
            min="0"
            inputMode="numeric"
            value={form.householdMonthlyIncome}
            onChange={(e) => change('householdMonthlyIncome', e.target.value)}
            placeholder="월 소득 (만원)"
          />
        </div>
        {typedPct !== null && typedPct > MAX_MEDIAN_PCT ? (
          <p className="field-error">월 소득이 너무 커요. 만원 단위로 넣었는지 확인해 주세요. (예: 월 300만 원 → 300)</p>
        ) : typedPct !== null ? (
          <p className="hint">
            기준중위소득 <b>약 {typedPct}%</b>예요. ({MEDIAN_INCOME_YEAR}년 {form.householdSize}인 가구 기준 월 {Math.round(monthlyMedian(Number(form.householdSize)) / 10000).toLocaleString()}만 원)
          </p>
        ) : savedPct !== null ? (
          <p className="hint">저장된 값: 기준중위소득 약 {savedPct}%. 바꾸려면 가구원 수와 월 소득을 다시 넣어 주세요.</p>
        ) : (
          <p className="hint">「기준중위소득 150% 이하」 같은 조건을 판정할 때 써요. 세금 떼기 전 금액으로 넣어 주세요.</p>
        )}

        <CodeSelect label="주거 형태" name="housingType" options={codes.data.housingType} form={form} change={change} />
        <label className="check">
          <input type="checkbox" checked={form.homeowner} onChange={(e) => change('homeowner', e.target.checked)} />
          내 명의로 된 집이 있어요
        </label>
        <p className="hint">주택 소유 조건이 있는 공고를 판정할 때 써요. 체크하지 않으면 무주택으로 봐요.</p>

        <div className="field-head">
          <span className="label">관심 분야</span>
          <span className="hint">여러 개 선택</span>
        </div>
        <div className="chips">
          {codes.data.interestCategories.map((c) => (
            <button
              type="button"
              key={c.code}
              className={form.interestCategories.includes(c.code) ? 'chip active' : 'chip'}
              onClick={() => toggleInterest(c.code)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row-between">
          <h2 className="card-title">학생 정보</h2>
          <label className="check small">
            <input type="checkbox" checked={form.isStudent} onChange={(e) => change('isStudent', e.target.checked)} />
            학생이에요
          </label>
        </div>
        {!form.isStudent && <p className="hint">학생이면 체크하고 학교 정보를 넣어 주세요. 장학금 판정에 써요.</p>}
        {form.isStudent && (
          <>
            <FieldHead label="학교" empty={!form.schoolName} onUnknown={() => change('schoolName', '')} />
            <input aria-label="학교" className={form.schoolName ? '' : 'is-unknown'} value={form.schoolName} onChange={(e) => change('schoolName', e.target.value)} placeholder="인하대학교" />

            <div className="row-two tight field-pair">
              <div>
                <p className="label">재학 상태</p>
                <select aria-label="재학 상태" className={form.enrollmentStatus ? '' : 'is-unknown'} value={form.enrollmentStatus ?? ''} onChange={(e) => change('enrollmentStatus', e.target.value)}>
                  <option value="">선택</option>
                  {codes.data.enrollmentStatus.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <p className="label">학년</p>
                <select aria-label="학년" className={form.gradeLevel ? '' : 'is-unknown'} value={form.gradeLevel} onChange={(e) => change('gradeLevel', e.target.value)}>
                  <option value="">선택</option>
                  {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
            </div>

            <FieldHead label="직전 학기 평점" empty={form.gpa === ''} onUnknown={() => change('gpa', '')} />
            <div className="row-two tight">
              <input aria-label="평점" className={form.gpa === '' ? 'is-unknown' : ''} type="number" step="0.01" min="0" value={form.gpa} onChange={(e) => change('gpa', e.target.value)} placeholder="예: 3.8" />
              <select aria-label="평점 만점" value={form.gpaScale} onChange={(e) => change('gpaScale', e.target.value)}>
                {codes.data.gpaScale.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </select>
            </div>

            <CodeSelect label="학자금 지원구간" name="kosafIncomeBracket" options={codes.data.kosafIncomeBracket} form={form} change={change} />
          </>
        )}
      </section>

      {saveError && <ErrorBox error={saveError} />}
      <p className="notice privacy-note">입력한 정보는 맞춤 공고를 찾는 데만 써요.<br />아래 ‘내 데이터 전체 삭제’로 언제든 지울 수 있어요. <Link to="/privacy">개인정보 처리방침</Link></p>
      <button className="btn-primary" type="submit">{returnTo ? '저장하고 검색 결과 다시 보기' : '저장하고 맞춤 공고 보기'}</button>
      <div className="row-between under-save">
        <span className="hint">{updatedAt ? `마지막 수정 ${updatedAt.slice(0, 10).replaceAll('-', '.')}` : ''}</span>
        <button type="button" className="link-muted" onClick={deleteData}>내 데이터 전체 삭제</button>
      </div>

      <section className="card">
        <h2 className="card-title">계정</h2>
        {isLoggedIn() ? (
          <>
            <div className="list-row"><span>이메일</span><span className="muted">{account.data?.email}</span></div>
            <Link className="list-row" to="/account"><span>닉네임</span><span className="row-inline muted">{account.data?.nickname}<span className="chev">›</span></span></Link>
            <Link className="list-row" to="/account"><span>비밀번호 변경</span><span className="chev">›</span></Link>
            <button type="button" className="list-row" onClick={logout}><span>로그아웃</span><span className="chev">›</span></button>
            <Link className="list-row danger" to="/account"><span>회원 탈퇴</span><span className="chev">›</span></Link>
          </>
        ) : (
          <Link className="list-row" to="/login"><span>로그인 · 회원가입</span><span className="chev">›</span></Link>
        )}
      </section>
    </form>
  );
}

// 칸 이름 + 오른쪽 「모름」 버튼. 누르면 값을 비운다(= 서버에 null = 모름).
function FieldHead({ label, empty, onUnknown }) {
  return (
    <div className="field-head">
      <span className="label">{label}</span>
      <button type="button" className={empty ? 'unknown-btn active' : 'unknown-btn'} onClick={onUnknown}>모름</button>
    </div>
  );
}

function CodeSelect({ label, name, options, form, change }) {
  const value = form[name] ?? '';
  return (
    <>
      <FieldHead label={label} empty={value === ''} onUnknown={() => change(name, '')} />
      <select aria-label={label} className={value === '' ? 'is-unknown' : ''} value={value} onChange={(e) => change(name, e.target.value)}>
        <option value="">모름으로 표시됨</option>
        {options.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
      </select>
    </>
  );
}
