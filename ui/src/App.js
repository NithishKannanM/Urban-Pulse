import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import './App.css';

/* ── Register Chart.js ── */
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

/* ── Constants (mirrors config/constants.py) ── */
const ELECTRICITY_PRICE = 6;
const CARBON_INTENSITY = 0.7;
const CARBON_PRICE = 3;
const INTERVENTION_COST = 50;
const TIME_WINDOW_HOURS = 0.25;

const REGIME_MAP = {
  0: 'Stable',
  1: 'Accelerating',
  2: 'Volatile',
  3: 'Unstable',
  4: 'Critical',
};

const REGIME_CHART_LABELS = {
  0: 'Stable',
  1: 'Watch',
  2: 'Alert',
  3: 'Emergency',
  4: 'Critical',
};

const ACTION_COLORS = {
  MONITOR: '#64748B',
  PREPARE: '#F59E0B',
  INTERVENE: '#DC2626',
};

const CONTEXTS = ['Campus', 'Data Center', 'Industrial Facility'];

const FALLBACK_OPS = {
  MONITOR: [
    'Trend monitoring active',
    'Efficiency tracking enabled',
    'No operational change required',
  ],
  PREPARE: [
    'Load rebalancing initiated',
    'Demand response readiness confirmed',
    'Backup system pre-check active',
    'Thermal inspection flagged',
  ],
  INTERVENE: [
    'Load shedding initiated',
    'Generator activation sequence',
    'Transformer protection engaged',
    'Emergency escalation active',
  ],
};

/* ── SVG Icons ── */
function CheckIcon({ size = 10, color = '#0F172A' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path
        d="M2 5.5L4 7.5L8 3"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Formatters ── */
function fmt(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toFixed(decimals);
}

function fmtCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return Number(val).toFixed(2);
}

function fmtTime(ts) {
  if (!ts) return '--';
  // Extract HH:MM:SS from timestamp string
  const parts = String(ts).split(' ');
  return parts.length > 1 ? parts[1] : ts;
}

/* ── Client-side cost model ── */
function computeCostModel(riskScore, predictionError) {
  const deltaP = Math.abs(predictionError);
  const energyImbalance = deltaP * TIME_WINDOW_HOURS;
  const energyCost = energyImbalance * ELECTRICITY_PRICE;
  const carbonEmission = energyImbalance * CARBON_INTENSITY;
  const carbonCost = carbonEmission * CARBON_PRICE;
  const totalLoss = energyCost + carbonCost;
  const expectedWaitLoss = riskScore * totalLoss;
  const netRiskDiff = expectedWaitLoss - INTERVENTION_COST;

  return {
    energyImbalance,
    carbonEmission,
    energyCost,
    carbonCost,
    totalLoss,
    expectedWaitLoss,
    interventionCost: INTERVENTION_COST,
    netRiskDiff,
  };
}

/* ── Chart.js shared config ── */
const CHART_GRID_COLOR = 'rgba(51, 65, 85, 0.4)';
const CHART_TICK_COLOR = '#94A3B8';
const CHART_FONT = { family: "'JetBrains Mono', monospace", size: 10 };

/* ════════════════════════════════════════════════
   APP COMPONENT
   ════════════════════════════════════════════════ */
function App() {
  const [context, setContext] = useState(0);
  const [decision, setDecision] = useState(null);
  const [rawLog, setRawLog] = useState(null);
  const [connected, setConnected] = useState(false);
  const [checkedOps, setCheckedOps] = useState({});

  /* ── New: Multi-document state ── */
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [recentRawLogs, setRecentRawLogs] = useState([]);

  /* ── Firestore Listeners ── */
  useEffect(() => {
    const decisionRef = collection(db, 'urbanpulse_decisions');

    // Latest decision (limit 1)
    const latestDecisionQ = query(decisionRef, orderBy('timestamp', 'desc'), limit(1));
    const unsubLatest = onSnapshot(
      latestDecisionQ,
      (snapshot) => {
        if (!snapshot.empty) {
          setDecision(snapshot.docs[0].data());
          setConnected(true);
          setCheckedOps({});
        }
      },
      (err) => {
        console.error('[UrbanPulse] Decision listener error:', err);
        setConnected(false);
      }
    );

    // Recent 30 decisions (for charts + history table)
    const recentDecisionQ = query(decisionRef, orderBy('timestamp', 'desc'), limit(30));
    const unsubRecent = onSnapshot(
      recentDecisionQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => d.data()).reverse(); // chronological
        setRecentDecisions(docs);
      },
      (err) => console.error('[UrbanPulse] Recent decisions error:', err)
    );

    // Raw logs
    const rawRef = collection(db, 'urbanpulse_raw_logs');

    // Latest raw log (limit 1)
    const latestRawQ = query(rawRef, orderBy('timestamp', 'desc'), limit(1));
    const unsubRaw = onSnapshot(
      latestRawQ,
      (snapshot) => {
        if (!snapshot.empty) setRawLog(snapshot.docs[0].data());
      },
      (err) => console.error('[UrbanPulse] Raw log error:', err)
    );

    // Recent 5 raw logs (for telemetry stream table)
    const recentRawQ = query(rawRef, orderBy('timestamp', 'desc'), limit(5));
    const unsubRecentRaw = onSnapshot(
      recentRawQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => d.data());
        setRecentRawLogs(docs);
      },
      (err) => console.error('[UrbanPulse] Recent raw logs error:', err)
    );

    return () => {
      unsubLatest();
      unsubRecent();
      unsubRaw();
      unsubRecentRaw();
    };
  }, []);

  /* ── Extract current decision data ── */
  const action = decision?.decision?.action || 'MONITOR';
  const priority = decision?.decision?.priority || 'P3';
  const confidence = decision?.decision?.confidence ?? decision?.risk_score ?? 0;
  const riskScore = decision?.risk_score ?? 0;
  const regimeLevel = decision?.regime ?? 0;
  const predictionError = decision?.signals?.prediction_error ?? 0;
  const mitigation = decision?.mitigation;
  const timestamp = decision?.timestamp;

  const cost = computeCostModel(riskScore, predictionError);

  const operations = mitigation?.operations || FALLBACK_OPS[action] || FALLBACK_OPS.MONITOR;
  const opsLevel = mitigation?.level || (
    action === 'INTERVENE' ? 'Active Mitigation' :
      action === 'PREPARE' ? 'Preventive Stabilization' : 'Observation'
  );

  const toggleOp = (index) => {
    setCheckedOps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const riskClass = riskScore >= 0.7 ? 'risk-high' : riskScore >= 0.3 ? 'risk-mid' : 'risk-low';

  const projectedEnergySaved = cost.energyImbalance;
  const projectedCarbonReduced = cost.carbonEmission;
  const projectedCostAvoided = cost.expectedWaitLoss > cost.interventionCost
    ? cost.expectedWaitLoss - cost.interventionCost
    : 0;

  /* ══════════════════════════════════════════
     CHART DATA — Risk Over Time
     ══════════════════════════════════════════ */
  const riskChartData = {
    labels: recentDecisions.map((d) => fmtTime(d.timestamp)),
    datasets: [
      {
        label: 'Risk Score',
        data: recentDecisions.map((d) => d.risk_score ?? 0),
        borderColor: '#E2E8F0',
        backgroundColor: 'rgba(226, 232, 240, 0.05)',
        borderWidth: 1.5,
        pointRadius: recentDecisions.map((d) => 4),
        pointBackgroundColor: recentDecisions.map((d) => {
          const act = d.decision?.action || 'MONITOR';
          return ACTION_COLORS[act] || '#64748B';
        }),
        pointBorderColor: 'transparent',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const riskChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        titleFont: CHART_FONT,
        bodyFont: CHART_FONT,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const d = recentDecisions[ctx.dataIndex];
            const act = d?.decision?.action || '--';
            const rs = d?.risk_score ?? 0;
            const pe = d?.signals?.prediction_error ?? 0;
            const ewl = computeCostModel(rs, pe).expectedWaitLoss;
            return [
              `Risk: ${rs.toFixed(4)}`,
              `Action: ${act}`,
              `Wait Loss: ₹${ewl.toFixed(2)}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: CHART_GRID_COLOR, drawBorder: false },
        ticks: { color: CHART_TICK_COLOR, font: CHART_FONT, maxRotation: 45 },
      },
      y: {
        min: 0,
        max: 1,
        grid: { color: CHART_GRID_COLOR, drawBorder: false },
        ticks: { color: CHART_TICK_COLOR, font: CHART_FONT, stepSize: 0.2 },
      },
    },
  };

  // Threshold line plugin for risk chart
  const riskThresholdPlugin = {
    id: 'riskThresholds',
    afterDatasetsDraw: (chart) => {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea) return;
      const { left, right } = chartArea;

      // Prepare threshold (0.5)
      const y05 = scales.y.getPixelForValue(0.5);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, y05);
      ctx.lineTo(right, y05);
      ctx.stroke();

      // Intervene threshold (0.8)
      const y08 = scales.y.getPixelForValue(0.8);
      ctx.strokeStyle = '#DC2626';
      ctx.beginPath();
      ctx.moveTo(left, y08);
      ctx.lineTo(right, y08);
      ctx.stroke();

      ctx.restore();
    },
  };

  /* ══════════════════════════════════════════
     CHART DATA — Regime Transition
     ══════════════════════════════════════════ */
  const regimeColors = ['#16A34A', '#22C55E', '#F59E0B', '#F97316', '#DC2626'];

  const regimeChartData = {
    labels: recentDecisions.map((d) => fmtTime(d.timestamp)),
    datasets: [
      {
        label: 'Regime Level',
        data: recentDecisions.map((d) => d.regime ?? 0),
        borderColor: (ctx) => {
          const index = ctx.dataIndex ?? 0;
          const val = recentDecisions[index]?.regime ?? 0;
          return regimeColors[val] || '#64748B';
        },
        segment: {
          borderColor: (ctx) => {
            const val = recentDecisions[ctx.p1DataIndex]?.regime ?? 0;
            return regimeColors[val] || '#64748B';
          },
        },
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: recentDecisions.map((d) => {
          const r = d.regime ?? 0;
          return regimeColors[r] || '#64748B';
        }),
        pointBorderColor: 'transparent',
        stepped: 'before',
        fill: false,
      },
    ],
  };

  const regimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      tooltip: {
        backgroundColor: '#1E293B',
        borderColor: '#334155',
        borderWidth: 1,
        titleFont: CHART_FONT,
        bodyFont: CHART_FONT,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            return `Regime: ${val} — ${REGIME_CHART_LABELS[val] || 'Unknown'}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: CHART_GRID_COLOR, drawBorder: false },
        ticks: { color: CHART_TICK_COLOR, font: CHART_FONT, maxRotation: 45 },
      },
      y: {
        min: 0,
        max: 4,
        grid: { color: CHART_GRID_COLOR, drawBorder: false },
        ticks: {
          color: CHART_TICK_COLOR,
          font: CHART_FONT,
          stepSize: 1,
          callback: (val) => REGIME_CHART_LABELS[val] || val,
        },
      },
    },
  };

  /* ══════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════ */
  return (
    <div className="console-root">
      {/* ══ HEADER ══ */}
      <header className="console-header">
        <div className="header-left">
          <h1 className="console-title">Urban Pulse</h1>
          <span className="console-subtitle">Infrastructure Decision Console</span>
        </div>
        <div className="header-right">
          <div className="context-selector">
            {CONTEXTS.map((ctx, i) => (
              <button
                key={ctx}
                className={`context-btn${context === i ? ' active' : ''}`}
                onClick={() => setContext(i)}
              >
                {ctx}
              </button>
            ))}
          </div>
          <div className="system-status">
            <span className={`status-dot${connected ? '' : ' offline'}`} />
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </header>

      {/* ══ MAIN GRID ══ */}
      <div className="console-grid">

        {/* ━━ 1) ACTION CONSOLE ━━ */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Action Console</span>
            {regimeLevel !== undefined && regimeLevel !== null && (
              <div className="regime-indicator">
                <div className="regime-bar">
                  {[0, 1, 2, 3, 4].map((seg) => (
                    <div
                      key={seg}
                      className={`regime-segment${seg <= regimeLevel ? ` filled-${seg}` : ''}`}
                    />
                  ))}
                </div>
                <span className="regime-label">
                  {REGIME_MAP[regimeLevel] || 'Unknown'}
                </span>
              </div>
            )}
          </div>

          <div className="action-console">
            {['MONITOR', 'PREPARE', 'INTERVENE'].map((act) => {
              const isActive = action === act;
              const cls = isActive ? `active-${act.toLowerCase()}` : '';
              const sublabels = {
                MONITOR: 'Passive surveillance',
                PREPARE: 'Preventive action',
                INTERVENE: 'Active mitigation',
              };
              return (
                <div key={act} className={`action-block ${cls}`}>
                  <div className="action-bar" />
                  <div className="action-icon">
                    <CheckIcon />
                  </div>
                  <span className="action-label">{act}</span>
                  <span className="action-sublabel">{sublabels[act]}</span>
                </div>
              );
            })}
          </div>

          <div className="action-meta">
            <div className="meta-item">
              <span className="meta-label">Priority</span>
              <span className="meta-value">{priority}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Confidence</span>
              <span className="meta-value">{(confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* ━━ 2) ECONOMIC IMPACT ASSESSMENT ━━ */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Economic Impact Assessment</span>
          </div>

          <div className="financial-grid">
            <div className={`metric-card${cost.expectedWaitLoss > cost.interventionCost ? ' highlight-loss' : ''}`}>
              <div className="metric-label">Expected Wait Loss</div>
              <div className={`metric-value large${cost.expectedWaitLoss > cost.interventionCost ? ' negative' : ''}`}>
                ₹{fmtCurrency(cost.expectedWaitLoss)}
              </div>
              <div className="metric-subtext">Risk × Total Loss</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Intervention Cost</div>
              <div className="metric-value large">₹{fmtCurrency(cost.interventionCost)}</div>
              <div className="metric-subtext">Fixed operational cost</div>
            </div>

            <div className={`metric-card${cost.netRiskDiff > 0 ? ' highlight-loss' : ' highlight-save'}`}>
              <div className="metric-label">Net Risk Differential</div>
              <div className={`metric-value large ${cost.netRiskDiff > 0 ? 'negative' : 'positive'}`}>
                {cost.netRiskDiff > 0 ? '+' : ''}₹{fmtCurrency(cost.netRiskDiff)}
              </div>
              <div className="metric-subtext">
                {cost.netRiskDiff > 0 ? 'Intervention justified' : 'Within tolerance'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Energy Imbalance</div>
              <div className={`metric-value${cost.energyImbalance > 0.5 ? ' warn' : ''}`}>
                {fmt(cost.energyImbalance, 4)}<span className="metric-unit">kWh</span>
              </div>
            </div>

            <div className="metric-card full-width">
              <div className="metric-label">Carbon Emission</div>
              <div className="metric-value">
                {fmt(cost.carbonEmission, 4)}<span className="metric-unit">kg CO₂</span>
              </div>
            </div>
          </div>
        </div>

        {/* ━━ 3) OPERATIONAL RESPONSE PLAN ━━ */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Operational Response Plan</span>
            <span className="panel-badge">{opsLevel}</span>
          </div>

          <ul className={`ops-list action-${action.toLowerCase()}`}>
            {operations.map((op, i) => {
              const isChecked = !!checkedOps[i];
              return (
                <li
                  key={i}
                  className={`ops-item${isChecked ? ' ops-checked' : ''}`}
                  onClick={() => toggleOp(i)}
                >
                  <span className={`ops-check check-${action.toLowerCase()}${isChecked ? '' : ' ops-unchecked'}`}>
                    {isChecked ? <CheckIcon size={8} color="#0F172A" /> : null}
                  </span>
                  <span className="ops-marker">{String(i + 1).padStart(2, '0')}</span>
                  <span className={isChecked ? 'ops-text-done' : ''}>{op}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ━━ 4) DECISION JUSTIFICATION ━━ */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Decision Justification</span>
          </div>

          <div className="risk-hero">
            <span className={`risk-hero-value ${riskClass}`}>{fmt(riskScore, 4)}</span>
            <span className="risk-hero-label">Risk Score</span>
          </div>

          <div className="justification-rows">
            <div className="justification-row">
              <span className="j-label">Regime Level</span>
              <span className="j-value">{regimeLevel} — {REGIME_MAP[regimeLevel] || 'Unknown'}</span>
            </div>
            <div className="justification-row">
              <span className="j-label">Prediction Error</span>
              <span className="j-value">{fmt(predictionError, 4)}</span>
            </div>
            <div className="justification-row highlight">
              <span className="j-label">Expected Loss</span>
              <span className={`j-value j-bold${cost.totalLoss > 10 ? ' j-loss' : ''}`}>
                ₹{fmtCurrency(cost.totalLoss)}
              </span>
            </div>
            <div className="justification-row">
              <span className="j-label">Policy Evaluation</span>
              <span className={`j-value action-tag ${action.toLowerCase()}`}>{action}</span>
            </div>
          </div>
        </div>

        {/* ━━ 5) RISK OVER TIME CHART ━━ */}
        <div className="panel panel-wide">
          <div className="panel-header">
            <span className="panel-title">Risk Over Time</span>
            <span className="panel-badge">{recentDecisions.length} samples</span>
          </div>
          <div className="chart-container">
            {recentDecisions.length > 0 ? (
              <Line
                data={riskChartData}
                options={riskChartOptions}
                plugins={[riskThresholdPlugin]}
              />
            ) : (
              <div className="chart-empty">Awaiting data stream</div>
            )}
          </div>
        </div>

        {/* ━━ 6) REGIME TRANSITION CHART ━━ */}
        <div className="panel panel-wide">
          <div className="panel-header">
            <span className="panel-title">Regime Transition</span>
            <span className="panel-badge">Stepped</span>
          </div>
          <div className="chart-container">
            {recentDecisions.length > 0 ? (
              <Line data={regimeChartData} options={regimeChartOptions} />
            ) : (
              <div className="chart-empty">Awaiting data stream</div>
            )}
          </div>
        </div>

        {/* ━━ 7) LIVE TELEMETRY STREAM ━━ */}
        <div className="panel panel-wide">
          <div className="panel-header">
            <span className="panel-title">Live Telemetry Stream</span>
            <span className="panel-badge">{recentRawLogs.length} entries</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Voltage (V)</th>
                  <th>Current (A)</th>
                  <th>Power (kW)</th>
                  <th>Temp (°C)</th>
                  <th>Fluctuation (%)</th>
                </tr>
              </thead>
              <tbody>
                {recentRawLogs.length > 0 ? recentRawLogs.map((log, i) => (
                  <tr key={i}>
                    <td className="td-ts">{fmtTime(log.timestamp)}</td>
                    <td className="td-mono">{fmt(log.voltage, 1)}</td>
                    <td className="td-mono">{fmt(log.current, 2)}</td>
                    <td className="td-mono">{fmt(log.power, 2)}</td>
                    <td className="td-mono">{fmt(log.temp, 1)}</td>
                    <td className="td-mono">{fmt(log.fluctuation, 2)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="td-empty">No telemetry data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ━━ 8) RECENT DECISION HISTORY ━━ */}
        <div className="panel panel-wide">
          <div className="panel-header">
            <span className="panel-title">Recent Decision History</span>
            <span className="panel-badge">{Math.min(recentDecisions.length, 10)} entries</span>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Regime</th>
                  <th>Risk Score</th>
                  <th>Expected Loss</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentDecisions.length > 0 ? (
                  [...recentDecisions].reverse().slice(0, 10).map((d, i) => {
                    const rs = d.risk_score ?? 0;
                    const pe = d.signals?.prediction_error ?? 0;
                    const c = computeCostModel(rs, pe);
                    const act = d.decision?.action || 'MONITOR';
                    return (
                      <tr key={i}>
                        <td className="td-ts">{fmtTime(d.timestamp)}</td>
                        <td className="td-mono">{d.regime ?? 0} — {REGIME_MAP[d.regime ?? 0]}</td>
                        <td className="td-mono">{fmt(rs, 4)}</td>
                        <td className="td-mono">₹{fmtCurrency(c.totalLoss)}</td>
                        <td>
                          <span
                            className="history-action"
                            style={{ color: ACTION_COLORS[act] || '#64748B' }}
                          >
                            {act}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="td-empty">No decision data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ━━ 9) PROJECTED IMPACT IF INTERVENED ━━ */}
        <div className="panel panel-projection">
          <div className="panel-header">
            <span className="panel-title">Projected Impact if Intervened</span>
            <span className="panel-badge">Cost Model</span>
          </div>

          <div className="projection-grid">
            <div className="projection-card">
              <div className="projection-label">Estimated Energy Saved</div>
              <div className="projection-value">
                {fmt(projectedEnergySaved, 4)}<span className="projection-unit">kWh</span>
              </div>
              <div className="projection-subtext">Based on predicted imbalance</div>
            </div>
            <div className="projection-card">
              <div className="projection-label">Estimated Carbon Reduction</div>
              <div className="projection-value">
                {fmt(projectedCarbonReduced, 4)}<span className="projection-unit">kg CO₂</span>
              </div>
              <div className="projection-subtext">At {CARBON_INTENSITY} kg/kWh intensity</div>
            </div>
            <div className="projection-card">
              <div className="projection-label">Estimated Cost Avoided</div>
              <div className="projection-value">₹{fmtCurrency(projectedCostAvoided)}</div>
              <div className="projection-subtext">Net savings after intervention</div>
            </div>
          </div>
        </div>

        {/* ━━ TELEMETRY STRIP ━━ */}
        <div className="telemetry-strip">
          <div className="telemetry-item">
            <span className="telemetry-label">Voltage</span>
            <span className="telemetry-value">{fmt(rawLog?.voltage, 1)}<span className="telemetry-unit">V</span></span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Current</span>
            <span className="telemetry-value">{fmt(rawLog?.current, 2)}<span className="telemetry-unit">A</span></span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Power</span>
            <span className="telemetry-value">{fmt(rawLog?.power, 2)}<span className="telemetry-unit">kW</span></span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Reactive Power</span>
            <span className="telemetry-value">{fmt(rawLog?.reactive_power, 2)}<span className="telemetry-unit">kVAR</span></span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Power Factor</span>
            <span className="telemetry-value">{fmt(rawLog?.pf, 3)}</span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Temperature</span>
            <span className="telemetry-value">{fmt(rawLog?.temp, 1)}<span className="telemetry-unit">°C</span></span>
          </div>
          <div className="telemetry-item">
            <span className="telemetry-label">Fluctuation</span>
            <span className="telemetry-value">{fmt(rawLog?.fluctuation, 2)}<span className="telemetry-unit">%</span></span>
          </div>
        </div>

        <div className="timestamp-bar">
          <span className="timestamp-text">Last Update: {timestamp || '--'}</span>
          <span className="timestamp-text">Deployment: {CONTEXTS[context]}</span>
        </div>
      </div>
    </div>
  );
}

export default App;
