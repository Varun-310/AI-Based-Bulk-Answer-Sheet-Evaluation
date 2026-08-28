'use client';

import React, { useState } from 'react';
import { ClassAnalytics, QuestionScore } from '../lib/analytics';
import styles from './DashboardCharts.module.css';

/* ── 1. Circular Progress Meter ── */
export function RadialProgressRing({
  percentage,
  size = 64,
  strokeWidth = 6,
  color = 'var(--accent-light)',
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div className={styles.ringWrapper} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.ringSvg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
      </svg>
      <div className={styles.ringCenter}>
        <span className={styles.ringVal}>{clampedPct}%</span>
      </div>
    </div>
  );
}

/* ── 2. Class Question-by-Question Benchmark Bar Chart ── */
export function ClassQuestionBarChart({
  stats,
  classAverage,
}: {
  stats: ClassAnalytics['questionStats'];
  classAverage: number;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!stats || stats.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        No question statistics available yet.
      </div>
    );
  }

  const height = 180;
  const barMaxHeight = 110;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>Question Mastery vs Benchmark</div>
        <div className={styles.benchmarkLegend}>
          <span className={styles.benchmarkLineIndicator} />
          <span>Class Avg ({classAverage}%)</span>
        </div>
      </div>

      <div className={styles.barChartArea} style={{ height }}>
        {/* Y Axis Guides */}
        <div className={styles.yGuides}>
          {[100, 75, 50, 25, 0].map((tick) => (
            <div key={tick} className={styles.yGuideRow}>
              <span className={styles.yGuideLabel}>{tick}%</span>
              <div className={styles.yGuideLine} />
            </div>
          ))}
        </div>

        {/* Benchmark Reference Line */}
        <div
          className={styles.benchmarkLine}
          style={{
            bottom: `${(classAverage / 100) * barMaxHeight + 30}px`,
          }}
        />

        {/* Bars Container */}
        <div className={styles.barsRow}>
          {stats.map((q, idx) => {
            const barH = Math.max(8, (q.avgPercentage / 100) * barMaxHeight);
            const isHovered = hoveredIdx === idx;
            const barColor =
              q.avgPercentage >= 75
                ? 'var(--green)'
                : q.avgPercentage >= 55
                ? 'var(--accent-light)'
                : 'var(--amber)';

            return (
              <div
                key={q.id}
                className={styles.barCol}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className={styles.barTooltip}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{q.id}</div>
                    <div style={{ color: barColor }}>
                      Avg: {q.avgScore} / {q.maxScore} ({q.avgPercentage}%)
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                      Range: {q.lowest}–{q.highest} marks
                    </div>
                  </div>
                )}

                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{
                      height: `${barH}px`,
                      background: barColor,
                    }}
                  />
                </div>
                <div className={styles.barLabel}>{q.id}</div>
                <div className={styles.barScoreLabel}>{q.avgScore}m</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 3. Class IB Mark Band Distribution Donut Chart ── */
export function GradeDistributionDonut({
  distribution,
  totalStudents,
}: {
  distribution: ClassAnalytics['bandDistribution'];
  totalStudents: number;
}) {
  const [hoveredBand, setHoveredBand] = useState<string | null>(null);

  const size = 150;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Compute SVG stroke-dasharray offsets
  let accumulatedAngle = 0;
  const segments = distribution.map((d) => {
    const fraction = totalStudents > 0 ? d.count / totalStudents : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedAngle;
    accumulatedAngle += fraction * circumference;
    return {
      ...d,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitle}>IB Mark Band Cohort Distribution</div>
      </div>

      <div className={styles.donutRow}>
        {/* SVG Donut */}
        <div className={styles.donutSvgWrap} style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donutSvg}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />
            {totalStudents > 0 &&
              segments.map((seg) => {
                if (seg.count === 0) return null;
                const isHovered = hoveredBand === seg.name;
                return (
                  <circle
                    key={seg.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    className={styles.donutSegment}
                    onMouseEnter={() => setHoveredBand(seg.name)}
                    onMouseLeave={() => setHoveredBand(null)}
                  />
                );
              })}
          </svg>
          <div className={styles.donutCenterText}>
            <span className={styles.donutTotalVal}>{totalStudents}</span>
            <span className={styles.donutTotalLbl}>Students</span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className={styles.donutLegend}>
          {distribution.map((d) => {
            const isHovered = hoveredBand === d.name;
            return (
              <div
                key={d.name}
                className={`${styles.legendItem} ${isHovered ? styles.legendItemActive : ''}`}
                onMouseEnter={() => setHoveredBand(d.name)}
                onMouseLeave={() => setHoveredBand(null)}
              >
                <div className={styles.legendDot} style={{ background: d.color }} />
                <div className={styles.legendText}>
                  <div className={styles.legendName}>{d.name}</div>
                  <div className={styles.legendCount}>
                    {d.count} <span style={{ color: 'var(--text-3)' }}>({d.percentage}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── 4. Student Competency / Performance Radar Chart ── */
export function StudentRadarChart({
  questions,
  classStats,
}: {
  questions: QuestionScore[];
  classStats?: ClassAnalytics | null;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!questions || questions.length < 3) {
    // If fewer than 3 questions, render a clean mini bar comparison instead
    return (
      <div className={styles.miniBarContainer}>
        <div className={styles.radarHeaderTitle}>Question Performance Breakdown</div>
        <div className={styles.miniBarList}>
          {questions.map((q) => {
            const pct = q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : 0;
            const barColor =
              pct >= 75 ? 'var(--green)' : pct >= 55 ? 'var(--accent-light)' : 'var(--amber)';
            return (
              <div key={q.id} className={styles.miniBarItem}>
                <div className={styles.miniBarHeader}>
                  <span className={styles.miniBarQId}>{q.id}</span>
                  <span style={{ color: barColor, fontWeight: 600 }}>
                    {q.score}/{q.maxScore} ({pct}%)
                  </span>
                </div>
                <div className={styles.miniBarTrack}>
                  <div
                    className={styles.miniBarFill}
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const size = 220;
  const center = size / 2;
  const maxRadius = 78;
  const numSides = questions.length;
  const angleStep = (2 * Math.PI) / numSides;

  // Concentric polygon background grids (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = valueRatio * maxRadius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  // Student Polygon Points
  const studentPoints = questions
    .map((q, i) => {
      const ratio = q.maxScore > 0 ? Math.max(0, Math.min(1, q.score / q.maxScore)) : 0;
      const { x, y } = getCoordinates(i, ratio);
      return `${x},${y}`;
    })
    .join(' ');

  // Class Average Polygon Points (if available)
  let classPoints = '';
  if (classStats && classStats.questionStats.length >= numSides) {
    classPoints = questions
      .map((q, i) => {
        const stat = classStats.questionStats.find((s) => s.id === q.id) || classStats.questionStats[i];
        const ratio = stat ? Math.max(0, Math.min(1, stat.avgScore / stat.maxScore)) : 0.5;
        const { x, y } = getCoordinates(i, ratio);
        return `${x},${y}`;
      })
      .join(' ');
  }

  return (
    <div className={styles.radarWrapper}>
      <div className={styles.radarHeader}>
        <div className={styles.radarHeaderTitle}>Student Competency Radar</div>
        <div className={styles.radarLegends}>
          <span className={styles.radarLegendStudent}>● Candidate</span>
          {classPoints && <span className={styles.radarLegendClass}>-- Class Benchmark</span>}
        </div>
      </div>

      <div className={styles.radarSvgWrap}>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className={styles.radarSvg}
          style={{ width: '100%', maxWidth: '210px', height: 'auto', display: 'block', margin: '0 auto' }}
        >
          {/* Background Grid Rings */}
          {gridLevels.map((lvl) => {
            const pts = Array.from({ length: numSides })
              .map((_, i) => {
                const { x, y } = getCoordinates(i, lvl);
                return `${x},${y}`;
              })
              .join(' ');
            return (
              <polygon
                key={lvl}
                points={pts}
                fill={lvl === 1.0 ? 'rgba(255, 255, 255, 0.015)' : 'none'}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Spokes from Center */}
          {questions.map((_, i) => {
            const { x, y } = getCoordinates(i, 1.0);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Class Benchmark Polygon (Dashed outline) */}
          {classPoints && (
            <polygon
              points={classPoints}
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Student Filled Polygon */}
          <polygon
            points={studentPoints}
            fill="rgba(99, 102, 241, 0.22)"
            stroke="var(--accent-light)"
            strokeWidth="2"
          />

          {/* Vertex Points & Labels */}
          {questions.map((q, i) => {
            const ratio = q.maxScore > 0 ? Math.max(0, Math.min(1, q.score / q.maxScore)) : 0;
            const pt = getCoordinates(i, ratio);
            const labelPt = getCoordinates(i, 1.22);
            const isHovered = hoveredIdx === i;

            return (
              <g key={q.id}>
                {/* Outer Question Label */}
                <text
                  x={labelPt.x}
                  y={labelPt.y + 4}
                  textAnchor="middle"
                  fill="var(--text-2)"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {q.id}
                </text>

                {/* Interactive Vertex Dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3.5}
                  fill={isHovered ? '#fff' : 'var(--accent-light)'}
                  stroke="var(--bg)"
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                />
              </g>
            );
          })}
        </svg>

        {/* Hovered Question Tooltip */}
        {hoveredIdx !== null && questions[hoveredIdx] && (
          <div className={styles.radarTooltip}>
            <span style={{ fontWeight: 600 }}>{questions[hoveredIdx].id}:</span>{' '}
            {questions[hoveredIdx].score} / {questions[hoveredIdx].maxScore} marks (
            {Math.round(
              (questions[hoveredIdx].score / (questions[hoveredIdx].maxScore || 1)) * 100
            )}
            %)
          </div>
        )}
      </div>
    </div>
  );
}
