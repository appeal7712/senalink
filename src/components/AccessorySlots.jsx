import { useEffect, useState } from 'react';
import ModalScrim from './ModalScrim';
import Icon from './icons/Icon';
import { backdropDismissProps } from '../utils/backdropDismiss';
import {
  RING_LIST,
  RING_RARITY_FILTERS,
  resolveAccessoryPair,
  ringLabel,
  ringValue,
} from '../lib/accessoryCraft';
import '../styles/accessorySlots.css';

function RingTile({ ring, size = 'md', dim = false }) {
  if (!ring) {
    return (
      <span className={`acc-ring acc-ring--empty acc-ring--${size}`} aria-hidden="true">
        <Icon name="plus" size={size === 'sm' ? 14 : 18} />
      </span>
    );
  }
  return (
    <span className={`acc-ring acc-ring--${ring.rarity} acc-ring--${size}${dim ? ' is-dim' : ''}`} aria-hidden="true">
      <img src={ring.iconUrl} alt="" draggable={false} />
    </span>
  );
}

function RingPicker({ slot, pair, onPick, onClear, onClose }) {
  const [rarity, setRarity] = useState('all');
  const current = slot === 'main' ? pair[0] : pair[1];
  const other = slot === 'main' ? pair[1] : pair[0];
  const listed = RING_LIST.filter((r) => rarity === 'all' || r.rarity === rarity);

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

  return (
    <ModalScrim className="acc-picker-scrim" style={{ zIndex: 9000, padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div className="glass-modal acc-picker-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="acc-picker-head">
          <h3 className="acc-picker-title">
            <img className="acc-picker-title-icon" src="/images/ui/accessory-ring.png" alt="" aria-hidden="true" />
            {slot === 'main' ? '① 메인 반지' : '② 세공 반지'} 선택
          </h3>
          <button type="button" className="acc-picker-close" onClick={onClose} aria-label="닫기">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="acc-picker-filter">
          {RING_RARITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`acc-chip${rarity === f.id ? ' is-on' : ''}`}
              onClick={() => setRarity(f.id)}
            >
              {f.label}
            </button>
          ))}
          {slot === 'sub' && current ? (
            <button type="button" className="acc-chip acc-chip--clear" onClick={onClear}>세공 없음</button>
          ) : null}
        </div>
        <div className="acc-picker-grid">
          {listed.map((ring) => {
            const isCur = current?.id === ring.id;
            const locked = other?.id === ring.id;
            return (
              <button
                key={ring.id}
                type="button"
                className={`acc-picker-cell${isCur ? ' is-on' : ''}`}
                disabled={locked}
                onClick={() => onPick(ring)}
                title={`${ring.displayName}\n${ring.effect || ''}${locked ? '\n(다른 슬롯에 사용 중)' : ''}`}
              >
                <RingTile ring={ring} dim={locked} />
                {locked ? <span className="acc-picker-lock"><Icon name="lock" size={11} /></span> : null}
                <span className="acc-picker-name">{ringLabel(ring)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalScrim>
  );
}

/**
 * 장신구 ① 메인(필수) + ② 세공(선택) 슬롯.
 * onChange는 항상 { accessory, accessory2 } 둘 다 받는다 — accessory2 키 유무로 구 문서를 구분하므로 생략 금지.
 */
export default function AccessorySlots({ gear, onChange, className = '', style }) {
  const [openSlot, setOpenSlot] = useState(null);
  const pair = resolveAccessoryPair(gear || {});
  const [main, sub] = pair;

  const write = (nextMain, nextSub) => {
    onChange({ accessory: ringValue(nextMain), accessory2: nextSub ? ringValue(nextSub) : '' });
  };
  const close = () => setOpenSlot(null);

  return (
    <div className={`acc-slots ${className}`.trim()} style={style}>
      <span className="acc-slot-label">장신구 · ① 메인</span>
      <span className="acc-slot-label">② 세공{sub ? '' : ' (선택)'}</span>
      <button type="button" className="acc-slot" onClick={() => setOpenSlot('main')} title={main.effect}>
        <span className="acc-slot-inner">
          <RingTile ring={main} />
          <span className="acc-slot-text">
            <span className="acc-slot-name">{ringLabel(main)}</span>
            {main.effect ? <span className="acc-slot-effect">{main.effect}</span> : null}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`acc-slot${sub ? '' : ' is-empty'}`}
        onClick={() => setOpenSlot('sub')}
        title={sub ? sub.effect : '세공 옵션 추가 (선택)'}
      >
        <span className="acc-slot-inner">
          <RingTile ring={sub} />
          <span className="acc-slot-text">
            <span className="acc-slot-name">{sub ? ringLabel(sub) : '세공 추가'}</span>
            <span className="acc-slot-effect">{sub ? sub.effect : '반지 하나를 더 고를 수 있어요'}</span>
          </span>
        </span>
        {sub ? (
          <span
            className="acc-slot-clear"
            role="button"
            tabIndex={0}
            aria-label="세공 빼기"
            onClick={(e) => { e.stopPropagation(); write(main, null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); write(main, null); } }}
          >
            <Icon name="close" size={10} />
          </span>
        ) : null}
      </button>

      {openSlot ? (
        <RingPicker
          slot={openSlot}
          pair={pair}
          onClose={close}
          onClear={() => { write(main, null); close(); }}
          onPick={(ring) => {
            if (openSlot === 'main') write(ring, sub);
            else write(main, ring);
            close();
          }}
        />
      ) : null}
    </div>
  );
}
