'use client';

import React, { useState, useCallback } from 'react';
import {
  Users, TrendingUp, Award, ChevronDown, ChevronUp,
  Download, FileSpreadsheet, BarChart3,
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
  const p = (s / m) * 100;
  return p >= 70 ? 'score-high' : p >= 50 ? 'score-mid' : 'score-low';
}

function badgeClass(st: string) {
  return st === 'Excellent' ? 'badge-green' : st === 'Good' ? 'badge-accent' : st === 'Satisfactory' ? 'badge-amber' : 'badge-red';
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
}

export default function Dashboard({ results, onUpdateResults }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const maxQ = Math.max(...results.map((r) => r.questions.length), 0);
  const qCols = Array.from({ length: maxQ }, (_, i) => `Q${i + 1}`);

  const total = results.length;
  const avg = total > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / total) : 0;
  const passRate = total > 0 ? Math.round((results.filter((r) => r.percentage >= 50).length / total) * 100) : 0;

  const editScore = useCallback(
    (sid: string, qi: number, val: number) => {
      onUpdateResults(
        results.map((r) => {
          if (r.studentId !== sid) return r;
          const qs = r.questions.map((q, i) => (i === qi ? { ...q, score: Math.max(0, Math.min(q.maxScore, val)) } : q));
          return recalc({ ...r, questions: qs });
        }),
      );
    },
    [results, onUpdateResults],
  );

  const exportXlsx = useCallback(() => {
    const rows = results.map((r) => {
      const row: Record<string, string | number> = { 'Student ID': r.studentId };
      r.questions.forEach((q, i) => { row[`Q${i + 1}`] = `${q.score}/${q.maxScore}`; });
      row['Total'] = `${r.totalScore}/${r.maxTotal}`;
      row['%'] = `${r.percentage}%`;
      row['Status'] = r.status;
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `evaluation_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [results]);

  const exportCsv = useCallback(() => {
    const h = ['Student ID', ...qCols, 'Total', '%', 'Status'];
    const rows = results.map((r) => {
      const c = [r.studentId];
      for (let i = 0; i < maxQ; i++) { const q = r.questions[i]; c.push(q ? `${q.score}/${q.maxScore}` : '-'); }
      c.push(`${r.totalScore}/${r.maxTotal}`, `${r.percentage}%`, r.status);
      return c.join(',');
    });
    const blob = new Blob([[h.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evaluation_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }, [results, qCols, maxQ]);

  if (!results.length) {
    return (
      <div className={styles.empty}>
        <BarChart3 size={36} strokeWidth={1.2} className={styles.emptyIcon} />
        <p className={styles.emptyText}>Upload and process answer sheets to see results</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {/* Stats */}
      <div className={styles.stats}>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statVal} style={{ color: 'var(--accent)' }}><Users size={18} style={{ verticalAlign: -3, marginRight: 6 }} />{total}</div>
          <div className={styles.statLbl}>Students</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statVal} style={{ color: avg >= 70 ? 'var(--green)' : avg >= 50 ? 'var(--amber)' : 'var(--red)' }}>
            <TrendingUp size={18} style={{ verticalAlign: -3, marginRight: 6 }} />{avg}%
          </div>
          <div className={styles.statLbl}>Average</div>
        </div>
        <div className={`card ${styles.stat}`}>
          <div className={styles.statVal} style={{ color: 'var(--green)' }}>
            <Award size={18} style={{ verticalAlign: -3, marginRight: 6 }} />{passRate}%
          </div>
          <div className={styles.statLbl}>Pass Rate</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Results</span>
        <div className={styles.toolbarBtns}>
          <button className="btn btn-ghost" onClick={exportCsv}><Download size={14} /> CSV</button>
          <button className="btn btn-ghost" onClick={exportXlsx}><FileSpreadsheet size={14} /> Excel</button>
        </div>
      </div>

      {/* Table */}
      <div className={`${styles.tableWrap} card`}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student ID</th>
              {qCols.map((q) => <th key={q}>{q}</th>)}
              <th>Total</th>
              <th>%</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <React.Fragment key={r.studentId}>
                <tr>
                  <td className={styles.sid}>{r.studentId}</td>
                  {qCols.map((_, i) => {
                    const q = r.questions[i];
                    return <td key={i}>{q ? <span className={`score ${scoreClass(q.score, q.maxScore)}`}>{q.score}/{q.maxScore}</span> : '-'}</td>;
                  })}
                  <td><span className={`score ${scoreClass(r.totalScore, r.maxTotal)}`}>{r.totalScore}/{r.maxTotal}</span></td>
                  <td className={styles.pct} style={{ color: r.percentage >= 70 ? 'var(--green)' : r.percentage >= 50 ? 'var(--amber)' : 'var(--red)' }}>{r.percentage}%</td>
                  <td><span className={`badge ${badgeClass(r.status)}`}>{r.status}</span></td>
                  <td>
                    <button className={styles.expandBtn} onClick={() => setExpandedId(expandedId === r.studentId ? null : r.studentId)}>
                      {expandedId === r.studentId ? <><ChevronUp size={14} /> Hide</> : <><ChevronDown size={14} /> View</>}
                    </button>
                  </td>
                </tr>
                {expandedId === r.studentId && (
                  <tr className={styles.detailRow}>
                    <td colSpan={qCols.length + 5}>
                      <div className={styles.detailContent}>
                        <div className={styles.detailGrid}>
                          {r.questions.map((q, qi) => (
                            <div key={q.id} className={styles.qCard}>
                              <span className={styles.qId}>{q.id}</span>
                              <div>
                                <div className={styles.qFeedback}>{q.feedback}</div>
                                {q.extractedAnswer && <div className={styles.qAnswer}>&ldquo;{q.extractedAnswer}&rdquo;</div>}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="number" className={styles.editInput}
                                  value={q.score} min={0} max={q.maxScore}
                                  onChange={(e) => editScore(r.studentId, qi, parseInt(e.target.value) || 0)}
                                  title={`Edit score for ${q.id}`}
                                />
                                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>/{q.maxScore}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
