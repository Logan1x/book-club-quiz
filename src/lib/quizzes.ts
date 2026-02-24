export type McqQuiz = {
  quizId: string;
  book?: {
    title?: string;
    chaptersCovered?: Array<{ number: number; title: string }>;
  };
  audience?: string;
  format?: { type: "mcq"; questions: number; optionsPerQuestion: number };
  questions: Array<{
    id: string;
    chapter?: number;
    prompt: string;
    options: string[];
  }>;
};

export type AnswerKey = {
  quizId: string;
  answerKey: Array<{ id: string; answerIndex: number; answerLabel?: string }>;
};

export function scoreAttempt(params: {
  quiz: McqQuiz;
  answerKey: AnswerKey;
  answers: Record<string, number>;
}): {
  total: number;
  correct: number;
  scorePct: number;
  perQuestion: Array<{ id: string; correct: boolean; correctIndex: number }>;
} {
  const quiz = params.quiz;
  const key = params.answerKey;

  const keyMap = new Map(key.answerKey.map((x) => [x.id, x.answerIndex] as const));

  const perQuestion = quiz.questions.map((q) => {
    const correctIndex = keyMap.get(q.id);
    if (correctIndex === undefined) {
      throw new Error(`Missing answer for question: ${q.id}`);
    }
    const given = params.answers[q.id];
    return {
      id: q.id,
      correctIndex,
      correct: Number.isInteger(given) && given === correctIndex,
    };
  });

  const correct = perQuestion.filter((x) => x.correct).length;
  const total = quiz.questions.length;
  const scorePct = total ? Math.round((correct / total) * 100) : 0;
  return { total, correct, scorePct, perQuestion };
}
