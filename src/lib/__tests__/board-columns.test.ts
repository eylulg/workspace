import { describe, expect, it } from 'vitest';
import { ids, makeIssue } from '@/test-utils/fixtures';
import { anchorFor, columnOf, projectDrop, toColumns } from '../board-columns';

describe('board columns', () => {
  const web1 = makeIssue({ number: 1, status: 'todo' });
  const plt1 = makeIssue({ number: 1, teamId: ids.platform, status: 'todo' });
  const web2 = makeIssue({ number: 2, status: 'todo' });
  const byId = new Map([web1, plt1, web2].map((issue) => [issue.id, issue]));

  it('anchors a dropped card to the closest card above it from the same team', () => {
    const column = [web1.id, plt1.id, web2.id];

    expect(anchorFor(web2.id, column, byId)).toBe(web1.id);
    expect(anchorFor(plt1.id, column, byId)).toBeNull();
  });

  it.each([
    ['a column id', 'column:done', 'done'],
    ['a card id', web2.id, 'todo'],
    ['an unknown id', 'missing', null],
  ])('finds the column of %s', (_name, id, expected) => {
    expect(columnOf(id, toColumns([web1, web2]))).toBe(expected);
  });

  it.each([
    ['onto a card in another column, above that card', 'done-1', 'done', ['web-2', 'done-1']],
    [
      'onto an empty part of another column, at its end',
      'column:done',
      'done',
      ['done-1', 'web-2'],
    ],
    ["onto a card in the same column, in that card's place", 'web-1', 'todo', ['web-2', 'web-1']],
  ])('projects a drop %s', (_name, overId, status, column) => {
    const columns = { ...toColumns([]), todo: ['web-1', 'web-2'], done: ['done-1'] };

    expect(projectDrop(columns, 'web-2', overId)).toEqual({ status, column });
  });
});
