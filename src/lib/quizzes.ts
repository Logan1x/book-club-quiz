import fs from "node:fs";
import path from "node:path";

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

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export function listQuizIds(): string[] {
  // map file names to quizIds; keep it simple for now
  return ["sophies-world-ch1-3"];
}

export function loadQuiz(quizId: string): McqQuiz {
  const root = process.cwd();
  const file = path.join(root, "src", "quizzes", `${quizId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Quiz not found: ${quizId}`);
  return readJson<McqQuiz>(file);
}

export function loadAnswerKey(quizId: string): AnswerKey {
  const root = process.cwd();
  const file = path.join(root, "src", "quizzes", `${quizId}.answers.json`);
  if (!fs.existsSync(file)) throw new Error(`Answer key not found: ${quizId}`);
  return readJson<AnswerKey>(file);
}

export function scoreAttempt(params: {
  quizId: string;
  answers: Record<string, number>;
}): {
  total: number;
  correct: number;
  scorePct: number;
  perQuestion: Array<{ id: string; correct: boolean; correctIndex: number }>;
} {
  const quiz = loadQuiz(params.quizId);
  const key = loadAnswerKey(params.quizId);

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
