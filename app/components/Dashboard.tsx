'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Users, TrendingUp, Award, ChevronDown, ChevronUp,
  Download, FileSpreadsheet, Search, Eye,
  Sparkles, Layers, CheckCircle2, AlertTriangle, Lightbulb,
  BarChart3, LayoutGrid, Split, User, ArrowUpRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  QuestionScore,
  StudentResult,
  calculateClassAnalytics,
  generateStudentReview,
} from '../lib/analytics';
import {
  ClassQuestionBarChart,
  GradeDistributionDonut,
  StudentRadarChart,
  RadialProgressRing,
} from './DashboardCharts';
import styles from './Dashboard.module.css';

export type { QuestionScore, StudentResult };

function scoreClass(s: number, m: number) {
  const p = m > 0 ? (s / m) * 100 : 0;
  return p >= 70 ? 'score-high' : p >= 50 ? 'score-mid' : 'score-low';
}

function badgeClass(st: string) {
  return st === 'Excellent'
    ? 'badge-green'
    : st === 'Good'
    ? 'badge-accent'
    : st === 'Satisfactory'
    ? 'badge-amber'
    : 'badge-red';
}

function recalc(r: StudentResult): StudentResult {
  const totalScore = r.questions.reduce((s, q) => s + q.score, 0);
  const maxTotal = r.questions.reduce((s, q) => s + q.maxScore, 0);
  const percentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;
  const status: StudentResult['status'] =
    percentage >= 85
      ? 'Excellent'
      : percentage >= 70
      ? 'Good'
      : percentage >= 55
      ? 'Satisfactory'
      : 'Needs Improvement';
  return { ...r, totalScore, maxTotal, percentage, status };
}

interface Props {
  results: StudentResult[];
  onUpdateResults: (u: StudentResult[]) => void;
}

export default function Dashboard({ results, onUpdateResults }: Props) {
  const [viewMode, setViewMode] = useState<'split' | 'analytics' | 'students'>('split');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Compute analytics
  const analytics = useMemo(() => calculateClassAnalytics(results), [results]);

  const maxQ = Math.max(...results.map((r) => r.questions.length), 0);
  const qCols = Array.from({ length: maxQ }, (_, i) => `Q${i + 1}`);

  // Filtered student list
  const filtered = useMemo(() => {
    return results.filter((r) => {
      const matchSearch = r.studentId.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [results, search, statusFilter]);

  const editScore = useCallback(
    (sid: string, qi: number, val: number) => {
      onUpdateResults(
        results.map((r) => {
          if (r.studentId !== sid) return r;
          const qs = r.questions.map((q, i) =>
            i === qi ? { ...q, score: Math.max(0, Math.min(q.maxScore, val)) } : q
          );
          return recalc({ ...r, questions: qs });
        })
      );
    },
    [results, onUpdateResults]
  );

  const exportXlsx = useCallback(() => {
    const rows = results.map((r) => {
      const row: Record<string, string | number> = { 'Student ID': r.studentId };
      r.questions.forEach((q, i) => {
        row[`Q${i + 1}`] = `${q.score}/${q.maxScore}`;
      });
      row['Total Marks'] = `${r.totalScore}/${r.maxTotal}`;
      row['Percentage'] = `${r.percentage}%`;
      row['IB Band Status'] = r.status;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'IB Evaluation Summary');
    XLSX.writeFile(wb, `IB_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [results]);

  const exportCsv = useCallback(() => {
    const h = ['Student ID', ...qCols, 'Total Marks', 'Percentage', 'Status'];
    const rows = results.map((r) => {
      const c = [r.studentId];
      for (let i = 0; i < maxQ; i++) {
        const q = r.questions[i];
        c.push(q ? `${q.score}/${q.maxScore}` : '-');
      }
      c.push(`${r.totalScore}/${r.maxTotal}`, `${r.percentage}%`, r.status);
      return c.join(',');
    });
    const blob = new Blob([[h.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `IB_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [results, qCols, maxQ]);

  // Empty state overview
  if (!results.length) {
    return (
      <div className={`panel ${styles.emptyGuide}`}>
        <div className={styles.emptyIconWrap}>
          <Layers size={22} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          Evaluation Dashboard & Analytics
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: 12, maxWidth: 440, marginTop: 4, textAlign: 'center' }}>
          Upload student answer sheet PDFs on the left to generate the complete cohort matrix, individual student reviews, and visual competency graphs.
        </p>

        <div className={styles.guideGrid}>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>01 · Ingest</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>Bulk Ingestion</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              Upload individual or batch student answer sheet PDFs.
            </div>
          </div>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>02 · Extract</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>PaddleOCR-VL</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              High-accuracy layout analysis & handwritten handwriting conversion.
            </div>
          </div>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>03 · Analyze</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>IB Standards & Graphs</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              Automated mark bands, student radars, and cohort reviews.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showAnalytics = viewMode === 'split' || viewMode === 'analytics';
  const showStudents = viewMode === 'split' || viewMode === 'students';

  return (
    <div className={styles.container}>
      {/* ── Top Dashboard Toolbar (View Switcher & Global Actions) ── */}
      <div className={styles.topToolbar}>
        {/* Left: View Mode Segmented Controls */}
        <div className={styles.viewModeGroup}>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'split' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('split')}
            title="Show overall analytics and student matrix together"
          >
            <Split size={13} />
            <span>Split View</span>
          </button>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'analytics' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('analytics')}
            title="Focus on Class Overview, Graphs, and AI Synthesis"
          >
            <BarChart3 size={13} />
            <span>Class Overview</span>
          </button>
          <button
            type="button"
            className={`${styles.viewModeBtn} ${viewMode === 'students' ? styles.viewModeBtnActive : ''}`}
            onClick={() => setViewMode('students')}
            title="Focus on Student Scorecards and Question Feedback"
          >
            <LayoutGrid size={13} />
            <span>Student Matrix ({results.length})</span>
          </button>
        </div>

        {/* Right: Export Controls */}
        <div className={styles.exportGroup}>
          <button className="btn btn-ghost" onClick={exportCsv} title="Export CSV report">
            <Download size={13} /> CSV
          </button>
          <button className="btn btn-ghost" onClick={exportXlsx} title="Export formatted Excel report">
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>

      {/* ── SECTION A: CLASS OVERVIEW & OVERALL GRAPHS ── */}
      {showAnalytics && analytics && (
        <div className={styles.overviewSection}>
          {/* Top KPI Cards Strip */}
          <div className={styles.statsRow}>
            <div className={`card ${styles.statCard}`}>
              <span className={styles.statLbl}>Evaluated</span>
              <div className={styles.statVal} style={{ color: 'var(--accent-light)' }}>
                <Users size={15} /> {analytics.totalStudents}
              </div>
            </div>

            <div className={`card ${styles.statCard}`}>
              <span className={styles.statLbl}>Class Average</span>
              <div
                className={styles.statVal}
                style={{
                  color:
                    analytics.classAverage >= 70
                      ? 'var(--green)'
                      : analytics.classAverage >= 50
                      ? 'var(--amber)'
                      : 'var(--red)',
                }}
              >
                <TrendingUp size={15} /> {analytics.classAverage}%
              </div>
            </div>

            <div className={`card ${styles.statCard}`}>
              <span className={styles.statLbl}>Pass Rate (≥50%)</span>
              <div className={styles.statVal} style={{ color: 'var(--green)' }}>
                <Award size={15} /> {analytics.passRate}%
              </div>
            </div>

            <div className={`card ${styles.statCard}`}>
              <span className={styles.statLbl}>Distinction (≥85%)</span>
              <div className={styles.statVal} style={{ color: 'var(--accent-light)' }}>
                {analytics.distinctionRate}%{' '}
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  ({analytics.bandDistribution.find((b) => b.name === 'Excellent')?.count || 0})
                </span>
              </div>
            </div>
          </div>

          {/* Graphs Grid (Question Mastery Bar Chart + Band Distribution Donut) */}
          <div className={styles.chartsGrid}>
            <ClassQuestionBarChart
              stats={analytics.questionStats}
              classAverage={analytics.classAverage}
            />
            <GradeDistributionDonut
              distribution={analytics.bandDistribution}
              totalStudents={analytics.totalStudents}
            />
          </div>

          {/* Class-Wide Overall AI Synthesis Review Card */}
          <div className={`card ${styles.classReviewCard}`}>
            <div className={styles.classReviewHeader}>
              <div className={styles.reviewBadge}>
                <Sparkles size={13} />
                <span>Overall Class AI Review & Diagnostic</span>
              </div>
              <span className={styles.cohortMetaTag}>Cohort Synthesis</span>
            </div>

            <p className={styles.reviewSummaryText}>{analytics.overallReview.summary}</p>

            <div className={styles.reviewColumns}>
              {/* Strengths */}
              <div className={styles.reviewColBox}>
                <div className={styles.reviewColTitle} style={{ color: 'var(--green)' }}>
                  <CheckCircle2 size={13} />
                  <span>Key Class Strengths</span>
                </div>
                <ul className={styles.reviewList}>
                  {analytics.overallReview.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses / Focus Areas */}
              <div className={styles.reviewColBox}>
                <div className={styles.reviewColTitle} style={{ color: 'var(--amber)' }}>
                  <AlertTriangle size={13} />
                  <span>Common Misconceptions / Gaps</span>
                </div>
                <ul className={styles.reviewList}>
                  {analytics.overallReview.weaknesses.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className={styles.reviewColBox}>
                <div className={styles.reviewColTitle} style={{ color: 'var(--accent-light)' }}>
                  <Lightbulb size={13} />
                  <span>Teaching Recommendations</span>
                </div>
                <ul className={styles.reviewList}>
                  {analytics.overallReview.recommendations.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION B: STUDENT EVALUATION MATRIX & DOSSIERS ── */}
      {showStudents && (
        <div className={styles.matrixSection}>
          {/* Controls Bar (Search & IB Band Filter) */}
          <div className={styles.controlsBar}>
            <div className={styles.searchBox}>
              <Search size={13} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search Student ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: 28, height: 30 }}
              />
            </div>

            <div className={styles.filterGroup}>
              {['ALL', 'EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS IMPROVEMENT'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`${styles.filterBtn} ${statusFilter === st ? styles.filterBtnActive : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'NEEDS IMPROVEMENT' ? 'NEEDS IMP.' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Student Matrix Table & Expandable Dossiers */}
          <div className={`card ${styles.tableCard}`}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    {qCols.map((q) => (
                      <th key={q}>{q}</th>
                    ))}
                    <th>Total Marks</th>
                    <th>Percentage</th>
                    <th>IB Band</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Student Report</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={qCols.length + 5}
                        style={{ textAlign: 'center', padding: '36px', color: 'var(--text-3)' }}
                      >
                        No student records match the filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const isExpanded = expandedId === r.studentId;
                      const studentReview = generateStudentReview(r, analytics);

                      return (
                        <React.Fragment key={r.studentId}>
                          <tr
                            className={isExpanded ? styles.tableRowSelected : ''}
                            onClick={() => setExpandedId(isExpanded ? null : r.studentId)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className={styles.sid}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={13} color="var(--accent-light)" />
                                <span>{r.studentId}</span>
                              </div>
                            </td>
                            {qCols.map((_, i) => {
                              const q = r.questions[i];
                              return (
                                <td key={i}>
                                  {q ? (
                                    <span className={`score ${scoreClass(q.score, q.maxScore)}`}>
                                      {q.score}/{q.maxScore}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-3)' }}>-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td>
                              <span className={`score ${scoreClass(r.totalScore, r.maxTotal)}`}>
                                {r.totalScore}/{r.maxTotal}
                              </span>
                            </td>
                            <td
                              className={styles.pct}
                              style={{
                                color:
                                  r.percentage >= 70
                                    ? 'var(--green)'
                                    : r.percentage >= 50
                                    ? 'var(--amber)'
                                    : 'var(--red)',
                              }}
                            >
                              {r.percentage}%
                            </td>
                            <td>
                              <span className={`badge ${badgeClass(r.status)}`}>{r.status}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: '3px 8px', fontSize: 11, gap: 4 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedId(isExpanded ? null : r.studentId);
                                }}
                              >
                                <span>{isExpanded ? 'Close' : 'Review'}</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            </td>
                          </tr>

                          {/* ── EXPANDED DETAILED STUDENT DOSSIER ── */}
                          {isExpanded && (
                            <tr className={styles.detailRow}>
                              <td colSpan={qCols.length + 5}>
                                <div className={styles.dossierContainer}>
                                  {/* Student Header Bar */}
                                  <div className={styles.dossierHeader}>
                                    <div className={styles.dossierHeaderLeft}>
                                      <RadialProgressRing
                                        percentage={r.percentage}
                                        size={54}
                                        strokeWidth={5}
                                        color={
                                          r.percentage >= 70
                                            ? 'var(--green)'
                                            : r.percentage >= 50
                                            ? 'var(--amber)'
                                            : 'var(--red)'
                                        }
                                      />
                                      <div>
                                        <div className={styles.dossierTitle}>
                                          Candidate Dossier: {r.studentId}
                                        </div>
                                        <div className={styles.dossierSub}>
                                          IB Mark Band:{' '}
                                          <span className={`badge ${badgeClass(r.status)}`}>
                                            {r.status}
                                          </span>{' '}
                                          · Total Marks:{' '}
                                          <strong style={{ color: 'var(--text)' }}>
                                            {r.totalScore}/{r.maxTotal}
                                          </strong>
                                        </div>
                                      </div>
                                    </div>

                                    <div className={styles.dossierHeaderRight}>
                                      <span className={styles.dossierHint}>
                                        Scores recalculate live upon editing question marks below.
                                      </span>
                                    </div>
                                  </div>

                                  {/* Top Row: Student Review Card + Student Graph */}
                                  <div className={styles.dossierTopGrid}>
                                    {/* Student Diagnostic AI Review */}
                                    <div className={styles.studentReviewBox}>
                                      <div className={styles.studentReviewTitle}>
                                        <Sparkles size={13} color="var(--accent-light)" />
                                        <span>Candidate AI Assessment & Diagnostics</span>
                                      </div>

                                      <p className={styles.studentReviewSummary}>
                                        {studentReview.summary}
                                      </p>

                                      <div className={styles.studentReviewPoints}>
                                        <div className={styles.reviewPoint}>
                                          <span className={styles.pointLabel} style={{ color: 'var(--green)' }}>
                                            Key Strengths:
                                          </span>
                                          <ul className={styles.pointList}>
                                            {studentReview.strengths.map((st, idx) => (
                                              <li key={idx}>{st}</li>
                                            ))}
                                          </ul>
                                        </div>

                                        <div className={styles.reviewPoint}>
                                          <span className={styles.pointLabel} style={{ color: 'var(--amber)' }}>
                                            Areas for Growth:
                                          </span>
                                          <ul className={styles.pointList}>
                                            {studentReview.weaknesses.map((wk, idx) => (
                                              <li key={idx}>{wk}</li>
                                            ))}
                                          </ul>
                                        </div>

                                        <div className={styles.reviewPoint}>
                                          <span className={styles.pointLabel} style={{ color: 'var(--accent-light)' }}>
                                            Examiner Recommendation:
                                          </span>
                                          <p className={styles.recommendationText}>
                                            {studentReview.recommendation}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Student Performance Competency Radar Graph */}
                                    <div className={styles.studentGraphBox}>
                                      <StudentRadarChart
                                        questions={r.questions}
                                        classStats={analytics}
                                      />
                                    </div>
                                  </div>

                                  {/* Bottom Row: Question Adjustments & PaddleOCR Text */}
                                  <div className={styles.dossierBottomGrid}>
                                    {/* Left: Question Breakdown & Mark Editor */}
                                    <div className={styles.qList}>
                                      <div className={styles.sectionSubTitle}>
                                        Question-wise Feedback & Mark Adjustments
                                      </div>
                                      {r.questions.map((q, qi) => (
                                        <div key={q.id} className={styles.qCard}>
                                          <span className={styles.qId}>{q.id}</span>
                                          <div className={styles.qCardBody}>
                                            <div className={styles.qFeedback}>{q.feedback}</div>
                                            {q.extractedAnswer && (
                                              <div className={styles.qAnswer}>
                                                Excerpt: &ldquo;{q.extractedAnswer}&rdquo;
                                              </div>
                                            )}
                                          </div>
                                          <div className={styles.scoreAdjustWrap}>
                                            <input
                                              type="number"
                                              className={styles.editInput}
                                              value={q.score}
                                              min={0}
                                              max={q.maxScore}
                                              onClick={(e) => e.stopPropagation()}
                                              onChange={(e) =>
                                                editScore(
                                                  r.studentId,
                                                  qi,
                                                  parseInt(e.target.value) || 0
                                                )
                                              }
                                              title={`Adjust score for ${q.id}`}
                                            />
                                            <span className={styles.maxScoreLbl}>/{q.maxScore}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Right: PaddleOCR Raw Text Stream */}
                                    <div className={styles.ocrPreviewBox}>
                                      <div className={styles.ocrPreviewTitle}>
                                        <Eye size={12} />
                                        <span>PaddleOCR Extracted Stream</span>
                                      </div>
                                      <div className={styles.ocrTextScroll}>
                                        {r.ocrText || 'No raw text recorded.'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
