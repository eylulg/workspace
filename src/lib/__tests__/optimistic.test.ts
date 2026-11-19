import { describe, expect, it } from 'vitest';
import { ids, makeIssue } from '@/test-utils/fixtures';
import { applyOptimistic } from '../optimistic';

describe('applyOptimistic', () => {
  it('moves an issue into another column right after the anchor', () => {
    const moving = makeIssue({ number: 1, status: 'todo' });
    const issues = [
      moving,
      makeIssue({ number: 2, status: 'done', sortOrder: 1000 }),
      makeIssue({ number: 3, status: 'done', sortOrder: 2000 }),
    ];

    const result = applyOptimistic(issues, {
      type: 'move',
      id: moving.id,
      status: 'done',
      afterId: issues[1]?.id ?? null,
    });

    expect(result.find((issue) => issue.id === moving.id)).toMatchObject({
      status: 'done',
      sortOrder: 1500,
    });
  });

  it('ignores cards from another team when it places a moved issue', () => {
    const moving = makeIssue({ number: 1, status: 'todo' });
    const otherTeam = makeIssue({
      number: 9,
      teamId: ids.platform,
      status: 'done',
      sortOrder: 500,
    });
    const sameTeam = makeIssue({ number: 2, status: 'done', sortOrder: 3000 });

    const result = applyOptimistic([moving, otherTeam, sameTeam], {
      type: 'move',
      id: moving.id,
      status: 'done',
      afterId: null,
    });

    expect(result.find((issue) => issue.id === moving.id)?.sortOrder).toBe(2000);
  });

  it('puts an issue whose status changes at the top of its new column, as the server does', () => {
    const changing = makeIssue({ number: 1, status: 'todo', sortOrder: 5000 });
    const issues = [
      changing,
      makeIssue({ number: 2, status: 'done', sortOrder: 2000 }),
      makeIssue({ number: 3, status: 'done', sortOrder: 3000 }),
    ];

    const result = applyOptimistic(issues, {
      type: 'update',
      id: changing.id,
      patch: { status: 'done' },
    });

    expect(result.find((issue) => issue.id === changing.id)).toMatchObject({
      status: 'done',
      sortOrder: 1000,
    });
  });

  it('patches only the changed issue', () => {
    const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

    const result = applyOptimistic(issues, {
      type: 'update',
      id: issues[0]?.id ?? '',
      patch: { priority: 1 },
    });

    expect(result.map((issue) => issue.priority)).toEqual([1, 0]);
  });

  it('removes a deleted issue', () => {
    const issues = [makeIssue({ number: 1 }), makeIssue({ number: 2 })];

    const result = applyOptimistic(issues, { type: 'remove', id: issues[0]?.id ?? '' });

    expect(result.map((issue) => issue.identifier)).toEqual(['WEB-2']);
  });
});
