import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Content domain — courses, units, lessons, quizzes, questions, labs, projects.
 *
 * Hierarchy: Course -> Unit -> Lesson (leaf). Labs and Projects are
 * first-class siblings of a unit; quizzes and questions are children of
 * either a lesson (small) or a unit (final exam).
 */

export const courses = sqliteTable(
  'courses',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text('slug').notNull().unique(),
    track: text('track', {
      enum: ['devops', 'data', 'english', 'networking', 'cloud'],
    }).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    difficulty: text('difficulty', {
      enum: ['beginner', 'intermediate', 'advanced'],
    })
      .notNull()
      .default('beginner'),
    estimatedHours: real('estimated_hours').notNull().default(0),
    locale: text('locale', { enum: ['es', 'en', 'both'] })
      .notNull()
      .default('both'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    trackIdx: index('idx_courses_track').on(t.track),
  }),
);

export const units = sqliteTable(
  'units',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    order: integer('order').notNull(),
    summary: text('summary').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    slugUq: uniqueIndex('uq_unit_slug').on(t.courseId, t.slug),
  }),
);

export const lessons = sqliteTable(
  'lessons',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    estimatedMinutes: integer('estimated_minutes').notNull().default(10),
    order: integer('order').notNull(),
    /** Schema version — bumping it creates a new "snapshot" for user progress. */
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    slugUq: uniqueIndex('uq_lesson_slug').on(t.unitId, t.slug),
  }),
);

export const quizzes = sqliteTable('quizzes', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  lessonId: text('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }),
  unitId: text('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  /** IRT-calibrated: b = difficulty, a = discrimination. Null = not yet calibrated. */
  isAdaptive: integer('is_adaptive', { mode: 'boolean' }).notNull().default(false),
  passingScore: real('passing_score').notNull().default(0.7),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const questions = sqliteTable(
  'questions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    quizId: text('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['single', 'multiple', 'truefalse', 'short', 'code'],
    })
      .notNull()
      .default('single'),
    prompt: text('prompt').notNull(),
    options: text('options', { mode: 'json' }).$type<Array<{ id: string; text: string }>>(),
    correctAnswer: text('correct_answer', { mode: 'json' }).$type<string | string[]>(),
    explanation: text('explanation').notNull().default(''),
    /** IRT parameters — a (discrimination), b (difficulty), c (guessing). */
    irtA: real('irt_a'),
    irtB: real('irt_b'),
    irtC: real('irt_c'),
    points: integer('points').notNull().default(1),
    order: integer('order').notNull().default(0),
  },
  (t) => ({
    quizIdx: index('idx_questions_quiz').on(t.quizId),
  }),
);

export const labs = sqliteTable(
  'labs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    /** "environment": docker, kubernetes, linux, etc. */
    environment: text('environment').notNull().default('linux'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(30),
    order: integer('order').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (t) => ({
    slugUq: uniqueIndex('uq_lab_slug').on(t.unitId, t.slug),
  }),
);

export const labSteps = sqliteTable(
  'lab_steps',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    labId: text('lab_id')
      .notNull()
      .references(() => labs.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    title: text('title').notNull(),
    instructions: text('instructions').notNull(),
    /** Optional check command the runner executes. */
    checkCommand: text('check_command'),
    expectedOutput: text('expected_output'),
  },
  (t) => ({
    labIdx: index('idx_lab_steps_lab').on(t.labId, t.order),
  }),
);

export const projects = sqliteTable('projects', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  estimatedHours: real('estimated_hours').notNull().default(4),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const projectMilestones = sqliteTable(
  'project_milestones',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    order: integer('order').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    rubric: text('rubric', { mode: 'json' })
      .$type<Array<{ criterion: string; points: number }>>()
      .notNull()
      .default(sql`('[]')`),
  },
  (t) => ({
    projectIdx: index('idx_milestones_project').on(t.projectId, t.order),
  }),
);

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Unit = typeof units.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Lab = typeof labs.$inferSelect;
export type LabStep = typeof labSteps.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectMilestone = typeof projectMilestones.$inferSelect;
