'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Zap, Trash2 } from 'lucide-react';
import Uploader from './components/Uploader';
import Dashboard, { StudentResult } from './components/Dashboard';

const KEY = 'answer-eval-results';

export default function Home() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const dashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setResults(JSON.parse(s)); } catch { /* */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(results)); } catch { /* */ }
  }, [results]);

  const onDone = useCallback((r: Record<string, unknown>[]) => {
    setResults((prev) => {
      const next = [...prev];
      for (const item of r) {
        const t = item as unknown as StudentResult;
        const idx = next.findIndex((e) => e.studentId === t.studentId);
        if (idx >= 0) next[idx] = t; else next.push(t);
      }
      return next;
    });
    setTimeout(() => dashRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, []);

  return (
    <main style={{ position: 'relative', width: '100%', maxWidth: '100%', padding: '32px 40px 60px' }}>
      {/* Header row */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', background: 'var(--accent-dim)',
            border: '1px solid rgba(129,140,248,0.15)',
            borderRadius: 999, fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            marginBottom: 10,
          }}>
            <Zap size={12} /> PaddleOCR + Gemini
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
            Answer Sheet Evaluator
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
            Upload student PDFs for automated OCR extraction and IB-standard scoring.
          </p>
        </div>
      </header>

      {/* Two-column layout: Upload left, results right — stacks on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: results.length > 0 ? '360px 1fr' : '1fr', gap: 32, alignItems: 'start' }}>
        {/* Uploader */}
        <section style={{ maxWidth: results.length > 0 ? undefined : 560, justifySelf: results.length > 0 ? undefined : 'center' }}>
          <Uploader onProcessComplete={onDone} isProcessing={processing} setIsProcessing={setProcessing} />
        </section>

        {/* Dashboard */}
        {results.length > 0 && (
          <section ref={dashRef} style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setResults([]); localStorage.removeItem(KEY); }} style={{ fontSize: 12 }}>
                <Trash2 size={13} /> Clear all
              </button>
            </div>
            <Dashboard results={results} onUpdateResults={setResults} />
          </section>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', marginTop: 48, padding: '16px 0',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-3)', fontSize: 11,
      }}>
        AI-Based Bulk Answer Sheet Evaluation · Demo
      </footer>
    </main>
  );
}
