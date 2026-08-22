import { useEffect, useState } from 'react';
import Icon from '../../components/icons/Icon';
import SafeImg from '../../components/icons/SafeImg';
import PublicProfileModal from '../../components/PublicProfileModal';
import CommunityGuideCard from './CommunityGuideCard';
import CommunityGuideEditor from './CommunityGuideEditor';
import {
  COMMUNITY_PVE_MODES,
  COMMUNITY_RAIDS,
  COMMUNITY_SURPRISE_RAIDS,
  COMMUNITY_GROWTH_DUNGEONS,
  communityContentLabel,
  communityContentsFor,
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

/** 보스별 object-position 이 src 교체보다 먼저 바뀌면 1초간 어긋남 → key+로드 전 숨김 */
function SurpriseBossArt({ content }) {
  const [ready, setReady] = useState(false);

  return (
    <img
      className={`community-surprise-view-boss community-surprise-view-boss--${content.key}${ready ? ' is-ready' : ''}`}
      src={content.iconUrl}
      alt={content.name}
      decoding="async"
      onLoad={() => setReady(true)}
      ref={(node) => {
        if (node?.complete && node.naturalWidth > 0 && !ready) {
          queueMicrotask(() => setReady(true));
        }
      }}
    />
  );
}

export default function CommunityPvePanel() {
  const { isSuperAdmin } = useSuperAdmin();
  const { authUser, profile } = useUserProfile();
  const [mode, setMode] = useState('raid');
  const [contentKey, setContentKey] = useState(COMMUNITY_RAIDS[0].key);
  const [guides, setGuides] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [profileUid, setProfileUid] = useState(null);

  const contents = communityContentsFor(mode);
  const canCreate = canCreateCommunityGuide({ isSuperAdmin, section: 'pve' });
  const activeContent = contents.find((c) => c.key === contentKey) || contents[0];

  useEffect(() => {
    const list = communityContentsFor(mode);
    if (!list.some((c) => c.key === contentKey)) {
      setContentKey(list[0]?.key || '');
    }
  }, [mode, contentKey]);

  useEffect(() => {
    if (!contentKey) {
      setGuides([]);
      return undefined;
    }
    setLoadError('');
    return subscribeCommunityGuides(
      { section: 'pve', category: mode, contentKey },
      setGuides,
      (err) => setLoadError(err?.message || '불러오기 실패'),
    );
  }, [mode, contentKey]);

  const openCreate = () => {
    if (!canCreate) {
      alert('PvE 공략은 슈퍼 관리자만 생성할 수 있습니다.');
      return;
    }
    setEditing(emptyCommunityGuide({
      section: 'pve',
      category: mode,
      contentKey,
      title: `${communityContentLabel(mode, contentKey)} 공략`,
    }));
  };

  const handleSave = async (payload) => {
    await saveCommunityGuide({
      ...payload,
      section: 'pve',
      category: mode,
      contentKey,
      author: profile.nickname || authUser?.displayName || '관리자',
      authorId: authUser?.uid || '',
    });
    setEditing(null);
  };

  const handleDelete = async (guide) => {
    if (!canEditCommunityGuide(guide, { uid: authUser?.uid, isSuperAdmin, section: 'pve' })) return;
    if (!window.confirm(`「${guide.title}」공략을 삭제할까요?`)) return;
    await deleteCommunityGuide(guide.id);
  };

  return (
    <div style={{ width: '100%' }}>
      <div className="glass-inset community-pve-modes">
        {COMMUNITY_PVE_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`nav-tab-btn${mode === m.id ? ' active' : ''}`}
            onClick={() => {
              setMode(m.id);
              const list = communityContentsFor(m.id);
              setContentKey(list[0]?.key || '');
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'raid' && (
        <div className="community-raid-stack">
          {COMMUNITY_RAIDS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`luxury-panel community-raid-banner${contentKey === c.key ? ' is-on' : ''}`}
              style={{ '--raid-accent': c.accent }}
              onClick={() => setContentKey(c.key)}
            >
              <div className="community-raid-banner-copy">
                <div className="eyebrow">Raid</div>
                <div className="name">{c.name}</div>
              </div>
              <div className="community-raid-banner-art">
                <SafeImg src={c.iconUrl} alt={c.name} />
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === 'surprise_raid' && (
        <div className="community-surprise">
          <div className="community-surprise-list">
            {COMMUNITY_SURPRISE_RAIDS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`luxury-panel community-surprise-pick${contentKey === c.key ? ' is-on' : ''}`}
                style={{ '--sur-accent': c.accent }}
                onClick={() => setContentKey(c.key)}
              >
                <span className="community-surprise-pick-name">{c.name}</span>
              </button>
            ))}
          </div>
          <div className="luxury-panel community-surprise-view">
            {activeContent && <SurpriseBossArt key={activeContent.key} content={activeContent} />}
            <div className="community-surprise-view-name">{activeContent?.name}</div>
          </div>
        </div>
      )}

      {mode === 'growth_dungeon' && (
        <div className="community-dungeon-grid">
          {COMMUNITY_GROWTH_DUNGEONS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`community-dungeon-tile${contentKey === c.key ? ' is-on' : ''}`}
              onClick={() => setContentKey(c.key)}
            >
              <span className="community-dungeon-tile-art">
                <SafeImg src={c.iconUrl} alt={c.name} />
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="community-section-head">
        <h3>
          {communityContentLabel(mode, contentKey)} 공략
          <span className="count">{guides.length}개</span>
        </h3>
        {canCreate && (
          <button type="button" className="btn-ops" onClick={openCreate} style={{ padding: '8px 14px' }}>
            <Icon name="plus" size={14} /> 공략 생성
          </button>
        )}
      </div>

      {loadError && <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13 }}>{loadError}</p>}

      {guides.length === 0 && !loadError && (
        <div className="glass-inset community-empty">
          등록된 공략이 없습니다.
          {!canCreate && <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>PvE는 슈퍼 관리자만 등록할 수 있습니다.</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {guides.map((g) => {
          const editable = canEditCommunityGuide(g, { uid: authUser?.uid, isSuperAdmin, section: 'pve' });
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
          authorName={profile.nickname || authUser?.displayName || '관리자'}
          authorId={authUser?.uid || ''}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {profileUid && <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />}
    </div>
  );
}
