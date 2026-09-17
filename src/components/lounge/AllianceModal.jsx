import { useState } from 'react';
import Icon from '../icons/Icon';
import { useLounge } from '../../context/LoungeContext';
import { parseAllianceCode, copyText } from '../../lib/invite';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import { showToast } from '../Toast';
import ModalScrim from '../ModalScrim';
import CopyNotice from './CopyNotice';

function AllianceModalShell({ title, onClose, children }) {
  return (
    <ModalScrim style={{ padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div
        className="glass-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 96vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '22px',
          borderRadius: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>
        {children}
      </div>
    </ModalScrim>
  );
}

const pathCardStyle = (on) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  alignItems: 'flex-start',
  width: '100%',
  padding: '14px 14px',
  borderRadius: 14,
  border: on ? '1px solid rgba(125,211,252,0.55)' : '1px solid rgba(255,255,255,0.12)',
  background: on ? 'rgba(14,116,144,0.22)' : 'rgba(255,255,255,0.06)',
  color: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
});

/**
 * 연합 — 1군(호스트) / 2군(게스트) 경로를 명확히 고른 뒤 연결
 */
export default function AllianceModal({ onClose }) {
  const {
    activeLounge,
    isAdmin,
    isMaster,
    isAllianceGuestView,
    allianceGuests,
    maxAllianceGuests,
    createAlliance,
    joinAlliance,
    leaveAlliance,
    revokeAllianceGuest,
    regenAllianceCode,
    dissolveAlliance,
    enterAllianceHostView,
    exitAllianceHostView,
  } = useLounge();

  const [busy, setBusy] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [err, setErr] = useState('');
  /** null | 'host' | 'guest' — 아직 연합 없을 때만 */
  const [path, setPath] = useState(null);
  const [copyNotice, setCopyNotice] = useState('');
  const [dissolveOpen, setDissolveOpen] = useState(false);

  const isHost = !!activeLounge?.allianceEnabled && !activeLounge?.allianceHostId && !isAllianceGuestView;
  const isGuestHome = !!activeLounge?.allianceHostId && !isAllianceGuestView;
  const code = activeLounge?.allianceCode || '';

  const run = async (fn, okMsg) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
      if (okMsg) showToast(okMsg, 'success');
    } catch (e) {
      const msg = e?.message || '요청에 실패했습니다.';
      setErr(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const dissolveConfirmUi = dissolveOpen ? (
    <ModalScrim
      style={{ zIndex: 10050, padding: '16px' }}
      {...backdropDismissProps(() => !busy && setDissolveOpen(false))}
    >
      <div
        className="glass-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(400px, 92vw)',
          padding: '22px 20px',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.55 }}>
          정말 연합을 종료할까요?
          <span
            style={{
              display: 'block',
              marginTop: 8,
              fontSize: 13,
              fontWeight: 700,
              color: 'rgba(252,165,165,0.95)',
              lineHeight: 1.55,
            }}
          >
            종료하면 연결된 2군 길드는
            <br />
            더 이상 1군 허브·공략을 볼 수 없습니다.
            {allianceGuests.length > 0 ? (
              <>
                <br />
                (현재 {allianceGuests.length}개 길드 연결됨)
              </>
            ) : null}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-ops"
            disabled={busy}
            onClick={() => setDissolveOpen(false)}
            style={{ justifyContent: 'center', minWidth: 100 }}
          >
            취소
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            disabled={busy}
            onClick={() => {
              void run(async () => {
                await dissolveAlliance();
                setDissolveOpen(false);
                setPath(null);
              }, '연합을 종료했습니다.');
            }}
          >
            연합 종료
          </button>
        </div>
      </div>
    </ModalScrim>
  ) : null;

  if (isAllianceGuestView) {
    return (
      <AllianceModalShell title="연합 · 읽기 전용" onClose={onClose}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
          1군 허브를 보고 있습니다. 공략·게시글은 열람만 가능하며 수정할 수 없습니다.
        </p>
        <button
          type="button"
          className="btn-ops"
          disabled={busy}
          onClick={() => {
            exitAllianceHostView();
            onClose();
          }}
        >
          내 허브로 돌아가기
        </button>
      </AllianceModalShell>
    );
  }

  if (isHost) {
    return (
      <>
        <AllianceModalShell title="연합 관리 · 1군" onClose={onClose}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1.45 }}>
            이 허브가 <strong style={{ color: '#fff' }}>1군(호스트)</strong>입니다.
            「코드 복사」로 연합 코드를 복사해 2군에 공유하세요. 연결돼도 멤버가 되지 않으며, 공략은 읽기만 가능합니다.
            (최대 {maxAllianceGuests}개)
          </p>

          <div
            className="alliance-code-actions"
            style={{
              display: 'grid',
              gridTemplateColumns: isMaster ? '1fr 1fr' : '1fr',
              gap: 8,
              width: '100%',
            }}
          >
            <button
              type="button"
              className="btn-ops"
              disabled={!code || busy}
              onClick={() => void copyText(code).then((ok) => {
                if (ok) setCopyNotice('연합 코드를 복사했습니다.');
              })}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name="copy" size={13} className="icon-inline--copy-invert" /> 코드 복사
            </button>
            {isMaster ? (
              <button
                type="button"
                className="btn-ops"
                disabled={busy}
                onClick={() => {
                  void run(async () => {
                    await regenAllianceCode();
                    setCopyNotice('코드가 재발급 되었습니다.');
                  });
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Icon name="edit" size={13} /> 코드 재발급
              </button>
            ) : null}
          </div>

          <h4 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#fff' }}>
            연결된 길드 ({allianceGuests.length}/{maxAllianceGuests})
          </h4>
          {allianceGuests.length === 0 ? (
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
              아직 연결된 길드가 없습니다.
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allianceGuests.map((g) => (
                <li
                  key={g.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{g.guestName || g.id}</span>
                  {isAdmin ? (
                    <button
                      type="button"
                      className="btn-danger-solid"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`「${g.guestName || g.id}」연결을 끊을까요?`)) return;
                        void run(() => revokeAllianceGuest(g.id), '연결을 끊었습니다.');
                      }}
                    >
                      끊기
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {isMaster ? (
            <button
              type="button"
              className="btn-danger-solid"
              disabled={busy}
              onClick={() => setDissolveOpen(true)}
              style={{ alignSelf: 'stretch', justifyContent: 'center' }}
            >
              연합 종료
            </button>
          ) : null}
          {err ? <p style={{ color: '#f87171', fontSize: 12, fontWeight: 700, margin: 0 }}>{err}</p> : null}
        </AllianceModalShell>
        <CopyNotice message={copyNotice} onClose={() => setCopyNotice('')} />
        {dissolveConfirmUi}
      </>
    );
  }

  if (isGuestHome) {
    const hostName = activeLounge.allianceHostName || '호스트';
    return (
      <AllianceModalShell title="연합 · 2군" onClose={onClose}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, textAlign: 'center' }}>
          이 허브가 <strong style={{ color: '#fff' }}>2군</strong>으로 연결되어 있습니다.
          <br />
          1군 공략은 읽기만 가능합니다.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, width: '100%', alignItems: 'stretch' }}>
          <button
            type="button"
            className="btn-ops"
            disabled={busy}
            onClick={() => {
              try {
                enterAllianceHostView();
                onClose();
              } catch (e) {
                showToast(e?.message || '1군 허브를 열 수 없습니다.', 'error');
              }
            }}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Icon name="hub" size={14} /> 1군 허브 보기
          </button>

          <div
            style={{
              margin: '16px 0',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em' }}>
              연결된 1군
            </div>
            <div style={{ marginTop: 4, fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35 }}>
              1군 : {hostName}
            </div>
          </div>

          {isAdmin ? (
            <button
              type="button"
              className="btn-danger-solid"
              disabled={busy}
              onClick={() => {
                if (!window.confirm('1군과의 연합 연결을 해제할까요?')) return;
                void run(async () => {
                  await leaveAlliance();
                  setPath(null);
                  onClose();
                }, '연합을 해제했습니다.');
              }}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Icon name="logout" size={13} /> 연합 해제
            </button>
          ) : null}
        </div>
        {err ? <p style={{ color: '#f87171', fontSize: 12, fontWeight: 700, margin: 0, textAlign: 'center' }}>{err}</p> : null}
      </AllianceModalShell>
    );
  }

  return (
    <AllianceModalShell title="연합" onClose={onClose}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
        먼저 우리 길드가 <strong style={{ color: '#fff' }}>1군</strong>인지 <strong style={{ color: '#fff' }}>2군</strong>인지 고르세요.
        잘못 골라도 나중에 해제·종료할 수 있습니다. (멤버 가입이 아니며, 2군은 1군 공략 읽기만)
      </p>

      {!isAdmin ? (
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
          연합 설정은 길드마스터·관리자만 할 수 있습니다.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" style={pathCardStyle(path === 'host')} onClick={() => setPath('host')} disabled={busy}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>1군 · 코드 발급</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                공략을 공유할 본진. 연합 코드를 만들어 2군에 알려줍니다.
              </span>
            </button>
            <button type="button" style={pathCardStyle(path === 'guest')} onClick={() => setPath('guest')} disabled={busy}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>2군 · 코드 입력</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
                1군이 준 연합 코드로 연결해, 1군 허브를 읽기 전용으로 봅니다.
              </span>
            </button>
          </div>

          {path === 'host' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(226,232,240,0.85)', lineHeight: 1.45 }}>
                확인 후 연합이 열리고 코드가 발급됩니다. 잘못 열었으면 관리 화면에서 「연합 종료」하면 됩니다.
              </p>
              <button
                type="button"
                className="btn-ops"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm('1군으로 연합을 열까요?\n연합 코드가 발급됩니다.')) return;
                  void run(() => createAlliance(), '1군 연합이 열렸습니다.');
                }}
              >
                1군 연합 열기
              </button>
            </div>
          ) : null}

          {path === 'guest' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>1군이 준 연합 코드</span>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="7A-XXXX-XXXX"
                  disabled={busy}
                  style={{
                    padding: '10px 12px', borderRadius: 10, border: 'none',
                    background: 'rgba(0,0,0,0.35)', color: '#fff', fontWeight: 700, fontSize: 14,
                  }}
                />
              </label>
              <button
                type="button"
                className="btn-ops"
                disabled={busy || !parseAllianceCode(joinCode)}
                onClick={() => run(async () => {
                  await joinAlliance(joinCode);
                  onClose();
                }, '2군으로 연결되었습니다.')}
              >
                2군으로 연결
              </button>
            </div>
          ) : null}
        </>
      )}
      {err ? <p style={{ color: '#f87171', fontSize: 12, fontWeight: 700, margin: 0 }}>{err}</p> : null}
    </AllianceModalShell>
  );
}
