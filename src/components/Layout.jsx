import { useEffect, useRef } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { NOTIFICATIONS_CHANGED } from '../api/notificationEvents';
import { HomeIcon, SearchIcon, PrepIcon, BellIcon, UserIcon, Logo } from './Icons';

const TABS = [
  { to: '/', label: '맞춤 홈', end: true, Icon: HomeIcon },
  { to: '/search', label: '검색', Icon: SearchIcon },
  { to: '/prep', label: '준비함', Icon: PrepIcon },
  { to: '/notifications', label: '알림', Icon: BellIcon },
  { to: '/profile', label: '내 정보', Icon: UserIcon },
];

export default function Layout() {
  const { data, reload } = useApi('/api/v1/me/notifications?size=1');
  const unread = data?.unreadCount ?? 0;

  // 틀(Layout)은 화면을 옮겨도 그대로라 처음 한 번만 불렸다. 화면을 옮길 때와 알림을 읽거나 지웠을 때 다시 받는다.
  const { pathname } = useLocation();
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false; // 처음 열 때는 useApi 가 이미 부른다
      return;
    }
    reload();
  }, [pathname, reload]);
  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED, reload);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, reload);
  }, [reload]);

  return (
    <div className="app">
      <AppHeader />
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="tab-bar">
        {TABS.map(({ to, label, end, Icon }) => (
          <NavLink key={to} to={to} end={end}>
            <span className="tab-icon">
              <Icon />
              {to === '/notifications' && unread > 0 && <span className="dot">{unread > 99 ? '99+' : unread}</span>}
            </span>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// 머리글. 로그인·회원가입 화면에서는 오른쪽 사람 버튼 없이 쓴다.
export function AppHeader({ showUser = true }) {
  return (
    <header className="app-header">
      <Link to="/" className="brand"><Logo />청년혜택 길잡이</Link>
      {showUser && <Link to="/profile" className="header-user" aria-label="내 정보"><UserIcon size={20} /></Link>}
    </header>
  );
}
