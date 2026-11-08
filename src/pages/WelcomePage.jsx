import { Link } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import { BenefitIllustration, SearchIcon, PrepIcon, BellIcon } from '../components/Icons';

const FEATURES = [
  { Icon: SearchIcon, title: '내 조건에 맞는 공고 찾기', description: '청년 정책부터 학교 장학금까지 모아봐요.' },
  { Icon: PrepIcon, title: '신청 준비를 한곳에서', description: '관심 공고를 담고, 필요한 서류를 챙겨요.' },
  { Icon: BellIcon, title: '놓치기 쉬운 마감 챙기기', description: '담아둔 공고의 마감과 변경 소식을 확인해요.' },
];

export default function WelcomePage({ onStart }) {
  return (
    <div className="app app-plain welcome-page">
      <AppHeader showUser={false} />
      <main className="app-main">
        <section className="hero welcome-hero">
          <p className="welcome-eyebrow">청년을 위한 혜택 길잡이</p>
          <h1>나에게 맞는 혜택,<br /><em>놓치지 않게</em> 챙겨요</h1>
          <BenefitIllustration />
          <p className="hero-sub">맞춤 공고를 찾고, 신청 준비부터<br />마감 일정까지 한곳에서 챙기는 서비스예요.</p>
        </section>

        <section className="card welcome-features" aria-labelledby="welcome-features-title">
          <h2 className="card-title" id="welcome-features-title">이렇게 도와드려요</h2>
          <ul>
            {FEATURES.map(({ Icon, title, description }) => (
              <li key={title}>
                <span className="welcome-feature-icon"><Icon size={21} /></span>
                <div><h3>{title}</h3><p>{description}</p></div>
              </li>
            ))}
          </ul>
        </section>

        <nav className="welcome-actions" aria-label="서비스 시작하기">
          <Link className="btn-primary" to="/login" onClick={() => onStart()}>로그인</Link>
          <Link className="btn-secondary" to="/signup" onClick={() => onStart()}>회원가입</Link>
          <Link className="welcome-guest" to="/" onClick={() => onStart(true)}>가입 없이 시작 <span aria-hidden="true">→</span></Link>
        </nav>
        <p className="notice welcome-note">내 정보는 둘러본 뒤 천천히 입력해도 괜찮아요.</p>
      </main>
    </div>
  );
}
