import { Fragment } from 'react';
import HeroPortraitCard from './HeroPortraitCard';
import Icon from './icons/Icon';

const COLS = 3;

/** 스킬 시전 순서 턴 라벨 (저장값이 1라여도 1턴으로 표시 · 0-1턴 포함) */
export function formatSkillTurnLabel(round) {
  const s = String(round || '').trim();
  if (!s) return '';
  if (/0\s*[-~∼]\s*1/.test(s)) return '0-1턴';
  const m = s.match(/(\d+)/);
  return m ? `${Number(m[1])}턴` : s.replace(/라/g, '턴');
}

/** 길드 허브 공성·강림과 동일 — 위/아래/각성 컬러 뱃지 */
export function SkillDirBadge({ dir }) {
  const meta = dir === 'upper'
    ? { label: '위 스킬', bg: '#5eb0ff' }
    : dir === 'down'
      ? { label: '아래 스킬', bg: '#ff7a7a' }
      : dir === 'awaken'
        ? { label: '각성', bg: '#e879f9' }
        : null;
  if (!meta) return null;
  return (
    <span className="kind-pill kind-pill--xs skill-dir-badge" style={{ background: meta.bg }}>
      {meta.label}
    </span>
  );
}

/** 길드 허브 공성·강림과 동일 — 흰 턴 마크 */
export function RoundMark({ round }) {
  return <span className="round-mark">{formatSkillTurnLabel(round)}</span>;
}

/** 스킬 시전 순서 — 3칸 한 줄, 메모는 해당 칸과 같은 폭·한 줄 … */
export default function SkillTimelineSteps({
  steps = [],
  resolveHeroByName,
  formatRound,
  renderDir,
  arrowColor = 'var(--gold-primary)',
  arrowSize = 13,
  emptyText = '등록된 스킬 순서가 없습니다.',
}) {
  const list = Array.isArray(steps) ? steps : [];

  if (list.length === 0) {
    return (
      <div className="timeline-steps timeline-steps--rows">
        <span style={{ fontSize: '13px', color: '#fff', fontWeight: 700 }}>{emptyText}</span>
      </div>
    );
  }

  const rows = [];
  for (let i = 0; i < list.length; i += COLS) {
    rows.push(list.slice(i, i + COLS));
  }

  return (
    <div className="timeline-steps timeline-steps--rows">
      {rows.map((row, ri) => (
        <div key={ri} className="timeline-row">
          <div className="timeline-row-steps">
            {row.map((step, localIdx) => {
              const heroData = resolveHeroByName?.(step.heroName);
              const dirNode = renderDir?.(step.dir);
              const note = String(step.text || '').trim();
              return (
                <Fragment key={`${ri}-${localIdx}`}>
                  <div className="timeline-row-col">
                    <div className="timeline-step timeline-step--no-note">
                      <div className="timeline-step-body">
                        <div className="timeline-step-face">
                          {heroData ? (
                            <HeroPortraitCard hero={heroData} showStars showRole showName={false} />
                          ) : null}
                        </div>
                        <div className="timeline-step-round">
                          {typeof formatRound === 'function' ? formatRound(step.round) : step.round}
                        </div>
                        <div className="timeline-step-name">{step.heroName}</div>
                        {dirNode ? <div className="timeline-step-dir">{dirNode}</div> : null}
                      </div>
                    </div>
                    {note ? (
                      <div className="timeline-row-note-box" title={note}>
                        <span className="timeline-row-note-text">{note}</span>
                      </div>
                    ) : null}
                  </div>
                  {localIdx < row.length - 1 ? (
                    <Icon
                      name="arrowRight"
                      size={arrowSize}
                      className="timeline-arrow"
                      color={arrowColor}
                      style={{ filter: `drop-shadow(0 0 6px ${arrowColor})` }}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
