import { useEffect, useState } from 'react';
import SafeImg from './icons/SafeImg';
import HeroPortraitCard from './HeroPortraitCard';

/** 영웅에서 예약 가능한 스킬 목록 — 각성기 / 스킬1 / 스킬2 (도감과 동일: upper=스킬1, down=스킬2) */
export function getReservableSkills(hero) {
  if (!hero?.skills?.length) return [];
  const awaken = hero.skills.find(s => s.type === 'awaken_skill' || s.direction === 'awaken');
  const upper = hero.skills.find(s => s.direction === 'upper'); // 스킬1
  const down = hero.skills.find(s => s.direction === 'down');   // 스킬2
  const list = [];
  if (awaken) list.push({ key: 'awaken', skill: awaken });
  if (upper) list.push({ key: 'upper', skill: upper });
  if (down) list.push({ key: 'down', skill: down });
  if (list.length > 0) return list;

  return hero.skills
    .filter(s => s.type === 'active' || s.type === 'awaken_skill')
    .slice(0, 3)
    .map((skill, i) => ({
      key: skill.type === 'awaken_skill' ? 'awaken' : (i === 0 ? 'upper' : 'down'),
      skill,
    }));
}

export function reservationSkillKey(entry) {
  if (!entry) return '';
  return entry.skillKey || entry.dir || '';
}

export function skillKeyLabel(key) {
  if (key === 'awaken') return '각성';
  if (key === 'upper') return '스킬1';
  if (key === 'down') return '스킬2';
  return key;
}

export function toggleReservationSlot(value, heroName, skillKey) {
  const cleaned = (value || []).filter(Boolean);
  const idx = cleaned.findIndex(v => v.heroName === heroName && reservationSkillKey(v) === skillKey);
  let next;
  if (idx !== -1) {
    next = cleaned.filter((_, i) => i !== idx);
  } else {
    next = [...cleaned, { heroName, skillKey, dir: skillKey }];
    if (next.length > 3) next = next.slice(next.length - 3);
  }
  return next.map((v, i) => ({
    ...v,
    skillKey: reservationSkillKey(v),
    dir: reservationSkillKey(v),
    round: `${i + 1}번째 예약`,
  }));
}

export function describeReservedSkill(entry, resolveHeroByName) {
  if (!entry) return '';
  const hero = resolveHeroByName?.(entry.heroName);
  const key = reservationSkillKey(entry);
  const skill = getReservableSkills(hero).find(s => s.key === key)?.skill;
  return `${entry.heroName} · ${skill?.name || skillKeyLabel(key)}`;
}

function SkillIconButton({
  skill, skillKey, order, editable, iconSize, badgeFont, onToggle, caption,
}) {
  const isAwaken = skillKey === 'awaken';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      <button
        type="button"
        disabled={!editable}
        title={skill?.name || (isAwaken ? '각성기' : skillKeyLabel(skillKey))}
        onClick={() => editable && onToggle()}
        style={{
          position: 'relative',
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          padding: 0,
          borderRadius: '10px',
          overflow: 'visible',
          cursor: editable ? 'pointer' : 'default',
          border: order
            ? '3px solid #38bdf8'
            : isAwaken
              ? '2px solid #a78bfa'
              : '1.5px solid rgba(255,255,255,0.2)',
          boxShadow: isAwaken && !order
            ? '0 0 10px rgba(167,139,250,0.45)'
            : order
              ? '0 0 0 2px rgba(8, 12, 22, 0.9), 0 0 14px rgba(56, 189, 248, 0.95)'
              : '0 2px 6px rgba(0,0,0,0.4)',
          background: '#0a0d14',
          flexShrink: 0,
        }}
      >
        <span style={{
          display: 'block', width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden'
        }}>
          <SafeImg
            src={skill?.iconUrl}
            alt={skill?.name || skillKey}
            fallbackIcon="swords"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
        {order && (
          <span style={{
            position: 'absolute',
            left: '50%',
            bottom: '-7px',
            transform: 'translateX(-50%)',
            background: '#0369a1',
            color: '#fff',
            fontSize: badgeFont,
            fontWeight: 900,
            padding: '3px 8px',
            minWidth: '22px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            border: '2px solid #7dd3fc',
            boxShadow: '0 2px 8px rgba(0,0,0,0.75), 0 0 10px rgba(56,189,248,0.7)',
            textShadow: '0 1px 2px rgba(0,0,0,0.9)',
            zIndex: 2,
            lineHeight: 1.15,
            textAlign: 'center',
          }}>
            {order}
          </span>
        )}
      </button>
      {caption && (
        <span style={{ fontSize: '10px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{caption}</span>
      )}
    </div>
  );
}

/**
 * 인게임형 스킬 예약 (가로):
 * 초상화 | 위=스킬2 · 아래=스킬1 | 각성기 — 예약 순서는 스킬 아이콘 뱃지 1·2·3
 */
export default function SkillReservationBoard({
  heroNames = [],
  resolveHeroByName,
  value = [],
  onChange,
  readOnly = false,
  compact = false,
  maxHeroes = null,
}) {
  const editable = !readOnly && !!onChange;
  const names = (heroNames || []).filter(Boolean).slice(0, maxHeroes || undefined);
  const reserved = (value || []).filter(Boolean);

  const [isMobileBoard, setIsMobileBoard] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches
  ));
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 980px)');
    const sync = () => setIsMobileBoard(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const useCompact = compact || (readOnly && isMobileBoard);
  const useBoard = readOnly && !isMobileBoard && !compact;

  const findOrder = (heroName, skillKey) => {
    const idx = reserved.findIndex(
      v => v.heroName === heroName && reservationSkillKey(v) === skillKey
    );
    return idx === -1 ? null : idx + 1;
  };

  const portraitSize = useCompact ? 58 : useBoard ? 68 : 78;
  const iconSize = useCompact ? 46 : useBoard ? 50 : 56;
  const badgeFont = useCompact ? '12px' : useBoard ? '12px' : '13px';

  return (
    <div className="skill-reserve is-row">
      {editable && (
        <div className="skill-reserve-help">
          스킬 아이콘을 순서대로 클릭해 최대 3개까지 예약하세요. 위=스킬2 · 아래=스킬1, 각성기는 오른쪽에 표시됩니다.
        </div>
      )}

      {names.length === 0 && (
        <div className="skill-reserve-empty">편성된 영웅이 없습니다.</div>
      )}

      {names.length > 0 && (
        <div className="skill-reserve-row" style={{
          gridTemplateColumns: useBoard
            ? `repeat(${names.length}, minmax(0, 1fr))`
            : `repeat(${names.length}, max-content)`,
          width: useBoard ? '100%' : undefined,
          maxWidth: useBoard ? '100%' : undefined,
          padding: useCompact ? '8px 10px 14px' : useBoard ? '10px 12px 16px' : '12px 12px 18px',
          gap: useCompact ? '10px' : useBoard ? '12px' : '14px',
        }}>
          {names.map((name, i) => {
            const hero = resolveHeroByName ? resolveHeroByName(name) : null;
            const skills = getReservableSkills(hero);
            const awaken = skills.find(s => s.key === 'awaken');
            const skill1 = skills.find(s => s.key === 'upper');
            const skill2 = skills.find(s => s.key === 'down');
            const basics = [skill2, skill1].filter(Boolean);

            return (
              <div key={`${name}_${i}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', minWidth: 0
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', flexShrink: 0, minWidth: 0 }}>
                  <div style={{ width: `${portraitSize}px`, flexShrink: 0 }}>
                    {hero ? <HeroPortraitCard hero={hero} showStars showRole showName={false} /> : null}
                  </div>
                  <div style={{
                    fontSize: useCompact ? '12px' : '13px',
                    color: '#e2e8f0',
                    fontWeight: 900,
                    maxWidth: `${portraitSize + 10}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                  }}>
                    {name}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '6px' }}>
                  {basics.length === 0 && !awaken && (
                    <div style={{
                      width: `${iconSize}px`, height: `${iconSize}px`, borderRadius: '10px',
                      background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', color: '#64748b', fontWeight: 800
                    }}>?</div>
                  )}
                  {basics.map(({ key, skill }) => (
                    <SkillIconButton
                      key={key}
                      skill={skill}
                      skillKey={key}
                      order={findOrder(name, key)}
                      editable={editable}
                      iconSize={iconSize}
                      badgeFont={badgeFont}
                      onToggle={() => onChange(toggleReservationSlot(value, name, key))}
                    />
                  ))}
                </div>

                {awaken && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingBottom: '6px' }}>
                    <SkillIconButton
                      skill={awaken.skill}
                      skillKey="awaken"
                      order={findOrder(name, 'awaken')}
                      editable={editable}
                      iconSize={iconSize}
                      badgeFont={badgeFont}
                      onToggle={() => onChange(toggleReservationSlot(value, name, 'awaken'))}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
