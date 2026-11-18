import { Link } from 'react-router-dom';

// 없는 주소, 내려간 공고에서 보여 주는 안내. 홈으로 나갈 길을 꼭 준다.
export default function NotFound({ title = '없는 페이지예요', children = '주소가 바뀌었거나 잘못 들어온 것 같아요.' }) {
  return (
    <section className="state-box not-found" role="alert">
      <strong>{title}</strong>
      <p className="muted">{children}</p>
      <Link className="btn-primary" to="/">맞춤 공고 보러 가기</Link>
    </section>
  );
}
