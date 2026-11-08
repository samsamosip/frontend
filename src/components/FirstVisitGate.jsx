import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';

// 이미 이용하던 브라우저는 새 소개 화면 때문에 기존 흐름이 끊기지 않게 한다.
const VISIT_KEYS = ['anonymousId', 'skipOnboarding', 'accessToken', 'refreshToken'];

export default function FirstVisitGate() {
  const { pathname } = useLocation();
  // 현재 소개 화면은 유지하되, 새로고침·다음 방문부터는 저장한 기록을 쓴다.
  const [started, setStarted] = useState(() => Boolean(localStorage.getItem('welcomeSeen')));
  const returning = started || VISIT_KEYS.some((key) => Boolean(localStorage.getItem(key)));

  const showWelcome = pathname === '/' && !returning;

  useEffect(() => {
    if (showWelcome) localStorage.setItem('welcomeSeen', 'yes');
  }, [showWelcome]);

  function start(guest = false) {
    localStorage.setItem('welcomeSeen', 'yes');
    if (guest) localStorage.setItem('skipOnboarding', 'yes');
    setStarted(true);
  }

  // 소개 화면 전에 Layout을 띄우면 익명 ID와 프로필 요청이 먼저 생긴다.
  // 홈에서만 안내하고, 공유받은 공고·인증 콜백 등의 직접 주소는 그대로 연다.
  if (showWelcome) return <WelcomePage onStart={start} />;
  return <Outlet />;
}
