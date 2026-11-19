import { z } from 'zod';
import { STATUSES } from './domain';

const id = z.uuid();
const isoDate = z.iso.date();

/** Titles are one line in the list and on the board; a word this long cannot wrap and breaks the layout. */
const LONG_WORD = /\S{61,}/;
const title = z
  .string()
  .trim()
  .min(1, 'titleRequired')
  .max(120, 'titleTooLong')
  .refine((value) => !LONG_WORD.test(value), 'wordTooLong');

const priorityValue = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const createIssueSchema = z.object({
  teamId: id,
  title,
  description: z.string().max(5_000).default(''),
  status: z.enum(STATUSES).default('backlog'),
  priority: priorityValue.default(0),
  assigneeId: id.nullable().default(null),
  projectId: id.nullable().default(null),
  labelIds: z.array(id).max(10).default([]),
  dueDate: isoDate.nullable().default(null),
});
export type CreateIssueInput = z.input<typeof createIssueSchema>;

export const updateIssueSchema = z.object({
  id,
  patch: z
    .object({
      title,
      description: z.string().max(5_000),
      status: z.enum(STATUSES),
      priority: priorityValue,
      assigneeId: id.nullable(),
      projectId: id.nullable(),
      labelIds: z.array(id).max(10),
      dueDate: isoDate.nullable(),
    })
    .partial()
    .refine((patch) => Object.keys(patch).length > 0, 'emptyPatch'),
});
export type UpdateIssueInput = z.input<typeof updateIssueSchema>;

export const moveIssueSchema = z.object({
  id,
  status: z.enum(STATUSES),
  /** The issue the moved one lands after, or null for the top of the column. */
  afterId: id.nullable(),
});

export const issueIdSchema = z.object({ id });

export const commentSchema = z.object({
  issueId: id,
  body: z.string().trim().min(1, 'commentRequired').max(2_000),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'invalidColor');

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(40, 'nameTooLong'),
  color: hexColor,
});

export const updateLabelSchema = createLabelSchema.extend({ id });

export const savedViewSchema = z.object({
  name: z.string().trim().min(1, 'nameRequired').max(60, 'nameTooLong'),
  query: z.string().max(1_000),
});
