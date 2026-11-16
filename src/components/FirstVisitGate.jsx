import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import { Loading } from './StateBox';
import { api } from '../api/client';

// 소개 화면을 다시 띄우지 않을 이유: 로그인했거나, "가입 없이 시작"·"나중에 입력"을 눌렀거나, 내 정보를 저장했다.
// 소개만 보고 나갔다가 다시 온 사람(정보 없음)에게는 소개 화면을 다시 보여 준다.
function settled() {
  return ['accessToken', 'skipOnboarding', 'profileSaved'].some((key) => Boolean(localStorage.getItem(key)));
}

export default function FirstVisitGate() {
  const { pathname } = useLocation();
  const [started, setStarted] = useState(settled);
  // 예전에 쓰던 브라우저(익명 ID만 있음)는 서버에 저장한 정보가 있는지 한 번 물어본다
  const [checking, setChecking] = useState(() => !settled() && Boolean(localStorage.getItem('anonymousId')));

  useEffect(() => {
    if (!checking) return;
    let alive = true;
    api('/api/v1/me/profile')
      .then(() => {
        localStorage.setItem('profileSaved', 'yes');
        if (alive) setStarted(true);
      })
      .catch(() => {}) // 404(정보 없음)·네트워크 오류면 소개 화면
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [checking]);

  function start(guest = false) {
    if (guest) localStorage.setItem('skipOnboarding', 'yes');
    setStarted(true);
  }

  // 소개 화면 전에 Layout을 띄우면 익명 ID와 프로필 요청이 먼저 생긴다.
  // 홈에서만 안내하고, 공유받은 공고·인증 콜백 등의 직접 주소는 그대로 연다.
  if (pathname !== '/' || started) return <Outlet />;
  if (checking) return <Loading />;
  return <WelcomePage onStart={start} />;
}
