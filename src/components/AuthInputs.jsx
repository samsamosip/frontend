import { useLayoutEffect, useRef, useState } from 'react';
import { EyeIcon, EyeOffIcon, CheckIcon } from './Icons';

// 눈 아이콘으로 비밀번호를 보였다 숨겼다 하는 입력칸
export function PasswordInput({ label, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <label>{label}
      <span className="password-wrap">
        <input type={shown ? 'text' : 'password'} {...props} />
        <button
          type="button"
          className="icon-btn eye"
          aria-label={shown ? '비밀번호 숨기기' : '비밀번호 보기'}
          onClick={() => setShown(!shown)}
        >
          {shown ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
        </button>
      </span>
    </label>
  );
}

// 인증 코드 여섯 칸. 숫자를 넣으면 다음 칸으로, 지우면 이전 칸으로 간다. 붙여넣기도 된다.
export function CodeInput({ value, onChange }) {
  const boxes = useRef([]);
  const digits = value;

  useLayoutEffect(() => {
    boxes.current.find((box) => box === document.activeElement)?.select();
  }, [value]);

  function setAt(index, digit) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next);
  }

  function handleChange(index, raw) {
    const only = raw.replace(/\D/g, '');
    if (!only) {
      if (!raw) setAt(index, '');
      return;
    }
    // 전체 코드는 어느 칸에 붙여넣어도 처음부터 채우고, 일부 수정은 나머지 칸을 유지한다.
    const start = only.length >= 6 ? 0 : index;
    const inserted = only.slice(0, 6 - start);
    const next = digits.slice();
    [...inserted].forEach((digit, offset) => { next[start + offset] = digit; });
    onChange(next);
    boxes.current[Math.min(start + inserted.length, 5)]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (digits[index]) setAt(index, '');
      else if (index > 0) {
        setAt(index - 1, '');
        boxes.current[index - 1]?.focus();
      }
    } else if (event.key === 'Delete') {
      event.preventDefault();
      setAt(index, '');
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      boxes.current[Math.max(0, Math.min(5, index + (event.key === 'ArrowLeft' ? -1 : 1)))]?.focus();
    }
  }

  return (
    <div className="code-boxes">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { boxes.current[i] = el; }}
          aria-label={`인증 코드 ${i + 1}번째 자리`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          className={d ? 'filled' : ''}
          value={d}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            // 커서가 글자 앞에 있어도 한 자리 타이핑은 해당 칸만 교체한다.
            const inserted = e.nativeEvent.data;
            if (typeof inserted === 'string' && inserted.length === 1) {
              if (/\d/.test(inserted)) handleChange(i, inserted);
            } else handleChange(i, e.target.value);
          }}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            if (/\d/.test(text)) handleChange(i, text);
          }}
        />
      ))}
    </div>
  );
}

// 개발용: 메일을 못 보내는 임시 서버(Render 무료)는 메일 대신 응답에 devCode를 준다.
// 줄지 말지는 서버가 정한다(AUTH_DEV_SHOW_CODE=true 이고 메일 설정이 없을 때만). 빌드한 화면에서도 서버가 주면 보여 준다
// — 안 그러면 임시 서버에 붙인 배포 화면에서 가입·비밀번호 찾기를 끝낼 수 없다.
export function DevCodeBox({ code, onUse }) {
  if (!code) return null;
  return (
    <div className="dev-code">
      <span>개발용 인증 코드 <b>{code}</b></span>
      <button type="button" onClick={() => onUse(String(code))}>채우기</button>
    </div>
  );
}

// 비밀번호 규칙 한 줄: 맞으면 초록 ✓, 아니면 회색 ○
export function Rule({ ok, children }) {
  return (
    <p className={ok ? 'rule ok' : 'rule'}>
      {ok ? <CheckIcon size={14} strokeWidth="3" /> : <span className="rule-dot" />}
      {children}
    </p>
  );
}
