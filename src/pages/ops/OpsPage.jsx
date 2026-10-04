import { useEffect, useRef, useState } from 'react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import Icon from '../../components/icons/Icon';
import MainSiteEditor from './MainSiteEditor';
import HubOversee from './HubOversee';
import UserOversee from './UserOversee';
import OpsDashboard from './OpsDashboard';
import { loadOpsSnapshot } from '../../lib/opsInsights';
import '../../styles/opsAdmin.css';

const OPS_TABS = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'main', label: '메인페이지' },
  { id: 'hubs', label: '길드 허브 감독' },
  { id: 'users', label: '유저 감독' },
];

function withoutMember(snapshot, hubId, memberId) {
  if (!snapshot) return snapshot;
  const list = (snapshot.membersByHub[hubId] || []).filter((m) => m.id !== memberId);
  return {
    ...snapshot,
    membersByHub: { ...snapshot.membersByHub, [hubId]: list },
    hubs: snapshot.hubs.map((h) => (h.id === hubId
      ? { ...h, memberCount: list.length, adminCount: list.filter((m) => m.role === 'admin').length }
      : h)),
  };
}

export default function OpsPage({ onOpenHub }) {
  const {
    authReady, adminReady, authUser, isSuperAdmin,
    loginError, signInWithGoogleForOps, enterLocalOpsAdmin, usingEmulators,
  } = useSuperAdmin();
  const [tab, setTab] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState({ key: -1, snapshot: null, error: '' });
  const [hubFocus, setHubFocus] = useState({ id: null, n: 0 });
  const requestedKeyRef = useRef(null);

  const wantsData = Boolean(authReady && adminReady && isSuperAdmin) && tab !== 'main';

  useEffect(() => {
    if (!wantsData || requestedKeyRef.current === reloadKey) return undefined;
    requestedKeyRef.current = reloadKey;
    let cancelled = false;
    let done = false;
    loadOpsSnapshot()
      .then((snapshot) => {
        done = true;
        if (!cancelled) setData({ key: reloadKey, snapshot, error: '' });
      })
      .catch((e) => {
        done = true;
        if (!cancelled) {
          setData((prev) => ({
            key: reloadKey,
            snapshot: prev.snapshot,
            error: e?.message || '데이터를 불러오지 못했습니다.',
          }));
        }
      });
    return () => {
      cancelled = true;
      if (!done) requestedKeyRef.current = null;
    };
  }, [wantsData, reloadKey]);

  const dataLoading = wantsData && data.key !== reloadKey;
  const reload = () => setReloadKey((k) => k + 1);
  const openHubDetail = (hubId) => {
    setHubFocus((f) => ({ id: hubId, n: f.n + 1 }));
    setTab('hubs');
  };
  const onMemberRemoved = (hubId, memberId) => {
    setData((prev) => ({ ...prev, snapshot: withoutMember(prev.snapshot, hubId, memberId) }));
  };
  const dataProps = {
    snapshot: data.snapshot,
    loading: dataLoading,
    error: data.error,
    onReload: reload,
  };

  const onLocal = async () => {
    setBusy(true);
    try {
      await enterLocalOpsAdmin();
    } catch {
      /* loginError 에 표시 */
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = () => {
    void signInWithGoogleForOps();
  };

  if (!authReady || !adminReady) {
    return (
      <div className="container fade-in page-section" style={{
        color: '#94a3b8', fontWeight: 800, textAlign: 'center', padding: '64px 24px',
        minHeight: '60vh', background: '#0c0b0a',
      }}>
        권한 확인 중…
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container fade-in page-section">
        <div className="luxury-panel" style={{ maxWidth: 560, margin: '40px auto', padding: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 12px' }}>로그인</h1>

          {usingEmulators ? (
            <>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 18 }}>
                로컬 에뮬레이터 세션입니다. 아래 버튼으로 계속할 수 있습니다.
              </p>
              {loginError && (
                <div style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{loginError}</div>
              )}
              <button type="button" className="btn-ops" disabled={busy || !authUser} onClick={onLocal}
                style={{ fontSize: 15, padding: '12px 22px' }}>
                {busy ? '들어가는 중…' : '계속하기'}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6, marginBottom: 18 }}>
                구글 계정으로 로그인해 주세요. 팝업이 막히면 주소창에서 허용한 뒤 다시 시도하세요.
              </p>
              {authUser && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)',
                  borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 12, color: '#e2e8f0',
                }}>
                  <div style={{ color: '#94a3b8', marginBottom: 6 }}>UID</div>
                  <code style={{ wordBreak: 'break-all', color: 'var(--gold-light)' }}>{authUser.uid}</code>
                </div>
              )}
              {loginError && (
                <div style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{loginError}</div>
              )}
              <button type="button" className="btn-ops" disabled={busy} onClick={onGoogle}
                style={{ fontSize: 15, padding: '12px 22px' }}>
                구글 계정으로 로그인
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in page-section">
      <div className="luxury-panel" style={{ padding: '20px 22px', marginBottom: 18 }}>
        <span className="ops-tag"><Icon name="shield" size={13} /> 슈퍼관리자</span>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '10px 0 6px' }}>사이트 관리</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          메인페이지·입장 배너·길드 허브·유저 감독. 쓰기 권한은 Firestore <code style={{ color: 'var(--gold-light)' }}>admins/&#123;내UID&#125;</code> 의 role=super 만 통과합니다. 다른 구글 계정은 /ops 로그인 화면만 보고 데이터는 못 바꿉니다.
        </p>
        <div style={{ marginTop: 14, fontSize: 11, color: '#64748b' }}>
          {usingEmulators ? '로컬 에뮬레이터' : (authUser?.email || authUser?.uid)}
        </div>
      </div>

      <div className="luxury-panel tab-bar-wrap opsx-tabbar" style={{ padding: '10px 14px', marginBottom: 18, display: 'flex', gap: 8 }}>
        {OPS_TABS.map((item) => {
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-tab-btn ${on ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
              style={{ padding: '8px 16px' }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <OpsDashboard {...dataProps} onOpenHub={openHubDetail} />}
      {tab === 'main' && <MainSiteEditor />}
      {tab === 'hubs' && (
        <HubOversee
          key={hubFocus.n}
          {...dataProps}
          focusHubId={hubFocus.id}
          onOpenHub={onOpenHub}
          onMemberRemoved={onMemberRemoved}
        />
      )}
      {tab === 'users' && <UserOversee {...dataProps} onOpenHub={openHubDetail} />}
    </div>
  );
}
