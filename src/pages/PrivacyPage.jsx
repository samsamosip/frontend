import { useNavigate } from 'react-router-dom';

// 개인정보 처리방침. 백엔드가 실제로 저장하고 내보내는 것만 적었다(2026-11-16 기준).
// 학생 프로젝트용 안내이며 법률 검토를 받은 문서는 아니다. 바뀌면 시행일과 함께 고친다.
const COLLECT = [
  ['처음 입력·내 정보', '생년월일', '선택', '만 나이로 나이 조건 판정'],
  ['처음 입력·내 정보', '사는 지역(시군구), 실제 사는 지역', '선택', '지역 조건 판정'],
  ['처음 입력·내 정보', '취업 상태, 학력, 혼인 여부, 전공, 특수 조건', '선택', '자격 조건 판정'],
  ['처음 입력·내 정보', '본인 연소득, 주거 형태, 내 명의 집 여부', '선택', '소득·무주택 조건 판정'],
  ['처음 입력·내 정보', '학교 이름, 학적, 학년, 평점, 학자금 지원구간', '선택', '장학금 조건 판정'],
  ['처음 입력·내 정보', '관심 분야', '선택', '맞춤 홈 정렬'],
  ['이메일 가입', '이메일, 비밀번호, 닉네임', '필수', '로그인, 인증 코드, 비밀번호 찾기 (비밀번호는 암호화한 값만 저장)'],
  ['카카오 로그인', '카카오 회원번호, 닉네임', '필수', '로그인'],
  ['쓰는 동안', '준비함에 담은 공고, 서류 체크, 직접 등록한 공고·메모', '—', '준비함, 마감 알림'],
  ['쓰는 동안', '알림 설정', '—', '알림 보내기'],
  ['쓰는 동안', '검색 문장, 불러온 공고 링크·캡처 사진', '—', '검색, 공고 불러오기'],
  ['자동', '기기 구분용 임시 번호(로그인 전), 날짜별 방문 여부', '—', '로그인 없이 쓰기, 사용 통계'],
  ['자동', '접속 IP', '—', '과도한 요청 막기 (서버 메모리에만 잠깐, 저장 안 함)'],
];

const OUTSIDE = [
  ['AI 서비스', '검색창에 쓴 문장', '문장 뜻 해석. 프로필은 같이 보내지 않아요'],
  ['공고 수집·불러오기 서버', '검색 문장, 불러올 공고 링크, 캡처 사진', '학교 장학금 검색, 공고 내용 읽기. 누가 보냈는지는 보내지 않고, 사진은 24시간 뒤 삭제'],
  ['메일 발송 서비스', '이메일 주소, 인증 코드, 알림 내용', '메일 보내기'],
  ['카카오', '로그인 확인만 받아요', '카카오 로그인'],
  ['서비스 서버', '서비스 데이터 전체', '서비스 운영'],
];

function Table({ head, rows }) {
  return (
    <div className="pv-table" role="table">
      <div className="pv-row pv-head" role="row">
        {head.map((h) => <span key={h} role="columnheader">{h}</span>)}
      </div>
      {rows.map((row) => (
        <div key={row.join('|')} className="pv-row" role="row">
          {row.map((cell, i) => <span key={i} role="cell" data-label={head[i]}>{cell}</span>)}
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <article className="privacy">
      <button className="link-muted pv-back" onClick={() => navigate(-1)}>← 뒤로</button>
      <h1>개인정보 처리방침</h1>
      <p className="hint">시행일 2026년 11월 16일 · 청년혜택 길잡이 (GDGoC 인하대 증명전 팀 프로젝트)</p>

      <section className="card">
        <h2>한눈에 보기</h2>
        <ul>
          <li>가입할 때 필요한 이메일·비밀번호·닉네임 말고는 <b>모두 건너뛸 수 있어요.</b></li>
          <li>주민등록번호, 전화번호, 자세한 주소(동·번지)는 <b>받지 않아요.</b></li>
          <li>입력한 정보는 <b>나에게 맞는 공고를 찾는 데만</b> 써요. 광고나 다른 곳에 팔지 않아요.</li>
          <li>나이·지역·소득 같은 프로필은 <b>바깥으로 보내지 않아요.</b> 자격 판정은 AI가 아니라 서비스 서버가 직접 해요.</li>
          <li>내 정보 화면에서 <b>언제든 지울 수 있어요.</b></li>
        </ul>
      </section>

      <section className="card">
        <h2>1. 받는 정보와 쓰는 곳</h2>
        <Table head={['언제', '항목', '왜']} rows={COLLECT.map(([when, item, need, why]) => [when + (need === '—' ? '' : ` · ${need}`), item, why])} />
      </section>

      <section className="card">
        <h2>2. 보관과 삭제</h2>
        <p>정보는 내가 지울 때까지 서비스 서버에 보관해요.</p>
        <ul>
          <li><b>내 데이터 삭제</b> (내 정보 화면 맨 아래): 프로필, 준비함·서류 체크, 직접 등록한 공고, 불러오기 기록, 알림, 방문 기록이 지워져요.</li>
          <li><b>회원 탈퇴</b> (내 계정 화면): 위의 것에 더해 계정(이메일·닉네임·카카오 번호)과 로그인 정보까지 모두 지워져요.</li>
          <li>공고 불러오기 기록은 7일 뒤, 캡처 사진과 불러온 결과는 24시간 뒤 자동으로 지워져요.</li>
          <li>로그인 전에 쓴 정보는 로그인하면 내 계정으로 옮겨져요.</li>
          <li>사람을 구분할 수 없는 날짜별 검색·불러오기 횟수만 통계로 남아요.</li>
          <li><b>서비스를 끝내면</b> 증명전이 끝나고 한 달 안에 모든 정보를 지워요.</li>
        </ul>
      </section>

      <section className="card">
        <h2>3. 바깥으로 나가는 것</h2>
        <p>서비스를 돌리려고 아래 곳에만 꼭 필요한 것을 보내요.</p>
        <Table head={['받는 곳', '보내는 것', '왜']} rows={OUTSIDE} />
      </section>

      <section className="card">
        <h2>4. 판정은 참고용이에요</h2>
        <p>판정은 입력한 정보와 공고 내용을 비교한 참고 결과예요. 글로 된 조건은 AI가 판정 규칙으로 바꿔 두어서 틀릴 수 있어요. 최종 자격은 공고 원문과 담당 기관에서 꼭 확인해 주세요.</p>
      </section>

      <section className="card">
        <h2>5. 만 14세 미만</h2>
        <p>만 14세 미만은 가입할 수 없어요.</p>
      </section>

      <section className="card">
        <h2>6. 문의</h2>
        <p>개인정보에 대해 궁금하거나 지워 달라고 할 때는 아래로 연락해 주세요.</p>
        <p><a className="link" href="mailto:youthbenefit.guide@gmail.com">youthbenefit.guide@gmail.com</a></p>
        <p className="hint">이 안내가 바뀌면 시행일과 함께 이 페이지에서 알려 드려요.</p>
      </section>
    </article>
  );
}
