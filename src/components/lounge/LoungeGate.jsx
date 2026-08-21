import { useMemo, useState } from 'react';
import Icon from '../icons/Icon';
import { useLounge } from '../../context/LoungeContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { LOUNGE_AFFILIATIONS, LOUNGE_TAGS, MAX_LOUNGE_TAGS, LOUNGE_STORAGE_KEYS, HUB_IDLE_DAYS } from '../../data/loungeMeta';
import { copyText, inviteLink, parseInviteCode } from '../../lib/invite';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import CopyNotice from './CopyNotice';
import ModalScrim from '../ModalScrim';

const inputStyle = {
  width: '100%', padding: '11px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 800, boxSizing: 'border-box'
};

export function LoungeLanding() {
  const {
    authReady, bootError, authUser, usingEmulators, useGoogleAuth,
    signInWithGoogle, signOutAccount,
  } = useLounge();
  const queryCode = useMemo(() => parseInviteCode(window.location.search) || '', []);
  const [mode, setMode] = useState(queryCode ? 'join' : null);
  const [loginError, setLoginError] = useState('');

  const onGoogle = () => {
    setLoginError('');
    void signInWithGoogle().catch((e) => {
      setLoginError(e.message || '구글 로그인에 실패했습니다.');
    });
  };

  const canEnter = authReady && !!authUser;

  return (
    <div className="container fade-in lounge-gate">
      <div className="luxury-panel hero-banner" style={{
        textAlign: 'center',
        marginBottom: '8px',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column'
      }}>
        <span className="ops-tag">Guild Hub</span>
        <h1 className="hero-headline" style={{ margin: '18px 0 12px' }}>길드 허브</h1>
        <p className="hero-subhead" style={{ margin: '0 auto 28px' }}>
          {useGoogleAuth
            ? `구글 계정으로 한 번 로그인하면, 초대 코드로 길드에 들어갑니다. 계정은 허브 하나에만 소속됩니다. 다른 길드로 가려면 먼저 나가야 합니다. 길드 기록이 ${HUB_IDLE_DAYS}일 동안 없으면 허브와 관련 데이터가 삭제됩니다.`
            : '길드마스터가 허브를 만들면 초대 코드로 길드원이 입장합니다. (테스트 중: 구글 로그인 없이 진행)'}
        </p>
        {usingEmulators && (
          <div style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--gold-light)', fontWeight: 800 }}>
            로컬 연습장 · 구글 없이 허브를 만들어 화면만 보면 됩니다. 라이브 길드 데이터와는 별개입니다.
          </div>
        )}
        {!authReady && (
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#fff', fontWeight: 800 }}>연결 준비 중…</div>
        )}
        {bootError && (
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#fca5a5', fontWeight: 800 }}>{bootError}</div>
        )}
        {loginError && (
          <div style={{ marginBottom: '14px', fontSize: '13px', color: '#fca5a5', fontWeight: 800 }}>{loginError}</div>
        )}

        {useGoogleAuth && !authUser ? (
          <button type="button" className="btn-ops" disabled={!authReady} onClick={onGoogle}
            style={{ padding: '12px 18px', fontSize: '14px' }}>
            <Icon name="key" size={15} /> Google로 계속
          </button>
        ) : (
          <>
            {useGoogleAuth && authUser && (
              <div style={{ fontSize: '13px', color: '#fff', fontWeight: 800, marginBottom: '16px' }}>
                {authUser.displayName || '계정'} · {authUser.email || '구글 로그인됨'}
                <button type="button" onClick={() => { void signOutAccount(); }}
                  style={{
                    marginLeft: '10px', background: 'none', border: 'none', color: '#fff',
                    cursor: 'pointer', fontWeight: 800, fontSize: '12px', textDecoration: 'underline'
                  }}>
                  로그아웃
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn-ops" disabled={!canEnter} onClick={() => setMode('create')} style={{ padding: '12px 18px', fontSize: '14px' }}>
                <Icon name="plus" size={15} /> 허브 생성
              </button>
              <button type="button" className="btn-steel" disabled={!canEnter} onClick={() => setMode('join')}
                style={{ opacity: canEnter ? 1 : 0.5, cursor: canEnter ? 'pointer' : 'not-allowed' }}>
                <Icon name="key" size={15} /> 코드로 입장
              </button>
            </div>
          </>
        )}
      </div>

      {mode === 'create' && (
        <LoungeCreateModal
          onClose={() => setMode(null)}
        />
      )}
      {mode === 'join' && <LoungeJoinModal onClose={() => setMode(null)} />}
    </div>
  );
}

export function InviteReadyModal({ hub, onClose }) {
  const code = hub?.inviteCode || '';
  const link = inviteLink(code);
  const [copyNotice, setCopyNotice] = useState('');

  const copyCode = async () => {
    await copyText(code);
    setCopyNotice('초대 코드를 복사했습니다.');
  };
  const copyLinkOnly = async () => {
    await copyText(link);
    setCopyNotice('초대 링크를 복사했습니다.');
  };

  return (
    <>
    <ModalScrim style={{ zIndex: 5000, padding: '16px' }}>
      <div className="glass-modal" style={{
        width: 'min(480px, 96vw)', padding: '24px', borderRadius: '28px',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{hub?.name} 허브가 개설되었습니다</h3>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1.55 }}>
          아래 코드 또는 링크를 길드원에게 나눠 주세요. 비밀번호는 없습니다.
        </p>
        <Field label="초대 코드">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input readOnly value={code} style={inputStyle} />
            <button type="button" onClick={copyCode} className="btn-ops" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>코드 복사</button>
          </div>
        </Field>
        <Field label="초대 링크">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input readOnly value={link} style={{ ...inputStyle, fontSize: '12px' }} />
            <button type="button" onClick={copyLinkOnly} className="btn-ops" style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
              링크 복사
            </button>
          </div>
        </Field>
        <button type="button" onClick={onClose} className="btn-ops" style={{ padding: '12px', justifyContent: 'center' }}>
          허브로 들어가기
        </button>
      </div>
    </ModalScrim>
    <CopyNotice message={copyNotice} onClose={() => setCopyNotice('')} />
    </>
  );
}

export function LoungeCreateModal({ onClose, onCreated }) {
  const { createLounge, usingEmulators } = useLounge();
  const { profile } = useUserProfile();
  const [name, setName] = useState('');
  const [affiliation, setAffiliation] = useState('lounge');
  const [tags, setTags] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleTag = (id) => {
    setTags(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id);
      if (prev.length >= MAX_LOUNGE_TAGS) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    try {
      setError('');
      setBusy(true);
      const lounge = await createLounge({ name, affiliation, tags });
      onCreated?.(lounge);
      onClose?.();
    } catch (e) {
      setError(e.message || '생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScrim style={{ zIndex: 5000, padding: '16px' }}
      {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{
        width: 'min(640px, 96vw)', maxHeight: '90vh', overflowY: 'auto', padding: '24px', borderRadius: '28px',
        color: '#fff', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="fortress" size={17} color="var(--gold-primary)" /> 허브 생성
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Icon name="close" size={18} /></button>
        </div>

        <Field label="길드 이름">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="예: 7K_REVERSE_LEGEND" style={inputStyle} />
        </Field>

        <Field label="길드 소속">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {LOUNGE_AFFILIATIONS.map(a => {
              const active = affiliation === a.id;
              return (
                <button key={a.id} type="button" onClick={() => setAffiliation(a.id)}
                  className="kind-pill kind-pill--md"
                  style={{
                    cursor: 'pointer', border: 'none',
                    background: active ? a.color : 'rgba(255,255,255,0.10)',
                    color: active ? '#161616' : '#fff',
                  }}>
                  {a.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label={`해시태그 (최대 ${MAX_LOUNGE_TAGS}개) · ${tags.length}/${MAX_LOUNGE_TAGS}`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {LOUNGE_TAGS.map(t => {
              const active = tags.includes(t.id);
              return (
                <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                  style={{
                    padding: '8px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: 900, fontSize: '12.5px',
                    border: active ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                    background: active ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)',
                    color: active ? 'var(--gold-light)' : '#fff'
                  }}>
                  {t.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="마스터 닉네임">
          <ProfileNicknameRow nickname={profile.nickname} />
        </Field>

        <p style={{ margin: 0, fontSize: '12px', color: '#fff', fontWeight: 700, lineHeight: 1.5 }}>
          {usingEmulators
            ? '로컬 연습장입니다. 구글 로그인 없이 허브를 만들어 화면을 보면 됩니다.'
            : `구글 계정은 허브 하나에만 소속됩니다. 길드 기록이 ${HUB_IDLE_DAYS}일 동안 없으면 이 허브는 삭제됩니다.`}
        </p>

        {error && <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>{error}</div>}

        <button type="button" onClick={submit} disabled={busy} className="btn-ops" style={{ padding: '13px', fontSize: '15px', justifyContent: 'center' }}>
          {busy ? '생성 중…' : '허브 개설'}
        </button>
      </div>
    </ModalScrim>
  );
}

export function LoungeJoinModal({ onClose, onJoined, initialCode = '' }) {
  const { joinLounge } = useLounge();
  const { profile } = useUserProfile();
  const queryCode = useMemo(() => {
    const fromQuery = parseInviteCode(window.location.search) || parseInviteCode(initialCode);
    if (fromQuery) return fromQuery;
    try { return parseInviteCode(localStorage.getItem(LOUNGE_STORAGE_KEYS.inviteHint) || ''); } catch { return ''; }
  }, [initialCode]);

  const [inviteCode, setInviteCode] = useState(queryCode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    try {
      setError('');
      setBusy(true);
      const lounge = await joinLounge({ inviteCode });
      onJoined?.(lounge);
      onClose?.();
    } catch (e) {
      setError(e.message || '입장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScrim style={{ zIndex: 5000, padding: '16px' }}
      {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{
        width: 'min(480px, 96vw)', padding: '24px', borderRadius: '28px',
        color: '#fff', display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="key" size={17} color="var(--accent-cyan)" /> 허브 입장
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><Icon name="close" size={18} /></button>
        </div>

        <p style={{ margin: 0, fontSize: '12px', color: '#fff', lineHeight: 1.55, fontWeight: 700 }}>
          초대 코드 또는 링크만 있으면 됩니다. 닉네임은 마이페이지에 저장한 이름을 그대로 씁니다.
        </p>

        <Field label="초대 코드 또는 링크">
          <input
            value={inviteCode}
            onChange={e => setInviteCode(parseInviteCode(e.target.value) || e.target.value)}
            placeholder="7K-XXXX-XXXX 또는 초대 링크"
            style={inputStyle}
          />
        </Field>
        <Field label="내 닉네임">
          <ProfileNicknameRow nickname={profile.nickname} />
        </Field>

        {error && <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>{error}</div>}

        <button type="button" onClick={submit} disabled={busy}
          style={{
            padding: '13px', fontSize: '15px', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: busy ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg, var(--accent-cyan), #0284c7)', color: '#04202b', opacity: busy ? 0.7 : 1
          }}>
          {busy ? '입장 중…' : '입장하기'}
        </button>
      </div>
    </ModalScrim>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 800, marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  );
}

/** 닉네임은 마이페이지에서만 고친다. 허브에서는 읽기 전용으로 보여준다. */
function ProfileNicknameRow({ nickname }) {
  const nick = String(nickname || '').trim();
  return (
    <div style={{
      ...inputStyle,
      display: 'flex', alignItems: 'center', gap: '8px',
      background: 'rgba(255,255,255,0.05)',
      color: nick ? '#fff' : '#fca5a5',
    }}>
      <Icon name="user" size={14} color={nick ? 'var(--gold-light)' : '#fca5a5'} />
      {nick || '마이페이지에서 닉네임을 먼저 설정해 주세요.'}
    </div>
  );
}
