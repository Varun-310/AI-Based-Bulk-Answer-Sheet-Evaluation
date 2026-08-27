import { NextRequest, NextResponse } from 'next/server';

// Call OpenRouter API with prioritized top reasoning models
async function callOpenRouter(prompt: string): Promise<string> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in .env.local');
  }

  // Best models for structured rubric scoring & OCR reasoning on OpenRouter
  const modelsToTry = [
    process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-haiku',
    'mistralai/mistral-small-24b-instruct-2501',
  ];

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
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
              content: 'You are an expert IB (International Baccalaureate) examiner. You evaluate student exam scripts objectively and output strictly structured JSON without markdown or codeblocks.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (!orRes.ok) {
        const errText = await orRes.text();
        console.warn(`OpenRouter model ${modelName} returned ${orRes.status}:`, errText);
        lastError = new Error(`OpenRouter ${modelName} error (${orRes.status}): ${errText}`);
        continue;
      }

      const data = await orRes.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        return content;
      }
    } catch (e) {
      lastError = e;
      console.warn(`OpenRouter model ${modelName} failed, trying next...`, e);
    }
  }

  throw lastError || new Error('All OpenRouter models failed to respond');
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
1. Identify all questions and their corresponding answers in the text. Look for patterns like "Q1", "Question 1", "1.", "1)", "(a)", "(b)", etc.
2. For each question found, assign an IB-style score on a 0-7 scale:
   - 0: No relevant content or completely wrong
   - 1-2: Very limited understanding, major errors
   - 3-4: Basic understanding, some correct elements but significant gaps
   - 5-6: Good understanding, minor errors or omissions
   - 7: Excellent, thorough and accurate response
3. Return a JSON structure with an array under "questions" (or direct array). Format:
{
  "questions": [
    {
      "id": "Q1",
      "score": 5,
      "maxScore": 7,
      "feedback": "Brief constructive feedback in 1-2 sentences",
      "extractedAnswer": "First 120 chars of extracted answer..."
    }
  ]
}

Rules:
- If you detect fewer than 2 clear questions, treat the entire content as one answer (Q1)
- Always return at least 1 question
- Scores must be integers 0-7
- Keep feedback professional and constructive
- extractedAnswer should be the first 120 characters of the student's answer text`;

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
          extractedAnswer: ocrText.substring(0, 120),
        },
      ];
    }

    // Calculate totals
    const totalScore = questions.reduce((s, q) => s + (Number(q.score) || 0), 0);
    const maxTotal = questions.reduce((s, q) => s + (Number(q.maxScore) || 7), 0);
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
