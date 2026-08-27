'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, XCircle, X,
  Loader2, Play, Trash2, Sparkles,
} from 'lucide-react';
import styles from './Uploader.module.css';

export interface FileEntry {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'ocr' | 'evaluating' | 'done' | 'error';
  progress?: string;
  error?: string;
}

interface Props {
  onProcessComplete: (results: Record<string, unknown>[]) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Uploader({ onProcessComplete, isProcessing, setIsProcessing }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const update = useCallback((id: string, u: Partial<FileEntry>) => {
    setFiles((p) => p.map((f) => (f.id === id ? { ...f, ...u } : f)));
  }, []);

  const add = useCallback((list: FileList | File[]) => {
    const entries: FileEntry[] = Array.from(list)
      .filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        status: 'queued' as const,
      }));
    setFiles((p) => [...p, ...entries]);
  }, []);

  // Quick load 3 test PDFs
  const loadTestSamples = useCallback(async () => {
    try {
      setLoadingSamples(true);
      const res = await fetch('/api/sample-pdfs');
      const data = await res.json();
      if (data.files && Array.isArray(data.files)) {
        const loadedFiles: File[] = [];
        for (const item of data.files) {
          const byteCharacters = atob(item.base64.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const file = new File([blob], item.name, { type: 'application/pdf' });
          loadedFiles.push(file);
        }
        add(loadedFiles);
      }
    } catch (e) {
      console.error('Failed to load sample PDFs', e);
    } finally {
      setLoadingSamples(false);
    }
  }, [add]);

  const processOne = useCallback(
    async (entry: FileEntry): Promise<Record<string, unknown> | null> => {
      const studentId = entry.file.name.replace(/\.[^/.]+$/, '');

      // 1 — upload to PaddleOCR
      update(entry.id, { status: 'uploading', progress: 'Uploading PDF…' });
      const fd = new FormData();
      fd.append('file', entry.file);
      const submitRes = await fetch('/api/ocr/submit', { method: 'POST', body: fd });
      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${submitRes.status})`);
      }
      const { jobId } = await submitRes.json();

      // 2 — poll OCR
      update(entry.id, { status: 'ocr', progress: 'PaddleOCR-VL…' });
      let ocrText = '';
      for (let i = 0; i < 60; i++) {
        await sleep(3000);
        const pr = await fetch(`/api/ocr/poll?jobId=${jobId}`);
        if (!pr.ok) throw new Error('OCR Poll failed');
        const pd = await pr.json();
        if (pd.state === 'done') {
          ocrText = pd.ocrText || '';
          break;
        }
        if (pd.state === 'failed') {
          throw new Error(pd.error || 'OCR failed');
        }
        const pg = pd.extractedPages != null ? ` (${pd.extractedPages}/${pd.totalPages || 1}p)` : '';
        update(entry.id, { progress: `OCR${pg}…` });
      }

      if (!ocrText) throw new Error('OCR returned no readable text');

      // 3 — evaluate with OpenRouter (with 1 automatic retry)
      update(entry.id, { status: 'evaluating', progress: 'AI Scoring…' });
      
      let evalData = null;
      let lastEvalErr = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const er = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ocrText, studentId }),
          });
          if (er.ok) {
            evalData = await er.json();
            break;
          } else {
            const err = await er.json().catch(() => ({}));
            lastEvalErr = new Error(err.error || `Evaluation HTTP ${er.status}`);
          }
        } catch (err) {
          lastEvalErr = err instanceof Error ? err : new Error('Network error');
        }
        if (attempt < 2) {
          update(entry.id, { progress: 'Retrying Scoring…' });
          await sleep(1500);
        }
      }

      if (!evalData) {
        throw lastEvalErr || new Error('Evaluation failed');
      }

      return evalData;
    },
    [update],
  );

  const processAll = useCallback(async () => {
    const q = files.filter((f) => f.status === 'queued');
    if (!q.length) return;
    setIsProcessing(true);
    const results: Record<string, unknown>[] = [];
    for (const e of q) {
      try {
        const r = await processOne(e);
        if (r) results.push(r);
        update(e.id, { status: 'done', progress: undefined });
      } catch (err) {
        update(e.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed',
          progress: undefined,
        });
      }
    }
    if (results.length) onProcessComplete(results);
    setIsProcessing(false);
  }, [files, onProcessComplete, setIsProcessing, processOne, update]);

  const queuedN = files.filter((f) => f.status === 'queued').length;

  const fmtSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const isActive = (s: string) => s === 'uploading' || s === 'ocr' || s === 'evaluating';

  return (
    <div className={styles.container}>
      {/* Drop Zone */}
      <div
        className={`${styles.zone} ${dragOver ? styles.zoneDrag : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <Upload size={22} strokeWidth={1.75} className={styles.zoneIcon} />
        <div className={styles.zoneTitle}>Upload Answer Sheets</div>
        <div className={styles.zoneSub}>Drop PDF files here or click to browse</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          multiple
          className={styles.hidden}
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Quick Load Samples helper */}
      <div className={styles.quickBar}>
        <span style={{ color: 'var(--text-3)' }}>Demo Test Pack</span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '4px 8px', fontSize: 11 }}
          onClick={loadTestSamples}
          disabled={isProcessing || loadingSamples}
        >
          {loadingSamples ? <Loader2 size={12} className="spinner" /> : <Sparkles size={12} />}
          Load 3 Test PDFs
        </button>
      </div>

      {/* File Queue List */}
      <div>
        <div className={styles.queueHeader}>
          <span>Queue ({files.length})</span>
          {files.length > 0 && (
            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>
              {queuedN} pending
            </span>
          )}
        </div>

        <div className={styles.list}>
          {files.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              No PDFs in queue. Add student sheets above.
            </div>
          ) : (
            files.map((f) => (
              <div key={f.id} className={styles.item}>
                <div className={styles.itemIcon}>
                  {f.status === 'done' ? (
                    <CheckCircle2 size={15} color="var(--green)" />
                  ) : f.status === 'error' ? (
                    <XCircle size={15} color="var(--red)" />
                  ) : (
                    <FileText size={15} />
                  )}
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{f.file.name}</div>
                  <div className={styles.itemMeta}>
                    <span>{fmtSize(f.file.size)}</span>
                    {f.error && <span className={styles.itemError}>· {f.error}</span>}
                  </div>
                </div>
                <div
                  className={`${styles.itemStatus} ${
                    f.status === 'queued'
                      ? styles.stQueued
                      : isActive(f.status)
                      ? styles.stActive
                      : f.status === 'done'
                      ? styles.stDone
                      : styles.stErr
                  }`}
                >
                  {isActive(f.status) && <Loader2 size={12} className="spinner" />}
                  {f.progress ||
                    (f.status === 'queued'
                      ? 'Queued'
                      : f.status === 'done'
                      ? 'Evaluated'
                      : f.status === 'error'
                      ? 'Failed'
                      : '')}
                </div>
                {f.status === 'queued' && !isProcessing && (
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles((p) => p.filter((x) => x.id !== f.id));
                    }}
                    title="Remove"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Batch Action Buttons */}
      <div className={styles.actions}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={processAll}
          disabled={isProcessing || queuedN === 0}
        >
          {isProcessing ? (
            <>
              <Loader2 size={14} className="spinner" />
              Evaluating Batch...
            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />
              Evaluate {queuedN > 0 ? `(${queuedN})` : ''}
            </>
          )}
        </button>

        {files.some((f) => f.status === 'done' || f.status === 'error') && !isProcessing && (
          <button
            className="btn btn-ghost"
            onClick={() => setFiles((p) => p.filter((f) => f.status !== 'done' && f.status !== 'error'))}
            title="Clear finished"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
