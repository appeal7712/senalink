import { useState } from 'react';
import Icon from '../icons/Icon';
import ModalScrim from '../ModalScrim';
import { showToast } from '../Toast';
import { useLounge } from '../../context/LoungeContext';
import { HUB_IDLE_DAYS, HUB_RENEW_WARN_DAYS } from '../../data/loungeMeta';
import { backdropDismissProps } from '../../utils/backdropDismiss';

const DAY_MS = 24 * 60 * 60 * 1000;
const dismissKey = (hubId) => `senalink_hub_renew_later_${hubId}`;

/** Functions purgeIdleHubs와 같은 기준 — lastActivityAt → updatedAt → createdAt */
function activityMs(hub) {
  for (const v of [hub?.lastActivityAt, hub?.updatedAt, hub?.createdAt]) {
    const t = Date.parse(String(v || ''));
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

/**
 * 활동 없이 HUB_RENEW_WARN_DAYS가 지난 허브에 길드원이 들어오면 「갱신하시겠습니까?」.
 * 「나중에」는 이 탭(sessionStorage)에서만 숨김 — 다음 방문 때 다시 뜸.
 */
export default function HubRenewPrompt() {
  const { activeLounge, myRole, isAllianceGuestView, renewHub } = useLounge();
  const [hiddenFor, setHiddenFor] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [visitedAt] = useState(() => Date.now());

  const hubId = activeLounge?.id;
  if (!hubId || isAllianceGuestView || !['master', 'admin', 'member'].includes(myRole)) return null;
  const last = activityMs(activeLounge);
  if (!last) return null;
  const idle = Math.floor((visitedAt - last) / DAY_MS);
  if (idle < HUB_RENEW_WARN_DAYS) return null;
  if (hiddenFor.has(hubId)) return null;
  try {
    if (sessionStorage.getItem(dismissKey(hubId))) return null;
  } catch { /* 저장소 막힘 — 그냥 표시 */ }

  const left = Math.max(0, HUB_IDLE_DAYS - idle);
  const hide = () => setHiddenFor((s) => new Set(s).add(hubId));
  const later = () => {
    try { sessionStorage.setItem(dismissKey(hubId), '1'); } catch { /* ignore */ }
    hide();
  };
  const renew = async () => {
    setBusy(true);
    try {
      await renewHub();
      hide();
      showToast(`허브를 갱신했어요. 오늘부터 다시 ${HUB_IDLE_DAYS}일이에요.`, 'success');
    } catch (e) {
      showToast(e?.message || '갱신에 실패했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScrim style={{ padding: '16px', zIndex: 5400 }} {...backdropDismissProps(later)}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-labelledby="hub-renew-title" style={{
        width: 'min(440px, 96vw)', padding: '22px', borderRadius: '28px', display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <h3 id="hub-renew-title" style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="clock" size={18} /> 길드 허브 갱신
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600, lineHeight: 1.6 }}>
          {HUB_IDLE_DAYS}일간 길드 허브를 사용하지 않으면 길드 허브가 삭제됩니다. 갱신하시겠습니까?
        </p>
        <p style={{ margin: 0, fontSize: '12.5px', color: '#fca5a5', fontWeight: 800 }}>
          마지막 활동 {idle}일 전 · 이대로면 {left}일 뒤 삭제돼요.
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={later} disabled={busy} className="btn-steel" style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>
            나중에
          </button>
          <button type="button" onClick={renew} disabled={busy} className="btn-ops" style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>
            {busy ? '갱신 중…' : '갱신'}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}
