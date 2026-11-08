import { Fragment } from 'react';
import { formationsData } from '../data/formations';
import { EQUIPMENT_SET_ICONS } from '../data/equipments';
import { resolveAccessoryPair, ringLabel, ringParts } from '../lib/accessoryCraft';
import { exclusiveOptionSummary } from '../lib/exclusiveGearSlots';
import Icon from './icons/Icon';
import { FORMATION_ICON_SIZE, FORMATION_ICON_SIZE_COMPACT } from '../data/uiIcons';
import { SKILL_RESERVE_ICON_SIZE_SM } from '../lib/skillReserveIcon';
import { SkillReservePlateIcon } from './icons/GameIconPlate';
import SkillReservationBoard from './SkillReservationBoard';
import { PvpModeBadge } from './PvpModeToggle';
import { buildOptionCode } from './HeroGearPanel';
import { backdropDismissProps } from '../utils/backdropDismiss';
import OverflowTitle from './OverflowTitle';
import HeroPortraitCard from './HeroPortraitCard';
import { renderFormationCircleIcon, renderDeckFormationLayout } from './deckFormation';

/**
 * 세팅 확인 창 (InGameDeckCard 「세팅 확인」 버튼) — 속공 순서/스킬 예약 · 배치 · 펫 · 메모 · 전원 장비.
 * 열림 · 닫힘 · 오버레이 스택 · 세팅 공유(PNG)는 InGameDeckCard가 맡고 여기는 그리기만.
 * 스타일: styles/settingOverview.css · 규칙: docs/agents/features.md §10.6
 */
export default function SettingOverviewModal({
  onClose,
  captureRef,
  shareBusy,
  onShare,
  isPvp,
  pvpMode,
  settingDeckTitle,
  reservedSkills,
  displayHeroes,
  maxHeroes,
  speedOrderList,
  speedIgnoredSet,
  cleanHeroName,
  resolveHeroByName,
  currentFormationId,
  selectedPet,
  hidePet,
  overviewNotes,
  overviewEnemyDeck,
}) {
  const formationSet = formationsData;
  const renderFormationLayout = (slotFn, fid = currentFormationId, list = displayHeroes) => (
    renderDeckFormationLayout(slotFn, fid, list)
  );

  const filledInspectHeroes = displayHeroes.filter(Boolean).slice(0, maxHeroes || 5);
  // 길드전(3인)은 배치 · 펫을 장비 칸 대신 스킬 예약 옆에 (renderTrioDeckBox)
  const isTrioOverview = !!(maxHeroes && maxHeroes <= 3);
  const showOverviewDeck = !isTrioOverview && filledInspectHeroes.length > 0;
  const overviewCellCount = filledInspectHeroes.length + (showOverviewDeck ? 1 : 0);

  const renderHeroGearBlock = (hero, compact = false) => {
    const gear = hero.gearConfig || {};
    const setName = gear.setName || '복수자';
    const setIcon = EQUIPMENT_SET_ICONS[setName] || '/images/equipment/복수자.png';
    const [acc, accCraft] = resolveAccessoryPair(gear);
    const optionCode = buildOptionCode(gear);
    const exclusiveSummary = exclusiveOptionSummary(gear);
    const tips = String(gear.detailNote || '')
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    const slots = [
      { label: '무기 1', value: gear.weapon1 || '치명타 확률', tone: 'gold' },
      { label: '방어구 1', value: gear.armor1 || '모든 공격력(%)', tone: 'cyan' },
      { label: '무기 2', value: gear.weapon2 || '치명타 확률', tone: 'gold' },
      { label: '방어구 2', value: gear.armor2 || '모든 공격력(%)', tone: 'cyan' },
    ];
    const toneColor = { gold: 'var(--gold-light)', cyan: 'var(--accent-cyan)' };
    const name = hero.name ? hero.name.replace('(각성)', '') : '영웅';

    return (
      <div className={compact ? 'gear-block-compact' : undefined} style={compact ? undefined : {
        background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-subtle)',
        borderRadius: '14px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '10px', minWidth: 0 }}>
          <div style={{ width: compact ? '48px' : '56px', flexShrink: 0 }} className={compact ? 'gear-block-face' : undefined}>
            <HeroPortraitCard hero={hero} showStars showRole showName={false} />
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                className={compact ? 'gear-block-name' : undefined}
                style={{ fontSize: compact ? '15px' : '16px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}
              >
                {name}
              </div>
              <div
                className={compact ? 'gear-block-set' : undefined}
                style={{
                marginLeft: 'auto',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '3px 8px', borderRadius: '7px', flexShrink: 0,
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)'
              }}>
                <img src={setIcon} alt="" style={{ width: '14px', height: '14px' }} />
                <span style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--gold-light)' }}>{setName}</span>
              </div>
            </div>
            {exclusiveSummary ? (
              <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: '8px', rowGap: '2px', minWidth: 0 }}>
                {optionCode && (
                  <div className={compact ? 'gear-block-optcode' : undefined} style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold-light)', letterSpacing: '0.4px', flexShrink: 0 }}>
                    {optionCode}
                  </div>
                )}
                <div
                  title={`전용장비: ${exclusiveSummary}`}
                  style={{
                    marginLeft: 'auto', flex: '0 0 auto', maxWidth: '100%', fontSize: '11.5px', fontWeight: 900, color: 'var(--accent-cyan)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                >
                  전장 {exclusiveSummary}
                </div>
              </div>
            ) : optionCode && (
              <div className={compact ? 'gear-block-optcode' : undefined} style={{ fontSize: '13px', fontWeight: 900, color: 'var(--gold-light)', letterSpacing: '0.4px' }}>
                {optionCode}
              </div>
            )}
          </div>
        </div>

        <div className="gear-detail-box">
          <div className="gear-detail-label">
            <Icon name="bolt" size={12} /> 세팅 디테일
          </div>
          <div className="gear-detail-body" tabIndex={tips.length > 3 ? 0 : undefined}>
            {tips.length > 0 ? (
              <ul>
                {tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            ) : (
              <div className="gear-detail-empty">등록된 세팅 디테일이 없습니다.</div>
            )}
          </div>
        </div>

        <div className={compact ? 'gear-block-slots' : undefined} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {slots.map(slot => (
            <div key={slot.label} className={compact ? 'gear-block-slot' : undefined} style={{
              background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', padding: compact ? '6px' : '8px', textAlign: 'center'
            }}>
              <div className={compact ? 'gear-block-slot-label' : undefined} style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, marginBottom: '3px' }}>{slot.label}</div>
              <div className={compact ? 'gear-block-slot-value' : undefined} style={{ fontSize: '12px', fontWeight: 900, color: toneColor[slot.tone], lineHeight: 1.3 }}>{slot.value}</div>
            </div>
          ))}
        </div>

        <div style={{
          background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-subtle)',
          borderRadius: '8px', padding: compact ? '6px 8px' : '8px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          textAlign: 'center'
        }}>
          {accCraft ? (
            <div className="acc-pair">
              <span className="acc-pair-sizer" aria-hidden="true"><span>&nbsp;</span><span>&nbsp;</span></span>
              {[acc, accCraft].map((ring, i) => {
                const { name: ringName, status } = ringParts(ring);
                return (
                  <Fragment key={i}>
                    {i ? <span className="acc-pair-plus" aria-hidden="true">+</span> : null}
                    <div className="acc-pair-half" title={ringLabel(ring)}>
                      <img src={ring.iconUrl} alt="" className="acc-pair-icon" />
                      <div className="acc-pair-text">
                        <div className="acc-pair-name">{ringName}</div>
                        {status ? <div className="acc-pair-status">{status}</div> : null}
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          ) : (<>
          <img src={acc.iconUrl} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'var(--gold-light)', fontWeight: 800 }}>장신구</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ringLabel(acc)}</div>
          </div>
          </>)}
        </div>
      </div>
    );
  };

  const renderOverviewHeroSlot = (h, idx) => {
    if (!h) {
      return (
        <div key={idx} className="deck-hero-slot">
          <div
            className="deck-hero-slot-face"
            style={{
              border: '1px dashed var(--border-subtle)',
              background: 'rgba(0,0,0,0.3)',
            }}
          />
        </div>
      );
    }

    const name = h.name ? h.name.replace('(각성)', '') : '';

    return (
      <div key={idx} className="deck-hero-slot">
        <div className="deck-hero-slot-face" title={name || undefined}>
          <HeroPortraitCard hero={h} showStars showRole showName={false} />
        </div>
      </div>
    );
  };

  const toFormationId = (fid) => {
    const mapped = fid === '2f1b' ? 'protect' : fid === '1f2b' ? 'basic' : fid;
    return formationSet.find(f => f.id === mapped) ? mapped : formationSet[0].id;
  };

  /** 세팅 확인 배치 칸 옆: 펫(영웅 초상과 같은 크기) · 진형 아이콘 (5인 · 길드전 공통) */
  const renderOverviewDeckSide = (fid, pet, petClass, iconSize = FORMATION_ICON_SIZE_COMPACT) => {
    const formation = formationSet.find(f => f.id === fid) || formationSet[0];
    return (
      <div className="setting-overview-deck-side">
        {!hidePet && (
          <div className={`${petClass} pet-portrait-face`} title={pet?.name || '장착 펫'}>
            {pet?.portraitUrl ? <img src={pet.portraitUrl} alt={pet.name} /> : <Icon name="pet" size={18} />}
          </div>
        )}
        <div className="setting-overview-deck-side-formation" title={formation.name}>
          {renderFormationCircleIcon(fid, iconSize)}
        </div>
      </div>
    );
  };

  /** 5인 배치 · 펫 칸. 장비가 두 칸 이상 나란하면 그리드 마지막 칸(grid), 장비 1열 스마트폰(≤560)은 본문 맨 위(top) */
  const renderOverviewDeckBox = (placement) => (
    <div className={`setting-overview-deck setting-overview-deck--${placement}`}>
      <div className="setting-overview-deck-label">배치 · 펫</div>
      <div className="deck-stage">
        <div className="deck-stage-formation">
          {renderFormationLayout(renderOverviewHeroSlot)}
        </div>
        {renderOverviewDeckSide(currentFormationId, selectedPet, 'setting-overview-deck-pet', FORMATION_ICON_SIZE)}
      </div>
    </div>
  );

  const renderTrioDeckBox = ({ key, kicker, title, tone, solo = false, placement = 'side', formationId: fid, heroes: list, pet }) => (
    <div key={key} className={`setting-overview-trio-deck is-${tone}${solo ? ' is-solo' : ''} setting-overview-trio-deck--${placement}`}>
      {solo ? (
        <div className="setting-overview-deck-label">{kicker}</div>
      ) : (
        <div className="setting-overview-trio-deck-head">
          <span className="setting-overview-trio-deck-kicker">{kicker}</span>
          {title ? <span className="setting-overview-trio-deck-title" title={title}>{title}</span> : null}
        </div>
      )}
      <div className="setting-overview-trio-deck-stage">
        <div className="deck-stage-formation">
          {renderFormationLayout(renderOverviewHeroSlot, fid, list)}
        </div>
        {renderOverviewDeckSide(fid, pet, 'setting-overview-trio-deck-pet', solo ? FORMATION_ICON_SIZE : FORMATION_ICON_SIZE_COMPACT)}
      </div>
    </div>
  );

  const mineTrioDeck = {
    kicker: overviewEnemyDeck ? '내 공격 덱' : '배치 · 펫',
    tone: 'mine',
    solo: !overviewEnemyDeck,
    formationId: currentFormationId,
    heroes: displayHeroes,
    pet: selectedPet,
  };
  // 길드전 방어(한 장) · 영웅 3명: 장비 2열 화면에선 장비 그리드 첫 칸에 (2×2로 빈칸 없이)
  const trioDeckInGrid = isTrioOverview && !overviewEnemyDeck
    && filledInspectHeroes.length === 3;

  const overviewNoteList = [
    ...(Array.isArray(overviewNotes) ? overviewNotes.filter(n => n?.text) : []),
    ...(String(overviewEnemyDeck?.note || '').trim()
      ? [{ label: '상대 덱 특이사항', text: String(overviewEnemyDeck.note).trim() }]
      : []),
  ];
  // 메모가 하나면 그 이름(기타 디테일 등)을 칸 제목으로 — 「공략 메모」 아래 한 줄 더 내려가지 않게
  const overviewNoteSingle = overviewNoteList.length === 1 && overviewNoteList[0].label && overviewNoteList[0].label !== '메모'
    ? overviewNoteList[0].label : '';
  // 길드전 공격: 메모를 「내 공격 덱 · 기타 디테일」 / 「상대 덱 · 특이사항」 두 칸으로 (배치 카드와 같은 파랑 · 빨강)
  const gwAttackMemo = overviewEnemyDeck ? {
    mine: (Array.isArray(overviewNotes) ? overviewNotes.filter(n => n?.text).map(n => n.text) : []).join('\n'),
    enemy: String(overviewEnemyDeck.note || '').trim(),
  } : null;
  const overviewNoteTitle = gwAttackMemo ? '공략 메모' : (overviewNoteSingle || '공략 메모');
  const renderGwAttackMemo = () => (
    <div className="setting-overview-memo-split">
      {[
        { tone: 'mine', kicker: '내 공격 덱', title: '기타 디테일', text: gwAttackMemo.mine, empty: '등록된 기타 디테일이 없습니다.' },
        { tone: 'enemy', kicker: '상대 덱', title: '특이사항', text: gwAttackMemo.enemy, empty: '등록된 특이사항이 없습니다.' },
      ].map(box => (
        <div key={box.tone} className={`setting-overview-memo-box is-${box.tone}`}>
          <div className="setting-overview-memo-head">
            <span className="setting-overview-trio-deck-kicker">{box.kicker}</span>
            <span className="setting-overview-memo-title">{box.title}</span>
          </div>
          <div className="setting-overview-memo-text">
            {box.text || <span className="is-empty">{box.empty}</span>}
          </div>
        </div>
      ))}
    </div>
  );
  // 길드전 공격 · 영웅 3명: 장비 2열 화면에선 메모를 장비 그리드 빈 4번째 칸에
  const notesInGrid = isTrioOverview && !!overviewEnemyDeck && filledInspectHeroes.length === 3
    && overviewNoteList.length > 0;
  const renderOverviewNoteItems = () => overviewNoteList.map((note, idx) => (
    <div key={`${note.label || 'note'}_${idx}`}>
      {!overviewNoteSingle && note.label && note.label !== '메모' && (
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{note.label}</div>
      )}
      <div style={{ fontSize: '13.5px', color: '#e2e8f0', whiteSpace: 'pre-line', lineHeight: 1.55, wordBreak: 'keep-all', overflowWrap: 'anywhere' }}>{note.text}</div>
    </div>
  ));

  const trioDeckBoxes = isTrioOverview ? [
    renderTrioDeckBox({ key: 'mine', ...mineTrioDeck }),
    overviewEnemyDeck ? renderTrioDeckBox({
      key: 'enemy',
      kicker: '상대 덱',
      title: String(overviewEnemyDeck.title || '').trim(),
      tone: 'enemy',
      formationId: toFormationId(overviewEnemyDeck.formationId),
      heroes: (() => {
        const list = (overviewEnemyDeck.heroNames || []).map(n => resolveHeroByName(n));
        while (list.length < 5) list.push(null);
        return list.slice(0, 5);
      })(),
      pet: overviewEnemyDeck.petObj,
    }) : null,
  ].filter(Boolean) : [];

  return (
    <div className="modal-scrim" style={{ zIndex: 8200, padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} ref={captureRef} className={`glass-modal setting-overview-modal${overviewCellCount >= 3 ? ' setting-overview-modal--wide' : ''}`} style={{
        maxHeight: '90vh', padding: '12px 14px', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', gap: '10px', boxSizing: 'border-box'
      }}>
        <div className="setting-overview-head">
          <div className="setting-overview-head-lead">
            <div className="setting-overview-head-kicker">
              <Icon name="settingConfirm" size={16} /> 세팅 확인
              {isPvp && pvpMode ? <PvpModeBadge mode={pvpMode} size="sm" /> : null}
              {settingDeckTitle ? (
                <div className="setting-overview-head-title">
                  <span className="setting-overview-head-title-label">덱 이름</span>
                  <span className="setting-overview-head-title-sep">:</span>
                  <OverflowTitle
                    className="setting-overview-head-title-value"
                    as="span"
                    text={settingDeckTitle}
                  />
                </div>
              ) : null}
            </div>
            <div className="setting-overview-head-sub">
              {isPvp
                ? (isTrioOverview ? '스킬 예약 · 배치 · 펫 · 장비 · 장신구 · 디테일' : '스킬 예약 · 장비 · 장신구 · 디테일')
                : '속공 순서 · 장비 · 장신구 · 디테일'}
            </div>
          </div>
          <button type="button" className="no-capture setting-overview-head-close" onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
            <Icon name="closeBtn" size={28} />
          </button>
        </div>

        <div className="setting-overview-body">
          {showOverviewDeck && renderOverviewDeckBox('top')}
          {isPvp ? (() => {
            const reserveSection = (
              <div className="setting-overview-section">
                <div className="setting-overview-label">
                  <SkillReservePlateIcon reservedSkills={reservedSkills} size={SKILL_RESERVE_ICON_SIZE_SM} /> 스킬 예약
                </div>
                <SkillReservationBoard
                  heroNames={displayHeroes.filter(Boolean).map(h => (h.name || '').replace('(각성)', ''))}
                  resolveHeroByName={resolveHeroByName}
                  value={reservedSkills}
                  readOnly
                  compact
                  maxHeroes={maxHeroes}
                />
              </div>
            );
            if (!trioDeckBoxes.length) return reserveSection;
            return (
              <div className={`setting-overview-trio-top${trioDeckBoxes.length > 1 ? ' has-enemy' : ''}${trioDeckInGrid ? ' has-grid-deck' : ''}`}>
                {reserveSection}
                <div className="setting-overview-trio-decks">{trioDeckBoxes}</div>
              </div>
            );
          })() : (
            <div className="setting-overview-section">
              <div className="setting-overview-label">
                <Icon name="speed" size={14} /> 속공 순서
              </div>
              {speedOrderList.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>등록된 속공 순서가 없습니다.</div>
              ) : (
                <div className="speed-order-strip">
                  {speedOrderList.map((h, idx) => {
                    const name = cleanHeroName(h);
                    const ignored = speedIgnoredSet.has(name);
                    return (
                      <Fragment key={`${name}_${idx}`}>
                        {idx > 0 && (
                          <Icon
                            name="arrowRight"
                            size={14}
                            strokeWidth={2.4}
                            className="speed-order-arrow"
                            color={ignored ? '#64748b' : 'var(--gold-primary)'}
                          />
                        )}
                        <div
                          className={`speed-order-chip${ignored ? ' is-off' : ''}`}
                          title={name}
                          aria-label={ignored ? `${name} · 속공 제외` : `${idx + 1}순위 ${name}`}
                        >
                          <span className="speed-order-num">{ignored ? '제외' : idx + 1}</span>
                          <div className="speed-order-face">
                            <HeroPortraitCard hero={h} showStars={false} showRole={false} showName={false} />
                          </div>
                          <strong>{name}</strong>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {overviewNoteList.length > 0 && (
            <div className={`setting-overview-section${notesInGrid ? ' setting-overview-notes-section--has-cell' : ''}`}>
              <div className="setting-overview-label">
                <Icon name="hubWrite" size={14} /> {overviewNoteTitle}
              </div>
              {gwAttackMemo ? renderGwAttackMemo() : (
                <div className="setting-overview-notes">{renderOverviewNoteItems()}</div>
              )}
            </div>
          )}

          <div className="setting-overview-section">
            <div className="setting-overview-label">
              <Icon name="gearShield" size={14} /> 전원 장비 · 세팅 디테일
            </div>
            {filledInspectHeroes.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 800, fontSize: '14px' }}>
                배치된 영웅이 없습니다.
              </div>
            ) : (
              <div className={`gear-overview-grid gear-overview-grid--${Math.min(overviewCellCount, 6)}`}>
                {/* 장비 2열 이상일 때 배치 · 펫은 첫 칸 (1열 폰은 CSS로 숨기고 본문 맨 위 --top) */}
                {showOverviewDeck && renderOverviewDeckBox('grid')}
                {trioDeckInGrid && renderTrioDeckBox({ key: 'mine-grid', ...mineTrioDeck, placement: 'grid' })}
                {filledInspectHeroes.slice(0, 5).map((hero, idx) => (
                  <div key={`${hero.id || hero.name}-${idx}`}>
                    {renderHeroGearBlock(hero, true)}
                  </div>
                ))}
                {notesInGrid && (
                  <div className="setting-overview-notes-cell">
                    <div className="setting-overview-label">
                      <Icon name="hubWrite" size={14} /> {overviewNoteTitle}
                    </div>
                    <div className="setting-overview-notes-cell-body">
                      {gwAttackMemo ? renderGwAttackMemo() : renderOverviewNoteItems()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="setting-overview-actions no-capture">
          <button
            type="button"
            className="btn-share-setting"
            disabled={shareBusy}
            onClick={onShare}
          >
            <Icon name="copy" size={14} />
            {shareBusy ? '복사 중…' : '세팅 공유'}
          </button>
          <button type="button" onClick={onClose} className="btn-ops" style={{
            padding: '12px', justifyContent: 'center', borderRadius: '12px'
          }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
