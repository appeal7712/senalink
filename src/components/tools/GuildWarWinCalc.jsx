import { useMemo, useState } from 'react';
import {
  DEFAULT_REMAINING,
  TOTAL_ATTACKS,
  ZONE_KEYS,
  ZONE_RULES,
  clampInt,
  evaluateGuildWar,
  formulaText,
} from '../../data/guildWarCalc';

const fmt = (n) => Number(n).toLocaleString('ko-KR');
const signed = (n) => `${n >= 0 ? '+' : ''}${fmt(n)}점`;
const OUR_COLOR = '#22c55e';
const ENEMY_COLOR = '#ff4d5e';

function ZoneRow({ zone, value, onChange, accent }) {
  const rule = ZONE_RULES[zone];
  return (
    <div className={`gwcalc-zone gwcalc-zone--${zone}`}>
      <div className="gwcalc-zone-head">
        <div>
          <p className="gwcalc-zone-name">{rule.name}</p>
          <p className="gwcalc-zone-meta">1개당 {rule.point}점</p>
        </div>
        <span className="gwcalc-pill">{value} / {rule.total}개</span>
      </div>
      <input
        type="range"
        min={0}
        max={rule.total}
        value={value}
        onChange={(e) => onChange(clampInt(e.target.value, 0, rule.total))}
        style={{ accentColor: accent }}
      />
      <input
        type="number"
        min={0}
        max={rule.total}
        value={value}
        onChange={(e) => onChange(clampInt(e.target.value, 0, rule.total))}
      />
    </div>
  );
}

export default function GuildWarWinCalc() {
  const [ourScore, setOurScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);
  const [ourAttacks, setOurAttacks] = useState(0);
  const [enemyAttacks, setEnemyAttacks] = useState(0);
  const [ourRemaining, setOurRemaining] = useState({ ...DEFAULT_REMAINING });
  const [enemyRemaining, setEnemyRemaining] = useState({ ...DEFAULT_REMAINING });

  const result = useMemo(
    () => evaluateGuildWar({
      ourScore, enemyScore, ourAttacks, enemyAttacks, ourRemaining, enemyRemaining,
    }),
    [ourScore, enemyScore, ourAttacks, enemyAttacks, ourRemaining, enemyRemaining],
  );

  const reset = () => {
    setOurScore(0);
    setEnemyScore(0);
    setOurAttacks(0);
    setEnemyAttacks(0);
    setOurRemaining({ ...DEFAULT_REMAINING });
    setEnemyRemaining({ ...DEFAULT_REMAINING });
  };

  const setRemain = (side, key, value) => {
    const setter = side === 'our' ? setOurRemaining : setEnemyRemaining;
    setter((prev) => ({ ...prev, [key]: clampInt(value, 0, ZONE_RULES[key].total) }));
  };

  return (
    <div className="gwcalc">
      <div className="luxury-panel gwcalc-hero">
        <div>
          <div className="gwcalc-eyebrow">길드전 계산기</div>
          <h1>승리확정 판정기</h1>
          <p>
            양쪽 남은 공격권과 남은 성 개수를 넣으면, 현재 확정인지 / 남은 공격으로 확정 가능한지 계산합니다.
          </p>
        </div>
        <button type="button" className="btn-steel gwcalc-reset" onClick={reset}>초기화</button>
      </div>

      <div className="gwcalc-stats">
        <div className="luxury-panel gwcalc-stat">
          <p>현재 점수차</p>
          <strong style={{ color: result.currentGap >= 0 ? OUR_COLOR : ENEMY_COLOR }}>{signed(result.currentGap)}</strong>
          <span>우리 점수 - 상대 점수</span>
        </div>
        <div className="luxury-panel gwcalc-stat">
          <p>우리 최대 추가점수</p>
          <strong style={{ color: OUR_COLOR }}>{fmt(result.ourGain.total)}점</strong>
          <span>우리 남은 공격 기준</span>
        </div>
        <div className="luxury-panel gwcalc-stat">
          <p>상대 최대 추가점수</p>
          <strong style={{ color: ENEMY_COLOR }}>{fmt(result.enemyGain.total)}점</strong>
          <span>상대 남은 공격 기준</span>
        </div>
        <div className="luxury-panel gwcalc-stat">
          <p>최대 최종 점수차</p>
          <strong style={{
            color: result.maxFinalGap > 0 ? OUR_COLOR : result.maxFinalGap < 0 ? ENEMY_COLOR : '#fb923c',
          }}>{signed(result.maxFinalGap)}</strong>
          <span>우리 최대 최종 - 상대 최대 최종</span>
        </div>
      </div>

      <div className="gwcalc-grid">
        <div className="luxury-panel gwcalc-panel">
          <h2>입력</h2>
          <p className="gwcalc-hint">우리 쪽과 상대 쪽을 각각 입력하면 됩니다.</p>

          <div className="gwcalc-two">
            <label className="gwcalc-box gwcalc-our">
              <span>우리 현재 점수</span>
              <input type="number" min={0} value={ourScore} onChange={(e) => setOurScore(clampInt(e.target.value, 0, 999999))} />
            </label>
            <label className="gwcalc-box gwcalc-enemy">
              <span>상대 현재 점수</span>
              <input type="number" min={0} value={enemyScore} onChange={(e) => setEnemyScore(clampInt(e.target.value, 0, 999999))} />
            </label>
          </div>

          <label className="gwcalc-box gwcalc-plain gwcalc-our" style={{ marginTop: 12 }}>
            <div className="gwcalc-row">
              <span>우리 남은 공격권</span>
              <span className="gwcalc-pill">{ourAttacks}회</span>
            </div>
            <input type="range" min={0} max={TOTAL_ATTACKS} value={ourAttacks}
              onChange={(e) => setOurAttacks(clampInt(e.target.value, 0, TOTAL_ATTACKS))}
              style={{ accentColor: OUR_COLOR }} />
            <input type="number" min={0} max={TOTAL_ATTACKS} value={ourAttacks}
              onChange={(e) => setOurAttacks(clampInt(e.target.value, 0, TOTAL_ATTACKS))} />
          </label>

          <label className="gwcalc-box gwcalc-plain gwcalc-enemy" style={{ marginTop: 12 }}>
            <div className="gwcalc-row">
              <span>상대 남은 공격권</span>
              <span className="gwcalc-pill">{enemyAttacks}회</span>
            </div>
            <input type="range" min={0} max={TOTAL_ATTACKS} value={enemyAttacks}
              onChange={(e) => setEnemyAttacks(clampInt(e.target.value, 0, TOTAL_ATTACKS))}
              style={{ accentColor: ENEMY_COLOR }} />
            <input type="number" min={0} max={TOTAL_ATTACKS} value={enemyAttacks}
              onChange={(e) => setEnemyAttacks(clampInt(e.target.value, 0, TOTAL_ATTACKS))} />
          </label>

          <div className="gwcalc-targets">
            <div className="gwcalc-target gwcalc-our">
              <div className="gwcalc-row">
                <div>
                  <h3>우리가 아직 먹을 수 있는 개수</h3>
                  <p className="gwcalc-hint">상대 성에 남아있는 개수</p>
                </div>
                <button type="button" className="gwcalc-mini" onClick={() => setOurRemaining({ ...DEFAULT_REMAINING })}>최대치로</button>
              </div>
              {ZONE_KEYS.map((key) => (
                <ZoneRow key={key} zone={key} value={ourRemaining[key]} accent={OUR_COLOR}
                  onChange={(v) => setRemain('our', key, v)} />
              ))}
            </div>
            <div className="gwcalc-target gwcalc-enemy">
              <div className="gwcalc-row">
                <div>
                  <h3>상대가 아직 먹을 수 있는 개수</h3>
                  <p className="gwcalc-hint">우리 성에 남아있는 개수</p>
                </div>
                <button type="button" className="gwcalc-mini" onClick={() => setEnemyRemaining({ ...DEFAULT_REMAINING })}>최대치로</button>
              </div>
              {ZONE_KEYS.map((key) => (
                <ZoneRow key={key} zone={key} value={enemyRemaining[key]} accent={ENEMY_COLOR}
                  onChange={(v) => setRemain('enemy', key, v)} />
              ))}
            </div>
          </div>
        </div>

        <div className="gwcalc-side">
          <div className={`luxury-panel gwcalc-result gwcalc-result--${result.verdict}`}>
            <div className="gwcalc-hint">판정 결과</div>
            <div className="gwcalc-result-title">{result.title}</div>
            <p className="gwcalc-result-desc">{result.desc}</p>
          </div>

          <div className="luxury-panel gwcalc-panel">
            <h3>핵심 계산</h3>
            <div className="gwcalc-calcgrid">
              <div className="gwcalc-calccard gwcalc-our">
                <p>우리 최대 최종점수</p>
                <strong>{fmt(result.ourMaxFinal)}점</strong>
              </div>
              <div className="gwcalc-calccard gwcalc-enemy">
                <p>상대 최대 최종점수</p>
                <strong>{fmt(result.enemyMaxFinal)}점</strong>
              </div>
              <div className="gwcalc-calccard">
                <p>현재 확정 필요 점수</p>
                <strong>{fmt(result.currentNeedForLock)}점</strong>
              </div>
              <div className="gwcalc-calccard">
                <p>최대 최종 점수차</p>
                <strong style={{
                  color: result.maxFinalGap > 0 ? OUR_COLOR : result.maxFinalGap < 0 ? ENEMY_COLOR : '#fb923c',
                }}>{signed(result.maxFinalGap)}</strong>
              </div>
            </div>
            <div className="gwcalc-summary">
              <p>우리 최대 추가점수 계산</p>
              <strong>{formulaText(result.ourGain)}</strong>
              {result.ourGain.unusedAttacks > 0 && (
                <span>우리 남은 공격권 {result.ourGain.unusedAttacks}회는 추가 점수로 계산되지 않았습니다.</span>
              )}
            </div>
            <div className="gwcalc-summary">
              <p>상대 최대 추가점수 계산</p>
              <strong>{formulaText(result.enemyGain)}</strong>
              {result.enemyGain.unusedAttacks > 0 && (
                <span>상대 남은 공격권 {result.enemyGain.unusedAttacks}회는 추가 점수로 계산되지 않았습니다.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
