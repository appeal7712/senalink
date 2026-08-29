# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

path = r'D:\안티그래비티 프로젝트 폴더\sevennight_guild_web\src\components\GuildLounge.jsx'
with open(path, 'r', encoding='utf-8') as f:
    txt = f.read()

target = "      {/* ── 8. 덱 생성/수정 대시보드 모달 (덱 무대 영웅 클릭시 장비 수정 탭 100% 양방향 매칭) ── */}"
idx = txt.find(target)

if idx != -1:
    modal_code = '''      {/* ── 8. 덱 생성/수정 대시보드 모달 (isEditMode 전달 + 영웅 서랍 168px 하단 공백 100% 제거) ── */}
      {editingBuild && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3500, padding: '16px' }}>
          <div className="luxury-panel" style={{ width: '92vw', maxWidth: '1400px', maxHeight: '84vh', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '18px', border: '2px solid var(--border-gold)', boxShadow: 'var(--shadow-main)' }}>
            
            {/* 1. 모달 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid var(--border-gold)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--gold-primary)', whiteSpace: 'nowrap', margin: 0 }}>
                  {isNewCreateMode ? '➕ 신규 공략 생성' : '✏️ 공략 덱 & 영웅 장비 세팅 수정'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '540px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--gold-primary)', fontWeight: 900, whiteSpace: 'nowrap' }}>제목:</span>
                  <input type="text" value={buildTitle} onChange={e => setBuildTitle(e.target.value)} placeholder="예: 월요일 마법 공성 (루디) - 600만 극딜 전술" style={{ width: '100%', padding: '6px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 800, boxSizing: 'border-box' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  작성 권한: <strong style={{ color: 'var(--accent-cyan)' }}>{guildRoom.masterNickname} (마스터)</strong>
                </span>
                <button onClick={() => setEditingBuild(null)}
                  style={{
                    background: 'rgba(239,68,68,0.2)', border: '1px solid var(--accent-red)', color: '#fff',
                    width: '30px', height: '30px', borderRadius: '50%', fontSize: '15px', fontWeight 900,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }} title="모달 닫기">✕</button>
              </div>
            </div>

            {/* 2. 바디 2열 대시보드 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start', boxSizing: 'border-box' }}>
              
              {/* ─── 좌측: (덱 무대 & 장비 세팅 패널 세로 높이 동기화) + (하단 공백 꽉 채운 영웅 서랍) ─── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* 덱 무대 + 영웅별 6슬롯 장비 선택 폼 가로 배치 */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch' }}>
                  <InGameDeckCard
                    teamName="덱 무대"
                    formationId={editingBuild.formationId || 'protect'}
                    heroList={editingHeroNames.map((name, idx) => {
                      const baseHero = heroes.find(x => x.name.includes(name) || name.includes(x.name.replace('(각성)', '')));
                      return baseHero ? { hero: baseHero, gearConfig: heroGearConfigs[idx] } : name;
                    })}
                    onSlotClick={(slotIdx) => {
                      setTargetSlotIdx(slotIdx);
                      setSelectedHeroGearIdx(slotIdx);
                    }}
                    selectedSlotIdx={targetSlotIdx}
                    isSelected={true}
                    isEditMode={true}
                  />
                  
                  {/* ⚔️ 배치된 영웅 실전 장비 선택기 */}
                  <div style={{ flex: 1, background: 'rgba(7,9,14,0.95)', border: '1.5px solid var(--border-gold)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--gold-primary)' }}>
                        ⚔️ 영웅 6슬롯 실전 장비 세팅
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', fontWeight: 800 }}>덱 무대 영웅 직접 클릭 가능!</span>
                    </div>

                    {/* 영웅 선택 탭 */}
                    <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                      {editingHeroNames.filter(Boolean).map((hName, idx) => (
                        <button key={idx} onClick={() => {
                          setSelectedHeroGearIdx(idx);
                          setTargetSlotIdx(idx);
                        }}
                          style={{
                            padding: '4px 8px', fontSize: '11px', fontWeight: 900, borderRadius: '5px', border: 'none', cursor: 'pointer',
                            background: selectedHeroGearIdx === idx ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)',
                            color: selectedHeroGearIdx === idx ? '#000' : '#cbd5e1', whiteSpace: 'nowrap'
                          }}>
                          {hName}
                        </button>
                      ))}
                    </div>

                    {/* 세트 종류 선택 */}
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', marginBottom: '3px', fontWeight: 800 }}>1. 장비 세트 선택</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
                        {['선봉장', '추적자', '성기사', '수문장', '수호자', '암살자', '복수자', '주술사', '조율자'].map(setName => {
                          const isCur = (heroGearConfigs[selectedHeroGearIdx]?.setName || '복수자') === setName;
                          return (
                            <button key={setName} onClick={() => handleUpdateSelectedHeroGear('setName', setName)}
                              style={{
                                padding: '4px 6px', fontSize: '10px', fontWeight: 800, borderRadius: '4px', border: 'none', cursor: 'pointer',
                                background: isCur ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
                                color: isCur ? '#000' : '#cbd5e1',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px'
                              }}>
                              <img src={EQUIPMENT_SET_ICONS[setName]} alt="" style={{ width: '12px', height: '12px' }} />
                              <span>{setName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 1행: [무기 1] : [방어구 1] */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', fontWeight: 800 }}>⚔️ 무기 1</div>
                        <select value={heroGearConfigs[selectedHeroGearIdx]?.weapon1 || '치명타 확률'} onChange={e => handleUpdateSelectedHeroGear('weapon1', e.target.value)} style={{ width: '100%', padding: '6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                          <option value="약점 공격 확률">약점 공격 확률</option>
                          <option value="치명타 확률">치명타 확률</option>
                          <option value="치명타 피해">치명타 피해</option>
                          <option value="모든 공격력(%)">모든 공격력(%)</option>
                          <option value="효과 적중">효과 적중</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', fontWeight: 800 }}>🛡️ 방어구 1</div>
                        <select value={heroGearConfigs[selectedHeroGearIdx]?.armor1 || '모든 공격력(%)'} onChange={e => handleUpdateSelectedHeroGear('armor1', e.target.value)} style={{ width: '100%', padding: '6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                          <option value="받는 피해 감소">받는 피해 감소</option>
                          <option value="막기 확률">막기 확률</option>
                          <option value="모든 공격력(%)">모든 공격력(%)</option>
                          <option value="방어력(%)">방어력(%)</option>
                          <option value="생명력(%)">생명력(%)</option>
                          <option value="효과 저항">효과 저항</option>
                        </select>
                      </div>
                    </div>

                    {/* 2행: [무기 2] : [방어구 2] */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', fontWeight: 800 }}>⚔️ 무기 2</div>
                        <select value={heroGearConfigs[selectedHeroGearIdx]?.weapon2 || '치명타 확률'} onChange={e => handleUpdateSelectedHeroGear('weapon2', e.target.value)} style={{ width: '100%', padding: '6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                          <option value="약점 공격 확률">약점 공격 확률</option>
                          <option value="치명타 확률">치명타 확률</option>
                          <option value="치명타 피해">치명타 피해</option>
                          <option value="모든 공격력(%)">모든 공격력(%)</option>
                          <option value="효과 적중">효과 적중</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', fontWeight: 800 }}>🛡️ 방어구 2</div>
                        <select value={heroGearConfigs[selectedHeroGearIdx]?.armor2 || '모든 공격력(%)'} onChange={e => handleUpdateSelectedHeroGear('armor2', e.target.value)} style={{ width: '100%', padding: '6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                          <option value="받는 피해 감소">받는 피해 감소</option>
                          <option value="막기 확률">막기 확률</option>
                          <option value="모든 공격력(%)">모든 공격력(%)</option>
                          <option value="방어력(%)">방어력(%)</option>
                          <option value="생명력(%)">생명력(%)</option>
                          <option value="효과 저항">효과 저항</option>
                        </select>
                      </div>
                    </div>

                    {/* 3행: [장신구] */}
                    <div>
                      <div style={{ fontSize: '10px', color: '#c084fc', marginBottom: '2px', fontWeight: 800 }}>💍 장신구 선택</div>
                      <select value={heroGearConfigs[selectedHeroGearIdx]?.accessory || '불사의 반지'} onChange={e => handleUpdateSelectedHeroGear('accessory', e.target.value)} style={{ width: '100%', padding: '6px', background: '#07090e', border: '1px solid #c084fc', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                        <option value="불사의 반지">불사의 반지 (부활)</option>
                        <option value="권능의 반지">권능의 반지 (보호막)</option>
                        <option value="승리의 반지">승리의 반지 (피해량/속공)</option>
                        <option value="용기의 반지">용기의 반지 (공격력/치확)</option>
                        <option value="수호의 반지">수호의 반지 (방어력/막기)</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* 🦸 살짝 더 늘려 하단 공백을 100% 완전히 지운 영웅 선택 서랍 (168px) */}
                <div style={{ background: 'rgba(7,9,14,0.95)', border: '1px solid var(--border-gold)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff' }}>
                      🦸 영웅 선택 서랍 <span style={{ color: 'var(--accent-cyan)', fontSize: '10px' }}>(슬롯 {targetSlotIdx + 1} 번)</span>
                    </div>

                    {/* 필터 버튼 */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      {[
                        { id: 'all',       label: '전체', icon: null },
                        { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
                        { id: 'magic',     label: '마법형', icon: ROLE_ICONS.magic },
                        { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
                        { id: 'support',   label: '지원형', icon: ROLE_ICONS.support },
                        { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
                      ].map(r => (
                        <button key={r.id} onClick={() => setRoleFilter(r.id)}
                          style={{
                            padding: '3px 6px', fontSize: '10px', fontWeight: 800, borderRadius: '4px', border: 'none', cursor: 'pointer',
                            background: roleFilter === r.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
                            color: roleFilter === r.id ? '#000' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px'
                          }}>
                          {r.icon && <img src={r.icon} alt="" style={{ width: '10px', height: '10px' }} />}
                          <span>{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 영웅 그리드 (세로 높이 168px로 살짝 확장하여 공백 제로 마감) */}
                  <div style={{ height: '168px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', gap: '6px', overflowY: 'auto', paddingRight: '4px' }}>
                    {filteredHeroesByRole.map(h => (
                      <div key={h.id} onClick={() => handleSelectHeroFromBottom(h)}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
                        <div style={{ position: 'relative', width: '54px', height: '60px', background: CARD_BG[h.cardTier || 'normal'], borderRadius: '7px', border: editingHeroNames.includes(h.name.replace('(각성)', '')) ? '2px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                          {h.portraitUrl ? <img src={h.portraitUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                        </div>
                        <div style={{ width: '54px', marginTop: '2px', background: '#000', borderRadius: '3px', padding: '1px 0', textAlign: 'center', fontSize: '8px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.name.replace('(각성)', '')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ─── 우측: 스킬 순서 편집기 ─── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--gold-primary)', margin: 0 }}>
                  ⏱️ 스킬 순서 편집기 (최대 70라운드)
                </h4>

                {/* 현재 등록된 스킬 시전 순서 */}
                <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '10px 12px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px' }}>
                    📋 현재 등록된 스킬 순서 ({editingSkillTimeline.length}개 / 마우스 휠 스크롤)
                  </div>
                  
                  {editingSkillTimeline.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', padding: '16px 0' }}>아직 등록된 스킬 순서가 없습니다. 아래에서 추가해 주세요.</div>
                  )}

                  <div style={{ height: '140px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
                    {editingSkillTimeline.map((step, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '5px',
                        borderLeft: '3px solid var(--gold-primary)', flexShrink: 0
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                          <span style={{
                            background: 'var(--gold-primary)', color: '#000', padding: '1px 6px',
                            borderRadius: '3px', fontWeight: 900, fontSize: '10px', minWidth: '28px', textAlign: 'center'
                          }}>{step.round}</span>
                          <strong style={{ color: '#fff' }}>{step.heroName} ({step.dir === 'upper' ? '위' : '아래'})</strong>
                          {step.text && <span style={{ color: '#cbd5e1', fontSize: '10px' }}>- {step.text}</span>}
                        </div>
                        <button onClick={() => handleRemoveSkillStep(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 스킬 추가 입력 폼 */}
                <div style={{ background: 'rgba(0,0,0,0.65)', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid var(--border-gold)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--gold-primary)' }}>+ 스킬 시전 순서 추가</div>
                  
                  {/* 라운드 선택 버튼 */}
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px', fontWeight: 800 }}>라운드 선택 (1~70라운드)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '2px' }}>
                      {Array.from({ length: 70 }, (_, i) => {
                        const r = `${i + 1}라`;
                        const isSelected = turnNumberInput === r;
                        return (
                          <button key={r} onClick={() => setTurnNumberInput(r)}
                            style={{
                              padding: '3px 0', fontSize: '9px', fontWeight: 800, borderRadius: '3px', border: isSelected ? '1px solid var(--gold-light)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                              background: isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
                              color: isSelected ? '#000' : '#cbd5e1',
                              textAlign: 'center', transition: 'all 0.15s ease'
                            }}>{i + 1}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 영웅 + 방향 선택 */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px', fontWeight: 800 }}>영웅</div>
                      <select value={newSkillHero} onChange={e => setNewSkillHero(e.target.value)} style={{ width: '100%', padding: '5px 6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', fontWeight: 800 }}>
                        {editingHeroNames.filter(Boolean).map((hN, i) => (
                          <option key={i} value={hN}>{hN}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px', fontWeight: 800 }}>스킬 방향</div>
                      <select value={newSkillDir} onChange={e => setNewSkillDir(e.target.value)} style={{ width: '100%', padding: '5px 6px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                        <option value="upper">위 스킬</option>
                        <option value="down">아래 스킬</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '1px', fontWeight: 800 }}>메모 (선택)</div>
                    <input type="text" placeholder="예: 여기서 도트가 걸려있어야함" value={newSkillText} onChange={e => setNewSkillText(e.target.value)} style={{ width: '100%', padding: '5px 8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '11px', boxSizing: 'border-box' }} />
                  </div>

                  <button onClick={handleAddSkillStep} style={{
                    padding: '8px', background: 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))',
                    color: '#000', border: 'none', borderRadius: '5px',
                    fontWeight: 900, cursor: 'pointer', fontSize: '12px', boxShadow: '0 4px 10px rgba(212,175,55,0.3)'
                  }}>
                    + 타임라인 단계 추가
                  </button>
                </div>

              </div>

            </div>

            {/* 3. 하단 푸터 저장 버튼 */}
            <div style={{ padding: '12px 24px', background: 'rgba(0,0,0,0.6)', borderTop: '1px solid var(--border-gold)', flexShrink: 0 }}>
              <button onClick={handleSaveEditedBuild} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))', color: '#000', fontWeight 900, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px rgba(212,175,55,0.4)' }}>
                💾 공략 저장 및 게시판 고정
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 방 생성 모달 */}
      {isRoomModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div className="luxury-panel" style={{ width: '440px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--gold-primary)' }}>🔑 길드 방 생성 & 가입</h3>
            <div>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>내 고유 인게임 닉네임</label>
              <input type="text" value={guildRoom.myNickname} onChange={e => setGuildRoom({ ...guildRoom, myNickname: e.target.value })} style={{ width: '100%', padding: '10px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '8px', marginTop: '4px' }} />
            </div>
            <button onClick={() => setIsRoomModalOpen(false)} style={{ padding: '10px', background: 'var(--gold-primary)', color: '#000', fontWeight 900, border: 'none', borderRadius: '8px', cursor: 'pointer' }}>확인</button>
          </div>
        </div>
      )}

    </div>
  );
}
'''
    txt = txt[:idx] + modal_code
    with open(path, 'w', encoding='utf-8') as f:
        f.write(txt)
    print("SUCCESSFUL SPEED ORDER VIEW-ONLY ENFORCEMENT & HERO DRAWER FIT!")
