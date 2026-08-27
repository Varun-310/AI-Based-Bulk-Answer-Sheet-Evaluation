import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Answer Sheet Evaluator',
    timestamp: new Date().toISOString(),
    env: {
      paddleocr: !!process.env.PADDLEOCR_API_URL,
      gemini: !!process.env.GEMINI_API_KEY,
    },
  });
}
