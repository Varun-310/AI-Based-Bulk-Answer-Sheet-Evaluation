'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, XCircle, X,
  Loader2, Rocket, Trash2,
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

  const processOne = useCallback(
    async (entry: FileEntry): Promise<Record<string, unknown> | null> => {
      const studentId = entry.file.name.replace(/\.[^/.]+$/, '');

      // 1 — upload
      update(entry.id, { status: 'uploading', progress: 'Uploading…' });
      const fd = new FormData();
      fd.append('file', entry.file);
      const submitRes = await fetch('/api/ocr/submit', { method: 'POST', body: fd });
      if (!submitRes.ok) throw new Error((await submitRes.json().catch(() => ({}))).error || 'Upload failed');
      const { jobId } = await submitRes.json();

      // 2 — poll OCR
      update(entry.id, { status: 'ocr', progress: 'Running OCR…' });
      let ocrText = '';
      for (let i = 0; i < 60; i++) {
        await sleep(3000);
        const pr = await fetch(`/api/ocr/poll?jobId=${jobId}`);
        if (!pr.ok) throw new Error('Poll failed');
        const pd = await pr.json();
        if (pd.state === 'done') { ocrText = pd.ocrText || ''; break; }
        if (pd.state === 'failed') throw new Error(pd.error || 'OCR failed');
        const pg = pd.extractedPages != null ? ` ${pd.extractedPages}/${pd.totalPages}` : '';
        update(entry.id, { progress: `OCR${pg}…` });
      }
      if (!ocrText) throw new Error('OCR returned empty');

      // 3 — evaluate
      update(entry.id, { status: 'evaluating', progress: 'Evaluating…' });
      const er = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrText, studentId }),
      });
      if (!er.ok) throw new Error((await er.json().catch(() => ({}))).error || 'Eval failed');
      return await er.json();
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
        update(e.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed', progress: undefined });
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
    <div>
      <div
        className={`${styles.zone} ${dragOver ? styles.zoneDrag : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); add(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button" tabIndex={0} aria-label="Upload PDF files"
      >
        <Upload size={32} strokeWidth={1.5} className={styles.zoneIcon} />
        <h3 className={styles.zoneTitle}>Drop answer sheet PDFs here</h3>
        <p className={styles.zoneSub}>or click to browse · PDF only</p>
        <input
          ref={inputRef} type="file" accept=".pdf" multiple className={styles.hidden}
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }}
        />
      </div>

      {files.length > 0 && (
        <>
          <div className={styles.list}>
            {files.map((f) => (
              <div key={f.id} className={styles.item}>
                <span className={styles.itemIcon}>
                  {f.status === 'done' ? <CheckCircle2 size={16} color="var(--green)" /> :
                   f.status === 'error' ? <XCircle size={16} color="var(--red)" /> :
                   <FileText size={16} />}
                </span>
                <div className={styles.itemInfo}>
                  <div className={styles.itemName}>{f.file.name}</div>
                  <div className={styles.itemMeta}>
                    {fmtSize(f.file.size)}
                    {f.error && <span className={styles.itemError}>{f.error}</span>}
                  </div>
                </div>
                <div className={`${styles.itemStatus} ${
                  f.status === 'queued' ? styles.stQueued :
                  isActive(f.status) ? styles.stActive :
                  f.status === 'done' ? styles.stDone : styles.stErr
                }`}>
                  {isActive(f.status) && <span className="spinner" />}
                  {f.progress || (f.status === 'queued' ? 'Queued' : f.status === 'done' ? 'Done' : f.status === 'error' ? 'Failed' : '')}
                </div>
                {f.status === 'queued' && (
                  <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((x) => x.id !== f.id)); }} title="Remove">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={processAll} disabled={isProcessing || queuedN === 0}>
              {isProcessing ? <><Loader2 size={14} className="spinner" /> Processing…</> : <><Rocket size={14} /> Evaluate {queuedN}</>}
            </button>
            {files.some((f) => f.status === 'done' || f.status === 'error') && (
              <button className="btn btn-ghost" onClick={() => setFiles((p) => p.filter((f) => f.status !== 'done' && f.status !== 'error'))}>
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
