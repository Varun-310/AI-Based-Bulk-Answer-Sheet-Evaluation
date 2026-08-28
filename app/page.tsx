'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2, Trash2, Cpu,
} from 'lucide-react';
import Uploader from './components/Uploader';
import Dashboard, { StudentResult } from './components/Dashboard';

const STORAGE_KEY = 'ib-answer-sheet-results';

export default function Home() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setResults(JSON.parse(s));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch {
      // ignore
    }
  }, [results]);

  const handleProcessComplete = useCallback((newResults: Record<string, unknown>[]) => {
    setResults((prev) => {
      const next = [...prev];
      for (const item of newResults) {
        const t = item as unknown as StudentResult;
        const idx = next.findIndex((e) => e.studentId === t.studentId);
        if (idx >= 0) next[idx] = t;
        else next.push(t);
      }
      return next;
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setResults([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* ── Top Navigation Header (100% Width) ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            <FileCheck2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>
              AI Answer Sheet Evaluation Suite
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Automated OCR Ingestion & IB Standards Scoring
            </div>
          </div>
        </div>

        {/* Engine Tags & Quick Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: 11,
              color: 'var(--text-2)',
            }}
          >
            <Cpu size={12} color="var(--accent-light)" />
            <span>PaddleOCR-VL + OpenRouter (Llama 3.3 70B)</span>
          </div>

          {results.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '3px 8px', fontSize: 11 }}
              onClick={handleClearAll}
              title="Clear all student records"
            >
              <Trash2 size={12} /> Clear Data
            </button>
          )}
        </div>
      </header>

      {/* ── Main Full-Screen Body Grid ── */}
      <main
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 380px) 1fr',
          gap: 16,
          padding: '16px 20px',
          maxWidth: '100vw',
          width: '100%',
        }}
      >
        {/* Left Side: Upload & Queue Ingestion Panel */}
        <section
          className="panel"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            height: 'fit-content',
            minHeight: 'calc(100vh - 90px)',
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Document Ingestion
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
              Upload handwritten or printed answer scripts
            </div>
          </div>

          <Uploader
            onProcessComplete={handleProcessComplete}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </section>

        {/* Right Side: Evaluation Matrix, Analytics & Inspector */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 'calc(100vh - 90px)',
          }}
        >
          <Dashboard
            results={results}
            onUpdateResults={setResults}
          />
        </section>
      </main>

      {/* ── Subtitle Footer ── */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 24px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-subtle)',
          fontSize: 11,
          color: 'var(--text-3)',
        }}
      >
        <span>AI-Based Bulk Answer Sheet Evaluation Demo</span>
        <span>IB Mark Band Scale (0–7) · PaddleOCR-VL-1.6 · Google Gemini</span>
      </footer>
    </div>
  );
}
