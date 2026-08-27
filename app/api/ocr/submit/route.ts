import { NextRequest, NextResponse } from 'next/server';

// Submit a PDF to PaddleOCR and return the jobId
export async function POST(request: NextRequest) {
  try {
    const JOB_URL = process.env.PADDLEOCR_API_URL!;
    const TOKEN = process.env.PADDLEOCR_TOKEN!;
    const MODEL = process.env.PADDLEOCR_MODEL || 'PaddleOCR-VL-1.6';

    if (!JOB_URL || !TOKEN) {
      return NextResponse.json({ error: 'PaddleOCR not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Build multipart form to forward to PaddleOCR
    const ocrForm = new FormData();
    ocrForm.append('file', file);
    ocrForm.append('model', MODEL);
    ocrForm.append(
      'optionalPayload',
      JSON.stringify({
        useDocOrientationClassify: false,
        useDocUnwarping: false,
        useChartRecognition: false,
      }),
    );

    const jobResponse = await fetch(JOB_URL, {
      method: 'POST',
      headers: { Authorization: `bearer ${TOKEN}` },
      body: ocrForm,
    });

    if (!jobResponse.ok) {
      const errText = await jobResponse.text();
      console.error('PaddleOCR submit error:', jobResponse.status, errText);
      return NextResponse.json(
        { error: `PaddleOCR error ${jobResponse.status}: ${errText}` },
        { status: 502 },
      );
    }

    const jobData = await jobResponse.json();
    const jobId = jobData?.data?.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'No jobId returned from PaddleOCR', raw: jobData },
        { status: 502 },
      );
    }

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error('OCR submit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Submit failed' },
      { status: 500 },
    );
  }
}
