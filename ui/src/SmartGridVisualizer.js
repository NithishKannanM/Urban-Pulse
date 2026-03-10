import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SmartGridVisualizer.css';

/* ════════════════════════════════════════════════
   GRID TOPOLOGY — Node & Edge Definitions
   ════════════════════════════════════════════════ */

const NODES = [
  // Power Sources (top row)
  { id: 'plant', label: 'Main Power Plant', icon: '⚡', type: 'source', x: 500, y: 70, capacity: 500 },
  { id: 'generator', label: 'Backup Generator', icon: '🔧', type: 'source', x: 200, y: 70, capacity: 200 },
  { id: 'battery', label: 'Battery Storage', icon: '🔋', type: 'source', x: 800, y: 70, capacity: 150 },

  // Infrastructure (middle row)
  { id: 'substation', label: 'Main Substation', icon: '🏗', type: 'infra', x: 500, y: 220, capacity: 600 },
  { id: 'transformerA', label: 'Transformer A', icon: '⬡', type: 'infra', x: 260, y: 300, capacity: 300 },
  { id: 'transformerB', label: 'Transformer B', icon: '⬡', type: 'infra', x: 740, y: 300, capacity: 300 },

  // Consumers (bottom row)
  { id: 'campusA', label: 'Campus A', icon: '🏫', type: 'consumer', x: 170, y: 450, capacity: 250, blocks: 5 },
  { id: 'campusB', label: 'Campus B', icon: '🏢', type: 'consumer', x: 500, y: 450, capacity: 200, blocks: 2 },
  { id: 'industry', label: 'Industry / DC', icon: '🏭', type: 'consumer', x: 830, y: 450, capacity: 300, blocks: 0 },
];

const EDGES = [
  // Sources → Substation
  { from: 'plant', to: 'substation', id: 'e1' },
  { from: 'generator', to: 'substation', id: 'e2' },
  { from: 'battery', to: 'substation', id: 'e3' },

  // Substation → Transformers
  { from: 'substation', to: 'transformerA', id: 'e4' },
  { from: 'substation', to: 'transformerB', id: 'e5' },

  // Transformer A → Campus A, Campus B
  { from: 'transformerA', to: 'campusA', id: 'e6' },
  { from: 'transformerA', to: 'campusB', id: 'e7' },

  // Transformer B → Campus B, Industry
  { from: 'transformerB', to: 'campusB', id: 'e8' },
  { from: 'transformerB', to: 'industry', id: 'e9' },
];

/* ════════════════════════════════════════════════
   SIMULATION PHASES
   ════════════════════════════════════════════════ */

const PHASES = [
  {
    name: 'Normal Operation',
    duration: 5000,
    description: '20:00 — All systems nominal. Even load distribution.',
    decision: 'MONITOR',
    riskScore: 0.15,
    powerShift: null,
    loads: { plant: 0.6, generator: 0.3, battery: 0.4, substation: 0.5, transformerA: 0.5, transformerB: 0.5, campusA: 0.45, campusB: 0.4, industry: 0.7 },
    nodeStates: {},
    edgeStates: {},
    evidence: ['20:00 — Grid stable. All nodes within capacity.', 'Load factor: 0.52 avg across consumers.'],
  },
  {
    name: 'Evening Shift',
    duration: 5000,
    description: '20:15 — Industry usage drops post-shift. Campus A demand rising.',
    decision: 'MONITOR',
    riskScore: 0.35,
    powerShift: null,
    loads: { plant: 0.65, generator: 0.3, battery: 0.35, substation: 0.55, transformerA: 0.7, transformerB: 0.35, campusA: 0.72, campusB: 0.4, industry: 0.25 },
    nodeStates: { industry: 'low' },
    edgeStates: { e9: 'dormant' },
    evidence: ['20:15 — Industry/DC load dropped to 75kW (cap: 300kW).', '20:15 — Campus A demand rising: 180kW / 250kW.'],
  },
  {
    name: 'Overload Detected',
    duration: 5000,
    description: '20:30 — Campus A exceeds safe threshold! Overload imminent.',
    decision: 'PREPARE',
    riskScore: 0.72,
    powerShift: null,
    loads: { plant: 0.75, generator: 0.3, battery: 0.35, substation: 0.65, transformerA: 0.92, transformerB: 0.25, campusA: 0.95, campusB: 0.42, industry: 0.2 },
    nodeStates: { campusA: 'overloaded', transformerA: 'warning', industry: 'low' },
    edgeStates: { e6: 'overloaded', e9: 'dormant' },
    evidence: [
      '⚠ 20:30 — Campus A at 238kW / 250kW (95% capacity)!',
      '⚠ 20:30 — Transformer A load: 92%. Thermal risk.',
      '20:30 — Grid B (Transformer B) at 25% — 225kW available.',
      '⚠ SYSTEM: Risk score 0.72. Regime: UNSTABLE.',
    ],
  },
  {
    name: 'Load Rebalancing',
    duration: 6000,
    description: '20:31 — UrbanPulse: PREPARE. Shifting 120kW from Grid B → Campus A.',
    decision: 'PREPARE',
    riskScore: 0.72,
    powerShift: '120kW',
    powerSource: 'Grid B',
    powerTarget: 'Campus A',
    loads: { plant: 0.7, generator: 0.3, battery: 0.35, substation: 0.6, transformerA: 0.65, transformerB: 0.55, campusA: 0.78, campusB: 0.42, industry: 0.2 },
    nodeStates: { campusA: 'warning', transformerB: 'warning', industry: 'low' },
    edgeStates: { e9: 'dormant' },
    showRebalance: true,
    evidence: [
      '✦ 20:31 — DECISION: PREPARE — load_rebalance',
      '✦ Mitigation: Shift 120kW from Grid B → Campus A.',
      '✦ Source: Transformer B (available: 225kW).',
      '✦ Route: Transformer B → Substation → Transformer A → Campus A.',
      '20:31 — Executing power reroute...',
    ],
  },
  {
    name: 'Balanced',
    duration: 4000,
    description: '20:33 — Load balanced. All nodes within safe operational limits.',
    decision: 'MONITOR',
    riskScore: 0.18,
    powerShift: null,
    loads: { plant: 0.6, generator: 0.3, battery: 0.4, substation: 0.55, transformerA: 0.6, transformerB: 0.5, campusA: 0.58, campusB: 0.42, industry: 0.2 },
    nodeStates: { industry: 'low' },
    edgeStates: { e9: 'dormant' },
    evidence: [
      '✓ 20:33 — Campus A stabilized at 145kW / 250kW (58%).',
      '✓ 20:33 — Transformer A load normalized to 60%.',
      '✓ 20:33 — Grid balanced. Risk score: 0.18.',
      '✓ No user disruption. Zero downtime achieved.',
    ],
  },
];

/* ════════════════════════════════════════════════
   HELPER — Get node by ID
   ════════════════════════════════════════════════ */
function getNode(id) {
  return NODES.find((n) => n.id === id);
}

/* ════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════ */

/* ── Transmission Line ── */
function TransmissionLine({ edge, state, flowState }) {
  const from = getNode(edge.from);
  const to = getNode(edge.to);
  if (!from || !to) return null;

  const lineClass = `sgv-line ${state || 'active'}`;
  const flowClass = `sgv-flow ${flowState || ''}`;

  return (
    <g>
      <line
        x1={from.x} y1={from.y}
        x2={to.x} y2={to.y}
        className={lineClass}
      />
      <line
        x1={from.x} y1={from.y}
        x2={to.x} y2={to.y}
        className={flowClass}
      />
    </g>
  );
}

/* ── Grid Node ── */
function GridNode({ node, state, load }) {
  const stateClass = state ? `sgv-node-${state}` : 'sgv-node-normal';
  const loadPct = Math.min(Math.max(load || 0, 0), 1);
  const loadColor = loadPct > 0.85 ? 'load-high' : loadPct > 0.6 ? 'load-mid' : 'load-low';

  const barWidth = 50;
  const barHeight = 5;

  if (node.type === 'source') {
    return (
      <g className={`sgv-node-group ${stateClass}`}>
        <circle cx={node.x} cy={node.y} r={32} className="sgv-node-circle" />
        <text x={node.x} y={node.y - 4} className="sgv-node-icon">{node.icon}</text>
        <text x={node.x} y={node.y + 50} className="sgv-node-label">{node.label}</text>
        {/* Load bar */}
        <rect x={node.x - barWidth / 2} y={node.y + 18} width={barWidth} height={barHeight} className="sgv-load-bg" />
        <rect
          x={node.x - barWidth / 2} y={node.y + 18}
          width={barWidth * loadPct} height={barHeight}
          className={`sgv-load-fill ${loadColor}`}
        />
        <text x={node.x} y={node.y + 34} className="sgv-load-text">{Math.round(loadPct * 100)}%</text>
      </g>
    );
  }

  if (node.type === 'infra') {
    // Hexagon shape
    const s = 28;
    const cx = node.x, cy = node.y;
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + s * Math.cos(angle)},${cy + s * Math.sin(angle)}`;
    }).join(' ');

    return (
      <g className={`sgv-node-group ${stateClass}`}>
        <polygon points={pts} className="sgv-node-hex" />
        <text x={node.x} y={node.y + 1} className="sgv-node-icon" style={{ fontSize: '14px' }}>{node.icon}</text>
        <text x={node.x} y={node.y + 45} className="sgv-node-label">{node.label}</text>
        <rect x={node.x - barWidth / 2} y={node.y + 16} width={barWidth} height={barHeight} className="sgv-load-bg" />
        <rect
          x={node.x - barWidth / 2} y={node.y + 16}
          width={barWidth * loadPct} height={barHeight}
          className={`sgv-load-fill ${loadColor}`}
        />
        <text x={node.x} y={node.y + 30} className="sgv-load-text">{Math.round(loadPct * 100)}%</text>
      </g>
    );
  }

  // Consumer — rectangle
  const w = 80, h = 50;
  return (
    <g className={`sgv-node-group ${stateClass}`}>
      <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} className="sgv-node-rect" />
      <text x={node.x} y={node.y - 8} className="sgv-node-icon" style={{ fontSize: '16px' }}>{node.icon}</text>
      <text x={node.x} y={node.y + 6} className="sgv-node-sublabel">
        {node.blocks > 0 ? `${node.blocks} blocks` : 'Data Center'}
      </text>
      <text x={node.x} y={node.y + h / 2 + 16} className="sgv-node-label">{node.label}</text>
      {/* Load bar */}
      <rect x={node.x - barWidth / 2} y={node.y + h / 2 + 22} width={barWidth} height={barHeight} className="sgv-load-bg" />
      <rect
        x={node.x - barWidth / 2} y={node.y + h / 2 + 22}
        width={barWidth * loadPct} height={barHeight}
        className={`sgv-load-fill ${loadColor}`}
      />
      <text x={node.x} y={node.y + h / 2 + 38} className="sgv-load-text">
        {Math.round(loadPct * node.capacity)}kW / {node.capacity}kW
      </text>
    </g>
  );
}

/* ── Rebalance Arrow ── */
function RebalanceArrow() {
  // Animate from Transformer B → Substation → Transformer A → Campus A
  const tB = getNode('transformerB');
  const sub = getNode('substation');
  const tA = getNode('transformerA');
  const cA = getNode('campusA');

  const pathD = `M${tB.x},${tB.y} L${sub.x},${sub.y} L${tA.x},${tA.y} L${cA.x},${cA.y}`;

  return (
    <g>
      <path d={pathD} className="sgv-rebalance-path" />
      {/* Arrowhead at Campus A */}
      <polygon
        points={`${cA.x},${cA.y - 25} ${cA.x - 8},${cA.y - 35} ${cA.x + 8},${cA.y - 35}`}
        className="sgv-rebalance-arrow"
      />
      {/* Label */}
      <text
        x={(tB.x + sub.x) / 2 + 30}
        y={(tB.y + sub.y) / 2 - 10}
        fill="#F59E0B"
        fontFamily="'JetBrains Mono', monospace"
        fontSize="10"
        fontWeight="700"
        textAnchor="middle"
        style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))' }}
      >
        120kW REROUTE
      </text>
    </g>
  );
}

/* ════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════ */
function SmartGridVisualizer({ data }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [simTime, setSimTime] = useState(0);
  const [evidence, setEvidence] = useState([]);
  const timerRef = useRef(null);
  const phaseTimerRef = useRef(null);

  // Simulation always runs. Live data from Firebase enhances the decision panel
  // but does not replace the visual simulation.
  const currentPhase = PHASES[phaseIndex];

  // Extract live backend info (if connected) for the decision panel overlay
  const liveAction = data?.decision?.action || null;
  const liveRisk = data?.risk_score ?? null;
  const liveMitigation = data?.mitigation || null;

  /* ── Simulation Timer ── */
  useEffect(() => {
    phaseTimerRef.current = setTimeout(() => {
      const nextIndex = (phaseIndex + 1) % PHASES.length;
      setPhaseIndex(nextIndex);
      setEvidence([]);
    }, currentPhase.duration);

    return () => clearTimeout(phaseTimerRef.current);
  }, [phaseIndex, currentPhase.duration]);

  /* ── Evidence accumulation ── */
  useEffect(() => {
    const phaseEvidence = currentPhase.evidence || [];
    const timers = [];

    phaseEvidence.forEach((item, i) => {
      const delay = 600 + (i + 1) * (currentPhase.duration / (phaseEvidence.length + 1));
      const t = setTimeout(() => {
        setEvidence((prev) => [...prev, item]);
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach((t) => clearTimeout(t));
  }, [phaseIndex, currentPhase]);

  /* ── Sim clock ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setSimTime((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Derive display state (always from simulation phases) ── */
  const getDisplayState = useCallback(() => {
    return {
      decision: currentPhase.decision,
      riskScore: currentPhase.riskScore,
      powerShift: currentPhase.powerShift,
      powerSource: currentPhase.powerSource || null,
      powerTarget: currentPhase.powerTarget || null,
      loads: currentPhase.loads,
      nodeStates: currentPhase.nodeStates,
      edgeStates: currentPhase.edgeStates,
      showRebalance: currentPhase.showRebalance || false,
      phaseName: currentPhase.name,
      description: currentPhase.description,
    };
  }, [currentPhase]);

  const display = getDisplayState();

  const riskClass = display.riskScore >= 0.7 ? 'high' : display.riskScore >= 0.3 ? 'mid' : 'low';
  const decisionClass = display.decision.toLowerCase();

  return (
    <div className="sgv-container">
      {/* ── SVG Canvas ── */}
      <svg className="sgv-svg" viewBox="0 0 1000 540" preserveAspectRatio="xMidYMid meet">
        {/* Grid background */}
        <defs>
          <linearGradient id="sgv-grad-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
            <stop offset="100%" stopColor="rgba(16,185,129,0.2)" />
          </linearGradient>
          <linearGradient id="sgv-grad-red" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(220,38,38,0.6)" />
            <stop offset="100%" stopColor="rgba(220,38,38,0.2)" />
          </linearGradient>
          <linearGradient id="sgv-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(245,158,11,0.6)" />
            <stop offset="100%" stopColor="rgba(245,158,11,0.2)" />
          </linearGradient>
        </defs>

        {/* Layer labels */}
        <text x={50} y={55} className="sgv-layer-label">Power Sources</text>
        <text x={50} y={255} className="sgv-layer-label">Infrastructure</text>
        <text x={50} y={430} className="sgv-layer-label">Consumers</text>

        {/* Transmission Lines */}
        {EDGES.map((edge) => (
          <TransmissionLine
            key={edge.id}
            edge={edge}
            state={display.edgeStates[edge.id] || 'active'}
            flowState={display.edgeStates[edge.id] || ''}
          />
        ))}

        {/* Rebalance Arrow */}
        {display.showRebalance && <RebalanceArrow />}

        {/* Nodes */}
        {NODES.map((node) => (
          <GridNode
            key={node.id}
            node={node}
            state={display.nodeStates[node.id] || null}
            load={display.loads[node.id] || 0}
          />
        ))}
      </svg>

      {/* ── Info Bar (below SVG, no overlap) ── */}
      <div className="sgv-info-bar">
        {/* ── Scenario Panel ── */}
        <div className="sgv-scenario-panel">
          <div className="sgv-scenario-title">Simulation Phase</div>
          <div className="sgv-scenario-phase">{display.phaseName}</div>
          <div className="sgv-scenario-time">{display.description}</div>
        </div>

        {/* ── Evidence Panel ── */}
        <div className="sgv-evidence-panel">
          <div className="sgv-evidence-title">System Evidence Log</div>
          <ul className="sgv-evidence-list">
            {evidence.filter(Boolean).map((item, i) => {
              let cls = '';
              const text = String(item);
              if (text.startsWith('⚠')) cls = 'warn';
              else if (text.startsWith('✦')) cls = 'critical';
              else if (text.startsWith('✓')) cls = 'success';
              return (
                <li key={`${phaseIndex}-${i}`} className={`sgv-evidence-item ${cls}`}>{text}</li>
              );
            })}
            {evidence.length === 0 && (
              <li className="sgv-evidence-item" style={{ color: 'var(--muted)', borderLeftColor: 'var(--border)' }}>
                Awaiting telemetry...
              </li>
            )}
          </ul>
        </div>

        {/* ── Decision Panel ── */}
        <div className="sgv-decision-panel">
          <div className="sgv-dp-title">Grid Decision Engine</div>
          <div className="sgv-dp-row">
            <span className="sgv-dp-label">Decision</span>
            <span className={`sgv-dp-decision ${decisionClass}`}>{display.decision}</span>
          </div>
          <div className="sgv-dp-row">
            <span className="sgv-dp-label">Risk Score</span>
            <span className="sgv-dp-value">{display.riskScore.toFixed(2)}</span>
          </div>
          <div className="sgv-risk-bar-bg">
            <div
              className={`sgv-risk-bar-fill ${riskClass}`}
              style={{ width: `${display.riskScore * 100}%` }}
            />
          </div>
          {display.powerShift && (
            <>
              <div className="sgv-dp-row" style={{ marginTop: 8 }}>
                <span className="sgv-dp-label">Power Shift</span>
                <span className="sgv-dp-value" style={{ color: '#F59E0B' }}>{display.powerShift}</span>
              </div>
              <div className="sgv-dp-row">
                <span className="sgv-dp-label">Route</span>
                <span className="sgv-dp-value" style={{ fontSize: '0.625rem' }}>
                  {display.powerTarget} ← {display.powerSource}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SmartGridVisualizer;
