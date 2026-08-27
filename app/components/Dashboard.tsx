'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Users, TrendingUp, Award, ChevronDown, ChevronUp,
  Download, FileSpreadsheet, Search, Eye,
  Sparkles, Layers,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './Dashboard.module.css';

interface QuestionScore {
  id: string;
  score: number;
  maxScore: number;
  feedback: string;
  extractedAnswer: string;
}

export interface StudentResult {
  studentId: string;
  questions: QuestionScore[];
  totalScore: number;
  maxTotal: number;
  percentage: number;
  status: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Error';
  ocrText: string;
}

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
    percentage >= 85 ? 'Excellent' : percentage >= 70 ? 'Good' : percentage >= 55 ? 'Satisfactory' : 'Needs Improvement';
  return { ...r, totalScore, maxTotal, percentage, status };
}

interface Props {
  results: StudentResult[];
  onUpdateResults: (u: StudentResult[]) => void;
  onLoadSamples?: () => void;
}

export default function Dashboard({ results, onUpdateResults, onLoadSamples }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const maxQ = Math.max(...results.map((r) => r.questions.length), 0);
  const qCols = Array.from({ length: maxQ }, (_, i) => `Q${i + 1}`);

  // Summary Metrics
  const total = results.length;
  const avg = total > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / total) : 0;
  const passN = results.filter((r) => r.percentage >= 50).length;
  const passRate = total > 0 ? Math.round((passN / total) * 100) : 0;
  const excellentN = results.filter((r) => r.status === 'Excellent').length;

  // Filtered List
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
        <div style={{
          display: 'inline-flex',
          padding: 8,
          borderRadius: 8,
          background: 'var(--accent-dim)',
          color: 'var(--accent-light)',
          marginBottom: 12
        }}>
          <Layers size={24} />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Evaluation Matrix & Analytics</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 12, maxWidth: 440, marginTop: 4 }}>
          Upload student answer sheets to view the question-wise mark matrix, automated feedback, and IB grade distributions.
        </p>

        <div className={styles.guideGrid}>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>STEP 01</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>Bulk Ingestion</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              Upload individual or multi-page student answer sheet PDFs.
            </div>
          </div>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>STEP 02</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>PaddleOCR Extraction</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              Extracts both handwritten script and printed exam text.
            </div>
          </div>
          <div className={styles.guideStep}>
            <div className={styles.guideStepNum}>STEP 03</div>
            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>IB Standards Scoring</div>
            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>
              Gemini breaks down answers (Q1–Qn) and assigns 0–7 mark bands.
            </div>
          </div>
        </div>

        {onLoadSamples && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 24, padding: '8px 16px', fontSize: 12 }}
            onClick={onLoadSamples}
          >
            <Sparkles size={14} /> Load Sample Student Dataset
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Stats Strip */}
      <div className={styles.statsRow}>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLbl}>Evaluated</span>
          <div className={styles.statVal} style={{ color: 'var(--accent-light)' }}>
            <Users size={16} /> {total}
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLbl}>Class Average</span>
          <div
            className={styles.statVal}
            style={{
              color: avg >= 70 ? 'var(--green)' : avg >= 50 ? 'var(--amber)' : 'var(--red)',
            }}
          >
            <TrendingUp size={16} /> {avg}%
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLbl}>Pass Rate (≥50%)</span>
          <div className={styles.statVal} style={{ color: 'var(--green)' }}>
            <Award size={16} /> {passRate}%
          </div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <span className={styles.statLbl}>Distinction (≥85%)</span>
          <div className={styles.statVal} style={{ color: 'var(--accent-light)' }}>
            {excellentN} <span style={{ fontSize: 11, color: 'var(--text-3)' }}>({total > 0 ? Math.round((excellentN / total) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className={styles.controlsBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, maxWidth: 360 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
            <input
              type="text"
              placeholder="Search Student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: 26, height: 30 }}
            />
          </div>
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

        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost" onClick={exportCsv} title="Export CSV report">
            <Download size={13} /> CSV
          </button>
          <button className="btn btn-ghost" onClick={exportXlsx} title="Export formatted Excel report">
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>

      {/* Main Results Table */}
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
                <th style={{ width: 60, textAlign: 'center' }}>Review</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={qCols.length + 5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)' }}>
                    No student records match the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <React.Fragment key={r.studentId}>
                    <tr>
                      <td className={styles.sid}>{r.studentId}</td>
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
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => setExpandedId(expandedId === r.studentId ? null : r.studentId)}
                        >
                          {expandedId === r.studentId ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Detailed Inspector View */}
                    {expandedId === r.studentId && (
                      <tr className={styles.detailRow}>
                        <td colSpan={qCols.length + 5}>
                          <div className={styles.detailContent}>
                            {/* Left: Question Breakdown & Scoring Override */}
                            <div className={styles.qList}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Question-wise Feedback & Mark Adjustments
                              </div>
                              {r.questions.map((q, qi) => (
                                <div key={q.id} className={styles.qCard}>
                                  <span className={styles.qId}>{q.id}</span>
                                  <div>
                                    <div className={styles.qFeedback}>{q.feedback}</div>
                                    {q.extractedAnswer && (
                                      <div className={styles.qAnswer}>
                                        Excerpt: &ldquo;{q.extractedAnswer}&rdquo;
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <input
                                      type="number"
                                      className={styles.editInput}
                                      value={q.score}
                                      min={0}
                                      max={q.maxScore}
                                      onChange={(e) =>
                                        editScore(r.studentId, qi, parseInt(e.target.value) || 0)
                                      }
                                      title={`Adjust score for ${q.id}`}
                                    />
                                    <span style={{ color: 'var(--text-3)', fontSize: 11 }}>/{q.maxScore}</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Right: OCR Raw Text Preview */}
                            <div className={styles.ocrPreviewBox}>
                              <div className={styles.ocrPreviewTitle}>
                                <Eye size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
                                PaddleOCR Extracted Text
                              </div>
                              <div className={styles.ocrTextScroll}>
                                {r.ocrText || 'No raw text stream recorded.'}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
