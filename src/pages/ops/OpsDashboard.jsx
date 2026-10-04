import { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/icons/Icon';
import { subscribeSiteVisitStats, subscribeVisitDaily } from '../../lib/siteVisitStats';
import {
  buildDailySeries, buildDailySeriesFromMap, daysUntilPurge, formatRelative, toMs,
} from '../../lib/opsInsights';
import { MAX_HUB_MEMBERS } from '../../data/loungeMeta';

const RANGES = [14, 30, 90];
const SERIES = [
  { id: 'visits', label: '방문자', note: '브라우저당 하루 1회 집계' },
  { id: 'joins', label: '길드 가입', note: '현재 남아 있는 길드원의 가입일 기준' },
  { id: 'hubs', label: '허브 개설', note: '현재 남아 있는 허브의 개설일 기준' },
];
const PURGE_WARN_DAYS = 14;

function formatNum(n) {
  return Number(n || 0).toLocaleString('ko-KR');
}

function DailyBarChart({ series }) {
  const peak = Math.max(0, ...series.map((s) => s.count));
  const max = Math.max(2, Math.ceil(peak / 2) * 2);
  const labelEvery = series.length > 45 ? 14 : series.length > 20 ? 5 : 2;
  return (
    <div className="opsx-chart" role="img" aria-label="일별 추이 막대 그래프">
      <div className="opsx-chart-grid" aria-hidden="true">
        <span>{max}</span>
        <span>{max / 2}</span>
        <span>0</span>
      </div>
      <div className="opsx-chart-bars">
        {series.map((s, i) => {
          const isLast = i === series.length - 1;
          const showLabel = isLast || (series.length - 1 - i) % labelEvery === 0;
          return (
            <div key={s.key} className={`opsx-chart-col${isLast ? ' is-today' : ''}`}>
              <div className="opsx-chart-track">
                <div
                  className={`opsx-chart-bar${s.count ? '' : ' is-zero'}`}
                  style={{ height: `${(s.count / max) * 100}%` }}
                />
                <span className="opsx-chart-tip">{s.label} · {s.count}</span>
              </div>
              <span className="opsx-chart-x">{showLabel ? s.label : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OpsDashboard({
  snapshot, loading, error, onReload, onOpenHub,
}) {
  const [visits, setVisits] = useState(null);
  const [visitDaily, setVisitDaily] = useState({});
  const [seriesId, setSeriesId] = useState('visits');
  const [range, setRange] = useState(30);

  useEffect(() => subscribeSiteVisitStats(setVisits, () => setVisits(null)), []);
  useEffect(() => subscribeVisitDaily(setVisitDaily, () => setVisitDaily({})), []);

  const hubs = useMemo(() => snapshot?.hubs || [], [snapshot]);
  const users = useMemo(() => snapshot?.users || [], [snapshot]);

  const stats = useMemo(() => {
    const totalMembers = hubs.reduce((sum, h) => sum + h.memberCount, 0);
    const inHub = users.filter((u) => u.hubId).length;
    return {
      totalMembers,
      inHub,
      inHubRate: users.length ? Math.round((inHub / users.length) * 100) : 0,
      avgMembers: hubs.length ? (totalMembers / hubs.length).toFixed(1) : '0',
      fullHubs: hubs.filter((h) => h.memberCount >= MAX_HUB_MEMBERS).length,
    };
  }, [hubs, users]);

  const series = useMemo(() => {
    if (seriesId === 'visits') {
      const list = buildDailySeriesFromMap(visitDaily, range);
      const today = list[list.length - 1];
      if (today && visits && visits.day === today.key) {
        today.count = Math.max(today.count, Number(visits.dayCount) || 0);
      }
      return list;
    }
    if (!snapshot) return [];
    if (seriesId === 'hubs') {
      return buildDailySeries(hubs.map((h) => h.createdMs), range);
    }
    const joins = [];
    Object.values(snapshot.membersByHub || {}).forEach((list) => {
      list.forEach((m) => joins.push(toMs(m.joinedAt)));
    });
    return buildDailySeries(joins, range);
  }, [snapshot, hubs, seriesId, range, visitDaily, visits]);

  const seriesTotal = series.reduce((sum, s) => sum + s.count, 0);
  const seriesMeta = SERIES.find((s) => s.id === seriesId);
  const unit = seriesId === 'visits' ? '명' : '건';
  const visitFirstDay = Object.keys(visitDaily).sort()[0];
  const seriesNote = seriesId === 'visits'
    ? `${seriesMeta.note} · ${visitFirstDay ? `${visitFirstDay}부터 기록` : '오늘부터 기록 시작'}`
    : seriesMeta?.note;

  const topHubs = useMemo(
    () => [...hubs].sort((a, b) => b.memberCount - a.memberCount || b.activityMs - a.activityMs).slice(0, 5),
    [hubs],
  );

  const purgeSoon = useMemo(() => hubs
    .map((h) => ({ hub: h, left: daysUntilPurge(h) }))
    .filter((x) => x.left != null && x.left <= PURGE_WARN_DAYS)
    .sort((a, b) => a.left - b.left)
    .slice(0, 5), [hubs]);

  const kpis = [
    { label: '오늘 방문자', value: visits ? formatNum(visits.dayCount) : '—', icon: 'globe', tone: 'cyan' },
    { label: '누적 방문자', value: visits ? formatNum(visits.total) : '—', icon: 'chart', tone: 'cyan' },
    { label: '등록 유저', value: formatNum(users.length), icon: 'user', tone: 'gold' },
    { label: '길드 허브', value: formatNum(hubs.length), icon: 'hub', tone: 'gold' },
    { label: '허브 소속 유저', value: `${formatNum(stats.inHub)}`, sub: `${stats.inHubRate}%`, icon: 'hubMembers', tone: 'green' },
    { label: '허브 평균 인원', value: stats.avgMembers, sub: `만석 ${stats.fullHubs}`, icon: 'users', tone: 'green' },
  ];

  return (
    <div className="opsx-stack">
      <div className="luxury-panel opsx-panel">
        <div className="opsx-head">
          <h2 className="opsx-title"><Icon name="chart" size={16} /> 사이트 현황</h2>
          <div className="opsx-head-actions">
            {snapshot && <span className="opsx-muted">불러온 시각 {formatRelative(snapshot.loadedAt)}</span>}
            <button type="button" className="opsx-ghost" onClick={onReload} disabled={loading}>
              {loading ? '불러오는 중…' : '새로고침'}
            </button>
          </div>
        </div>
        {error && <div className="opsx-error">{error}</div>}

        <div className="opsx-kpis">
          {kpis.map((k) => (
            <div key={k.label} className={`opsx-kpi tone-${k.tone}`}>
              <div className="opsx-kpi-label"><Icon name={k.icon} size={13} /> {k.label}</div>
              <div className="opsx-kpi-value">
                {loading && !snapshot && !k.label.includes('방문자') ? '…' : k.value}
                {k.sub && snapshot && <span className="opsx-kpi-sub">{k.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="luxury-panel opsx-panel">
        <div className="opsx-head">
          <div>
            <h3 className="opsx-subtitle">일별 추이</h3>
            <div className="opsx-muted">{seriesNote} · KST</div>
          </div>
          <div className="opsx-head-actions">
            <div className="opsx-seg" role="tablist" aria-label="그래프 종류">
              {SERIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={seriesId === s.id}
                  className={seriesId === s.id ? 'is-on' : ''}
                  onClick={() => setSeriesId(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="opsx-seg" role="tablist" aria-label="기간">
              {RANGES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={range === r}
                  className={range === r ? 'is-on' : ''}
                  onClick={() => setRange(r)}
                >
                  {r}일
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="opsx-chart-summary">
          <span>최근 {range}일 <b>{formatNum(seriesTotal)}</b>{unit}</span>
          <span>하루 평균 <b>{(seriesTotal / range).toFixed(1)}</b>{unit}</span>
          <span>오늘 <b>{formatNum(series[series.length - 1]?.count || 0)}</b>{unit}</span>
        </div>

        {(snapshot || seriesId === 'visits') ? <DailyBarChart series={series} /> : (
          <div className="opsx-empty">{loading ? '데이터를 불러오는 중…' : '데이터가 없습니다.'}</div>
        )}
      </div>

      <div className="opsx-two">
        <div className="luxury-panel opsx-panel">
          <h3 className="opsx-subtitle">인원 많은 허브 TOP 5</h3>
          {!topHubs.length && <div className="opsx-empty">허브가 없습니다.</div>}
          <div className="opsx-rank-list">
            {topHubs.map((h, i) => (
              <button key={h.id} type="button" className="opsx-rank-row" onClick={() => onOpenHub(h.id)}>
                <span className="opsx-rank-no">{i + 1}</span>
                <span className="opsx-rank-name">{h.name || '(이름 없음)'}</span>
                <span className="opsx-fill"><span style={{ width: `${Math.min(100, (h.memberCount / MAX_HUB_MEMBERS) * 100)}%` }} /></span>
                <span className="opsx-rank-val">{h.memberCount}/{MAX_HUB_MEMBERS}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="luxury-panel opsx-panel">
          <h3 className="opsx-subtitle">자동 정리 임박 허브</h3>
          <div className="opsx-muted" style={{ marginBottom: 10 }}>활동 없이 60일이 지나면 자동 삭제돼요 (남은 {PURGE_WARN_DAYS}일 이하)</div>
          {!purgeSoon.length && <div className="opsx-empty">임박한 허브가 없습니다.</div>}
          <div className="opsx-rank-list">
            {purgeSoon.map(({ hub, left }) => (
              <button key={hub.id} type="button" className="opsx-rank-row" onClick={() => onOpenHub(hub.id)}>
                <span className="opsx-badge tone-red">{left <= 0 ? '오늘' : `D-${left}`}</span>
                <span className="opsx-rank-name">{hub.name || '(이름 없음)'}</span>
                <span className="opsx-rank-val">{hub.memberCount}명 · {formatRelative(hub.activityMs)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
