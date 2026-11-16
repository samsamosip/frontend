import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/Layout';
import { BenefitIllustration, SearchIcon, PrepIcon, BellIcon } from '../components/Icons';

const FEATURES = [
  { Icon: SearchIcon, title: '내 조건에 맞는 공고 찾기', description: '청년 정책부터 학교 장학금까지 모아봐요.' },
  { Icon: PrepIcon, title: '신청 준비를 한곳에서', description: '관심 공고를 담고, 필요한 서류를 챙겨요.' },
  { Icon: BellIcon, title: '놓치기 쉬운 마감 챙기기', description: '담아둔 공고의 마감과 변경 소식을 확인해요.' },
];

// 처음 온 사람에게 보여 주는 소개 페이지.
// 맨 위 글자는 차례로 떠오르고, 아래로 내리면 실제로 쓰는 순서대로 장면이 하나씩 나타난다.
// 움직임 줄이기 설정(prefers-reduced-motion)이면 바로 보인다.

// 아래로 내리면 나오는 장면. 그림은 실제 앱 화면에서 핵심 카드만 잘라 낸 것(public/welcome).
// cards: 위에서부터 차례로 떠오른다. narrow 는 조금 좁게, fade 는 아래가 흐려진다.
const SCENES = [
  {
    title: <>내 정보를<br />한 번만 넣으면</>,
    desc: <>나이, 사는 곳, 학력 정도면 충분해요.<br />모르는 칸은 비워 둬도 돼요.</>,
    cards: [{ src: 'step1-profile.png', alt: '생년월일, 지역, 취업 상태, 학력 입력칸', w: 358, h: 393, fade: true }],
  },
  {
    title: <>받을 수 있는 혜택이<br />바로 모여요</>,
    desc: <>정부 정책과 학교 장학금 중<br />내 조건에 맞는 것을 골라 보여 줘요.</>,
    cards: [
      { src: 'step2-counts.png', alt: '조건 일치 142, 확인 필요 110, 조건 불일치 941', w: 358, h: 73, narrow: true },
      { src: 'step2-card.png', alt: '조건 일치 공고 카드', w: 358, h: 133 },
    ],
  },
  {
    title: <>왜 되는지,<br />무엇을 확인할지까지</>,
    desc: <>공고 조건을 내 정보와 하나씩 비교해서<br />맞는 것과 확인할 것을 알려 줘요.</>,
    cards: [
      { src: 'judge-head.png', alt: '천원 복비 공고, 최대 30만원, 확인 필요', w: 358, h: 194, narrow: true },
      { src: 'judge-compare.png', alt: '나이 맞음, 지역 맞음, 주택 소유 확인 필요', w: 358, h: 305, fade: true },
    ],
  },
  {
    title: <>궁금한 건<br />말로 물어봐요</>,
    desc: <>딱 맞는 단어를 몰라도 괜찮아요.<br />하고 싶은 말 그대로 검색하면 찾아 줘요.</>,
    cards: [
      { src: 'step4-search.png', alt: '면접 정장 빌릴 수 있는 지원 있어? 검색', w: 358, h: 50, pill: true },
      { src: 'step4-card.png', alt: '드림나래 면접 정장 대여 공고 카드', w: 358, h: 174 },
    ],
  },
];

function StartButtons({ onStart }) {
  return (
    <nav className="welcome-actions" aria-label="서비스 시작하기">
      <Link className="btn-primary" to="/login" onClick={() => onStart()}>로그인</Link>
      <Link className="btn-secondary" to="/signup" onClick={() => onStart()}>회원가입</Link>
      <Link className="welcome-guest" to="/" onClick={() => onStart(true)}>가입 없이 시작 <span aria-hidden="true">→</span></Link>
    </nav>
  );
}

// 화면에 들어오면 .shown 을 붙여 떠오르게 한다
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const items = ref.current?.querySelectorAll('.reveal') ?? [];
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('shown'));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('shown');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export default function WelcomePage({ onStart }) {
  const ref = useReveal();

  return (
    <div className="app app-plain welcome-page" ref={ref}>
      <AppHeader showUser={false} />
      <main className="app-main">
        <section className="hero welcome-hero">
          <p className="welcome-eyebrow rise" style={{ '--d': '0ms' }}>청년을 위한 혜택 길잡이</p>
          <h1>
            <span className="rise" style={{ '--d': '150ms' }}>나에게 맞는 혜택,</span>
            <span className="rise" style={{ '--d': '450ms' }}><em>놓치지 않게</em> 챙겨요</span>
          </h1>
          <BenefitIllustration />
          <p className="hero-sub rise" style={{ '--d': '750ms' }}>맞춤 공고를 찾고, 신청 준비부터<br />마감 일정까지 한곳에서 챙기는 서비스예요.</p>
        </section>

        <div className="rise" style={{ '--d': '1000ms' }}>
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

          <StartButtons onStart={onStart} />
          <p className="notice welcome-note">내 정보는 둘러본 뒤 천천히 입력해도 괜찮아요. <Link to="/privacy" onClick={() => onStart()}>개인정보 처리방침</Link></p>
          <a className="lp-down" href="#lp-flow">어떻게 쓰는지 볼까요? <span aria-hidden="true">↓</span></a>
        </div>

        <div className="lp-flow" id="lp-flow">
          {SCENES.map((scene, index) => (
            <section key={index} className="lpa-scene reveal">
              <p className="lpa-step">{String(index + 1).padStart(2, '0')}</p>
              <h2>{scene.title}</h2>
              <p className="lpa-desc">{scene.desc}</p>
              <div className="lpa-stack">
                {scene.cards.map((card, i) => (
                  <img
                    key={card.src}
                    className={['lpa-card', card.narrow && 'narrow', card.fade && 'fade', card.pill && 'pill'].filter(Boolean).join(' ')}
                    style={{ '--i': i }}
                    src={`/welcome/${card.src}`}
                    alt={card.alt}
                    width={card.w}
                    height={card.h}
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          ))}

          <section className="lp-end reveal">
            <h2>지금 내 혜택을<br />찾아볼까요?</h2>
            <p className="lp-end-sub">정부 정책과 학교 장학금 1,400여 개 중에서<br />내 조건에 맞는 것만 골라 드려요.</p>
            <StartButtons onStart={onStart} />
            <p className="notice welcome-note">내 정보는 둘러본 뒤 천천히 입력해도 괜찮아요. <Link to="/privacy" onClick={() => onStart()}>개인정보 처리방침</Link></p>
          </section>
        </div>
      </main>
    </div>
  );
}
