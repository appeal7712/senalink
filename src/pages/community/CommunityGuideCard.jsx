import { Fragment } from 'react';
import InGameDeckCard from '../../components/InGameDeckCard';
import SkillReservationBoard from '../../components/SkillReservationBoard';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import Icon from '../../components/icons/Icon';
import { AuthorMeta } from '../../components/PublicProfileModal';
import { ArenaDeckKindBadge, metaDeckKindTheme } from '../../components/ArenaDeckKind';
import { PvpModeBadge } from '../../components/PvpModeToggle';
import { arenaTierById } from '../../data/arenaTiers';
import { COMMUNITY_ARENA_KINDS, communitySkillMode } from '../../data/communityCatalog';
import { pets } from '../../data/pets';
import { heroes } from '../../data/heroes';

function resolveHeroByName(name) {
  if (!name || !String(name).trim()) return null;
  const raw = String(name);
  const clean = raw.replace('(각성)', '').trim();
  return heroes.find((x) => x.name === raw)
    || heroes.find((x) => x.name.replace('(각성)', '').trim() === clean)
    || null;
}

function resolvePetById(petId) {
  return pets.find((p) => p.id === petId) || pets[0];
}

export default function CommunityGuideCard({
  guide,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onOpenProfile,
}) {
  const skillMeta = communitySkillMode(guide.category);
  const isTimeline = skillMeta.mode === 'timeline';
  const isPvpLayout = skillMeta.layout === 'pvp';
  const maxRes = skillMeta.maxReservations || 3;
  const arenaKind = guide.category === 'arena' ? metaDeckKindTheme(guide.deckKind) : null;
  const tier = guide.arenaTier ? arenaTierById(guide.arenaTier) : null;
  const arenaKindLabel = COMMUNITY_ARENA_KINDS.find((k) => k.id === guide.arenaKind)?.label;
  const reserved = isTimeline
    ? []
    : (guide.reservedSkills?.length ? guide.reservedSkills : guide.skillSequence || []);
  const timeline = isTimeline ? (guide.skillSequence || []) : [];

  return (
    <div
      className="luxury-panel build-panel"
      style={arenaKind ? { boxShadow: `inset 3px 0 0 ${arenaKind.text}` } : undefined}
    >
      <div className="build-panel-deck">
        <InGameDeckCard
          embedded
          teamName=""
          formationId={guide.formationId}
          petObj={resolvePetById(guide.petId)}
          heroList={(guide.heroNames || []).map((name, idx) => {
            const base = resolveHeroByName(name);
            return base ? { hero: base, gearConfig: (guide.heroGearConfigs || [])[idx] } : name;
          })}
          contentMode={isPvpLayout ? 'pvp' : 'pve'}
          reservedSkills={reserved}
          maxReservations={maxRes}
          speedOrderNames={guide.speedOrderNames}
          speedIgnoredNames={guide.speedIgnoredNames}
          pvpMode={isPvpLayout ? guide.mode : null}
          headerSlot={isPvpLayout ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              {arenaKind ? <ArenaDeckKindBadge kind={guide.deckKind} /> : null}
              <PvpModeBadge mode={guide.mode} size="sm" />
            </div>
          ) : null}
        />
      </div>

      <div className="build-panel-body">
        <div
          className="build-title-strip"
          style={{ borderLeft: `3px solid ${arenaKind ? arenaKind.text : 'var(--gold-primary)'}` }}
        >
          <div style={{ minWidth: 0, flex: '1 1 180px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {arenaKind ? <ArenaDeckKindBadge kind={guide.deckKind} /> : null}
              {arenaKindLabel && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)', color: '#e2e8f0',
                }}>
                  {guide.arenaKind === 'advanced' ? (
                    <img src="/images/community/arena/arena_advanced.png" alt="" style={{ width: 16, height: 16 }} />
                  ) : (
                    <img src="/images/community/arena/arena.png" alt="" style={{ width: 16, height: 16 }} />
                  )}
                  {arenaKindLabel}
                </span>
              )}
              {tier && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 900, color: '#fff' }}>
                  <img src={tier.iconUrl} alt="" style={{ width: 18, height: 18 }} />
                  {tier.label}
                </span>
              )}
              <h3 className="build-title-name">{guide.title}</h3>
            </div>
            <AuthorMeta
              author={guide.author}
              authorId={guide.authorId}
              updatedAt={guide.updatedAt}
              onOpenProfile={onOpenProfile}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 'auto' }}>
            {canEdit && (
              <button type="button" onClick={() => onEdit(guide)} className="btn-edit">
                <Icon name="edit" size={14} /> 수정
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(guide)}
                className="btn-danger-solid"
              >
                <Icon name="close" size={14} /> 삭제
              </button>
            )}
          </div>
        </div>

        {isTimeline ? (
          <div className="build-panel-timeline">
            <div className="build-panel-timeline-title">
              <Icon name="clock" size={15} />
              스킬 시전 순서 타임라인
            </div>
            <div className="timeline-steps">
              {timeline.length === 0 && (
                <span style={{ fontSize: 13, color: '#fff' }}>등록된 스킬 순서가 없습니다.</span>
              )}
              {timeline.map((seq, sIdx) => {
                const heroData = resolveHeroByName(seq.heroName);
                const dirLabel = seq.dir === 'upper' ? '위 스킬' : seq.dir === 'down' ? '아래 스킬' : (seq.dir === 'awaken' ? '각성' : '');
                return (
                  <Fragment key={sIdx}>
                    <div className={`timeline-step${seq.text?.trim() ? '' : ' timeline-step--no-note'}`}>
                      <div className="timeline-step-body">
                        <div className="timeline-step-face">
                          {heroData ? <HeroPortraitCard hero={heroData} showStars showRole showName={false} /> : null}
                        </div>
                        <div className="timeline-step-round">{seq.round}</div>
                        <div className="timeline-step-name">{seq.heroName}</div>
                        {dirLabel ? <div className="timeline-step-dir">{dirLabel}</div> : null}
                      </div>
                      {seq.text?.trim() ? <span className="timeline-step-note">{seq.text}</span> : null}
                    </div>
                    {sIdx < timeline.length - 1 && (
                      <Icon name="arrowRight" size={13} className="timeline-arrow" color="var(--gold-primary)" />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="build-panel-playbook">
            <div className="build-panel-playbook-title">
              <Icon name="target" size={15} />
              스킬 예약 ({reserved.filter(Boolean).length}/{maxRes})
            </div>
            <SkillReservationBoard
              heroNames={guide.heroNames || []}
              resolveHeroByName={resolveHeroByName}
              value={reserved}
              readOnly
              maxReservations={maxRes}
            />
          </div>
        )}
      </div>
    </div>
  );
}
