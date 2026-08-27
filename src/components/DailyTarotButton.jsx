import { useEffect, useMemo, useState } from 'react';
import { useUserProfile } from '../context/UserProfileContext';
import {
  DAILY_TAROT_URL,
  getDailyTarotPeriodId,
  isDailyTarotClaimed,
  readLocalDailyTarotPeriod,
  writeLocalDailyTarotPeriod,
} from '../lib/dailyTarot';

/**
 * GNB 일일 타로카드 — 마이프로필과 같은 알약 크기.
 * KST 09:00 주기. 로그인 유저는 users.dailyTarotPeriodId, 비로그인은 localStorage.
 * Auth·프로필 로딩 중에는 is-live(빛남)를 켜지 않음 — claim 여부를 알기 전 flash 방지.
 * (PC/모바일 동일 컴포넌트 · CSS는 버튼 순서만 다름)
 */
export default function DailyTarotButton() {
  const { authUser, authReady, profile, profileReady, saveProfile } = useUserProfile();
  const [localPeriod, setLocalPeriod] = useState(() => readLocalDailyTarotPeriod());
  const [periodTick, setPeriodTick] = useState(0);

  useEffect(() => {
    const tick = () => setPeriodTick((n) => n + 1);
    const id = window.setInterval(tick, 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Auth 복원 전엔 게스트처럼 보이며 빛이 깜빡일 수 있음 → authReady 필수.
  // 로그인 유저는 Firestore 프로필이 올 때까지 claim 판정 보류.
  const claimReady = authReady && (!authUser || profileReady);

  const storedPeriod = authUser
    ? (profile?.dailyTarotPeriodId || localPeriod || '')
    : localPeriod;

  const claimed = useMemo(
    () => (claimReady ? isDailyTarotClaimed(storedPeriod) : false),
    // periodTick: 09시 경계 넘김 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storedPeriod, periodTick, claimReady],
  );

  const onClick = async () => {
    window.open(DAILY_TAROT_URL, '_blank', 'noopener,noreferrer');
    if (!claimReady || isDailyTarotClaimed(storedPeriod)) return;

    const periodId = getDailyTarotPeriodId();
    writeLocalDailyTarotPeriod(periodId);
    setLocalPeriod(periodId);

    if (authUser?.uid && profileReady) {
      try {
        await saveProfile({ dailyTarotPeriodId: periodId });
      } catch {
        /* 링크는 이미 열림 · 로컬 상태로 유지 */
      }
    }
  };

  const toneClass = !claimReady
    ? ' is-pending'
    : claimed
      ? ' is-claimed'
      : ' is-live';

  return (
    <button
      type="button"
      className={`gnb-daily-tarot${toneClass}`}
      onClick={onClick}
      aria-label="일일 타로카드"
      title={
        !claimReady
          ? '일일 타로카드'
          : claimed
            ? '오늘은 이미 열었습니다 · 내일 오전 9시에 다시 빛나요'
            : '일일 타로카드 열기'
      }
    >
      <span className="gnb-daily-tarot-glow" aria-hidden="true" />
      <span className="gnb-daily-tarot-label">일일 타로카드</span>
    </button>
  );
}
