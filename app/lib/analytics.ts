export interface QuestionScore {
  id: string;
  score: number;
  maxScore: number;
  feedback: string;
  extractedAnswer: string;
}

export interface StudentResult {
  studentId: string;
  questions: QuestionScore[];
  totalScore: number;
  maxTotal: number;
  percentage: number;
  status: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement' | 'Error';
  ocrText: string;
}

export interface ClassAnalytics {
  totalStudents: number;
  classAverage: number;
  passRate: number;
  distinctionRate: number;
  highestScore: number;
  lowestScore: number;
  questionStats: Array<{
    id: string;
    avgScore: number;
    maxScore: number;
    avgPercentage: number;
    highest: number;
    lowest: number;
  }>;
  bandDistribution: Array<{
    name: 'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement';
    count: number;
    percentage: number;
    color: string;
  }>;
  overallReview: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

export interface StudentReview {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

/**
 * Calculates comprehensive class-wide statistics, question breakdowns, and an AI diagnostic review.
 */
export function calculateClassAnalytics(results: StudentResult[]): ClassAnalytics | null {
  if (!results.length) return null;

  const totalStudents = results.length;
  const percentages = results.map((r) => r.percentage);
  const classAverage = Math.round(percentages.reduce((a, b) => a + b, 0) / totalStudents);
  const passCount = results.filter((r) => r.percentage >= 50).length;
  const passRate = Math.round((passCount / totalStudents) * 100);
  const distinctionCount = results.filter((r) => r.status === 'Excellent').length;
  const distinctionRate = Math.round((distinctionCount / totalStudents) * 100);
  const highestScore = Math.max(...percentages);
  const lowestScore = Math.min(...percentages);

  // Determine maximum questions present across any student
  const maxQCount = Math.max(...results.map((r) => r.questions.length), 0);
  const questionStats: ClassAnalytics['questionStats'] = [];

  for (let i = 0; i < maxQCount; i++) {
    const qScores: number[] = [];
    let qMax = 7;
    let qId = `Q${i + 1}`;

    for (const r of results) {
      if (r.questions[i]) {
        qScores.push(r.questions[i].score);
        qMax = r.questions[i].maxScore || 7;
        qId = r.questions[i].id || qId;
      }
    }

    if (qScores.length > 0) {
      const avgScore = Number((qScores.reduce((a, b) => a + b, 0) / qScores.length).toFixed(1));
      const avgPercentage = Math.round((avgScore / qMax) * 100);
      questionStats.push({
        id: qId,
        avgScore,
        maxScore: qMax,
        avgPercentage,
        highest: Math.max(...qScores),
        lowest: Math.min(...qScores),
      });
    }
  }

  // Band distribution
  const bands: Record<'Excellent' | 'Good' | 'Satisfactory' | 'Needs Improvement', number> = {
    Excellent: 0,
    Good: 0,
    Satisfactory: 0,
    'Needs Improvement': 0,
  };

  for (const r of results) {
    if (r.status in bands) {
      bands[r.status as keyof typeof bands]++;
    } else {
      bands['Needs Improvement']++;
    }
  }

  const bandDistribution: ClassAnalytics['bandDistribution'] = [
    {
      name: 'Excellent',
      count: bands.Excellent,
      percentage: Math.round((bands.Excellent / totalStudents) * 100),
      color: '#10b981', // emerald green
    },
    {
      name: 'Good',
      count: bands.Good,
      percentage: Math.round((bands.Good / totalStudents) * 100),
      color: '#6366f1', // indigo / accent
    },
    {
      name: 'Satisfactory',
      count: bands.Satisfactory,
      percentage: Math.round((bands.Satisfactory / totalStudents) * 100),
      color: '#f59e0b', // amber
    },
    {
      name: 'Needs Improvement',
      count: bands['Needs Improvement'],
      percentage: Math.round((bands['Needs Improvement'] / totalStudents) * 100),
      color: '#ef4444', // red
    },
  ];

  // Synthesize Class AI Review
  const sortedQ = [...questionStats].sort((a, b) => b.avgPercentage - a.avgPercentage);
  const bestQ = sortedQ[0];
  const hardestQ = sortedQ[sortedQ.length - 1];

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (bestQ) {
    strengths.push(
      `Strongest overall mastery demonstrated in ${bestQ.id} with an average score of ${bestQ.avgScore}/${bestQ.maxScore} (${bestQ.avgPercentage}%).`
    );
  }
  if (distinctionRate >= 30) {
    strengths.push(`High distinction rate: ${distinctionRate}% of candidates achieved the top IB Mark Band.`);
  } else if (passRate >= 80) {
    strengths.push(`Solid cohort foundational grasp with a ${passRate}% pass rate.`);
  }

  if (hardestQ && hardestQ.id !== bestQ?.id) {
    weaknesses.push(
      `Primary conceptual gap observed in ${hardestQ.id} averaging ${hardestQ.avgScore}/${hardestQ.maxScore} (${hardestQ.avgPercentage}%).`
    );
  }
  if (bands['Needs Improvement'] > 0) {
    weaknesses.push(
      `${bands['Needs Improvement']} student(s) currently require targeted remedial intervention to meet baseline criteria.`
    );
  }

  if (hardestQ) {
    recommendations.push(
      `Conduct a focused review on core principles evaluated in ${hardestQ.id}.`
    );
  }
  recommendations.push(
    `Encourage structured marking rubric self-assessments before formal exam submissions.`
  );

  const summary = `Class cohort of ${totalStudents} candidate(s) attained an average score of ${classAverage}% with a ${passRate}% pass rate. ${
    classAverage >= 75
      ? 'The cohort shows strong analytical consistency across standard IB criteria.'
      : classAverage >= 60
      ? 'Performance is moderate with specific opportunities to reinforce deeper explanations.'
      : 'Targeted review is recommended across fundamental concepts to improve cohort results.'
  }`;

  return {
    totalStudents,
    classAverage,
    passRate,
    distinctionRate,
    highestScore,
    lowestScore,
    questionStats,
    bandDistribution,
    overallReview: {
      summary,
      strengths: strengths.length ? strengths : ['Consistent engagement across all evaluation sections.'],
      weaknesses: weaknesses.length ? weaknesses : ['Minor inconsistencies in precision and extended details.'],
      recommendations: recommendations.length
        ? recommendations
        : ['Continue regular rubric-aligned formative checks.'],
    },
  };
}

/**
 * Generates an individualized diagnostic review for a specific student.
 */
export function generateStudentReview(
  student: StudentResult,
  classStats?: ClassAnalytics | null
): StudentReview {
  const qs = student.questions;
  if (!qs.length) {
    return {
      summary: 'No evaluated questions recorded for this candidate.',
      strengths: ['Evaluation pending'],
      weaknesses: ['Evaluation pending'],
      recommendation: 'Ensure complete answer sheet OCR ingestion.',
    };
  }

  const ratedQs = qs.map((q) => ({
    ...q,
    pct: q.maxScore > 0 ? (q.score / q.maxScore) * 100 : 0,
  }));

  const sorted = [...ratedQs].sort((a, b) => b.pct - a.pct);
  const best = sorted[0];
  const weakest = sorted[sorted.length - 1];

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (best && best.pct >= 70) {
    strengths.push(
      `High proficiency in ${best.id} (${best.score}/${best.maxScore}): ${best.feedback || 'Thorough and well-reasoned response.'}`
    );
  } else if (best) {
    strengths.push(`Best relative performance on ${best.id} (${best.score}/${best.maxScore}).`);
  }

  if (student.percentage >= 80) {
    strengths.push('Demonstrates strong subject terminology, clear structure, and conceptual rigor.');
  } else if (student.percentage >= 60) {
    strengths.push('Good basic framework with solid retention of foundational definitions.');
  }

  if (weakest && weakest.pct < 70) {
    weaknesses.push(
      `Loss of marks in ${weakest.id} (${weakest.score}/${weakest.maxScore}): ${weakest.feedback || 'Needs further development and precision.'}`
    );
  }

  const lowQuestions = ratedQs.filter((q) => q.pct < 60);
  if (lowQuestions.length > 1) {
    weaknesses.push(
      `Recurring deductions across ${lowQuestions.map((q) => q.id).join(', ')} due to missing technical specifics or incomplete derivations.`
    );
  } else if (!weaknesses.length) {
    weaknesses.push('Minor points lost on advanced extensions; foundational content is sound.');
  }

  let recommendation = '';
  if (student.percentage >= 85) {
    recommendation = 'Maintain precision in multi-step questions and focus on advanced synthesis to secure top band marks.';
  } else if (student.percentage >= 70) {
    recommendation = `Review feedback notes on ${weakest?.id || 'lower scoring questions'} and incorporate concrete examples or formulas in future answers.`;
  } else if (student.percentage >= 50) {
    recommendation = `Focus on structured step-by-step reasoning for ${weakest?.id || 'complex questions'} and review key IB marking definitions.`;
  } else {
    recommendation = 'Schedule a one-on-one review session covering core subject concepts and practice structured answer outlines.';
  }

  const compText = classStats
    ? student.percentage >= classStats.classAverage
      ? `(${student.percentage - classStats.classAverage}% above class average)`
      : `(${classStats.classAverage - student.percentage}% below class average)`
    : '';

  const summary = `Candidate achieved a total score of ${student.totalScore}/${student.maxTotal} (${student.percentage}%) placed in the '${student.status}' IB Mark Band ${compText}. ${
    student.percentage >= 85
      ? 'Exemplary work demonstrating comprehensive understanding.'
      : student.percentage >= 70
      ? 'Competent and consistent performance with clear analytical clarity.'
      : student.percentage >= 50
      ? 'Meets standard expectations with clear scope for refinement in detail.'
      : 'Substantial improvement required in core response completeness.'
  }`;

  return {
    summary,
    strengths: strengths.length ? strengths : ['Structured answer attempts present.'],
    weaknesses: weaknesses.length ? weaknesses : ['Needs further depth in explanations.'],
    recommendation,
  };
}
