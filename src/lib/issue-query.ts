import {
  type IssueSummary,
  PRIORITIES,
  type Priority,
  STATUSES,
  type Status,
  type Team,
} from './domain';

const VIEWS = ['list', 'board'] as const;
export const GROUPINGS = ['status', 'priority', 'assignee', 'none'] as const;
export const SORTS = ['manual', 'priority', 'updated', 'created', 'due'] as const;

type View = (typeof VIEWS)[number];
export type Grouping = (typeof GROUPINGS)[number];
export type Sort = (typeof SORTS)[number];

/** Everything the issues view shows is described by the URL, so any view can be shared or saved. */
export interface IssueQuery {
  team: string | null;
  view: View;
  group: Grouping;
  sort: Sort;
  status: Status[];
  priority: Priority[];
  /** Member ids, or "none" for unassigned. */
  assignee: string[];
  label: string[];
  project: string[];
  q: string;
}

const DEFAULT_QUERY: IssueQuery = {
  team: null,
  view: 'list',
  group: 'status',
  sort: 'manual',
  status: [],
  priority: [],
  assignee: [],
  label: [],
  project: [],
  q: '',
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

const read = (source: ParamSource, key: string): string | undefined => {
  if (source instanceof URLSearchParams) return source.get(key) ?? undefined;
  const value = source[key];
  return Array.isArray(value) ? value[0] : value;
};

const list = (value: string | undefined) => (value ? value.split(',').filter(Boolean) : []);

const oneOf = <T extends string>(
  options: readonly T[],
  value: string | undefined,
  fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

export function parseIssueQuery(source: ParamSource): IssueQuery {
  return {
    team: read(source, 'team')?.toUpperCase() || null,
    view: oneOf(VIEWS, read(source, 'view'), DEFAULT_QUERY.view),
    group: oneOf(GROUPINGS, read(source, 'group'), DEFAULT_QUERY.group),
    sort: oneOf(SORTS, read(source, 'sort'), DEFAULT_QUERY.sort),
    status: list(read(source, 'status')).filter((value): value is Status =>
      STATUSES.includes(value as Status),
    ),
    priority: list(read(source, 'priority'))
      .map(Number)
      .filter((value): value is Priority => PRIORITIES.includes(value as Priority)),
    assignee: list(read(source, 'assignee')),
    label: list(read(source, 'label')),
    project: list(read(source, 'project')),
    q: (read(source, 'q') ?? '').slice(0, 200),
  };
}

/** Serialises only the values that differ from the defaults, in a stable order. */
export function serializeIssueQuery(query: Partial<IssueQuery>): string {
  const merged = { ...DEFAULT_QUERY, ...query };
  const params = new URLSearchParams();
  if (merged.team) params.set('team', merged.team);
  if (merged.view !== DEFAULT_QUERY.view) params.set('view', merged.view);
  if (merged.group !== DEFAULT_QUERY.group) params.set('group', merged.group);
  if (merged.sort !== DEFAULT_QUERY.sort) params.set('sort', merged.sort);
  for (const key of ['status', 'priority', 'assignee', 'label', 'project'] as const) {
    if (merged[key].length) params.set(key, merged[key].join(','));
  }
  if (merged.q.trim()) params.set('q', merged.q.trim());
  return params.toString().replaceAll('%2C', ',');
}

export const CLEARED_FILTERS: Partial<IssueQuery> = {
  status: [],
  priority: [],
  assignee: [],
  label: [],
  project: [],
  q: '',
};

export const hasActiveFilters = (query: IssueQuery) =>
  query.status.length +
    query.priority.length +
    query.assignee.length +
    query.label.length +
    query.project.length >
    0 || query.q.trim() !== '';

export function filterIssues(
  issues: IssueSummary[],
  query: IssueQuery,
  teams: Team[],
): IssueSummary[] {
  const team = query.team ? teams.find((item) => item.key === query.team) : undefined;
  const needle = query.q.trim().toLowerCase();
  return issues.filter((issue) => {
    if (query.team && issue.teamId !== team?.id) return false;
    if (query.status.length && !query.status.includes(issue.status)) return false;
    if (query.priority.length && !query.priority.includes(issue.priority)) return false;
    if (query.assignee.length && !query.assignee.includes(issue.assigneeId ?? 'none')) return false;
    if (query.label.length && !issue.labelIds.some((id) => query.label.includes(id))) return false;
    if (query.project.length && !query.project.includes(issue.projectId ?? 'none')) return false;
    if (
      needle &&
      !issue.title.toLowerCase().includes(needle) &&
      !issue.identifier.toLowerCase().includes(needle)
    )
      return false;
    return true;
  });
}

const priorityRank = (priority: Priority) => (priority === 0 ? 5 : priority);

export function sortIssues(issues: IssueSummary[], sort: Sort): IssueSummary[] {
  const sorted = [...issues];
  const byManual = (a: IssueSummary, b: IssueSummary) =>
    a.sortOrder - b.sortOrder || a.number - b.number;
  switch (sort) {
    case 'priority':
      return sorted.sort(
        (a, b) => priorityRank(a.priority) - priorityRank(b.priority) || byManual(a, b),
      );
    case 'updated':
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'created':
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'due':
      // Issues without a due date go last.
      return sorted.sort(
        (a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || byManual(a, b),
      );
    default:
      return sorted.sort(byManual);
  }
}

export interface IssueGroup {
  key: string;
  issues: IssueSummary[];
}

export function groupIssues(
  issues: IssueSummary[],
  group: Grouping,
  memberIds: string[],
): IssueGroup[] {
  if (group === 'none') return [{ key: 'all', issues }];
  const keys: string[] =
    group === 'status'
      ? [...STATUSES]
      : group === 'priority'
        ? PRIORITIES.map(String)
        : [...memberIds, 'none'];
  const keyOf = (issue: IssueSummary) =>
    group === 'status'
      ? issue.status
      : group === 'priority'
        ? String(issue.priority)
        : (issue.assigneeId ?? 'none');
  return keys
    .map((key) => ({ key, issues: issues.filter((issue) => keyOf(issue) === key) }))
    .filter((item) => item.issues.length > 0);
}

/** Keeps the first `limit` issues across the groups and drops the groups left empty. */
export function limitGroups(groups: IssueGroup[], limit: number): IssueGroup[] {
  let left = limit;
  return groups
    .map((group) => {
      const issues = group.issues.slice(0, left);
      left -= issues.length;
      return { ...group, issues };
    })
    .filter((group) => group.issues.length > 0);
}

/** Picks a sort order between two neighbours so a move only updates the moved issue. */
export function sortOrderBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return 1000;
  if (before === null) return (after as number) - 1000;
  if (after === null) return before + 1000;
  return (before + after) / 2;
}
