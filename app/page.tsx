'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck2, Trash2, Cpu,
} from 'lucide-react';
import Uploader from './components/Uploader';
import Dashboard, { StudentResult } from './components/Dashboard';
import styles from './page.module.css';

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
    <div className={styles.appWrapper}>
      {/* ── Top Navigation Header (100% Width) ── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <FileCheck2 size={16} />
          </div>
          <div>
            <div className={styles.brandTitle}>
              AI Answer Sheet Evaluation Suite
            </div>
            <div className={styles.brandSub}>
              Automated OCR Ingestion & IB Standards Scoring
            </div>
          </div>
        </div>

        {/* Engine Tags & Quick Controls */}
        <div className={styles.headerActions}>
          <div className={styles.engineBadge}>
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

      {/* ── Main Responsive Body Grid ── */}
      <main className={styles.mainGrid}>
        {/* Left Side: Upload & Queue Ingestion Panel */}
        <section className={`panel ${styles.ingestionSection}`}>
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
        <section className={styles.dashboardSection}>
          <Dashboard
            results={results}
            onUpdateResults={setResults}
          />
        </section>
      </main>

      {/* ── Subtitle Footer ── */}
      <footer className={styles.footer}>
        <span>AI-Based Bulk Answer Sheet Evaluation Demo</span>
        <span>IB Mark Band Scale (0–7) · PaddleOCR-VL-1.6 · Google Gemini</span>
      </footer>
    </div>
  );
}
