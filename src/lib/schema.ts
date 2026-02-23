import { pgTable, text, integer, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const quizzes = pgTable("quizzes", {
  quizId: text("quiz_id").primaryKey(),
  title: text("title").notNull(),
  durationSec: integer("duration_sec").notNull().default(360),
  content: jsonb("content"),
  answerKey: jsonb("answer_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cohorts = pgTable("cohorts", {
  cohortCode: text("cohort_code").primaryKey(),
  cohortName: text("cohort_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cohortQuizzes = pgTable(
  "cohort_quizzes",
  {
    cohortCode: text("cohort_code")
      .notNull()
      .references(() => cohorts.cohortCode, { onDelete: "cascade" }),
    quizId: text("quiz_id")
      .notNull()
      .references(() => quizzes.quizId, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cohortCode, t.quizId] }),
  })
);

export const attempts = pgTable("attempts", {
  attemptId: text("attempt_id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.quizId, { onDelete: "cascade" }),
  cohort: text("cohort").notNull(),
  participantKey: text("participant_key"),
  displayName: text("display_name"),
  whatsapp: text("whatsapp"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  durationMs: integer("duration_ms"),
  correct: integer("correct"),
  total: integer("total"),
  scorePct: integer("score_pct"),
  timedOut: boolean("timed_out"),
  answers: jsonb("answers"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
