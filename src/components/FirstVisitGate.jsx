import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WelcomePage from '../pages/WelcomePage';
import { isLoggedIn } from '../api/client';

// 소개 화면 규칙
// - 로그인한 사람: 보여 주지 않는다.
// - 로그인 안 한 사람: 사이트에 새로 들어올 때(창·앱을 새로 열 때)마다 보여 준다.
//   쓰는 도중 "맞춤 홈" 탭을 누를 때마다 뜨지 않게, 이번에 연 창에서 한 번 넘겼으면 다시 안 띄운다(sessionStorage).
const SEEN = 'welcomeSeenThisVisit';

function seenThisVisit() {
  try {
    return Boolean(sessionStorage.getItem(SEEN));
  } catch {
    return false;
  }
}

export default function FirstVisitGate() {
  const { pathname } = useLocation();
  const [started, setStarted] = useState(() => isLoggedIn() || seenThisVisit());

  function start(guest = false) {
    try {
      sessionStorage.setItem(SEEN, 'yes');
    } catch {
      // 저장이 막힌 브라우저여도 이번 화면에서는 넘어간다
    }
    // "가입 없이 시작"이면 정보 입력 화면으로 끌고 가지 않는다
    if (guest) localStorage.setItem('skipOnboarding', 'yes');
    setStarted(true);
  }

  // 소개 화면 전에 Layout을 띄우면 익명 ID와 프로필 요청이 먼저 생긴다.
  // 홈에서만 안내하고, 공유받은 공고·인증 콜백 등의 직접 주소는 그대로 연다.
  if (pathname !== '/' || started || isLoggedIn()) return <Outlet />;
  return <WelcomePage onStart={start} />;
}
