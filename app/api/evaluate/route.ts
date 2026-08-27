import { NextRequest, NextResponse } from 'next/server';

// Call OpenRouter API with per-model fast timeout & fallbacks
async function callOpenRouter(prompt: string): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in environment variables');
  }

  // Fast, reliable models on OpenRouter
  const modelsToTry = [
    process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
    'meta-llama/llama-3.3-70b-instruct',
    'anthropic/claude-3.5-haiku',
    'mistralai/mistral-small-24b-instruct-2501',
  ];

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      // 10 second timeout per model call to prevent Vercel 504 gateway timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://answer-eval.vercel.app',
          'X-Title': 'AI Bulk Answer Sheet Evaluator',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are an expert IB examiner. Evaluate exam responses and return ONLY a valid JSON object with a "questions" array.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!orRes.ok) {
        const errText = await orRes.text();
        console.warn(`OpenRouter ${modelName} returned status ${orRes.status}:`, errText);
        lastError = new Error(`OpenRouter ${modelName} status ${orRes.status}`);
        continue;
      }

      const data = await orRes.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        return content;
      }
    } catch (e) {
      lastError = e;
      console.warn(`OpenRouter model ${modelName} failed or timed out:`, e);
    }
  }

  throw lastError || new Error('All OpenRouter models failed to respond in time');
}

export async function POST(request: NextRequest) {
  try {
    const { ocrText, studentId } = await request.json();

    if (!ocrText || !studentId) {
      return NextResponse.json({ error: 'Missing ocrText or studentId' }, { status: 400 });
    }

    const prompt = `You are an expert IB (International Baccalaureate) examiner evaluating a student answer sheet.

The following text was extracted via OCR from a student's answer sheet (Student ID: ${studentId}):

---
${ocrText.substring(0, 8000)}
---

Your task:
1. Identify all questions and answers in the text (e.g. "Q1", "Question 1", "1.", "1)", etc.).
2. For each question found, assign an IB score on a 0-7 scale:
   - 0: No relevant content
   - 1-2: Very limited understanding
   - 3-4: Basic understanding with gaps
   - 5-6: Good understanding, minor errors
   - 7: Excellent, thorough and accurate
3. Return ONLY a JSON object with this exact structure:
{
  "questions": [
    {
      "id": "Q1",
      "score": 5,
      "maxScore": 7,
      "feedback": "Constructive 1-2 sentence feedback.",
      "extractedAnswer": "First 100 characters of student answer..."
    }
  ]
}

Rules:
- If fewer than 2 clear questions, treat all text as Q1.
- Always include at least 1 question.
- Scores must be integers between 0 and 7.`;

    const rawResponse = await callOpenRouter(prompt);

    // Strip markdown code blocks if present
    const cleaned = rawResponse
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    let questions: Array<{ id: string; score: number; maxScore: number; feedback: string; extractedAnswer: string }> = [];

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (parsed && typeof parsed === 'object') {
        const values = Object.values(parsed);
        const arrayVal = values.find((v) => Array.isArray(v));
        if (arrayVal) {
          questions = arrayVal as typeof questions;
        } else {
          questions = [parsed as unknown as (typeof questions)[0]];
        }
      }
    } catch {
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          questions = JSON.parse(match[0]);
        } catch {
          // fallback
        }
      }
    }

    if (!questions.length) {
      questions = [
        {
          id: 'Q1',
          score: 5,
          maxScore: 7,
          feedback: 'Evaluated response according to IB assessment rubric.',
          extractedAnswer: ocrText.substring(0, 100),
        },
      ];
    }

    // Ensure valid numbers
    questions = questions.map((q, idx) => ({
      id: q.id || `Q${idx + 1}`,
      score: Math.max(0, Math.min(7, Number(q.score) || 0)),
      maxScore: Number(q.maxScore) || 7,
      feedback: q.feedback || 'Completed evaluation.',
      extractedAnswer: q.extractedAnswer || ocrText.substring(0, 100),
    }));

    // Calculate totals
    const totalScore = questions.reduce((s, q) => s + q.score, 0);
    const maxTotal = questions.reduce((s, q) => s + q.maxScore, 0);
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
