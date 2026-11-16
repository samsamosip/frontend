import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { PasswordInput, Rule } from '../components/AuthInputs';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', nickname: '' });
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const longEnough = form.password.length >= 8 && form.password.length <= 64;
  const mixed = /[A-Za-z]/.test(form.password) && /[0-9]/.test(form.password);
  const same = form.password !== '' && form.password === form.confirm;

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const { email, password, nickname } = form;
      const res = await api('/api/v1/auth/signup', { method: 'POST', body: { email, password, nickname } });
      navigate('/verify-email', { state: { email, devCode: res?.devCode } });
    } catch (err) {
      // 오류 번호는 사용자에게 보이지 않게, 개발할 때만 F12 콘솔에 남긴다
      if (import.meta.env.DEV) console.warn('회원가입 실패', err.status, err.code, err.errors);
      setError(err); // 409 EMAIL_TAKEN이면 "이미 가입된 이메일이에요" 문구가 그대로 나온다
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <section className="hero">
        <Link className="link-white back" to="/login">← 로그인</Link>
        <h1>회원가입</h1>
        <p className="hero-sub">이메일로 가입하고, 메일로 받은 코드로 인증해요.</p>
      </section>
      <section className="card">
        <label>이메일<input name="email" type="email" required value={form.email} onChange={change} placeholder="example@email.com" /></label>
        <p className="hint">인증 코드를 이 주소로 보내요.</p>
        <FieldError error={error} name="email" />

        <PasswordInput label="비밀번호" name="password" required value={form.password} onChange={change} />
        <Rule ok={longEnough}>8자 이상</Rule>
        <Rule ok={mixed}>영문과 숫자를 함께 사용</Rule>
        <FieldError error={error} name="password" />

        <PasswordInput label="비밀번호 확인" name="confirm" required value={form.confirm} onChange={change} />
        {form.confirm && (same
          ? <p className="hint ok">비밀번호가 같아요.</p>
          : <p className="field-error">비밀번호가 서로 달라요.</p>)}

        <label>닉네임<input name="nickname" required minLength={2} maxLength={10} value={form.nickname} onChange={change} /></label>
        <p className="hint">맞춤 홈에서 「{form.nickname || '홍길동'}님」처럼 불러 드려요. 2~10자</p>
        <FieldError error={error} name="nickname" />
      </section>
      {/* 칸마다 틀린 곳은 그 칸 아래에, 나머지(이미 가입된 이메일 등)는 여기에 */}
      {error && !hasFieldErrors(error) && (
        <p className="error-box" role="alert">{error.message}</p>
      )}
      {error && hasFieldErrors(error) && (
        <p className="error-box" role="alert">빨간 글씨로 표시한 칸을 확인해 주세요.</p>
      )}
      <button className="btn-primary" disabled={sending || !longEnough || !mixed || !same}>
        {sending ? '보내는 중… (처음엔 1분쯤 걸릴 수 있어요)' : '가입하고 인증 코드 받기'}
      </button>
      <p className="notice consent-note">가입하면 <Link to="/privacy">개인정보 처리방침</Link>에 동의한 것으로 봐요. 만 14세 미만은 가입할 수 없어요.</p>
      <p className="notice">이미 계정이 있나요? <Link to="/login">로그인</Link></p>
    </form>
  );
}

function hasFieldErrors(error) {
  return Boolean(error?.errors && Object.keys(error.errors).length > 0);
}

// 서버가 칸 이름으로 알려 준 오류를 그 칸 바로 아래에 보여 준다
function FieldError({ error, name }) {
  const message = error?.errors?.[name];
  return message ? <p className="field-error">{message}</p> : null;
}
