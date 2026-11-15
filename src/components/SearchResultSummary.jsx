import { Link } from 'react-router-dom';

export default function SearchResultSummary({ counts, profileLink }) {
  if (!counts) return null;
  const groups = [
    { key: 'match', label: '조건 일치', color: 'c-match' },
    { key: 'needsCheck', label: '확인 필요', color: 'c-check' },
    { key: 'noMatch', label: '조건 다름', color: 'c-nomatch' },
  ];
  const total = groups.reduce((sum, group) => sum + (counts[group.key] ?? 0), 0);
  return (
    <section className="card search-result-summary" aria-label="검색 결과 요약">
      <div className="row-between">
        <h2>관련 공고 {total}개</h2>
        {profileLink && <Link className="link" to={profileLink}>내 정보 확인·수정</Link>}
      </div>
      <div className="search-result-counts">
        {groups.map((group) => (
          <div key={group.key}>
            <strong className={group.color}>{counts[group.key] ?? 0}</strong>
            <span>{group.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
