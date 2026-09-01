import { useEffect, useMemo, useState } from 'react';
import { heroes, compareHeroesForList } from '../../data/heroes';
import { EXCLUSIVE_GEAR_PRIORITY_COUNT, EXCLUSIVE_GEAR_UI } from '../../data/exclusiveGearOptions';
import { exclusiveGearByHeroId, getExclusiveGearIconUrl } from '../../data/exclusiveGearMeta';
import {
  getPrioritySlots,
  heroGuideHasContent,
  normalizeHeroGuide,
  saveExclusiveGearGuides,
  subscribeExclusiveGearGuides,
} from '../../lib/exclusiveGearGuides';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import ExclusiveGearCard from './ExclusiveGearCard';
import ExclusiveGearOptionBar from './ExclusiveGearOptionBar';
import Icon from '../icons/Icon';
import ModalScrim from '../ModalScrim';
import { backdropDismissProps } from '../../utils/backdropDismiss';

const GEAR_HERO_IDS = new Set(Object.keys(exclusiveGearByHeroId));
const PRIORITY_KEYS = Array.from({ length: EXCLUSIVE_GEAR_PRIORITY_COUNT }, (_, i) => String(i + 1));

function cleanName(hero) {
  return String(hero?.name || '').replace('(각성)', '').trim();
}

function findHero(id) {
  return heroes.find((h) => h.id === id) || null;
}

function gearCardLabel(hero) {
  return cleanName(hero);
}

function HeroGuideCell({ hero, onClick }) {
  const gearIcon = getExclusiveGearIconUrl(hero.id);
  return (
    <button
      type="button"
      className="exgear-cell"
      onClick={onClick}
      title={cleanName(hero)}
    >
      <ExclusiveGearCard iconUrl={gearIcon} label={gearCardLabel(hero)} size={108} />
    </button>
  );
}

function PriorityOptionSet({ slots, editing, onSlotChange }) {
  return (
    <div className="exgear-option-set" role="list">
      {slots.map((optionKey, idx) => (
        <div key={idx} className="exgear-option-set__row" role="listitem">
          <ExclusiveGearOptionBar
            optionKey={optionKey}
            editing={editing}
            onChange={(val) => onSlotChange?.(idx, val)}
          />
        </div>
      ))}
    </div>
  );
}

function GuideDetailModal({
  hero,
  guide,
  gearIcon,
  editing,
  onClose,
  onChange,
  onRemove,
}) {
  const [activePriority, setActivePriority] = useState('1');
  const safeGuide = guide || normalizeHeroGuide({});

  useEffect(() => {
    setActivePriority('1');
  }, [hero?.id]);

  if (!hero) return null;

  const slots = getPrioritySlots(safeGuide, activePriority);
  const hasGuide = heroGuideHasContent(safeGuide);

  return (
    <ModalScrim
      className="modal-scrim--lite"
      style={{ zIndex: 7000, padding: '16px' }}
      {...backdropDismissProps(onClose)}
    >
      <div
        className="luxury-panel exgear-modal"
        role="dialog"
        aria-label={`${cleanName(hero)} 전용장비 조율 추천`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="exgear-modal-head">
          <ExclusiveGearCard
            iconUrl={gearIcon}
            label={gearCardLabel(hero)}
            size={116}
            className="exgear-modal-card"
          />
          <button type="button" className="modal-close exgear-modal-close" onClick={onClose} aria-label="닫기">
            <Icon name="closeBtn" size={22} />
          </button>
        </div>

        <div className="exgear-modal-body">
          <div className="exgear-modal-slots-panel">
            <p className="exgear-modal-section-label">추천 조율 옵션</p>

            <div className="exgear-priority-tabs" role="tablist" aria-label="우선순위">
              {PRIORITY_KEYS.map((key) => {
                const on = activePriority === key;
                const filled = getPrioritySlots(safeGuide, key).some(Boolean);
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    aria-label={`${key}순위`}
                    className={`exgear-priority-tab${on ? ' is-on' : ''}${filled ? ' has-data' : ''}`}
                    onClick={() => setActivePriority(key)}
                  >
                    <img
                      className="exgear-priority-tab__icon"
                      src={EXCLUSIVE_GEAR_UI.priorityIcons[key]}
                      alt=""
                      draggable={false}
                    />
                  </button>
                );
              })}
            </div>

            {!editing && !hasGuide ? (
              <p className="exgear-modal-pending">조율 가이드 준비 중입니다.</p>
            ) : (
              <PriorityOptionSet
                slots={slots}
                editing={editing}
                onSlotChange={(idx, val) => {
                  const nextPriorities = { ...safeGuide.priorities };
                  const nextSlots = [...getPrioritySlots(safeGuide, activePriority)];
                  nextSlots[idx] = val;
                  nextPriorities[activePriority] = nextSlots;
                  onChange?.({ priorities: nextPriorities });
                }}
              />
            )}
          </div>

          {editing && hasGuide ? (
            <button type="button" className="tierlist-reset exgear-remove" onClick={onRemove}>
              이 영웅 추천 옵션 삭제
            </button>
          ) : null}
        </div>
      </div>
    </ModalScrim>
  );
}

export default function ExclusiveGearGuide() {
  const { isSuperAdmin, authUser } = useSuperAdmin();
  const [guides, setGuides] = useState({});
  const [draft, setDraft] = useState(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [selectedHeroId, setSelectedHeroId] = useState(null);

  useEffect(() => {
    setLoadError('');
    return subscribeExclusiveGearGuides(
      (data) => {
        setGuides(data.guides);
        setUpdatedAt(data.updatedAt || '');
        setLoadError('');
      },
      (err) => {
        setLoadError(err?.message || '추천 옵션을 불러오지 못했습니다. 아이콘 목록은 계속 볼 수 있습니다.');
      },
    );
  }, []);

  const activeGuides = editing && draft ? draft : guides;

  const listedHeroes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...heroes]
      .filter((h) => GEAR_HERO_IDS.has(h.id))
      .filter((h) => {
        if (!q) return true;
        return cleanName(h).toLowerCase().includes(q) || String(h.name || '').toLowerCase().includes(q);
      })
      .sort(compareHeroesForList);
  }, [query]);

  const selectedHero = selectedHeroId ? findHero(selectedHeroId) : null;
  const selectedGuide = selectedHeroId
    ? normalizeHeroGuide(activeGuides[selectedHeroId] || {})
    : null;

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(guides)));
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(null);
    setSelectedHeroId(null);
  };

  const onSave = async () => {
    if (!draft || busy) return;
    setBusy(true);
    try {
      await saveExclusiveGearGuides({ guides: draft, uid: authUser?.uid || '' });
      setEditing(false);
      setDraft(null);
      setSelectedHeroId(null);
    } catch (e) {
      alert(e?.message || '저장에 실패했습니다. Firestore 규칙이 배포되었는지 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const updateSelectedGuide = (patch) => {
    if (!selectedHeroId || !editing || !draft) return;
    setDraft((prev) => ({
      ...prev,
      [selectedHeroId]: normalizeHeroGuide({ ...prev[selectedHeroId], ...patch }),
    }));
  };

  const removeSelectedGuide = () => {
    if (!selectedHeroId || !draft) return;
    if (!window.confirm('이 영웅의 추천 조율 옵션을 삭제할까요?')) return;
    setDraft((prev) => {
      const next = { ...prev };
      delete next[selectedHeroId];
      return next;
    });
    setSelectedHeroId(null);
  };

  return (
    <div className="exgear-guide">
      <div className="luxury-panel exgear-intro-panel">
        <div className="exgear-head">
          <div className="exgear-head-copy">
            <h2 className="exgear-title">전용장비 옵션 추천</h2>
            <p className="exgear-copy">영웅별 전용장비 조율 옵션을 1~2순위로 추천합니다.</p>
          </div>
          <div className="exgear-actions">
            {updatedAt ? (
              <span className="exgear-updated">
                갱신 {new Date(updatedAt).toLocaleDateString('ko-KR')}
              </span>
            ) : null}
            {isSuperAdmin ? (
              editing ? (
                <>
                  <button type="button" className="tierlist-reset" onClick={cancelEdit} disabled={busy}>
                    취소
                  </button>
                  <button type="button" className="btn-ops" onClick={onSave} disabled={busy}>
                    <Icon name="save" size={14} />
                    {busy ? '저장 중…' : '저장'}
                  </button>
                </>
              ) : (
                <button type="button" className="btn-ops" onClick={startEdit}>
                  <Icon name="edit" size={14} />
                  수정
                </button>
              )
            ) : null}
          </div>
        </div>

        {loadError ? <div className="exgear-error">{loadError}</div> : null}

        <div className="exgear-toolbar">
          <input
            type="text"
            className="form-input dex-hero-search exgear-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="영웅 이름 검색..."
          />
        </div>
      </div>

      {listedHeroes.length === 0 ? (
        <div className="luxury-panel exgear-empty-panel">표시할 영웅이 없습니다.</div>
      ) : (
        <div className="luxury-panel exgear-grid-panel">
          <div className="exgear-grid">
            {listedHeroes.map((hero) => (
                <HeroGuideCell
                  key={hero.id}
                  hero={hero}
                  onClick={() => setSelectedHeroId(hero.id)}
                />
              ))}
          </div>
        </div>
      )}

      {selectedHero ? (
        <GuideDetailModal
          hero={selectedHero}
          guide={selectedGuide}
          gearIcon={getExclusiveGearIconUrl(selectedHero.id)}
          editing={editing}
          onClose={() => setSelectedHeroId(null)}
          onChange={updateSelectedGuide}
          onRemove={removeSelectedGuide}
        />
      ) : null}
    </div>
  );
}
