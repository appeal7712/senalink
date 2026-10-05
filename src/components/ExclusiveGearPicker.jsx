import { useEffect, useState } from 'react';
import ModalScrim from './ModalScrim';
import Icon from './icons/Icon';
import ExclusiveGearCard from './tools/ExclusiveGearCard';
import ExclusiveGearOptionBar from './tools/ExclusiveGearOptionBar';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { heroes } from '../data/heroes';
import { getExclusiveGearIconUrl } from '../data/exclusiveGearMeta';
import {
  EXCLUSIVE_GEAR_UI,
  emptyPrioritySlots,
} from '../data/exclusiveGearOptions';
import { exclusiveOptionSlots, exclusiveOptionSummary } from '../lib/exclusiveGearSlots';

function heroGearIcon(heroName) {
  const name = String(heroName || '');
  const hero = heroes.find((h) => h.name === name)
    || heroes.find((h) => h.name === name.replace('(각성)', ''));
  return getExclusiveGearIconUrl(hero?.id) || '';
}

function ExclusiveGearModal({ heroName, slots, onSlotChange, onClear, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const label = String(heroName || '').replace('(각성)', '').trim() || '전용장비';

  return (
    <ModalScrim className="modal-scrim--lite" style={{ zIndex: 9000, padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div
        className="luxury-panel exgear-modal"
        role="dialog"
        aria-label={`${label} 전용장비 조율 옵션`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="exgear-modal-head">
          <ExclusiveGearCard iconUrl={heroGearIcon(heroName)} label={label} size={116} className="exgear-modal-card" />
          <button type="button" className="modal-close exgear-modal-close" onClick={onClose} aria-label="닫기">
            <Icon name="closeBtn" size={22} />
          </button>
        </div>
        <div className="exgear-modal-body">
          <div className="exgear-modal-slots-panel">
            <p className="exgear-modal-section-label">조율 옵션 (선택)</p>
            <div className="exgear-option-set" role="list">
              {slots.map((optionKey, idx) => (
                <div key={idx} className="exgear-option-set__row" role="listitem">
                  <ExclusiveGearOptionBar optionKey={optionKey} editing onChange={(val) => onSlotChange(idx, val)} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', padding: '0 8px' }}>
            <button type="button" className="tierlist-reset" style={{ flex: 1 }} onClick={onClear} disabled={!slots.some(Boolean)}>
              비우기
            </button>
            <button type="button" className="btn-ops" style={{ flex: 1 }} onClick={onClose}>
              완료
            </button>
          </div>
        </div>
      </div>
    </ModalScrim>
  );
}

/**
 * 「장비 세팅」 제목 줄 오른쪽에 붙는 전용장비 버튼 + 조율 옵션 팝업.
 * onChange는 { exclusiveOptions: string[4] } 를 받는다. 한 번도 안 고른 영웅은 키 자체가 없다.
 */
export default function ExclusiveGearButton({ heroName, gear, onChange }) {
  const [open, setOpen] = useState(false);
  const slots = exclusiveOptionSlots(gear);
  const active = slots.some(Boolean);

  const write = (next) => onChange({ exclusiveOptions: next });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!heroName}
        aria-pressed={active}
        title={active ? `전용장비 조율 옵션: ${exclusiveOptionSummary(gear)}` : '전용장비 조율 옵션 (선택)'}
        style={{
          marginLeft: 'auto', marginTop: 0, marginBottom: '-3.2px',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '3px 11px', borderRadius: '8px', cursor: heroName ? 'pointer' : 'default',
          fontSize: '12.5px', fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', flexShrink: 0,
          border: active ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.16)',
          background: active ? 'rgba(236,232,224,0.18)' : 'rgba(255,255,255,0.06)',
          color: active ? 'var(--gold-light)' : '#cbd5e1',
        }}
      >
        <img src={EXCLUSIVE_GEAR_UI.menuIcon} alt="" aria-hidden="true" style={{ width: '16px', height: '16px', objectFit: 'contain', opacity: active ? 1 : 0.55 }} />
        전용장비
      </button>
      {open ? (
        <ExclusiveGearModal
          heroName={heroName}
          slots={slots}
          onSlotChange={(idx, val) => {
            const next = [...slots];
            next[idx] = val;
            write(next);
          }}
          onClear={() => write(emptyPrioritySlots())}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
