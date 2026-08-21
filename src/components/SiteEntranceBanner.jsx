import { useEffect, useMemo, useState } from 'react';
import ModalScrim from './ModalScrim';
import Icon from './icons/Icon';
import { useSiteMain } from '../lib/siteMain';
import { useUserProfile } from '../context/UserProfileContext';

const STORAGE_KEY = 'senalink_entrance_banner_hide_until';

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isHiddenForToday() {
  try {
    const until = localStorage.getItem(STORAGE_KEY);
    return until === todayKey();
  } catch {
    return false;
  }
}

function hideForToday() {
  try {
    localStorage.setItem(STORAGE_KEY, todayKey());
  } catch { /* ignore */ }
}

/**
 * /ops 에서 켠 사이트 입장 배너.
 * 글라스 패널 + 뒷배경 스크림으로 본문 차단. 「오늘 하루 안 보기」는 로컬만.
 */
export default function SiteEntranceBanner() {
  const { content, loaded } = useSiteMain();
  const { authUser, authReady, profile, profileReady } = useUserProfile();
  const banner = content?.entranceBanner;
  const [dismissed, setDismissed] = useState(false);
  const [skipToday, setSkipToday] = useState(() => isHiddenForToday());

  // 닉네임 설정 관문이 떠 있는 동안에는 모달을 겹치지 않는다.
  const nicknameGateOpen = authReady && profileReady && !!authUser
    && !String(profile.nickname || '').trim();

  useEffect(() => {
    setSkipToday(isHiddenForToday());
    setDismissed(false);
  }, [banner?.updatedAt, banner?.enabled, banner?.title, banner?.body]);

  const open = useMemo(() => {
    if (!loaded || dismissed || skipToday || nicknameGateOpen) return false;
    if (!banner?.enabled) return false;
    const title = String(banner.title || '').trim();
    const body = String(banner.body || '').trim();
    return !!(title || body);
  }, [loaded, dismissed, skipToday, nicknameGateOpen, banner]);

  if (!open) return null;

  const title = String(banner.title || '').trim() || '공지';
  const body = String(banner.body || '').trim();

  return (
    <ModalScrim className="site-entrance-scrim" style={{ zIndex: 9600, padding: 16 }}>
      <div className="site-entrance-card luxury-panel glass-modal" role="dialog" aria-modal="true" aria-labelledby="site-entrance-title">
        <div className="site-entrance-tag">
          <Icon name="shield" size={13} /> 공지
        </div>
        <h2 id="site-entrance-title" className="site-entrance-title">{title}</h2>
        {body ? (
          <div className="site-entrance-body">{body}</div>
        ) : null}
        <div className="site-entrance-actions">
          <button
            type="button"
            className="btn-steel"
            onClick={() => {
              hideForToday();
              setSkipToday(true);
              setDismissed(true);
            }}
          >
            오늘 하루 안 보기
          </button>
          <button
            type="button"
            className="btn-ops"
            onClick={() => setDismissed(true)}
          >
            확인
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}
