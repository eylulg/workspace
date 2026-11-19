import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const ISSUE_STATUSES = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'canceled',
] as const;
export const PROJECT_STATES = ['planned', 'in_progress', 'completed'] as const;
export const ACTIVITY_KINDS = [
  'created',
  'status',
  'priority',
  'assignee',
  'title',
  'description',
  'due_date',
  'project',
  'labels',
  'deleted',
  'restored',
] as const;

export const issueStatus = pgEnum('issue_status', ISSUE_STATUSES);
export const projectState = pgEnum('project_state', PROJECT_STATES);
export const activityKind = pgEnum('activity_kind', ACTIVITY_KINDS);

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: createdAt(),
});

/** People in a workspace. A future Auth.js user maps to one member per workspace. */
export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    isGuest: boolean('is_guest').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('members_workspace_email_idx').on(t.workspaceId, t.email)],
);

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    name: text('name').notNull(),
    /** Last issue number handed out, so identifiers like WEB-42 stay stable. */
    issueCounter: integer('issue_counter').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('teams_workspace_key_idx').on(t.workspaceId, t.key)],
);

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  state: projectState('state').notNull().default('planned'),
  leadId: uuid('lead_id').references(() => members.id, { onDelete: 'set null' }),
  targetDate: date('target_date', { mode: 'string' }),
  createdAt: createdAt(),
});

export const labels = pgTable(
  'labels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('labels_workspace_name_idx').on(t.workspaceId, t.name)],
);

export const issues = pgTable(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: issueStatus('status').notNull().default('backlog'),
    /** 0 none, 1 urgent, 2 high, 3 medium, 4 low (the same scale Linear uses). */
    priority: smallint('priority').notNull().default(0),
    assigneeId: uuid('assignee_id').references(() => members.id, { onDelete: 'set null' }),
    creatorId: uuid('creator_id').references(() => members.id, { onDelete: 'set null' }),
    dueDate: date('due_date', { mode: 'string' }),
    /** Manual order inside a status column. Fractional so a move only touches one row. */
    sortOrder: doublePrecision('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete so a delete can be undone from the toast. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('issues_team_number_idx').on(t.teamId, t.number),
    index('issues_team_status_idx').on(t.teamId, t.status),
  ],
);

export const issueLabels = pgTable(
  'issue_labels',
  {
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    labelId: uuid('label_id')
      .notNull()
      .references(() => labels.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.issueId, t.labelId] })],
);

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => members.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('comments_issue_idx').on(t.issueId)],
);

export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issueId: uuid('issue_id')
      .notNull()
      .references(() => issues.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => members.id, { onDelete: 'set null' }),
    kind: activityKind('kind').notNull(),
    fromValue: text('from_value'),
    toValue: text('to_value'),
    createdAt: createdAt(),
  },
  (t) => [index('activities_issue_idx').on(t.issueId)],
);

/** Saved filters: a name and the URL query string of the issues view. */
export const savedViews = pgTable('saved_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  query: text('query').notNull(),
  createdAt: createdAt(),
});

export const issuesRelations = relations(issues, ({ many }) => ({ labels: many(issueLabels) }));
export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, { fields: [issueLabels.issueId], references: [issues.id] }),
  label: one(labels, { fields: [issueLabels.labelId], references: [labels.id] }),
}));

export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type ProjectState = (typeof PROJECT_STATES)[number];
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
