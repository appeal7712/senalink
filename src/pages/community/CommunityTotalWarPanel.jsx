import { useEffect, useMemo, useState } from 'react';
import InGameDeckCard from '../../components/InGameDeckCard';
import StrategyActionBar from '../../components/StrategyActionBar';
import PublicProfileModal, { AuthorMeta } from '../../components/PublicProfileModal';
import { PvpModeBadge } from '../../components/PvpModeToggle';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import Icon from '../../components/icons/Icon';
import ModalScrim from '../../components/ModalScrim';
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
import { backdropDismissProps } from '../../utils/backdropDismiss';
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

function normalizeDecks(raw, count) {
  const decks = [...(Array.isArray(raw) ? raw : [])].map((d) => ({ ...emptyDeck(), ...d }));
  while (decks.length < count) decks.push(emptyDeck());
  return decks.slice(0, count);
}

export default function CommunityTotalWarPanel() {
  const { isSuperAdmin } = useSuperAdmin();
  const { authUser, profile } = useUserProfile();
  const [activeTier, setActiveTier] = useState('legend');
  const [guides, setGuides] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [profileUid, setProfileUid] = useState(null);

  /** 팀 선택 단계 (길드 허브 totalwar-team-pick 과 동일 플로우) */
  const [pickOpen, setPickOpen] = useState(false);
  const [pickId, setPickId] = useState('');
  const [pickTitle, setPickTitle] = useState('');
  const [pickDecks, setPickDecks] = useState([]);
  const [editTeam, setEditTeam] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const closePick = () => {
    setPickOpen(false);
    setPickId('');
    setPickTitle('');
    setPickDecks([]);
    setEditTeam(null);
  };

  const openCreate = () => {
    if (!authUser) {
      alert('구글 로그인 후 이용해 주세요.');
      return;
    }
    if (!hasNickname) {
      alert('마이페이지에서 닉네임을 먼저 설정해 주세요.');
      return;
    }
    setPickId('');
    setPickTitle(`${tier.label} 총력전 공략`);
    setPickDecks(Array.from({ length: tier.deckCount }, emptyDeck));
    setEditTeam(null);
    setPickOpen(true);
  };

  const openEdit = (guide) => {
    setPickId(guide.id || '');
    setPickTitle(guide.title || `${tier.label} 총력전 공략`);
    setPickDecks(normalizeDecks(guide.decks, tier.deckCount));
    setEditTeam(null);
    setPickOpen(true);
  };

  const handlePersist = async () => {
    const trimmed = pickTitle.trim();
    if (!trimmed) {
      alert('제목을 입력해 주세요.');
      return;
    }
    try {
      setSaving(true);
      await saveCommunityGuide(emptyCommunityGuide({
        id: pickId || undefined,
        section: 'pvp',
        category: 'totalwar',
        contentKey: activeTier,
        title: trimmed,
        decks: pickDecks,
        author: profile.nickname,
        authorId: authUser.uid,
      }));
      closePick();
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
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
                  overviewTitle={b.title ? `${b.title} · ${i + 1}팀` : `${i + 1}팀`}
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

      {pickOpen && editTeam == null && (
        <ModalScrim style={{ zIndex: 3490, padding: 16 }} {...backdropDismissProps(closePick)}>
          <div
            className="glass-modal totalwar-team-pick-modal"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 'min(920px, 96vw)', padding: 24, borderRadius: 18,
              display: 'flex', flexDirection: 'column', gap: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="totalwar" size={18} color="var(--gold-primary)" />
                총력전 팀 선택 · {tier.label} 등급
              </h3>
              <button type="button" onClick={closePick} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <Icon name="closeBtn" size={26} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#fff', marginBottom: 5, fontWeight: 800 }}>제목</div>
              <input
                value={pickTitle}
                onChange={(e) => setPickTitle(e.target.value)}
                placeholder="예: 전설 등급 5팀 편성"
                style={{
                  width: '100%', padding: '9px 12px', background: '#07090e',
                  border: '1px solid var(--border-gold)', color: '#fff', borderRadius: 7,
                  fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
              세팅할 팀을 고르세요. 장비 · 펫 · 스킬 예약은 결투장과 같은 창에서 설정합니다.
            </div>
            <div
              className="totalwar-team-pick-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(tier.deckCount, 5)}, minmax(0, 1fr))`,
                gap: 10,
              }}
            >
              {pickDecks.map((deck, i) => {
                const filled = (deck.heroNames || []).filter(Boolean);
                const leadHero = filled[0] ? resolveHeroByName(filled[0]) : null;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '14px 10px', borderRadius: 14,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold-light)' }}>{i + 1}팀</div>
                    <div className="totalwar-team-lead-face" style={{ width: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {leadHero
                        ? <HeroPortraitCard hero={leadHero} showStars showRole showName={false} />
                        : <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800 }}>빈 덱</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditTeam(i)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 12, fontWeight: 900,
                        background: 'rgba(56,189,248,0.16)',
                        border: '1.5px solid var(--accent-cyan)',
                        color: 'var(--accent-cyan)',
                      }}
                    >
                      세팅하기
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={handlePersist} disabled={saving} className="btn-ops" style={{ padding: 12, justifyContent: 'center', fontSize: 15 }}>
              {saving ? '저장 중…' : '공략 저장'}
            </button>
          </div>
        </ModalScrim>
      )}

      {pickOpen && editTeam != null && (
        <CommunityTotalWarEditor
          key={editTeam}
          team={editTeam}
          deck={pickDecks[editTeam] || emptyDeck()}
          deckCount={tier.deckCount}
          onChangeDeck={(next) => {
            setPickDecks((prev) => prev.map((d, i) => (i === editTeam ? next : d)));
          }}
          onSelectTeam={setEditTeam}
          onBack={() => setEditTeam(null)}
          onClose={closePick}
        />
      )}

      {profileUid && <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />}
    </div>
  );
}
