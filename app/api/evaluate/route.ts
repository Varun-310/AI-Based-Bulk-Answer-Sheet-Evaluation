import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { ocrText, studentId } = await request.json();

    if (!ocrText || !studentId) {
      return NextResponse.json({ error: 'Missing ocrText or studentId' }, { status: 400 });
    }

    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
    let result = null;
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (e) {
        lastError = e;
        console.warn(`Model ${modelName} failed, trying next...`, e);
      }
    }

    if (!result) {
      throw lastError || new Error('All Gemini models failed');
    }
    const responseText = result.response.text();

    // Strip markdown code blocks if present
    const cleaned = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    let questions;
    try {
      const parsed = JSON.parse(cleaned);
      questions = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        questions = [
          {
            id: 'Q1',
            score: 0,
            maxScore: 7,
            feedback: 'Could not parse evaluation. Please review manually.',
            extractedAnswer: ocrText.substring(0, 120),
          },
        ];
      }
    }

    // Calculate totals
    const totalScore = questions.reduce((s: number, q: { score: number }) => s + q.score, 0);
    const maxTotal = questions.reduce((s: number, q: { maxScore: number }) => s + q.maxScore, 0);
    const percentage = maxTotal > 0 ? Math.round((totalScore / maxTotal) * 100) : 0;

    let status: string;
    if (percentage >= 85) status = 'Excellent';
    else if (percentage >= 70) status = 'Good';
    else if (percentage >= 55) status = 'Satisfactory';
    else status = 'Needs Improvement';

    return NextResponse.json({
      studentId,
      questions,
      totalScore,
      maxTotal,
      percentage,
      status,
      ocrText: ocrText.substring(0, 500),
    });
  } catch (err) {
    console.error('Evaluate error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Evaluation failed' },
      { status: 500 },
    );
  }
}
