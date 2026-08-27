import { NextRequest, NextResponse } from 'next/server';

// Poll PaddleOCR job status. Returns state + OCR text when done.
export async function GET(request: NextRequest) {
  try {
    const JOB_URL = process.env.PADDLEOCR_API_URL!;
    const TOKEN = process.env.PADDLEOCR_TOKEN!;

    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const res = await fetch(`${JOB_URL}/${jobId}`, {
      headers: { Authorization: `bearer ${TOKEN}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `PaddleOCR poll error ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const state: string = data?.data?.state || 'unknown';
    const progress = data?.data?.extractProgress;

    if (state === 'done') {
      // Download the JSONL result and extract all markdown text
      const jsonlUrl = data?.data?.resultUrl?.jsonUrl;
      if (!jsonlUrl) {
        return NextResponse.json({ state: 'done', ocrText: '', error: 'No result URL' });
      }

      const jsonlRes = await fetch(jsonlUrl);
      if (!jsonlRes.ok) {
        return NextResponse.json({ state: 'done', ocrText: '', error: 'Failed to fetch results' });
      }

      const jsonlText = await jsonlRes.text();
      const lines = jsonlText.trim().split('\n');
      const markdownParts: string[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const results = parsed?.result?.layoutParsingResults;
          if (Array.isArray(results)) {
            for (const res of results) {
              const md = res?.markdown?.text;
              if (md) markdownParts.push(md);
            }
          }
        } catch {
          // skip unparseable lines
        }
      }

      const ocrText = markdownParts.join('\n\n---\n\n');
      return NextResponse.json({ state: 'done', ocrText });
    }

    if (state === 'failed') {
      const errorMsg = data?.data?.errorMsg || 'Unknown failure';
      return NextResponse.json({ state: 'failed', error: errorMsg });
    }

    // Still running or pending
    return NextResponse.json({
      state,
      totalPages: progress?.totalPages,
      extractedPages: progress?.extractedPages,
    });
  } catch (err) {
    console.error('OCR poll error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Poll failed' },
      { status: 500 },
    );
  }
}
