import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { UserIcon } from './Icons';

export default function SearchProfileSummary() {
  const profile = useApi('/api/v1/me/profile');
  const summary = profile.data?.age != null ? `만 ${profile.data.age}세` : '';
  const missing = profile.error?.status === 404;

  return (
    <aside className="search-profile-summary" aria-label="신청 조건 비교에 사용하는 내 정보">
      <UserIcon size={16} />
      <span>
        {profile.loading ? '저장한 내 정보를 확인하고 있어요.'
          : profile.data ? `내 정보 기준${summary ? `: ${summary}` : ''}`
            : missing ? '내 정보를 입력하면 더 정확히 비교할 수 있어요.' : '저장한 정보는 내 정보에서 확인해 주세요.'}
      </span>
      <Link className="link" to="/profile">{missing ? '입력하기' : '확인·수정'}</Link>
    </aside>
  );
}
