import { useEffect, useMemo, useState } from 'react';
import InGameDeckCard from '../../components/InGameDeckCard';
import StrategyActionBar from '../../components/StrategyActionBar';
import PublicProfileModal, { AuthorMeta } from '../../components/PublicProfileModal';
import { PvpModeBadge } from '../../components/PvpModeToggle';
import { TOTALWAR_TIERS } from '../../data/totalwarTiers';
import { pets } from '../../data/pets';
import { heroes } from '../../data/heroes';
import {
  canCreateCommunityGuide,
  canEditCommunityGuide,
  deleteCommunityGuide,
  emptyCommunityGuide,
  saveCommunityGuide,
  subscribeCommunityGuides,
} from '../../lib/communityGuides';
import { emptyGearConfig } from '../../components/HeroGearPanel';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { useUserProfile } from '../../context/UserProfileContext';
import CommunityTotalWarEditor from './CommunityTotalWarEditor';

function resolveHeroByName(name) {
  if (!name || !String(name).trim()) return null;
  const raw = String(name);
  const clean = raw.replace('(각성)', '').trim();
  return heroes.find((x) => x.name === raw)
    || heroes.find((x) => x.name.replace('(각성)', '').trim() === clean)
    || null;
}

function resolvePet(petId) {
  return pets.find((p) => p.id === petId) || pets[0];
}

function emptyDeck() {
  return {
    formationId: 'protect',
    petId: pets[0]?.id || 'pet_1',
    heroNames: ['', '', '', '', ''],
    reservedSkills: [],
    mode: '속공',
    heroGearConfigs: Array.from({ length: 5 }, () => emptyGearConfig()),
  };
}

export default function CommunityTotalWarPanel() {
  const { isSuperAdmin } = useSuperAdmin();
  const { authUser, profile } = useUserProfile();
  const [activeTier, setActiveTier] = useState('legend');
  const [guides, setGuides] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null);
  const [profileUid, setProfileUid] = useState(null);

  const tier = TOTALWAR_TIERS.find((t) => t.id === activeTier) || TOTALWAR_TIERS[0];
  const hasNickname = Boolean(String(profile.nickname || '').trim());
  const canCreate = canCreateCommunityGuide({ isSuperAdmin, section: 'pvp', hasNickname });

  useEffect(() => {
    setLoadError('');
    return subscribeCommunityGuides(
      { section: 'pvp', category: 'totalwar' },
      setGuides,
      (err) => setLoadError(err?.message || '불러오기 실패'),
    );
  }, []);

  const builds = useMemo(
    () => guides.filter((g) => g.contentKey === activeTier),
    [guides, activeTier],
  );

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
      category: 'totalwar',
      contentKey: activeTier,
      title: `${tier.label} 총력전 공략`,
      decks: Array.from({ length: tier.deckCount }, emptyDeck),
    }));
  };

  const openEdit = (guide) => {
    const count = tier.deckCount;
    const decks = [...(guide.decks || [])].map((d) => ({ ...emptyDeck(), ...d }));
    while (decks.length < count) decks.push(emptyDeck());
    setEditing({
      ...guide,
      decks: decks.slice(0, count),
      contentKey: activeTier,
    });
  };

  const handleSave = async (payload) => {
    await saveCommunityGuide({
      ...payload,
      section: 'pvp',
      category: 'totalwar',
      contentKey: activeTier,
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
      <div className="luxury-panel totalwar-tier-grid" style={{ padding: 10 }}>
        {TOTALWAR_TIERS.map((t) => {
          const isActive = activeTier === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className="totalwar-tier-btn"
              onClick={() => setActiveTier(t.id)}
              style={{
                border: isActive ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.1)',
                background: isActive ? `${t.color}22` : 'rgba(255,255,255,0.04)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                boxShadow: isActive ? `0 0 16px ${t.color}55` : 'none',
              }}
            >
              <span>{t.label}</span>
              <img className="totalwar-tier-icon" src={t.iconUrl} alt="" />
            </button>
          );
        })}
      </div>

      <StrategyActionBar
        icon="totalwar"
        title={`${tier.label} 등급 공략`}
        hint={`${tier.deckCount}팀 편성 · 펫 · 장비 · 스킬 예약`}
        actionLabel="공략 추가"
        onAction={canCreate ? openCreate : undefined}
      />

      {loadError && <p style={{ color: '#f87171', fontWeight: 700, fontSize: 13 }}>{loadError}</p>}

      {builds.length === 0 && !loadError && (
        <div className="glass-inset community-empty">
          등록된 공략이 없습니다. {canCreate ? '위 「공략 추가」로 등록해 보세요.' : '닉네임 설정 후 공유할 수 있습니다.'}
        </div>
      )}

      {builds.map((b) => {
        const editable = canEditCommunityGuide(b, { uid: authUser?.uid, isSuperAdmin, section: 'pvp' });
        return (
          <div key={b.id} className="luxury-panel totalwar-build-panel" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="totalwar-build-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{b.title}</div>
                <AuthorMeta
                  author={b.author}
                  authorId={b.authorId}
                  updatedAt={b.updatedAt}
                  prefix=""
                  onOpenProfile={setProfileUid}
                />
              </div>
              {editable && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => openEdit(b)} className="btn-edit">수정</button>
                  <button type="button" onClick={() => handleDelete(b)} className="btn-danger-solid">삭제</button>
                </div>
              )}
            </div>
            <div className="totalwar-deck-row">
              {(b.decks || []).map((d, i) => (
                <InGameDeckCard
                  key={i}
                  teamName={`${i + 1}팀`}
                  formationId={d.formationId || 'protect'}
                  heroList={(d.heroNames || []).map((name, idx) => {
                    const baseHero = resolveHeroByName(name);
                    return baseHero ? { hero: baseHero, gearConfig: (d.heroGearConfigs || [])[idx] } : name;
                  })}
                  contentMode="pvp"
                  compact
                  petObj={resolvePet(d.petId)}
                  reservedSkills={d.reservedSkills}
                  pvpMode={d.mode}
                  headerSlot={(
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <PvpModeBadge mode={d.mode} size="sm" />
                    </div>
                  )}
                />
              ))}
            </div>
          </div>
        );
      })}

      {editing && (
        <CommunityTotalWarEditor
          initial={editing}
          deckCount={tier.deckCount}
          authorName={profile.nickname || ''}
          authorId={authUser?.uid || ''}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
      {profileUid && <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />}
    </div>
  );
}
