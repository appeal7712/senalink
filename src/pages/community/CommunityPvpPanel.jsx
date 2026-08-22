import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/icons/Icon';
import SafeImg from '../../components/icons/SafeImg';
import PublicProfileModal from '../../components/PublicProfileModal';
import { META_DECK_KINDS, metaDeckKindTheme } from '../../components/ArenaDeckKind';
import CommunityGuideCard from './CommunityGuideCard';
import CommunityGuideEditor from './CommunityGuideEditor';
import CommunityTotalWarPanel from './CommunityTotalWarPanel';
import {
  COMMUNITY_ARENA_KINDS,
  COMMUNITY_PVP_MODES,
} from '../../data/communityCatalog';
import {
  canCreateCommunityGuide,
  canEditCommunityGuide,
  deleteCommunityGuide,
  emptyCommunityGuide,
  saveCommunityGuide,
  subscribeCommunityGuides,
} from '../../lib/communityGuides';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { useUserProfile } from '../../context/UserProfileContext';

export default function CommunityPvpPanel() {
  const [hubMode, setHubMode] = useState('arena'); // arena | arena_advanced | totalwar
  const activeMode = COMMUNITY_PVP_MODES.find((m) => m.id === hubMode) || COMMUNITY_PVP_MODES[0];

  return (
    <div style={{ width: '100%' }}>
      <div className="glass-inset community-pve-modes community-pvp-modes">
        {COMMUNITY_PVP_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`nav-tab-btn${hubMode === m.id ? ' active' : ''}`}
            onClick={() => setHubMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {hubMode === 'totalwar' ? (
        <CommunityTotalWarPanel />
      ) : (
        <CommunityArenaSection
          arenaKind={activeMode.arenaKind}
          bannerUrl={activeMode.banner}
        />
      )}
    </div>
  );
}

function CommunityArenaSection({ arenaKind, bannerUrl }) {
  const { isSuperAdmin } = useSuperAdmin();
  const { authUser, profile } = useUserProfile();
  const [guides, setGuides] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [profileUid, setProfileUid] = useState(null);
  const [filterDeckKind, setFilterDeckKind] = useState('all');

  const hasNickname = Boolean(String(profile.nickname || '').trim());
  const canCreate = canCreateCommunityGuide({ isSuperAdmin, section: 'pvp', hasNickname });
  const activeArena = COMMUNITY_ARENA_KINDS.find((k) => k.id === arenaKind) || COMMUNITY_ARENA_KINDS[0];

  useEffect(() => {
    setFilterDeckKind('all');
  }, [arenaKind]);

  useEffect(() => {
    setLoadError('');
    return subscribeCommunityGuides(
      { section: 'pvp', category: 'arena' },
      setGuides,
      (err) => setLoadError(err?.message || '불러오기 실패'),
    );
  }, []);

  const filtered = useMemo(() => guides.filter((g) => {
    if (g.arenaKind !== arenaKind) return false;
    if (filterDeckKind !== 'all' && g.deckKind !== filterDeckKind) return false;
    return true;
  }), [guides, arenaKind, filterDeckKind]);

  const openCreate = () => {
    if (!authUser) {
      alert('구글 로그인 후 이용해 주세요.');
      return;
    }
    if (!hasNickname) {
      alert('마이페이지에서 닉네임을 먼저 설정해 주세요.');
      return;
    }
    setEditing(emptyCommunityGuide({
      section: 'pvp',
      category: 'arena',
      contentKey: 'arena',
      arenaKind,
      arenaTier: profile.arenaTier || 'bronze',
      deckKind: filterDeckKind === 'all' ? 'attack' : filterDeckKind,
      title: `${activeArena.label} 공략`,
    }));
  };

  const handleSave = async (payload) => {
    await saveCommunityGuide({
      ...payload,
      section: 'pvp',
      category: 'arena',
      contentKey: 'arena',
      arenaKind: payload.arenaKind || arenaKind,
      author: profile.nickname,
      authorId: authUser.uid,
    });
    setEditing(null);
  };

  const handleDelete = async (guide) => {
    if (!canEditCommunityGuide(guide, { uid: authUser?.uid, isSuperAdmin, section: 'pvp' })) return;
    if (!window.confirm(`「${guide.title}」공략을 삭제할까요?`)) return;
    await deleteCommunityGuide(guide.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="luxury-panel community-arena-action">
        <div className="community-arena-action-main">
          <div className="community-arena-action-copy">
            <div className="community-arena-action-title">
              <Icon name="swords" size={15} color="var(--gold-primary)" />
              {activeArena.label} 공략
            </div>
            <div className="community-arena-action-hint">덱 유형 · 펫 · 장비 · 스킬 예약</div>
          </div>
          {canCreate && (
            <div className="community-arena-action-cta">
              <button type="button" onClick={openCreate} className="btn-ops" style={{ padding: '9px 14px', fontSize: 12 }}>
                <Icon name="plus" size={13} />
                공략 추가
              </button>
            </div>
          )}
        </div>
        <div className="community-arena-action-art" aria-hidden>
          <SafeImg src={bannerUrl || activeArena.iconUrl} alt="" />
        </div>
      </div>

      <div className="community-deck-kind-filters" role="tablist" aria-label="덱 유형">
        <button
          type="button"
          className={`community-deck-kind-chip${filterDeckKind === 'all' ? ' is-on' : ''}`}
          onClick={() => setFilterDeckKind('all')}
        >
          전체
        </button>
        {META_DECK_KINDS.map((k) => {
          const theme = metaDeckKindTheme(k.id);
          const on = filterDeckKind === k.id;
          return (
            <button
              key={k.id}
              type="button"
              className={`community-deck-kind-chip${on ? ' is-on' : ''}`}
              onClick={() => setFilterDeckKind(k.id)}
              style={on ? {
                background: theme.pill,
                color: '#161616',
                borderColor: 'transparent',
              } : undefined}
            >
              {k.label}
            </button>
          );
        })}
        <span className="community-deck-kind-count">{filtered.length}개</span>
      </div>

      {loadError && <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13 }}>{loadError}</p>}
      {filtered.length === 0 && !loadError && (
        <div className="glass-inset community-empty">등록된 {activeArena.label} 공략이 없습니다.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((g) => {
          const editable = canEditCommunityGuide(g, { uid: authUser?.uid, isSuperAdmin, section: 'pvp' });
          return (
            <CommunityGuideCard
              key={g.id}
              guide={g}
              canEdit={editable}
              canDelete={editable}
              onEdit={setEditing}
              onDelete={handleDelete}
              onOpenProfile={setProfileUid}
            />
          );
        })}
      </div>

      {editing && (
        <CommunityGuideEditor
          initial={editing}
          authorName={profile.nickname || authUser?.displayName || ''}
          authorId={authUser?.uid || ''}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {profileUid && <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />}
    </div>
  );
}
