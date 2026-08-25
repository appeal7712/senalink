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
 */
export default function DailyTarotButton() {
  const { authUser, profile, profileReady, saveProfile } = useUserProfile();
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

  const storedPeriod = authUser
    ? (profile?.dailyTarotPeriodId || localPeriod || '')
    : localPeriod;

  const claimed = useMemo(
    () => isDailyTarotClaimed(storedPeriod),
    // periodTick: 09시 경계 넘김 반영
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storedPeriod, periodTick],
  );

  const onClick = async () => {
    window.open(DAILY_TAROT_URL, '_blank', 'noopener,noreferrer');
    if (isDailyTarotClaimed(storedPeriod)) return;

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

  return (
    <button
      type="button"
      className={`gnb-daily-tarot${claimed ? ' is-claimed' : ' is-live'}`}
      onClick={onClick}
      aria-label="일일 타로카드"
      title={claimed ? '오늘은 이미 열었습니다 · 내일 오전 9시에 다시 빛나요' : '일일 타로카드 열기'}
    >
      <span className="gnb-daily-tarot-glow" aria-hidden="true" />
      <span className="gnb-daily-tarot-label">일일 타로카드</span>
    </button>
  );
}
