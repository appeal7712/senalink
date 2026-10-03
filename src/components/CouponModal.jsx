import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import { backdropDismissProps } from '../utils/backdropDismiss';
import {
  COUPON_GAP_MS,
  FINAL_STATUSES,
  NETMARBLE_COUPON_PAGE,
  STATUS_LABEL,
  clearAllCouponStorage,
  clearHistoryFor,
  isValidCouponUid,
  loadCoupons,
  parseCouponCodes,
  readHistory,
  readRemember,
  readSavedUid,
  redeemCouponCode,
  writeHistoryEntry,
  writeRemember,
  writeSavedUid,
} from '../lib/coupons';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function StatusPill({ status }) {
  if (!status) return <span className="coupon-pill">미수령</span>;
  return (
    <span className={`coupon-pill s-${status}`}>
      {status === 'loading' && <span className="coupon-spin" aria-hidden="true" />}
      <span>{STATUS_LABEL[status] || status}</span>
    </span>
  );
}

export default function CouponModal({ onClose }) {
  const [coupons, setCoupons] = useState([]);
  const [listReady, setListReady] = useState(false);
  const [remember, setRemember] = useState(() => readRemember());
  const [uid, setUid] = useState(() => (readRemember() ? readSavedUid() : ''));
  const [history, setHistory] = useState(() => readHistory());
  const [session, setSession] = useState({});
  const [live, setLive] = useState({});
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState('');
  const [summary, setSummary] = useState('');
  const [tab, setTab] = useState('active');
  const [manualText, setManualText] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');
  const copyTimerRef = useRef(0);

  useEffect(() => {
    let alive = true;
    loadCoupons().then((list) => {
      if (!alive) return;
      setCoupons(list);
      setListReady(true);
    });
    return () => {
      alive = false;
      window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedUid = uid.trim();
  const uidOk = isValidCouponUid(trimmedUid);

  const statusOf = useCallback((c) => {
    if (c.expired) return 'expired';
    if (live[c.code]) return live[c.code];
    if (!remember) return session[c.code] || null;
    return history[trimmedUid]?.[c.code]?.s || null;
  }, [live, remember, session, history, trimmedUid]);

  const activeList = useMemo(() => coupons.filter((c) => statusOf(c) !== 'expired'), [coupons, statusOf]);
  const expiredList = useMemo(() => coupons.filter((c) => statusOf(c) === 'expired'), [coupons, statusOf]);
  const pending = useMemo(() => coupons.filter((c) => !FINAL_STATUSES.has(statusOf(c))), [coupons, statusOf]);
  const manualCodes = useMemo(() => parseCouponCodes(manualText), [manualText]);
  const hasHistory = remember && uidOk && Object.keys(history[trimmedUid] || {}).length > 0;

  const saveResult = (u, code, status) => {
    if (!remember) {
      setSession((prev) => ({ ...prev, [code]: status }));
      return;
    }
    writeHistoryEntry(u, code, status);
    setHistory(readHistory());
  };

  const runQueue = async (codes, onEach) => {
    if (busy || !uidOk || !codes.length) return;
    const u = trimmedUid;
    setBusy(true);
    setAlert('');
    setSummary('');
    const tally = {};
    let stoppedAlert = '';
    for (let i = 0; i < codes.length; i += 1) {
      const code = codes[i];
      setLive((prev) => ({ ...prev, [code]: 'loading' }));
      onEach?.(code, 'loading');
      const status = await redeemCouponCode(u, code);
      setLive((prev) => {
        const next = { ...prev };
        delete next[code];
        return next;
      });
      tally[status] = (tally[status] || 0) + 1;
      if (status !== 'invalid_uid' && status !== 'rate_limited' && status !== 'error') {
        saveResult(u, code, status);
      }
      onEach?.(code, status);
      if (status === 'invalid_uid') {
        stoppedAlert = 'UID를 찾을 수 없습니다. 확인 후 다시 시도해 주세요.';
        break;
      }
      if (status === 'rate_limited') {
        stoppedAlert = '잘못된 시도가 너무 많아 넷마블이 이 계정의 쿠폰 사용을 1시간 동안 제한했습니다. 나중에 다시 시도해 주세요.';
        break;
      }
      if (i < codes.length - 1) await sleep(COUPON_GAP_MS);
    }
    if (!stoppedAlert && tally.error) {
      stoppedAlert = '쿠폰 서버에 연결할 수 없습니다. 연결 상태를 확인한 후 다시 시도해 주세요.';
    }
    setAlert(stoppedAlert);
    const parts = [];
    if (tally.success) parts.push(`${tally.success}개 사용`);
    if (tally.already) parts.push(`${tally.already}개 이미 수령`);
    if (tally.expired) parts.push(`${tally.expired}개 기간 만료`);
    if (tally.not_target) parts.push(`${tally.not_target}개 사용 대상 아님`);
    if (tally.invalid_code) parts.push(`${tally.invalid_code}개 잘못된 코드`);
    if (tally.error) parts.push(`${tally.error}개 실패`);
    setSummary(parts.join(' · ') + (tally.success ? ' — 게임 내 우편함을 확인하세요.' : ''));
    setBusy(false);
  };

  const onRedeemAll = () => runQueue(pending.map((c) => c.code));

  const onRedeemManual = () => {
    const codes = manualCodes;
    if (!codes.length) return;
    setManualResults(codes.map((code) => ({ code, status: null })));
    runQueue(codes, (code, status) => {
      setManualResults((prev) => prev.map((r) => (r.code === code ? { ...r, status } : r)));
      if (FINAL_STATUSES.has(status)) {
        setManualText((prev) => parseCouponCodes(prev).filter((c) => c !== code).join('\n'));
      }
    });
  };

  const onUidChange = (e) => {
    const next = e.target.value;
    setUid(next);
    if (remember) writeSavedUid(next.trim());
    setSummary('');
    setAlert('');
  };

  const onRememberChange = (e) => {
    const on = e.target.checked;
    setRemember(on);
    writeRemember(on);
    if (on) {
      if (trimmedUid) writeSavedUid(trimmedUid);
    } else {
      clearAllCouponStorage();
      setHistory({});
    }
  };

  const onClearHistory = () => {
    clearHistoryFor(trimmedUid);
    setHistory(readHistory());
    setSummary('');
  };

  const onCopy = (code) => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopiedCode(code);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopiedCode(''), 1500);
    }).catch(() => {});
  };

  const redeemAllLabel = !trimmedUid
    ? 'UID를 입력하세요'
    : !uidOk
      ? 'UID를 확인하세요'
      : !pending.length
        ? '모든 쿠폰 수령 완료'
        : `쿠폰 ${pending.length}개 모두 사용`;

  const shown = tab === 'expired' ? expiredList : activeList;

  return (
    <ModalScrim className="coupon-scrim" {...backdropDismissProps(onClose)}>
      <div
        className="glass-modal coupon-modal"
        role="dialog"
        aria-modal="true"
        aria-label="쿠폰 사용"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="coupon-modal-header">
          <div className="coupon-modal-heading">
            <h2 className="coupon-modal-title">쿠폰 사용</h2>
            <p className="coupon-modal-sub">
              UID를 한 번만 입력하면 사용 가능한 쿠폰을 한 번에 모두 사용할 수 있습니다. 보상은 게임 내 우편함으로 바로 지급됩니다.
            </p>
          </div>
          <button type="button" className="coupon-close-btn" onClick={onClose} aria-label="닫기">
            <Icon name="closeBtn" size={18} />
          </button>
        </header>

        <div className="coupon-modal-body">
          <div className="coupon-layout">
            <section className="coupon-card coupon-acct" aria-label="내 계정">
              <h3 className="coupon-card-title">내 계정</h3>
              <label className="coupon-label" htmlFor="coupon-uid">UID (회원번호)</label>
              <input
                id="coupon-uid"
                className={`coupon-input${trimmedUid && !uidOk ? ' is-bad' : ''}`}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="UID를 입력하세요"
                value={uid}
                onChange={onUidChange}
              />
              {trimmedUid && !uidOk && (
                <p className="coupon-field-msg">UID는 영문과 숫자로만 이루어져 있습니다.</p>
              )}
              <p className="coupon-hint">게임 내 설정 → 계정 &amp; 약관에서 확인할 수 있으며, 옆에 복사 버튼이 있습니다.</p>
              <div className="coupon-row">
                <label className="coupon-switch">
                  <input type="checkbox" checked={remember} onChange={onRememberChange} />
                  <span className="coupon-switch-slider" />
                </label>
                <span className="coupon-hint">이 기기에 저장하기</span>
              </div>
              <button
                type="button"
                className="coupon-btn coupon-btn-main"
                disabled={busy || !uidOk || !pending.length || !listReady}
                onClick={onRedeemAll}
              >
                {busy ? (
                  <>
                    <span className="coupon-spin" aria-hidden="true" />
                    <span>사용 중…</span>
                  </>
                ) : (
                  <span>{redeemAllLabel}</span>
                )}
              </button>
              {alert && <div className="coupon-alert">{alert}</div>}
              {summary && <p className="coupon-summary">{summary}</p>}
            </section>

            <section className="coupon-card coupon-other" aria-label="기타 코드">
              <h3 className="coupon-card-title">기타 코드</h3>
              <label className="coupon-label" htmlFor="coupon-manual">쿠폰번호</label>
              <textarea
                id="coupon-manual"
                className="coupon-textarea"
                rows={3}
                spellCheck={false}
                autoCapitalize="characters"
                placeholder="한 줄에 하나씩, 또는 쉼표나 공백으로 구분"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
              />
              <p className="coupon-hint">
                공식 경로에서 받은 코드만 입력하세요. 잘못된 코드를 너무 많이 입력하면 1시간 동안 쿠폰 사용이 제한됩니다.
              </p>
              <button
                type="button"
                className="coupon-btn coupon-btn-main"
                disabled={busy || !uidOk || !manualCodes.length}
                onClick={onRedeemManual}
              >
                코드 사용
              </button>
              {manualResults.length > 0 && (
                <div className="coupon-results">
                  {manualResults.map((r) => (
                    <div key={r.code} className="coupon-result">
                      <span className="coupon-code">{r.code}</span>
                      <StatusPill status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="coupon-card coupon-listcard" aria-label="쿠폰 목록">
              <div className="coupon-list-head">
                <h3 className="coupon-card-title">쿠폰</h3>
                {hasHistory && (
                  <button type="button" className="coupon-link coupon-link-danger" onClick={onClearHistory}>
                    저장된 결과 지우기
                  </button>
                )}
              </div>
              <div className="coupon-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'active'}
                  className={`coupon-tab${tab === 'active' ? ' is-active' : ''}`}
                  onClick={() => setTab('active')}
                >
                  <span>사용 가능</span>
                  <span className="coupon-tab-count">{listReady ? activeList.length : ''}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'expired'}
                  className={`coupon-tab${tab === 'expired' ? ' is-active' : ''}`}
                  onClick={() => setTab('expired')}
                >
                  <span>기간 만료</span>
                  <span className="coupon-tab-count">{listReady ? expiredList.length : ''}</span>
                </button>
              </div>

              {!listReady ? (
                <p className="coupon-empty">쿠폰 목록을 불러오는 중…</p>
              ) : !shown.length ? (
                <p className="coupon-empty">
                  {tab === 'expired' ? '기간 만료된 쿠폰이 없습니다.' : '현재 사용 가능한 쿠폰이 없습니다. 곧 다시 확인해 주세요.'}
                </p>
              ) : (
                <div className="coupon-grid">
                  {shown.map((c) => {
                    const s = statusOf(c);
                    const done = FINAL_STATUSES.has(s) && s !== 'expired';
                    return (
                      <article
                        key={c.code}
                        className={`coupon-item${done ? ' is-done' : ''}${s === 'expired' ? ' is-dead' : ''}`}
                      >
                        <div className="coupon-item-top">
                          <span className="coupon-code">{c.code}</span>
                          <StatusPill status={s} />
                        </div>
                        {c.event && <p className="coupon-event">{c.event}</p>}
                        {c.rewards.length > 0 && (
                          <ul className="coupon-rewards">
                            {c.rewards.map((r, i) => (
                              <li key={`${c.code}-${i}`}>
                                <span>{r.name}</span>
                                <span className="coupon-qty">{r.qty}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="coupon-actions">
                          <button type="button" className="coupon-btn coupon-btn-ghost" onClick={() => onCopy(c.code)}>
                            {copiedCode === c.code ? '복사됨!' : '복사'}
                          </button>
                          <button
                            type="button"
                            className="coupon-btn coupon-btn-solid"
                            disabled={!uidOk || busy || FINAL_STATUSES.has(s)}
                            onClick={() => runQueue([c.code])}
                          >
                            사용
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="coupon-foot">
                <a className="coupon-link" href={NETMARBLE_COUPON_PAGE} target="_blank" rel="noopener noreferrer">
                  넷마블 공식 쿠폰 페이지 ↗
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ModalScrim>
  );
}
