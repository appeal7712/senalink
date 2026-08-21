import MyPageModal from './MyPageModal';
import { useUserProfile } from '../context/UserProfileContext';

/**
 * 구글 로그인은 했지만 프로필 닉네임이 없는 상태를 막는 관문.
 * 닉네임은 사이트 전체와 길드 허브가 공유하는 유일한 이름이라, 저장 전에는 진행할 수 없다.
 */
export default function NicknameGate() {
  const { authUser, authReady, profile, profileReady } = useUserProfile();

  if (!authReady || !profileReady || !authUser) return null;
  if (String(profile.nickname || '').trim()) return null;

  return <MyPageModal mandatory onClose={() => {}} />;
}
