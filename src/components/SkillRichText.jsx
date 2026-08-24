import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { skillKeywords, EFFECT_KEYWORDS } from '../data/keywords';
import Icon from './icons/Icon';

/** "방어자세 (중첩)" → ["방어자세 (중첩)", "방어자세"] */
function matchAliases(term) {
  const out = [term];
  const bare = term.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (bare && bare !== term) out.push(bare);
  return out;
}

function buildTooltipEntries(skillTooltips = {}) {
  const map = new Map();
  Object.entries(skillKeywords).forEach(([k, v]) => {
    if (k && v) map.set(k, v);
  });
  Object.entries(skillTooltips).forEach(([k, v]) => {
    if (k && v) map.set(k, v);
  });

  const entries = [];
  map.forEach((def, key) => {
    matchAliases(key).forEach((alias) => {
      entries.push({ alias, key, def });
    });
  });
  entries.sort((a, b) => b.alias.length - a.alias.length);
  return entries;
}

function findTooltip(part, entries) {
  return entries.find((e) => e.alias === part) || null;
}

function resolveActiveDef(openKey, entries) {
  if (!openKey) return '';
  return entries.find((e) => e.key === openKey || e.alias === openKey)?.def || skillKeywords[openKey] || '';
}

function clampTipStyle(anchor, tipEl) {
  const pad = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = tipEl.offsetWidth || Math.min(280, vw * 0.82);
  const tipH = tipEl.offsetHeight || 80;
  let left = anchor.left;
  let top = anchor.top;
  let place = 'above';

  if (top - tipH - 16 < pad) {
    place = 'below';
    top = anchor.bottom != null ? anchor.bottom : (anchor.top + 18);
  }

  const half = tipW / 2;
  left = Math.min(Math.max(left, pad + half), vw - pad - half);

  if (place === 'above') {
    top = Math.max(pad + tipH + 4, top);
  } else {
    top = Math.min(top, vh - pad - tipH);
  }

  return { left, top, place };
}

/**
 * negi-lab 식: 설명 본문에 효과를 하이라이트하고, 호버/탭 시 작은 툴팁.
 */
export default function SkillRichText({ text, skillTooltips = {}, className = '' }) {
  const tipId = useId();
  const rootRef = useRef(null);
  const tipRef = useRef(null);
  const [openKey, setOpenKey] = useState(null);
  const [anchor, setAnchor] = useState(null);
  const [tipPos, setTipPos] = useState(null);

  const entries = useMemo(() => buildTooltipEntries(skillTooltips), [skillTooltips]);
  const aliasList = useMemo(() => entries.map((e) => e.alias), [entries]);

  const kwPattern = useMemo(() => {
    const fromEffects = EFFECT_KEYWORDS.filter(Boolean);
    const all = [...new Set([...aliasList, ...fromEffects])].sort((a, b) => b.length - a.length);
    if (!all.length) return null;
    return new RegExp(`(${all.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  }, [aliasList]);

  const activeDef = resolveActiveDef(openKey, entries);

  useEffect(() => {
    if (!openKey) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        const tip = tipRef.current;
        if (tip && tip.contains(e.target)) return;
        setOpenKey(null);
        setAnchor(null);
        setTipPos(null);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenKey(null);
        setAnchor(null);
        setTipPos(null);
      }
    };
    const onScroll = () => {
      setOpenKey(null);
      setAnchor(null);
      setTipPos(null);
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [openKey]);

  useLayoutEffect(() => {
    if (!openKey || !anchor || !tipRef.current) {
      return;
    }
    setTipPos(clampTipStyle(anchor, tipRef.current));
  }, [openKey, anchor, activeDef]);

  if (!text) return null;

  const openTip = (key, el) => {
    setOpenKey(key);
    if (el) {
      const br = el.getBoundingClientRect();
      setAnchor({
        left: br.left + br.width / 2,
        top: br.top,
        bottom: br.bottom,
      });
      setTipPos(null);
    }
  };

  const toggleTip = (key, el) => {
    if (openKey === key) {
      setOpenKey(null);
      setAnchor(null);
      setTipPos(null);
      return;
    }
    openTip(key, el);
  };

  const activeLabel = openKey
    ? (entries.find((e) => e.key === openKey || e.alias === openKey)?.key || openKey)
    : '';

  const numSplitRegex = /(\d+%(?:\s*확률)?|\d+회|\d+턴|\d+중첩|\d+명|\d+개|\d+초|\d+마다|\d+레벨)/g;
  const numTestRegex = /^(?:\d+%(?:\s*확률)?|\d+회|\d+턴|\d+중첩|\d+명|\d+개|\d+초|\d+마다|\d+레벨)$/;

  const lines = String(text).split('\n');
  const place = tipPos?.place || 'above';

  return (
    <div className={`skill-rich-text ${className}`.trim()} ref={rootRef}>
      {lines.map((line, lIdx) => {
        const targetMatch = line.match(/^\[(.*?)\]$/);
        if (targetMatch) {
          const label = targetMatch[1];
          const isAlly = /아군|자신/.test(label);
          const isEnemy = !isAlly && /적/.test(label);
          const tone = isEnemy ? 'enemy' : isAlly ? 'ally' : 'neutral';
          return (
            <span key={lIdx} className={`kind-pill kind-pill--sm skill-rich-target skill-rich-target--${tone}`}>
              {label}
            </span>
          );
        }

        if (!line) {
          return <div key={lIdx} className="skill-rich-gap" />;
        }

        const parts = kwPattern ? line.split(kwPattern) : [line];

        return (
          <div key={lIdx} className="skill-rich-line">
            {parts.map((part, kIdx) => {
              const hit = findTooltip(part, entries);
              const isEffectWord = !hit && EFFECT_KEYWORDS.includes(part);

              if (hit || isEffectWord) {
                const tipKey = hit?.key || part;
                const hasDef = !!(hit?.def || skillKeywords[tipKey]);
                const isOpen = openKey === tipKey;
                return (
                  <button
                    key={kIdx}
                    type="button"
                    className={`skill-tip-term${hasDef ? ' has-tip' : ''}${isOpen ? ' is-open' : ''}`}
                    aria-expanded={hasDef ? isOpen : undefined}
                    aria-describedby={isOpen ? tipId : undefined}
                    onMouseEnter={(e) => {
                      if (!hasDef) return;
                      if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                        openTip(tipKey, e.currentTarget);
                      }
                    }}
                    onMouseLeave={() => {
                      if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                        setOpenKey(null);
                        setAnchor(null);
                        setTipPos(null);
                      }
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (hasDef) toggleTip(tipKey, e.currentTarget);
                    }}
                  >
                    {part}
                  </button>
                );
              }

              const numParts = part.split(numSplitRegex);
              return numParts.map((sub, nIdx) => {
                if (numTestRegex.test(sub)) {
                  return (
                    <span key={`${kIdx}-${nIdx}`} className="skill-rich-num">
                      {sub}
                    </span>
                  );
                }
                return <span key={`${kIdx}-${nIdx}`}>{sub}</span>;
              });
            })}
          </div>
        );
      })}

      {openKey && activeDef && anchor && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={tipRef}
            id={tipId}
            role="tooltip"
            className={`skill-tip-pop${place === 'below' ? ' skill-tip-pop--below' : ''}`}
            style={{
              left: tipPos?.left ?? anchor.left,
              top: tipPos?.top ?? anchor.top,
              visibility: tipPos ? 'visible' : 'hidden',
            }}
          >
            <div className="skill-tip-pop-title">{activeLabel}</div>
            <div className="skill-tip-pop-body">{activeDef}</div>
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}

/** 스킬 강화 / 2·6초월 블록 */
export function SkillUpgradeBlocks({ skill }) {
  const enhance = Array.isArray(skill?.skillEnhance) ? skill.skillEnhance.filter(Boolean) : [];
  const tr = skill?.transcendenceEffects || {};
  const t2 = tr['2초월'] || tr['2'] || '';
  const t6 = tr['6초월'] || tr['6'] || '';
  if (!enhance.length && !t2 && !t6) return null;

  return (
    <div className="skill-upgrade-blocks">
      {enhance.length > 0 && (
        <div className="skill-upgrade-block skill-upgrade-block--enhance">
          <div className="skill-upgrade-label">스킬 강화</div>
          <ul className="skill-upgrade-list">
            {enhance.map((line, i) => (
              <li key={i}>
                <SkillRichText text={line} skillTooltips={skill.tooltips || {}} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {t2 ? (
        <div className="skill-upgrade-block skill-upgrade-block--t2">
          <div className="skill-upgrade-label">
            <Icon name="transcend2" size={15} /> 2초월
          </div>
          <div className="skill-upgrade-body">
            <SkillRichText text={t2} skillTooltips={skill.tooltips || {}} />
          </div>
        </div>
      ) : null}
      {t6 ? (
        <div className="skill-upgrade-block skill-upgrade-block--t6">
          <div className="skill-upgrade-label">
            <Icon name="transcend6" size={15} /> 6초월
          </div>
          <div className="skill-upgrade-body">
            <SkillRichText text={t6} skillTooltips={skill.tooltips || {}} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
