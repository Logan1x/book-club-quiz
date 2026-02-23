import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const quizzes = pgTable("quizzes", {
  quizId: text("quiz_id").primaryKey(),
  title: text("title").notNull(),
  durationSec: integer("duration_sec").notNull().default(360),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const attempts = pgTable("attempts", {
  attemptId: text("attempt_id").primaryKey(),
  quizId: text("quiz_id")
    .notNull()
    .references(() => quizzes.quizId, { onDelete: "cascade" }),
  cohort: text("cohort").notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
